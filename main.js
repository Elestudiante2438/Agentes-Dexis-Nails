import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =============================================
// 0. SIN BLOQUEOS — main.js arranca directo
// =============================================
console.log('✅ main.js iniciado');

// =============================================
// 1. CONFIGURACIÓN GLOBAL
// =============================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.003);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = true;
controls.zoomSpeed = 0.8;
controls.enablePan = true;
controls.panSpeed = 0.5;
controls.maxPolarAngle = Math.PI * 0.72;
controls.target.set(0, 0.5, 0);

const sceneRadius = 7.5;
function setTopView() {
    camera.position.set(
        window.innerWidth < 768 ? 3 : 4,
        window.innerWidth < 768 ? 5 : 6,
        window.innerWidth < 768 ? 7 : 8
    );
    controls.target.set(0, 0.5, 0);
    controls.update();
    const minDistance = sceneRadius / Math.tan((camera.fov * Math.PI) / 360);
    controls.minDistance = minDistance * 0.9;
    controls.maxDistance = 35;
}
setTopView();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    setTopView();
});

let isPageVisible = true;
document.addEventListener('visibilitychange', () => { isPageVisible = !document.hidden; });

// =============================================
// 2. LUCES
// =============================================
scene.add(new THREE.AmbientLight(0x111122, 1.0));

const mainLight = new THREE.DirectionalLight(0xfff5e0, 1.8);
mainLight.position.set(3, 5, 2);
mainLight.castShadow = true;
mainLight.shadow.mapSize.set(1024, 1024);
scene.add(mainLight);

const fillLight = new THREE.PointLight(0x4466ff, 1.2, 20);
fillLight.position.set(-3, 2, 2);
scene.add(fillLight);

const rimLight = new THREE.PointLight(0xff8833, 1.0, 15);
rimLight.position.set(-1, 1, -3);
scene.add(rimLight);

const topLight = new THREE.PointLight(0xffffff, 0.5, 12);
topLight.position.set(0, 6, 0);
scene.add(topLight);

scene.add(new THREE.HemisphereLight(0x0a0a2a, 0x000000, 0.6));

// =============================================
// 3. CENTRO — NÚCLEO EN CAPAS + DODECAEDRO + ANILLOS
// =============================================
const bubbleGeo = new THREE.SphereGeometry(5.5, 64, 64);
const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: 0x000000,
    metalness: 0.85, roughness: 0.1,
    transparent: true, opacity: 0.08,
    side: THREE.DoubleSide, depthWrite: false,
});
const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
bubble.position.set(0, 0.5, 0);
scene.add(bubble);

const coreMat = new THREE.MeshStandardMaterial({
    color: 0x44cc88, emissive: 0x22aa55, emissiveIntensity: 1.2,
    metalness: 1.0, roughness: 0.0,
});
const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 64, 64), coreMat);
core.position.set(0, 0.5, 0);
core.castShadow = true;
scene.add(core);

const glowMat = new THREE.MeshStandardMaterial({
    color: 0x88ffcc, emissive: 0x44ddaa, emissiveIntensity: 0.4,
    metalness: 0.6, roughness: 0.3,
    transparent: true, opacity: 0.3, depthWrite: false,
});
const glowShell = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), glowMat);
glowShell.position.copy(core.position);
scene.add(glowShell);

const dodecaGeo = new THREE.DodecahedronGeometry(1.05, 0);
const dodecaMat = new THREE.MeshStandardMaterial({
    color: 0x88aaff, emissive: 0x112244, emissiveIntensity: 0.6,
    metalness: 0.9, roughness: 0.2, transparent: true, opacity: 0.55,
});
const dodecahedron = new THREE.Mesh(dodecaGeo, dodecaMat);
dodecahedron.position.copy(core.position);
dodecahedron.castShadow = true;
scene.add(dodecahedron);

const edgesMat = new THREE.LineBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.9 });
dodecahedron.add(new THREE.LineSegments(new THREE.EdgesGeometry(dodecaGeo), edgesMat));

