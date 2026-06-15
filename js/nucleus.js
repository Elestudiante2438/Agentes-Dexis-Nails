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

export function initAudioAnalyser(sourceNode, context) {
    try {
        audioCtx  = context;
        analyser  = audioCtx.createAnalyser();
        analyser.fftSize        = 256;
        analyser.smoothingTimeConstant = 0.75;
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

function readVoiceAmplitude() {
    if (!audioActive || !analyser || !freqData) return 0;
    analyser.getByteFrequencyData(freqData);
    const binStart = 3;
    const binEnd   = Math.min(30, freqData.length - 1);
    let sum = 0;
    for (let b = binStart; b <= binEnd; b++) sum += freqData[b];
    const avg = sum / (binEnd - binStart + 1);
    return Math.max(0, (avg - 20) / 200);
}

// =============================================
// SISTEMA DE PARTÍCULAS MORFOLÓGICAS
// =============================================
const PARTICLE_COUNT = 2200;  // más densidad para detalles finos
const CENTER = new THREE.Vector3(0, 0.5, 0);

const COLOR_BRAIN  = { h: 0.72, s: 1.0, l: 0.62 };
const COLOR_MOUTH  = { h: 0.12, s: 1.0, l: 0.60 };
const COLOR_EAR    = { h: 0.47, s: 0.9, l: 0.55 };
const COLOR_ACCENT = { h: 0.08, s: 1.0, l: 0.70 };

// ──────────────────────────────────────────────────────────
// 1. CEREBRO — elipsoide con surcos y cisura interhemisférica
// ──────────────────────────────────────────────────────────
function brainPoint(i, total) {
    const phi   = Math.acos(1 - 2 * (i + 0.5) / total);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    let x = 1.0 * Math.sin(phi) * Math.cos(theta);
    let y = 0.85 * Math.sin(phi) * Math.sin(theta);
    let z = 0.75 * Math.cos(phi);

    const topRegion = Math.max(0, y);
    const midX      = Math.abs(x);
    const fissure   = Math.exp(-midX * 7) * topRegion * 0.2;
    y -= fissure;

    const gyri =
        Math.sin(x * 8.5 + y * 4.5) * 0.05 +
        Math.sin(y * 6.5 + z * 5.5) * 0.04 +
        Math.sin(z * 10.2 + x * 3.8) * 0.03;

    const frontal   = Math.exp(-Math.pow(z - 0.6, 2) * 5) * 0.1;
    const occipital = Math.exp(-Math.pow(z + 0.7, 2) * 6) * 0.07;

    const r = 0.75 + gyri + frontal + occipital;
    return new THREE.Vector3(x * r, y * r, z * r);
}

// ──────────────────────────────────────────────────────────
// 2. BOCA — labios humanos reales con arco de Cupido y volumen
// ──────────────────────────────────────────────────────────
function mouthPoint(i, total, time = 0, amplitude = 0) {
    const t = i / total;
    const angle = t * Math.PI * 2;

    const rx = 0.68;
    const ry = 0.32;
    let x = Math.cos(angle) * rx;
    let y = Math.sin(angle) * ry;

    // Arco de Cupido (pico superior)
    if (y > 0 && Math.abs(x) < 0.35) {
        const cupid = 0.08 * (1 - Math.abs(x) / 0.35) * Math.sin(angle * 3);
        y += cupid;
    }

    // Labio inferior más carnoso
    if (y < 0) {
        const chin = 0.05 * (1 - Math.abs(x) / 0.6) * (1 + Math.sin(angle));
        y -= chin;
    }

    // Profundidad con volumen
    let z = (Math.random() - 0.5) * 0.12;
    const centerFactor = Math.cos(angle) * Math.cos(angle);
    z += centerFactor * 0.06;

    // Apertura animada (boca abierta)
    if (amplitude > 0) {
        const open = amplitude * 0.22;
        if (y > 0) y += open;
        if (y < 0) y -= open * 0.8;
        if (Math.abs(x) > 0.5) x += open * 0.2 * (x > 0 ? 1 : -1);
    }

    const vibrate = amplitude * 0.025 * Math.sin(angle * 12 + time * 30);
    x += vibrate;
    y += vibrate * 0.5;

    return new THREE.Vector3(x, y, z);
}

// ──────────────────────────────────────────────────────────
// 3. OÍDO — pabellón auricular real (hélice, concha, lóbulo)
// ──────────────────────────────────────────────────────────
function earPoint(i, total) {
    const t = i / total;
    const turns = 2.8;
    const angle = t * Math.PI * 2 * turns;
    let r = (1 - t) * 0.82;

    const helix = (1 - t) * 0.18 * Math.sin(angle * 1.5);
    r += helix;

    let x = Math.cos(angle) * r;
    let z = Math.sin(angle) * r * 0.65;
    let y = t * 0.35;

    if (t < 0.2) {
        const lobe = Math.sin(t * Math.PI) * 0.12;
        y -= lobe;
        z -= lobe * 0.5;
    }

    if (t > 0.35 && t < 0.7) {
        const conchaDepth = Math.sin((t - 0.35) / 0.35 * Math.PI) * 0.14;
        z -= conchaDepth;
        y += 0.02;
    }

    if (t > 0.25 && t < 0.55) {
        const antihelix = Math.sin((t - 0.25) / 0.3 * Math.PI) * 0.1;
        z += antihelix;
        x += antihelix * 0.3;
    }

    const jitter = (Math.random() - 0.5) * 0.02;
    x += jitter;
    y += jitter * 0.5;
    z += jitter * 0.5;

    return new THREE.Vector3(x, y, z);
}

// ── Buffers de posición para los 3 estados ─────────────────
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

// ── Geometría y material de partículas ──────────────────────
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
    pSizes[i] = 0.038 + Math.random() * 0.030;
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
    size: 0.055,
    map: makeGlowSprite(),
    vertexColors: true,
    transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    alphaTest: 0.005,
});

