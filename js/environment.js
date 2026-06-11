import * as THREE from 'three';
import { scene } from './scene.js';

// =============================================
// WARP — efecto hiperespacio 3D
// =============================================
const WARP_COUNT  = 1800;                  // partículas totales
const WARP_RADIUS = 120;                   // distancia máxima desde el origen
const WARP_SPEED_BASE  = 0.55;            // velocidad base (idle)
const WARP_SPEED_VOICE = 2.8;             // velocidad al hablar
const WARP_SPEED_LISTEN = 1.4;            // velocidad al escuchar

// Cada partícula: posición actual + dirección radial normalizada + velocidad individual
const warpPos   = new Float32Array(WARP_COUNT * 3); // posición (punto)
const warpTrail = new Float32Array(WARP_COUNT * 3); // posición trasera (rastro)
const warpDir   = new Float32Array(WARP_COUNT * 3); // dirección normalizada
const warpSpeed = new Float32Array(WARP_COUNT);      // velocidad individual

function initWarpParticle(i) {
    // Nacer en una esfera pequeña alrededor del origen — punto de fuga
    const r     = 2 + Math.random() * 4;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    warpPos[i*3]   = x;
    warpPos[i*3+1] = y;
    warpPos[i*3+2] = z;

    // Dirección: desde el origen hacia afuera — lo que crea el efecto túnel
    const len = Math.sqrt(x*x + y*y + z*z);
    warpDir[i*3]   = x / len;
    warpDir[i*3+1] = y / len;
    warpDir[i*3+2] = z / len;

    warpSpeed[i] = 0.6 + Math.random() * 0.8;

    // Trail empieza en la misma posición
    warpTrail[i*3]   = x;
    warpTrail[i*3+1] = y;
    warpTrail[i*3+2] = z;
}

// Inicializar distribuidas por todo el volumen (no solo en el centro)
for (let i = 0; i < WARP_COUNT; i++) {
    initWarpParticle(i);
    // Dispersar aleatoriamente en profundidad para evitar flash inicial
    const spread = Math.random();
    warpPos[i*3]   += warpDir[i*3]   * WARP_RADIUS * spread;
    warpPos[i*3+1] += warpDir[i*3+1] * WARP_RADIUS * spread;
    warpPos[i*3+2] += warpDir[i*3+2] * WARP_RADIUS * spread;
    warpTrail[i*3]   = warpPos[i*3];
    warpTrail[i*3+1] = warpPos[i*3+1];
    warpTrail[i*3+2] = warpPos[i*3+2];
}

// Geometría de puntos (cabeza del rastro)
const warpHeadGeo = new THREE.BufferGeometry();
warpHeadGeo.setAttribute('position', new THREE.BufferAttribute(warpPos.slice(), 3));

const warpHeadMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.18,
    transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
});
const warpHeads = new THREE.Points(warpHeadGeo, warpHeadMat);
scene.add(warpHeads);

// Geometría de líneas (rastros de velocidad)
// Cada rastro es un segmento: [cabeza, cola] — 2 vértices por partícula
const trailVerts = new Float32Array(WARP_COUNT * 6);
for (let i = 0; i < WARP_COUNT; i++) {
    trailVerts[i*6]   = warpPos[i*3];
    trailVerts[i*6+1] = warpPos[i*3+1];
    trailVerts[i*6+2] = warpPos[i*3+2];
    trailVerts[i*6+3] = warpTrail[i*3];
    trailVerts[i*6+4] = warpTrail[i*3+1];
    trailVerts[i*6+5] = warpTrail[i*3+2];
}

// Colores por vértice — cabeza blanca/cian, cola desvanece a negro
const trailColors = new Float32Array(WARP_COUNT * 6);
for (let i = 0; i < WARP_COUNT; i++) {
    // Cabeza: blanco-cian brillante
    trailColors[i*6]   = 0.7 + Math.random() * 0.3;
    trailColors[i*6+1] = 0.85 + Math.random() * 0.15;
    trailColors[i*6+2] = 1.0;
    // Cola: negro (transparencia por color)
    trailColors[i*6+3] = 0;
    trailColors[i*6+4] = 0;
    trailColors[i*6+5] = 0;
}