const vertexSphereGeo = new THREE.SphereGeometry(0.05, 16, 16);
const vertexMat = new THREE.MeshStandardMaterial({
    color: 0xffaa88, emissive: 0x884422, emissiveIntensity: 0.8, metalness: 0.9,
});
const vertexMap = new Map();
const posAttr = dodecaGeo.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i), y = posAttr.getY(i), z = posAttr.getZ(i);
    const key = `${Math.round(x*1000)},${Math.round(y*1000)},${Math.round(z*1000)}`;
    if (!vertexMap.has(key)) vertexMap.set(key, new THREE.Vector3(x, y, z));
}
Array.from(vertexMap.values()).forEach(v => {
    const p = new THREE.Mesh(vertexSphereGeo, vertexMat);
    p.position.copy(v);
    dodecahedron.add(p);
});

function makeRing(radius, tube, color, emissive, rotX, rotZ) {
    const mat = new THREE.MeshStandardMaterial({
        color, emissive, emissiveIntensity: 0.8,
        metalness: 0.95, roughness: 0.05,
        transparent: true, opacity: 0.9,
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 64, 200), mat);
    mesh.rotation.x = rotX;
    mesh.rotation.z = rotZ;
    dodecahedron.add(mesh);
    return { mesh, mat };
}
const ring1 = makeRing(1.45, 0.022, 0xaa44ff, 0x6622bb, Math.PI / 2, 0);
const ring2 = makeRing(1.58, 0.016, 0xff8844, 0xcc4411, Math.PI / 3, Math.PI / 3);
const ring3 = makeRing(1.68, 0.012, 0x44ddff, 0x1188aa, Math.PI / 5, Math.PI * 0.7);

// =============================================
// 4. PARTÍCULAS
// =============================================
const particleCount = 2500;
const pPos = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    const r = 1.8 + Math.random() * 1.2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    pPos[i*3+2] = r * Math.cos(phi);
}
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particleMat = new THREE.PointsMaterial({
    color: 0x88aaff, size: 0.022, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
});
dodecahedron.add(new THREE.Points(particleGeo, particleMat));

// =============================================
// 5. ESTRELLAS DE FONDO
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
const starsBg = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(starsBg);

// =============================================
// 6. PLANETAS
// =============================================
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

const planetas = [
    { name: 'Tejedora', color: 0xFFD700, size: 0.45, distance: 3.0, speed: 0.005, rings: true, moon: { size: 0.09, dist: 0.75, speed: 0.03 }, atmoColor: 0xffdd66, tex: { baseColor:[1,0.75,0], darkColor:[0.5,0.3,0], noiseScale:5, cloudy:true, cloudColor:[1,0.95,0.7], hasContinents:false } },
    { name: 'Kai', color: 0x3399FF, size: 0.42, distance: 3.0, speed: 0.005, rings: false, moon: null, atmoColor: 0x5599ff, tex: { baseColor:[0.1,0.35,0.85], darkColor:[0.02,0.1,0.45], noiseScale:4, poles:true, cloudy:true, hasContinents:true } },
    { name: 'Quántor', color: 0x33CC66, size: 0.44, distance: 3.0, speed: 0.005, rings: false, moon: { size: 0.07, dist: 0.7, speed: 0.025 }, atmoColor: 0x44ee88, tex: { baseColor:[0.1,0.7,0.3], darkColor:[0.02,0.25,0.08], noiseScale:3.5, hasContinents:true } },
    { name: 'Memoria', color: 0xFF3333, size: 0.40, distance: 3.0, speed: 0.005, rings: false, moon: null, atmoColor: 0xff5533, tex: { baseColor:[0.85,0.15,0.1], darkColor:[0.3,0.02,0.02], noiseScale:4, lava:true, hasContinents:false } },
    { name: 'Valorador', color: 0xFF8800, size: 0.46, distance: 3.0, speed: 0.005, rings: false, moon: { size: 0.08, dist: 0.8, speed: 0.02 }, atmoColor: 0xff9944, tex: { baseColor:[0.95,0.45,0], darkColor:[0.4,0.15,0], noiseScale:6, cloudy:true, cloudColor:[1,0.8,0.5], hasContinents:false } },
    { name: 'Faro', color: 0xDDEEFF, size: 0.38, distance: 3.0, speed: 0.005, rings: false, moon: null, atmoColor: 0xaaccff, tex: { baseColor:[0.75,0.85,1], darkColor:[0.3,0.4,0.6], noiseScale:3, poles:true, poleColor:[1,1,1], cloudy:true, cloudColor:[0.95,0.98,1], hasContinents:true } },
];

