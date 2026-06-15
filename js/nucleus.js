import * as THREE from 'three';
import { scene } from './scene.js';

// =============================================
// NÚCLEO — Cerebro de partículas + dodecaedro protector
// Paleta: Plum Voltage #8052ff | Amber Spark #ffb829 | Bone #fff | Lichen #15846e
// Estados: BRAIN (base) → MOUTH (habla) → EAR (escucha)
// Web Audio: AnalyserNode modula mouthAmplitude en tiempo real
// =============================================

// Burbuja exterior (mantiene exports que necesita neural.js)
const bubbleGeo = new THREE.SphereGeometry(5.5, 64, 64);
export const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: 0x000000,
    metalness: 0.85, roughness: 0.1,
    transparent: true, opacity: 0.03,
    side: THREE.DoubleSide, depthWrite: false,
});
export const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
bubble.position.set(0, 0.5, 0);
scene.add(bubble);

// =============================================
// WEB AUDIO — Análisis de amplitud en tiempo real
// =============================================
let audioCtx     = null;
let analyser     = null;
let freqData     = null;
let audioActive  = false;

// Inicializa el contexto de audio y conecta la fuente (stream de micrófono o síntesis)
export function initAudioAnalyser(sourceNode, context) {
    try {
        audioCtx  = context;
        analyser  = audioCtx.createAnalyser();
        analyser.fftSize        = 256;    // 128 bins de frecuencia
        analyser.smoothingTimeConstant = 0.75; // suavizado temporal
        freqData  = new Uint8Array(analyser.frequencyBinCount);
        sourceNode.connect(analyser);
        audioActive = true;
        console.log('[Nucleus] Web Audio analyser conectado');
    } catch (e) {
        console.warn('[Nucleus] Web Audio no disponible:', e.message);
        audioActive = false;
    }
}

export function disconnectAudioAnalyser() {
    if (analyser) {
        try { analyser.disconnect(); } catch(e) {}
    }
    audioActive = false;
    analyser    = null;
    freqData    = null;
}

// Lee la amplitud RMS de las frecuencias de voz (300–3000 Hz)
// Retorna 0..1 normalizado
function readVoiceAmplitude() {
    if (!audioActive || !analyser || !freqData) return 0;
    analyser.getByteFrequencyData(freqData);

    // Frecuencias de voz humana: bins ~3 a ~30 con fftSize=256, sampleRate~44100
    const binStart = 3;
    const binEnd   = Math.min(30, freqData.length - 1);
    let sum = 0;
    for (let b = binStart; b <= binEnd; b++) sum += freqData[b];
    const avg = sum / (binEnd - binStart + 1);

    // Normalizar 0..255 → 0..1, con umbral de ruido de fondo (~20/255)
    return Math.max(0, (avg - 20) / 200);
}

// =============================================
// SISTEMA DE PARTÍCULAS MORFOLÓGICAS
// =============================================
const PARTICLE_COUNT = 1800;
const CENTER = new THREE.Vector3(0, 0.5, 0);

// Colores base por modo
const COLOR_BRAIN  = { h: 0.72, s: 1.0, l: 0.62 }; // Plum Voltage
const COLOR_MOUTH  = { h: 0.12, s: 1.0, l: 0.60 }; // Amber Spark
const COLOR_EAR    = { h: 0.47, s: 0.9, l: 0.55 }; // Lichen teal
const COLOR_ACCENT = { h: 0.08, s: 1.0, l: 0.70 }; // warm highlight

// ── Generadores de forma ──────────────────────────────────────────────────────

// CEREBRO — elipsoide con surcos sinusoidales procedurales
function brainPoint(i, total) {
    const phi   = Math.acos(1 - 2 * (i + 0.5) / total);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    let x = 1.05 * Math.sin(phi) * Math.cos(theta);
    let y = 0.82 * Math.sin(phi) * Math.sin(theta);
    let z = 0.78 * Math.cos(phi);

    // Cisura interhemisférica
    const topRegion = Math.max(0, y);
    const midX      = Math.abs(x);
    const fissure   = Math.exp(-midX * 8) * topRegion * 0.28;
    y -= fissure;

    // Circunvoluciones procedurales
    const gyri =
        Math.sin(x * 9.3 + y * 5.1) * 0.045 +
        Math.sin(y * 7.7 + z * 6.2) * 0.038 +
        Math.sin(z * 11.1 + x * 4.3) * 0.030 +
        Math.sin(x * 14.2 - z * 8.8) * 0.022;

    const frontal   = Math.exp(-Math.pow(z - 0.6, 2) * 4) * 0.12;
    const occipital = Math.exp(-Math.pow(z + 0.7, 2) * 5) * 0.08;

    const r = 0.72 + gyri + frontal + occipital;
    return new THREE.Vector3(x * r / 1.05, y * r / 0.82, z * r / 0.78);
}