const particleSystem = new THREE.Points(particleGeo, particleMat);
particleSystem.scale.setScalar(1.4);
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
    color: 0x8052ff, emissive: 0x2a1a88, emissiveIntensity: 0.4,
    metalness: 0.95, roughness: 0.15,
    transparent: true, opacity: 0.06,
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

// ── Anillos orbitales ───────────────────────────────────────
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

    if (audioActive && currentState === 1) {
        const liveAmp = readVoiceAmplitude();
        targetMouthAmp = Math.max(targetMouthAmp * 0.3, liveAmp);
    }
    mouthAmplitude += (targetMouthAmp - mouthAmplitude) * 0.12;

    if (morphProgress < 1) {
        morphProgress = Math.min(1, morphProgress + MORPH_SPEED);
    }

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
    dodecaMat.emissiveIntensity = 0.5;
    dodecaMat.opacity = 0.06;
    dodecaMat.color.setHex(0x15846e);
    if (ring1?.mat) { ring1.mat.color.setHex(0x15846e); ring1.mat.emissiveIntensity = 1.4; }
    if (ring2?.mat) { ring2.mat.emissiveIntensity = 1.0; }
    if (ring3?.mat) { ring3.mat.color.setHex(0x20c4a4); ring3.mat.emissiveIntensity = 1.6; }
    ringState.speed = 0.025;
}

export function setSpeakingMode() {
    transitionTo(1);
    targetMouthAmp = 0.5;

    bubbleMat.emissive.setHex(0xffb829);
    bubbleMat.emissiveIntensity = 0.22;
    bubbleMat.opacity = 0.07;
    dodecaMat.emissive.setHex(0xcc7700);
    dodecaMat.emissiveIntensity = 0.7;
    dodecaMat.opacity = 0.07;
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

// ── GlowShell — nube orbital de partículas que pulsan con el beat ─────────────
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

export function setMouthAmplitude(amp) {
    targetMouthAmp = Math.max(0, Math.min(1, amp));
}

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