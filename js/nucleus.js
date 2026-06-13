import * as THREE from 'three';
import { scene } from './scene.js';

// =============================================
// NÚCLEO — burbuja + core + dodecaedro + anillos + partículas
// =============================================

// --- Burbuja exterior ---
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
// CORE CON MORPH TARGETS (boca + oído)
// =============================================

// Geometría base: esfera 64x64
const coreGeo = new THREE.SphereGeometry(0.80, 64, 64);

// --- Generador de morph target: boca ---
// Aplana una franja horizontal frontal creando una ranura
function buildMouthMorph(baseGeo) {
    const pos = baseGeo.attributes.position;
    const count = pos.count;
    const morphPos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        // Frente de la esfera (z > 0), franja vertical central (|y| < 0.25)
        const isFront = z > 0.3;
        const isStrip = Math.abs(y) < 0.25;

        if (isFront && isStrip) {
            // Aplana y hacia 0 (crea la ranura) y empuja z hacia afuera ligeramente
            const squish = 1.0 - (1.0 - Math.abs(y) / 0.25) * 0.55;
            morphPos[i * 3]     = x;
            morphPos[i * 3 + 1] = y * squish;
            morphPos[i * 3 + 2] = z * 1.12;
        } else {
            morphPos[i * 3]     = x;
            morphPos[i * 3 + 1] = y;
            morphPos[i * 3 + 2] = z;
        }
    }
    return new THREE.Float32BufferAttribute(morphPos, 3);
}

// --- Generador de morph target: oído ---
// Deforma el lado derecho creando una concavidad tipo concha
function buildEarMorph(baseGeo) {
    const pos = baseGeo.attributes.position;
    const count = pos.count;
    const morphPos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        // Lado derecho (x > 0.3), zona central (|y| < 0.45, |z| < 0.45)
        const isRight = x > 0.3;
        const isMid   = Math.abs(y) < 0.45 && Math.abs(z) < 0.45;

        if (isRight && isMid) {
            // Empuja x hacia adentro creando la concavidad de oreja
            const depth = (x - 0.3) / 0.7; // 0..1
            const concave = depth * 0.45;
            morphPos[i * 3]     = x - concave;
            morphPos[i * 3 + 1] = y;
            morphPos[i * 3 + 2] = z;
        } else {
            morphPos[i * 3]     = x;
            morphPos[i * 3 + 1] = y;
            morphPos[i * 3 + 2] = z;
        }
    }
    return new THREE.Float32BufferAttribute(morphPos, 3);
}

// Asignar morph targets al core
coreGeo.morphAttributes.position = [
    buildMouthMorph(coreGeo), // índice 0 → boca
    buildEarMorph(coreGeo),   // índice 1 → oído
];
coreGeo.morphTargetsRelative = false;

export const coreMat = new THREE.MeshStandardMaterial({
    color: 0x44cc88, emissive: 0x22aa55, emissiveIntensity: 1.2,
    metalness: 1.0, roughness: 0.0,
    morphTargets: true,
});

export const core = new THREE.Mesh(coreGeo, coreMat);
core.morphTargetInfluences[0] = 0; // boca apagada
core.morphTargetInfluences[1] = 0; // oído apagado
core.position.set(0, 0.5, 0);
core.castShadow = true;
scene.add(core);

// --- Glow shell (sin morph, solo visual) ---
const glowMat = new THREE.MeshStandardMaterial({
    color: 0x88ffcc, emissive: 0x44ddaa, emissiveIntensity: 0.4,
    metalness: 0.6, roughness: 0.3,
    transparent: true, opacity: 0.45, depthWrite: false,
});
export const glowShell = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 32), glowMat);
glowShell.position.copy(core.position);
scene.add(glowShell);

// --- Dodecaedro ---
const dodecaGeo = new THREE.DodecahedronGeometry(1.45, 0);
export const dodecaMat = new THREE.MeshStandardMaterial({
    color: 0x88aaff, emissive: 0x112244, emissiveIntensity: 0.6,
    metalness: 0.9, roughness: 0.2, transparent: true, opacity: 0.55,
});
export const dodecahedron = new THREE.Mesh(dodecaGeo, dodecaMat);
dodecahedron.position.copy(core.position);
dodecahedron.castShadow = true;
scene.add(dodecahedron);

