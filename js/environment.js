import * as THREE from 'three';
import { scene } from './scene.js';

// =============================================
// ESTRELLAS DE FONDO
// =============================================
const starCount = 2500;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPos[i*3]   = (Math.random() - 0.5) * 500;
    starPos[i*3+1] = (Math.random() - 0.5) * 250;
    starPos[i*3+2] = (Math.random() - 0.5) * 180 - 50;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
export const starsBg = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(starsBg);

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