const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailVerts, 3));
trailGeo.setAttribute('color',    new THREE.BufferAttribute(trailColors, 3));

const trailMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
});
const warpTrails = new THREE.LineSegments(trailGeo, trailMat);
scene.add(warpTrails);

// Estado de velocidad warp — voice.js puede escribir aquí
export const warpState = { speed: WARP_SPEED_BASE };
export function setWarpVoice()   { warpState.speed = WARP_SPEED_VOICE; }
export function setWarpListen()  { warpState.speed = WARP_SPEED_LISTEN; }
export function setWarpIdle()    { warpState.speed = WARP_SPEED_BASE; }

// Colores de rastro según modo
const COLOR_IDLE    = { r: 0.7,  g: 0.9,  b: 1.0  }; // cian frío
const COLOR_LISTEN  = { r: 0.4,  g: 0.6,  b: 1.0  }; // azul escucha
const COLOR_VOICE   = { r: 1.0,  g: 0.85, b: 0.3  }; // dorado hablar
let   _targetColor  = COLOR_IDLE;
let   _currentColor = { ...COLOR_IDLE };

export function updateWarp() {
    const spd = warpState.speed;

    // Suavizar color hacia target
    _currentColor.r += (_targetColor.r - _currentColor.r) * 0.05;
    _currentColor.g += (_targetColor.g - _currentColor.g) * 0.05;
    _currentColor.b += (_targetColor.b - _currentColor.b) * 0.05;

    // Detectar modo por velocidad
    if      (spd >= WARP_SPEED_VOICE  * 0.9) _targetColor = COLOR_VOICE;
    else if (spd >= WARP_SPEED_LISTEN * 0.9) _targetColor = COLOR_LISTEN;
    else                                       _targetColor = COLOR_IDLE;

    const posAttr   = warpHeadGeo.attributes.position;
    const trailAttr = trailGeo.attributes.position;
    const colorAttr = trailGeo.attributes.color;

    // Longitud del rastro proporcional a la velocidad — más rápido = rastro más largo
    const trailLength = 0.8 + spd * 1.2;

    for (let i = 0; i < WARP_COUNT; i++) {
        const dx = warpDir[i*3];
        const dy = warpDir[i*3+1];
        const dz = warpDir[i*3+2];
        const v  = warpSpeed[i] * spd;

        // Mover cabeza hacia afuera
        warpPos[i*3]   += dx * v;
        warpPos[i*3+1] += dy * v;
        warpPos[i*3+2] += dz * v;

        // Cola sigue a la cabeza con rezago = longitud del rastro
        warpTrail[i*3]   = warpPos[i*3]   - dx * trailLength * warpSpeed[i];
        warpTrail[i*3+1] = warpPos[i*3+1] - dy * trailLength * warpSpeed[i];
        warpTrail[i*3+2] = warpPos[i*3+2] - dz * trailLength * warpSpeed[i];

        // Distancia desde origen
        const px = warpPos[i*3], py = warpPos[i*3+1], pz = warpPos[i*3+2];
        const dist = Math.sqrt(px*px + py*py + pz*pz);

        // Reiniciar cuando sale del volumen
        if (dist > WARP_RADIUS) initWarpParticle(i);

        // Actualizar buffers
        posAttr.setXYZ(i, warpPos[i*3], warpPos[i*3+1], warpPos[i*3+2]);

        trailAttr.setXYZ(i*2,   warpPos[i*3],   warpPos[i*3+1],   warpPos[i*3+2]);
        trailAttr.setXYZ(i*2+1, warpTrail[i*3], warpTrail[i*3+1], warpTrail[i*3+2]);

        // Color cabeza = color actual del modo
        colorAttr.setXYZ(i*2,   _currentColor.r, _currentColor.g, _currentColor.b);
        // Cola siempre negra — gradiente natural
        colorAttr.setXYZ(i*2+1, 0, 0, 0);
    }

    posAttr.needsUpdate   = true;
    trailAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
}