export const edgesMat = new THREE.LineBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.9 });
dodecahedron.add(new THREE.LineSegments(new THREE.EdgesGeometry(dodecaGeo), edgesMat));

const vertexSphereGeo = new THREE.SphereGeometry(0.05, 16, 16);
export const vertexMat = new THREE.MeshStandardMaterial({
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

// --- Anillos ---
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
export const ring1 = makeRing(1.90, 0.028, 0xaa44ff, 0x6622bb, Math.PI / 2, 0);
export const ring2 = makeRing(2.10, 0.022, 0xff8844, 0xcc4411, Math.PI / 3, Math.PI / 3);
export const ring3 = makeRing(2.25, 0.018, 0x44ddff, 0x1188aa, Math.PI / 5, Math.PI * 0.7);

// --- Partículas del dodecaedro ---
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
export const particleMat = new THREE.PointsMaterial({
    color: 0x88aaff, size: 0.022, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
});
dodecahedron.add(new THREE.Points(particleGeo, particleMat));

// =============================================
// MORPH INTERPOLATION — transición suave entre estados
// =============================================
const morphCurrent = { mouth: 0, ear: 0 };
const morphTarget  = { mouth: 0, ear: 0 };
const MORPH_SPEED  = 0.04; // lerp por frame (~60fps → ~0.7s de transición)

export function updateMorphs() {
    let changed = false;

    if (Math.abs(morphCurrent.mouth - morphTarget.mouth) > 0.001) {
        morphCurrent.mouth += (morphTarget.mouth - morphCurrent.mouth) * MORPH_SPEED;
        changed = true;
    }
    if (Math.abs(morphCurrent.ear - morphTarget.ear) > 0.001) {
        morphCurrent.ear += (morphTarget.ear - morphCurrent.ear) * MORPH_SPEED;
        changed = true;
    }

    if (changed) {
        core.morphTargetInfluences[0] = morphCurrent.mouth;
        core.morphTargetInfluences[1] = morphCurrent.ear;
    }
}

// =============================================
// MODOS DE VOZ PARA NÚCLEO (usados por voice.js)
// =============================================
export const ringState = { speed: 0.03 };
let listeningActiveGlobal = false;

export function setListeningMode() {
    // Morph: oído activo, boca inactiva
    morphTarget.mouth = 0;
    morphTarget.ear   = 1;

    bubbleMat.emissive.setHex(0x1155AA);
    bubbleMat.emissiveIntensity = 0.25;
    bubbleMat.color.setHex(0x000000);
    bubbleMat.opacity = 0.06;
    if (ring1?.mat) ring1.mat.emissiveIntensity = 1.2;
    if (ring2?.mat) ring2.mat.emissiveIntensity = 1.2;
    if (ring3?.mat) ring3.mat.emissiveIntensity = 1.0;
    ringState.speed = 0.03;
}

export function setSpeakingMode() {
    // Morph: boca activa, oído inactivo
    morphTarget.mouth = 1;
    morphTarget.ear   = 0;

    bubbleMat.emissive.setHex(0x884400);
    bubbleMat.emissiveIntensity = 0.3;
    bubbleMat.color.setHex(0x000000);
    bubbleMat.opacity = 0.07;
    if (ring1?.mat) ring1.mat.emissiveIntensity = 1.6;
    if (ring2?.mat) ring2.mat.emissiveIntensity = 1.6;
    if (ring3?.mat) ring3.mat.emissiveIntensity = 1.4;
    ringState.speed = 0.03 * 1.8;
    setTimeout(() => {
        if (listeningActiveGlobal) setListeningMode();
        else setSilenceMode();
    }, 1200);
}

export function setSilenceMode() {
    // Morph: esfera pura, sin boca ni oído
    morphTarget.mouth = 0;
    morphTarget.ear   = 0;

    bubbleMat.emissive.setHex(0x000000);
    bubbleMat.emissiveIntensity = 0.0;
    bubbleMat.color.setHex(0x000000);
    bubbleMat.opacity = 0.03;
    if (ring1?.mat) ring1.mat.emissiveIntensity = 0.7;
    if (ring2?.mat) ring2.mat.emissiveIntensity = 0.7;
    if (ring3?.mat) ring3.mat.emissiveIntensity = 0.7;
    ringState.speed = 0.03;
}

export function setListeningActive(active) {
    listeningActiveGlobal = active;
}