const anglesPlanets = [0, 60, 120, 180, 240, 300].map(d => d * Math.PI / 180);
const planetFigures = [];
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
    planet.userData = { name: def.name, color: def.color, distance: def.distance, speed: def.speed, angle: initAngle };
    scene.add(planet);
    planetFigures.push(planet);

    const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(def.size * 1.12, 32, 32),
        new THREE.MeshStandardMaterial({ color: def.atmoColor, emissive: def.atmoColor, emissiveIntensity: 0.2, transparent: true, opacity: 0.15, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    planet.add(atmo);

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
// 7. NAVES
// =============================================
const ships = [];
const _wingMat   = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.95, roughness: 0.1 });
const _exhaustMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, emissive: 0x221100, emissiveIntensity: 0.3 });
const _wingGeo   = new THREE.BoxGeometry(0.08, 0.015, 0.04);

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

// =============================================
// 8. VOZ Y DEXIS (sin agentes separados)
// =============================================
let isSpeaking     = false;
let listeningActive = false;
let recognition    = null;
let currentRingSpeed = 0.03;
const normalRingSpeed = 0.03;
let lastAgentColor = null;
let permanentColor = null;

const _edgeColor = new THREE.Color();

function setNucleusColor(hex) {
    _edgeColor.setHex(hex);
    coreMat.color.copy(_edgeColor);
    coreMat.emissive.copy(_edgeColor).multiplyScalar(0.6);
    dodecaMat.color.copy(_edgeColor);
    particleMat.color.copy(_edgeColor);
    vertexMat.color.copy(_edgeColor);
}

function setListeningMode() {
    bubbleMat.emissive.setHex(0x3399FF); bubbleMat.emissiveIntensity = 0.8; bubbleMat.color.setHex(0x3399FF);
    ring1.mat.emissiveIntensity = 1.2; ring2.mat.emissiveIntensity = 1.2; ring3.mat.emissiveIntensity = 1.0;
    currentRingSpeed = normalRingSpeed;
}
function setSpeakingMode() {
    bubbleMat.emissive.setHex(0xFFAA44); bubbleMat.emissiveIntensity = 1.0; bubbleMat.color.setHex(0xFFAA44);
    ring1.mat.emissiveIntensity = 1.6; ring2.mat.emissiveIntensity = 1.6; ring3.mat.emissiveIntensity = 1.4;
    currentRingSpeed = normalRingSpeed * 1.8;
    setTimeout(() => { if (listeningActive) setListeningMode(); else setSilenceMode(); }, 1200);
}
function setSilenceMode() {
    bubbleMat.emissive.setHex(0x000000); bubbleMat.emissiveIntensity = 0.0; bubbleMat.color.setHex(0x000000);
    ring1.mat.emissiveIntensity = 0.7; ring2.mat.emissiveIntensity = 0.7; ring3.mat.emissiveIntensity = 0.7;
    currentRingSpeed = normalRingSpeed;
}

async function getDexiResponse(userText) {
    const lower = userText.toLowerCase();

    // Respuestas directas sin pasar por DeepSeek
    if (lower.includes('dexis'))
        return { respuesta: "Soy Dexis, tu asistente. ¿En qué te ayudo?", agenteNombre: 'Dexis' };
    if (lower.includes('ayuda'))
        return { respuesta: "Claro. Puedes reservar servicios de manicura, pedicura, podología, uñas de gel, faciales, o consultar por colonias árabes. ¿Qué necesitas?", agenteNombre: 'Dexis' };

    // Verificar que agents.js cargó
    if (!window.Dexis || typeof window.Dexis.responder !== 'function') {
        console.warn('[Dexis] agents.js no está cargado todavía');
        return {
            respuesta: "Estoy iniciando. Espera un momento e intenta de nuevo.",
            agenteNombre: 'Dexis'
        };
    }

    // Colorear el núcleo según el agente visual
    const agenteNombre = window.decidirAgente?.(userText, '') ?? 'Tejedora';
    const newColor = agentColorsMap[agenteNombre] ?? 0xFFFFFF;
    if (lastAgentColor !== newColor) {
        lastAgentColor = newColor;
        permanentColor = newColor;
        setNucleusColor(newColor);
    }

    // Llamar a Dexis — agents.js ya maneja todos los errores internamente
    try {
        const respuesta = await window.Dexis.responder(userText);
        return { respuesta, agenteNombre };
    } catch (err) {
        console.error('[Dexis] Error inesperado en getDexiResponse:', err.message);
        return { respuesta: 'Hubo un error inesperado. ¿Puedes intentarlo de nuevo?', agenteNombre: 'Dexis' };
    }
}