// starsBg exportado como alias para compatibilidad con main.js
// (main.js anima starsBg.material.opacity — redirigimos a trailMat)
export const starsBg = { material: trailMat };

// =============================================
// PLANETAS — textura procedural + datos API
// =============================================
function c(v) { return Math.min(255, Math.floor(v * 255)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function fbm(x, y, oct) {
    let v = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < oct; i++) {
        v += valueNoise(x * freq, y * freq) * amp;
        amp *= 0.5; freq *= 2.1;
    }
    return v;
}
function valueNoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
    const h = (px, py) => { const n = Math.sin(px*127.1+py*311.7)*43758.5453; return n-Math.floor(n); };
    return lerp(lerp(h(ix,iy), h(ix+1,iy), ux), lerp(h(ix,iy+1), h(ix+1,iy+1), ux), uy);
}

function makePlanetTexture(size, opts = {}) {
    const {
        baseColor = [0.2, 0.5, 0.8], darkColor = [0.05, 0.1, 0.3],
        noiseScale = 4, poles = false, poleColor = [0.9, 0.95, 1.0],
        cloudy = false, cloudColor = [1, 1, 1],
        lava = false, hasContinents = true,
    } = opts;

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const w = size, h = size;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0,   `rgb(${c(darkColor[0])},${c(darkColor[1])},${c(darkColor[2])})`);
    grad.addColorStop(0.5, `rgb(${c(baseColor[0])},${c(baseColor[1])},${c(baseColor[2])})`);
    grad.addColorStop(1,   `rgb(${c(darkColor[0])},${c(darkColor[1])},${c(darkColor[2])})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
            const n = fbm((x / w) * noiseScale, (y / h) * noiseScale, 5);
            if (lava && n > 0.62) {
                ctx.fillStyle = `rgba(255,${Math.floor(60 + n * 120)},0,${0.5 + n * 0.5})`;
                ctx.fillRect(x, y, 2, 2);
            } else if (hasContinents && !lava && n > 0.52) {
                const t = (n - 0.52) / 0.48;
                ctx.fillStyle = `rgba(${c(lerp(baseColor[0], baseColor[0]*1.5, t))},${c(lerp(baseColor[1], baseColor[1]*1.3, t))},${c(lerp(baseColor[2], baseColor[2]*0.6, t))},0.7)`;
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }

    if (cloudy) {
        for (let y = 0; y < h; y += 2) {
            for (let x = 0; x < w; x += 2) {
                const n = fbm((x / w) * 6 + 10, (y / h) * 6 + 10, 4);
                if (n > 0.58) {
                    const a = ((n - 0.58) / 0.42 * 0.55).toFixed(2);
                    ctx.fillStyle = `rgba(${c(cloudColor[0])},${c(cloudColor[1])},${c(cloudColor[2])},${a})`;
                    ctx.fillRect(x, y, 2, 2);
                }
            }
        }
    }

    if (poles) {
        const poleH = Math.floor(h * 0.12);
        for (let yy = 0; yy < poleH; yy++) {
            const a = (1 - yy / poleH).toFixed(2);
            ctx.fillStyle = `rgba(${c(poleColor[0])},${c(poleColor[1])},${c(poleColor[2])},${a})`;
            ctx.fillRect(0, yy, w, 1);
            ctx.fillRect(0, h - 1 - yy, w, 1);
        }
    }

    return new THREE.CanvasTexture(canvas);
}

// --- Datos del backend ---
export let datosInventario = null;
export let datosEnseres = null;

export async function cargarDatos() {
    try {
        const invResp = await fetch('/api/consultar?tabla=inventario');
        if (invResp.ok) datosInventario = (await invResp.json()).datos;
        const ensResp = await fetch('/api/consultar?tabla=enseres');
        if (ensResp.ok) datosEnseres = (await ensResp.json()).datos;
        console.log('📊 Datos cargados:', { inventario: datosInventario?.length, enseres: datosEnseres?.length });
    } catch (e) {
        console.warn('Error cargando datos:', e);
    }
}
cargarDatos();

// --- Definición de planetas ---
const planetas = [
    {
        name: 'Tejedora', color: 0xFFD700, size: 0.45, distance: 3.0, speed: 0.005,
        rings: true, moon: { size: 0.09, dist: 0.75, speed: 0.03 },
        atmoColor: 0xffdd66,
        tex: { baseColor:[1,0.75,0], darkColor:[0.5,0.3,0], noiseScale:5, cloudy:true, cloudColor:[1,0.95,0.7], hasContinents:false },
        getTexto: () => '📅 Tejedora\nOrganiza citas y recordatorios'
    },
    {
        name: 'Kai', color: 0x3399FF, size: 0.42, distance: 3.0, speed: 0.005,
        rings: false, moon: null, atmoColor: 0x5599ff,
        tex: { baseColor:[0.1,0.35,0.85], darkColor:[0.02,0.1,0.45], noiseScale:4, poles:true, cloudy:true, hasContinents:true },
        getTexto: () => {
            if (datosInventario && datosInventario.length > 0) {
                const productos = datosInventario.slice(0, 3);
                let texto = '🛍️ INVENTARIO (VENTAS)\n';
                productos.forEach(p => { texto += `• ${p.nombre}: ${p.stock} uds ($${p.precio})\n`; });
                if (datosInventario.length > 3) texto += `... y ${datosInventario.length - 3} más`;
                return texto;
            }
            return '🛍️ Kai\nInventario no disponible';
        }
    },
    {
        name: 'Quántor', color: 0x33CC66, size: 0.44, distance: 3.0, speed: 0.005,
        rings: false, moon: { size: 0.07, dist: 0.7, speed: 0.025 },
        atmoColor: 0x44ee88,
        tex: { baseColor:[0.1,0.7,0.3], darkColor:[0.02,0.25,0.08], noiseScale:3.5, hasContinents:true },
        getTexto: () => '⚠️ Quántor\nAlertas y control de calidad'
    },
    {
        name: 'Memoria', color: 0xFF3333, size: 0.40, distance: 3.0, speed: 0.005,
        rings: false, moon: null, atmoColor: 0xff5533,
        tex: { baseColor:[0.85,0.15,0.1], darkColor:[0.3,0.02,0.02], noiseScale:4, lava:true, hasContinents:false },
        getTexto: () => {
            if (datosEnseres && datosEnseres.length > 0) {
                const materiales = datosEnseres.slice(0, 3);
                let texto = '🔧 MATERIAL DE TRABAJO\n';
                materiales.forEach(m => {
                    const alerta = m.stock <= m.stock_minimo ? ' ⚠️' : '';
                    texto += `• ${m.nombre}: ${m.stock} ${m.unidad}${alerta}\n`;
                });
                if (datosEnseres.length > 3) texto += `... y ${datosEnseres.length - 3} más`;
                return texto;
            }
            return '🔧 Memoria\nMaterial no disponible';
        }
    },
    {
        name: 'Valorador', color: 0xFF8800, size: 0.46, distance: 3.0, speed: 0.005,
        rings: false, moon: { size: 0.08, dist: 0.8, speed: 0.02 },
        atmoColor: 0xff9944,
        tex: { baseColor:[0.95,0.45,0], darkColor:[0.4,0.15,0], noiseScale:6, cloudy:true, cloudColor:[1,0.8,0.5], hasContinents:false },
        getTexto: () => '⚖️ Valorador\nEvalúa reglas y validaciones'
    },
    {
        name: 'Faro', color: 0xDDEEFF, size: 0.38, distance: 3.0, speed: 0.005,
        rings: false, moon: null, atmoColor: 0xaaccff,
        tex: { baseColor:[0.75,0.85,1], darkColor:[0.3,0.4,0.6], noiseScale:3, poles:true, poleColor:[1,1,1], cloudy:true, cloudColor:[0.95,0.98,1], hasContinents:true },
        getTexto: () => '🔭 Faro\nMonitoreo del sistema'
    },
];

const anglesPlanets = [0, 60, 120, 180, 240, 300].map(d => d * Math.PI / 180);
export const planetFigures = [];
const orbitMat = new THREE.LineBasicMaterial({ color: 0x223355, transparent: true, opacity: 0.2 });

planetas.forEach((def, idx) => {
    const oPts = [];
    for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        oPts.push(new THREE.Vector3(Math.cos(a) * def.distance, 0.5, Math.sin(a) * def.distance));
    }
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(oPts), orbitMat));

    const tex = makePlanetTexture(512, def.tex);
    const planet = new THREE.Mesh(
        new THREE.SphereGeometry(def.size, 64, 64),
        new THREE.MeshStandardMaterial({ map: tex, metalness: 0.1, roughness: 0.8, emissive: new THREE.Color(def.color), emissiveIntensity: 0.04 })
    );
    planet.castShadow = true;
    planet.receiveShadow = true;
    const initAngle = anglesPlanets[idx];
    planet.position.set(Math.cos(initAngle) * def.distance, 0.5, Math.sin(initAngle) * def.distance);
    planet.userData = { name: def.name, color: def.color, distance: def.distance, speed: def.speed, angle: initAngle, getTexto: def.getTexto, texto: def.getTexto() };
    scene.add(planet);
    planetFigures.push(planet);

    planet.add(new THREE.Mesh(
        new THREE.SphereGeometry(def.size * 1.12, 32, 32),
        new THREE.MeshStandardMaterial({ color: def.atmoColor, emissive: def.atmoColor, emissiveIntensity: 0.2, transparent: true, opacity: 0.15, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending })
    ));

    if (def.rings) {
        const rMesh = new THREE.Mesh(
            new THREE.TorusGeometry(def.size * 1.7, def.size * 0.4, 2, 120),
            new THREE.MeshStandardMaterial({ color: 0xffcc77, emissive: 0x553300, emissiveIntensity: 0.3, metalness: 0.4, roughness: 0.7, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
        );
        rMesh.rotation.x = Math.PI / 2;
        planet.add(rMesh);
    }

    if (def.moon) {
        const moonTex = makePlanetTexture(128, { baseColor: [0.55, 0.55, 0.55], darkColor: [0.2, 0.2, 0.22], noiseScale: 5, hasContinents: true });
        const moon = new THREE.Mesh(
            new THREE.SphereGeometry(def.moon.size, 16, 16),
            new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.95, metalness: 0.05 })
        );
        moon.userData = { dist: def.moon.dist, speed: def.moon.speed, angle: Math.random() * Math.PI * 2 };
        planet.add(moon);
        planet.userData.moon = moon;
    }
});

// =============================================
// NAVES
// =============================================
export const ships = [];
const _wingMat    = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.95, roughness: 0.1 });
const _exhaustMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, emissive: 0x221100, emissiveIntensity: 0.3 });
const _wingGeo    = new THREE.BoxGeometry(0.08, 0.015, 0.04);

function createShip(color = 0x88aaff) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.13, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.12, metalness: 0.85, roughness: 0.15 })
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const lWing = new THREE.Mesh(_wingGeo, _wingMat); lWing.position.set(-0.065, 0, 0.01);
    const rWing = new THREE.Mesh(_wingGeo, _wingMat); rWing.position.set( 0.065, 0, 0.01);
    group.add(lWing, rWing);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.055, 6), _exhaustMat);
    exhaust.position.z = -0.06;
    group.add(exhaust);
    return group;
}

for (let i = 0; i < 12; i++) {
    const ship = createShip(new THREE.Color().setHSL(i / 12, 0.7, 0.6).getHex());
    ship.userData = {
        orbitRadius: 1.6 + Math.random() * 0.8,
        orbitSpeed: -(0.3 + Math.random() * 0.4),
        angle: (i / 12) * Math.PI * 2,
        yAmp: 0.1 + Math.random() * 0.15,
        yFreq: 0.5 + Math.random() * 1.0,
    };
    scene.add(ship);
    ships.push(ship);
}