// BOCA — contorno labial animado con amplitud real de voz
function mouthPoint(i, total, time = 0, amplitude = 0) {
    const t = (i / total) * Math.PI * 2;

    const lipShape = Math.abs(Math.cos(t * 0.5));
    const rx = 0.65 * lipShape;
    const ry = 0.22 * lipShape;

    let x = Math.cos(t) * rx;
    let y = Math.sin(t) * ry;
    const z = (Math.random() - 0.5) * 0.04;

    // Abertura: modulada por amplitud real de voz
    const isLower = Math.sin(t) < 0;
    const opening = amplitude * 0.35 * Math.sin(time * 18) * (isLower ? -1 : 1);
    y += opening;

    // Vibración de labios proporcional a la intensidad
    const vibration = amplitude * 0.06 * Math.sin(t * 6 + time * 25);
    x += vibration;

    return new THREE.Vector3(x, y, z);
}

// OÍDO — espiral de concha con antihelix
function earPoint(i, total) {
    const t = (i / total);
    const spiralTurns = 3.2;
    const angle  = t * Math.PI * 2 * spiralTurns;
    const radius = (1 - t) * 0.68;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.55;

    const outerBulge = (1 - t) * Math.sin(angle * 0.5) * 0.22;
    const y = outerBulge + t * 0.08;

    const antihelix = t > 0.5
        ? Math.exp(-Math.pow(t - 0.7, 2) * 20) * 0.18
        : 0;

    return new THREE.Vector3(x, y + antihelix, z);
}

// ── Buffers de posición para los 3 estados ───────────────────────────────────
const posBrain = new Float32Array(PARTICLE_COUNT * 3);
const posMouth = new Float32Array(PARTICLE_COUNT * 3);
const posEar   = new Float32Array(PARTICLE_COUNT * 3);

for (let i = 0; i < PARTICLE_COUNT; i++) {
    const b = brainPoint(i, PARTICLE_COUNT);
    posBrain[i*3]   = b.x; posBrain[i*3+1] = b.y; posBrain[i*3+2] = b.z;

    const m = mouthPoint(i, PARTICLE_COUNT, 0, 0);
    posMouth[i*3]   = m.x; posMouth[i*3+1] = m.y; posMouth[i*3+2] = m.z;

    const e = earPoint(i, PARTICLE_COUNT);
    posEar[i*3]   = e.x; posEar[i*3+1] = e.y; posEar[i*3+2] = e.z;
}

// ── Geometría y material de partículas ───────────────────────────────────────
const particleGeo    = new THREE.BufferGeometry();
const currentPos     = new Float32Array(PARTICLE_COUNT * 3);
const particleColors = new Float32Array(PARTICLE_COUNT * 3);
const pSizes         = new Float32Array(PARTICLE_COUNT);

currentPos.set(posBrain);

const _initCol = new THREE.Color();
for (let i = 0; i < PARTICLE_COUNT; i++) {
    const t   = i / PARTICLE_COUNT;
    const hue = COLOR_BRAIN.h + (COLOR_ACCENT.h - COLOR_BRAIN.h) * t * 0.4;
    _initCol.setHSL(hue, 1.0, 0.60 + t * 0.12);
    particleColors[i*3]   = _initCol.r;
    particleColors[i*3+1] = _initCol.g;
    particleColors[i*3+2] = _initCol.b;
    pSizes[i] = 0.028 + Math.random() * 0.022;
}

particleGeo.setAttribute('position', new THREE.BufferAttribute(currentPos, 3));
particleGeo.setAttribute('color',    new THREE.BufferAttribute(particleColors, 3));