async function processUserText(text) {
    if (!text.trim()) return;
    window.addToMemory?.('user', text);
    const { respuesta, agenteNombre } = await getDexiResponse(text);
    window.addToMemory?.('dexi', respuesta);
    speakResponse(respuesta);

    const statusEl = document.getElementById('statusMsg');
    if (statusEl) {
        statusEl.innerHTML = `🤖 Dexis: ${respuesta.substring(0, 80)}${respuesta.length > 80 ? '…' : ''}`;
        setTimeout(() => {
            if (listeningActive) statusEl.innerHTML = '🎤 Escuchando…';
            else statusEl.innerHTML = '⚪ Sistema listo';
        }, 5000);
    }

    window.guardarConversacion?.(text, respuesta, 'Dexis');
}

function speakResponse(text) {
    if (!text || isSpeaking) return;
    isSpeaking = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-CO'; u.rate = 0.9;
    u.onend = u.onerror = () => { isSpeaking = false; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
}

async function startListening() {
    if (listeningActive) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '❌ Este navegador no soporta reconocimiento de voz';
        return;
    }

    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '🎤 Activa el micrófono en tu navegador para continuar';
        console.warn('[Dexis] Permiso de micrófono denegado:', err.message);
        return;
    }

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'es-CO';

    recognition.onstart = () => {
        listeningActive = true;
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '🎤 Escuchando…';
        setListeningMode();
    };

    recognition.onend = () => {
        if (listeningActive && typeof isPressing !== 'undefined' && isPressing) {
            try { recognition.start(); } catch(e) { }
        } else if (listeningActive) {
            stopListening();
        }
    };

    recognition.onerror = (event) => {
        console.warn('[Dexis] Error de reconocimiento:', event.error);
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        stopListening();
    };

    recognition.onresult = (event) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++)
            if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
        if (finalText) {
            setSpeakingMode();
            processUserText(finalText.trim());
            setTimeout(() => { if (listeningActive) setListeningMode(); else setSilenceMode(); }, 1000);
        }
    };

    try {
        recognition.start();
    } catch(e) {
        console.warn('[Dexis] No se pudo iniciar recognition:', e.message);
    }
}

function stopListening() {
    try { recognition?.stop(); } catch(e) { }
    recognition = null;
    listeningActive = false;
    const statusEl = document.getElementById('statusMsg');
    if (statusEl) statusEl.innerHTML = '⚪ Sistema listo';
    setSilenceMode();
}

window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'e') { e.preventDefault(); startListening(); }
    else if (k === 'm') { e.preventDefault(); stopListening(); }
    else if (k === 'r') { e.preventDefault(); setTopView(); }
});

// =============================================
// 9. ANIMACIÓN
// =============================================
let time = 0;
let particleHue = 0;
let ringDirection = 1;
let ringSwitchTimer = 0;

function animate() {
    requestAnimationFrame(animate);
    if (!isPageVisible) return;

    time += 0.016;

    const beat = Math.sin(time * 5) * 0.5 + Math.sin(time * 2.3) * 0.3;
    core.scale.setScalar(1 + beat * 0.05);
    glowShell.scale.setScalar(1 + beat * 0.09);
    dodecahedron.scale.setScalar(1 + beat * 0.025);

    dodecahedron.position.set(
        core.position.x + Math.sin(time * 0.7) * 0.015,
        core.position.y + Math.sin(time * 0.5) * 0.01,
        core.position.z + Math.sin(time * 0.9) * 0.02
    );
    core.rotation.y = time * 0.3;
    dodecahedron.rotation.y = time * 0.2;
    dodecahedron.rotation.x = Math.sin(time * 0.3) * 0.04;

    bubble.rotation.y -= 0.0008;
    bubble.rotation.x += 0.0003;

    ringSwitchTimer += 0.016;
    if (ringSwitchTimer > 5) { ringDirection *= -1; ringSwitchTimer = 0; }
    const rs = currentRingSpeed * ringDirection;
    ring1.mesh.rotation.z += rs;
    ring1.mesh.rotation.x = Math.PI / 2 + Math.sin(time * 2.1) * 0.22;
    ring2.mesh.rotation.z += rs * 0.85;
    ring2.mesh.rotation.x += Math.sin(time * 0.7) * 0.025;
    ring2.mesh.rotation.y += Math.cos(time * 0.9) * 0.018;
    ring2.mesh.scale.setScalar(1 + Math.sin(time * 1.3) * 0.08);
    ring3.mesh.rotation.z -= rs * 0.65;
    ring3.mesh.rotation.y += Math.sin(time * 1.1) * 0.02;
    ring3.mesh.scale.setScalar(1 + Math.cos(time * 0.9) * 0.06);

    ships.forEach(ship => {
        const d = ship.userData;
        d.angle += d.orbitSpeed * 0.008;
        ship.position.set(
            dodecahedron.position.x + Math.cos(d.angle) * d.orbitRadius,
            dodecahedron.position.y + Math.sin(d.angle * d.yFreq) * d.yAmp,
            dodecahedron.position.z + Math.sin(d.angle) * d.orbitRadius
        );
        ship.rotation.y = d.angle;
        ship.rotation.x = Math.sin(d.angle * 2) * 0.18;
    });

    planetFigures.forEach(planet => {
        const d = planet.userData;
        d.angle += d.speed;
        planet.position.set(
            Math.cos(d.angle) * d.distance,
            0.5 + Math.sin(d.angle * 2) * 0.06,
            Math.sin(d.angle) * d.distance
        );
        planet.rotation.y += 0.004;
        if (d.moon) {
            const md = d.moon.userData;
            md.angle += md.speed;
            d.moon.position.set(
                Math.cos(md.angle) * md.dist,
                Math.sin(md.angle * 0.5) * 0.15,
                Math.sin(md.angle) * md.dist
            );
        }
    });

    if (!listeningActive && !isSpeaking && !permanentColor) {
        particleHue = (particleHue + 0.004) % 1;
        particleMat.color.setHSL(particleHue, 1, 0.6);
    }

    if (permanentColor) {
        const t = 0.3 + Math.sin(time * 6) * 0.4;
        _edgeColor.setHex(permanentColor);
        edgesMat.color.setRGB(_edgeColor.r * t, _edgeColor.g * t, _edgeColor.b * t);
    }

    starsBg.material.opacity = 0.4 + Math.sin(time * 2.5) * 0.28;

    controls.update();
    renderer.render(scene, camera);
}

animate();

console.log('✨ Dexis — Universo 3D mejorado ✨');

// =============================================
// BOTONES TÁCTILES PARA MÓVIL (Push-to-Talk)
// =============================================
const btnListen = document.getElementById('btn-listen');
const btnStop = document.getElementById('btn-stop');
const btnReset = document.getElementById('btn-reset');

let pressTimer = null;
let isPressing = false;

if (btnListen) {
    btnListen.addEventListener('mousedown', startPressToTalk);
    btnListen.addEventListener('touchstart', startPressToTalk);
    window.addEventListener('mouseup', stopPressToTalk);
    window.addEventListener('touchend', stopPressToTalk);
}

function startPressToTalk(e) {
    e.preventDefault();
    if (isPressing) return;
    isPressing = true;
    btnListen.style.background = '#6c5ce7';
    btnListen.style.transform = 'scale(0.96)';
    startListening();
    pressTimer = setTimeout(() => { if (isPressing) stopPressToTalk(); }, 10000);
}

function stopPressToTalk() {
    if (!isPressing) return;
    isPressing = false;
    if (btnListen) {
        btnListen.style.background = '';
        btnListen.style.transform = '';
    }
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    stopListening();
}

if (btnStop) {
    btnStop.addEventListener('click', () => { stopPressToTalk(); stopListening(); });
}
if (btnReset) {
    btnReset.addEventListener('click', () => { setTopView(); });
}

console.log('✅ Botones push-to-talk activados');