function makeGlowSprite() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.25,'rgba(220,200,255,0.9)');
    g.addColorStop(0.6, 'rgba(128,82,255,0.4)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}

export const particleMat = new THREE.PointsMaterial({
    size: 0.038,
    map: makeGlowSprite(),
    vertexColors: true,
    transparent: true, opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.005,
});

const particleSystem = new THREE.Points(particleGeo, particleMat);
particleSystem.position.copy(CENTER);

const brainGroup = new THREE.Group();
brainGroup.position.copy(CENTER);
brainGroup.add(particleSystem);
particleSystem.position.set(0, 0, 0);
scene.add(brainGroup);

// =============================================
// DODECAEDRO PROTECTOR
// =============================================
const dodecaGeo = new THREE.DodecahedronGeometry(1.45, 0);
export const dodecaMat = new THREE.MeshStandardMaterial({
    color: 0x8052ff, emissive: 0x2a1a88, emissiveIntensity: 0.5,
    metalness: 0.95, roughness: 0.15,
    transparent: true, opacity: 0.18,
    side: THREE.DoubleSide,
});
export const dodecahedron = new THREE.Mesh(dodecaGeo, dodecaMat);
dodecahedron.position.copy(CENTER);
scene.add(dodecahedron);

export const edgesMat = new THREE.LineBasicMaterial({
    color: 0xb48fff, transparent: true, opacity: 0.85,
});
dodecahedron.add(new THREE.LineSegments(new THREE.EdgesGeometry(dodecaGeo), edgesMat));

const vertexSphereGeo = new THREE.SphereGeometry(0.045, 12, 12);
export const vertexMat = new THREE.MeshStandardMaterial({
    color: 0xffb829, emissive: 0xff8800, emissiveIntensity: 1.2,
    metalness: 0.9,
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

// ── Anillos orbitales ─────────────────────────────────────────────────────────
function makeRing(radius, tube, color, emissive, rotX, rotZ) {
    const mat = new THREE.MeshStandardMaterial({
        color, emissive, emissiveIntensity: 0.9,
        metalness: 0.95, roughness: 0.05,
        transparent: true, opacity: 0.85,
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 64, 200), mat);
    mesh.rotation.x = rotX;
    mesh.rotation.z = rotZ;
    dodecahedron.add(mesh);
    return { mesh, mat };
}
export const ring1 = makeRing(1.90, 0.026, 0x8052ff, 0x5030cc, Math.PI / 2, 0);
export const ring2 = makeRing(2.10, 0.020, 0xffb829, 0xcc7700, Math.PI / 3, Math.PI / 3);
export const ring3 = makeRing(2.25, 0.016, 0x15846e, 0x0a4a3e, Math.PI / 5, Math.PI * 0.7);

export const ringState = { speed: 0.03 };

// =============================================
// ESTADO Y TRANSICIÓN MORFOLÓGICA
// =============================================
let currentState  = 0;
let morphProgress = 0;
let morphFrom     = 0;
let morphTo       = 0;
const MORPH_SPEED = 0.028;

let mouthTime      = 0;
let mouthAmplitude = 0;
let targetMouthAmp = 0;

const workPos = new Float32Array(PARTICLE_COUNT * 3);
const _col    = new THREE.Color();

function getStateBuffer(state) {
    if (state === 0) return posBrain;
    if (state === 1) return posMouth;
    return posEar;
}

function targetColor(state) {
    if (state === 0) return COLOR_BRAIN;
    if (state === 1) return COLOR_MOUTH;
    return COLOR_EAR;
}

export function updateMorphs(time) {
    mouthTime = time;

    // ── Web Audio: leer amplitud real si está activo, si no usar target manual ──
    if (audioActive && currentState === 1) {
        const liveAmp = readVoiceAmplitude();
        // Mezclar amplitud en vivo con suavizado (evita saltos bruscos)
        targetMouthAmp = Math.max(targetMouthAmp * 0.3, liveAmp);
    }
    mouthAmplitude += (targetMouthAmp - mouthAmplitude) * 0.12;

    // Avanzar transición
    if (morphProgress < 1) {
        morphProgress = Math.min(1, morphProgress + MORPH_SPEED);
    }

    // Ease in-out cúbico
    const t = morphProgress < 0.5
        ? 4 * morphProgress * morphProgress * morphProgress
        : 1 - Math.pow(-2 * morphProgress + 2, 3) / 2;

    const fromBuf = useSnapshot ? morphFromSnapshot : getStateBuffer(morphFrom);
    const toBuf   = getStateBuffer(morphTo);
    const cFrom   = targetColor(morphFrom);
    const cTo     = targetColor(morphTo);

    const pAttr     = particleGeo.attributes.position;
    const colorAttr = particleGeo.attributes.color;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;

        // Boca animada desde morphProgress > 0.3 — nace vibrando mientras migra
        let tx = toBuf[idx], ty = toBuf[idx+1], tz = toBuf[idx+2];
        if (morphTo === 1 && morphProgress > 0.3) {
            const ampScale = Math.min(1, (morphProgress - 0.3) / 0.4);
            const mp = mouthPoint(i, PARTICLE_COUNT, mouthTime, mouthAmplitude * ampScale);
            tx = mp.x; ty = mp.y; tz = mp.z;
        }

        workPos[idx]   = fromBuf[idx]   + (tx - fromBuf[idx])   * t;
        workPos[idx+1] = fromBuf[idx+1] + (ty - fromBuf[idx+1]) * t;
        workPos[idx+2] = fromBuf[idx+2] + (tz - fromBuf[idx+2]) * t;

        pAttr.setXYZ(i, workPos[idx], workPos[idx+1], workPos[idx+2]);

        const hueNoise = (Math.sin(i * 0.137 + time * 0.8) * 0.5 + 0.5) * 0.06;
        const hue = cFrom.h + (cTo.h - cFrom.h) * t + hueNoise;
        const sat = cFrom.s + (cTo.s - cFrom.s) * t;
        const lit = cFrom.l + (cTo.l - cFrom.l) * t + Math.sin(i * 0.41 + time * 2.1) * 0.06;

        _col.setHSL(hue % 1, sat, Math.min(0.85, Math.max(0.3, lit)));
        colorAttr.setXYZ(i, _col.r, _col.g, _col.b);
    }

    pAttr.needsUpdate     = true;
    colorAttr.needsUpdate = true;

    if (currentState === 0) {
        brainGroup.rotation.y += 0.0025;
        brainGroup.rotation.x += 0.0005;
    } else {
        brainGroup.rotation.y *= 0.96;
        brainGroup.rotation.x *= 0.96;
    }
}

// Buffer snapshot para transiciones encadenadas
const morphFromSnapshot = new Float32Array(PARTICLE_COUNT * 3);
let useSnapshot = false;

function transitionTo(state) {
    if (currentState === state && morphProgress >= 1) return;
    morphFromSnapshot.set(workPos);
    useSnapshot   = true;
    morphFrom     = currentState;
    morphTo       = state;
    morphProgress = 0;
    currentState  = state;
}

// =============================================
// MODOS DE VOZ (API pública para voice.js)
// =============================================
let listeningActiveGlobal = false;

export function setListeningMode() {
    transitionTo(2);
    targetMouthAmp = 0;
    disconnectAudioAnalyser();

    bubbleMat.emissive.setHex(0x15846e);
    bubbleMat.emissiveIntensity = 0.18;
    bubbleMat.opacity = 0.05;
    dodecaMat.emissive.setHex(0x15846e);
    dodecaMat.emissiveIntensity = 0.4;
    dodecaMat.color.setHex(0x15846e);
    if (ring1?.mat) { ring1.mat.color.setHex(0x15846e); ring1.mat.emissiveIntensity = 1.4; }
    if (ring2?.mat) { ring2.mat.emissiveIntensity = 1.0; }
    if (ring3?.mat) { ring3.mat.color.setHex(0x20c4a4); ring3.mat.emissiveIntensity = 1.6; }
    ringState.speed = 0.025;
}

export function setSpeakingMode() {
    transitionTo(1);
    targetMouthAmp = 0.5; // fallback si Web Audio no arranca

    bubbleMat.emissive.setHex(0xffb829);
    bubbleMat.emissiveIntensity = 0.22;
    bubbleMat.opacity = 0.07;
    dodecaMat.emissive.setHex(0xcc7700);
    dodecaMat.emissiveIntensity = 0.6;
    dodecaMat.color.setHex(0xffb829);
    if (ring1?.mat) { ring1.mat.color.setHex(0x8052ff); ring1.mat.emissiveIntensity = 2.0; }
    if (ring2?.mat) { ring2.mat.color.setHex(0xffb829); ring2.mat.emissiveIntensity = 2.2; }
    if (ring3?.mat) { ring3.mat.emissiveIntensity = 1.2; }
    ringState.speed = 0.055;
}

export function setSilenceMode() {
    transitionTo(0);
    targetMouthAmp = 0;
    disconnectAudioAnalyser();

    bubbleMat.emissive.setHex(0x000000);
    bubbleMat.emissiveIntensity = 0.0;
    bubbleMat.opacity = 0.03;
    dodecaMat.emissive.setHex(0x2a1a88);
    dodecaMat.emissiveIntensity = 0.5;
    dodecaMat.color.setHex(0x8052ff);
    if (ring1?.mat) { ring1.mat.color.setHex(0x8052ff); ring1.mat.emissiveIntensity = 0.8; }
    if (ring2?.mat) { ring2.mat.color.setHex(0xffb829); ring2.mat.emissiveIntensity = 0.7; }
    if (ring3?.mat) { ring3.mat.color.setHex(0x15846e); ring3.mat.emissiveIntensity = 0.7; }
    ringState.speed = 0.03;
}

export function setListeningActive(active) {
    listeningActiveGlobal = active;
}

// ── GlowShell — nube orbital de partículas que pulsan con el beat ────────────
const GLOW_COUNT = 320;
const glowPos    = new Float32Array(GLOW_COUNT * 3);
const glowBaseR  = new Float32Array(GLOW_COUNT);

for (let i = 0; i < GLOW_COUNT; i++) {
    const phi   = Math.acos(1 - 2 * (i + 0.5) / GLOW_COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r     = 0.92 + Math.random() * 0.22;
    glowBaseR[i]   = r;
    glowPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    glowPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    glowPos[i*3+2] = r * Math.cos(phi);
}

const glowGeo = new THREE.BufferGeometry();
glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPos.slice(), 3));

function makeGlowSpriteSoft() {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0,   'rgba(180,143,255,1)');
    g.addColorStop(0.5, 'rgba(128,82,255,0.35)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
}

const glowMat = new THREE.PointsMaterial({
    size: 0.055,
    map: makeGlowSpriteSoft(),
    color: new THREE.Color(0xb48fff),
    transparent: true, opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false, sizeAttenuation: true,
});

const glowPoints = new THREE.Points(glowGeo, glowMat);
brainGroup.add(glowPoints);

export const glowShell = {
    scale: {
        setScalar(s) {
            const attr = glowGeo.attributes.position;
            for (let i = 0; i < GLOW_COUNT; i++) {
                const phi   = Math.acos(1 - 2 * (i + 0.5) / GLOW_COUNT);
                const theta = Math.PI * (1 + Math.sqrt(5)) * i;
                const r     = glowBaseR[i] * s;
                attr.setXYZ(i,
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(phi)
                );
            }
            attr.needsUpdate = true;
        }
    }
};

// =============================================
// EXPORTS FINALES
// =============================================
export const core    = brainGroup;
export const coreMat = particleMat;

// Control manual de amplitud (fallback sin Web Audio)
export function setMouthAmplitude(amp) {
    targetMouthAmp = Math.max(0, Math.min(1, amp));
}

// Reset total al estado base
export function resetToIdle() {
    useSnapshot    = false;
    morphFrom      = 0;
    morphTo        = 0;
    morphProgress  = 1;
    currentState   = 0;
    mouthAmplitude = 0;
    targetMouthAmp = 0;
    disconnectAudioAnalyser();

    particleGeo.attributes.position.array.set(posBrain);
    particleGeo.attributes.position.needsUpdate = true;
    workPos.set(posBrain);
    brainGroup.rotation.set(0, 0, 0);

    dodecaMat.emissive.setHex(0x2a1a88);
    dodecaMat.emissiveIntensity = 0.5;
    dodecaMat.color.setHex(0x8052ff);
    if (ring1?.mat) { ring1.mat.color.setHex(0x8052ff); ring1.mat.emissiveIntensity = 0.8; }
    if (ring2?.mat) { ring2.mat.color.setHex(0xffb829); ring2.mat.emissiveIntensity = 0.7; }
    if (ring3?.mat) { ring3.mat.color.setHex(0x15846e); ring3.mat.emissiveIntensity = 0.7; }
    ringState.speed = 0.03;

    console.log('[Nucleus] resetToIdle — cerebro restaurado');
}

console.log('✅ Nucleus — cerebro de partículas + Web Audio analyser listo');