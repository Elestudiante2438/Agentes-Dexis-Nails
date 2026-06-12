import * as THREE from 'three';
import { scene } from './scene.js';
import { bubble } from './nucleus.js';

// =============================================
// MALLA NEURAL — color aurora multizonal
// =============================================
const isMobile = window.innerWidth < 768;
const NEURAL_NODE_COUNT   = isMobile ? 80 : 130;
const NEURAL_RADIUS       = 4.2;
const NEURAL_CONNECT_DIST = 2.2;

export const nodePositions = [];
const nodeMaterials = [];
const nodeDistances = [];
const nodeMeshes    = [];

// Datos por nodo para el sistema de color aurora
// hueOffset: fase HSL única de cada nodo basada en posición
const nodeHueOffset = [];

export const neuralGroup = new THREE.Group();
neuralGroup.position.copy(bubble.position);
scene.add(neuralGroup);

const NODE_SIZE = isMobile ? 0.082 : 0.065;
const nodeGeo   = new THREE.SphereGeometry(NODE_SIZE, 8, 8);

for (let i = 0; i < NEURAL_NODE_COUNT; i++) {
    const phi     = Math.acos(1 - 2 * (i + 0.5) / NEURAL_NODE_COUNT);
    const theta   = Math.PI * (1 + Math.sqrt(5)) * i;
    const rJitter = NEURAL_RADIUS + (Math.random() - 0.5) * 0.15;
    const pos = new THREE.Vector3(
        rJitter * Math.sin(phi) * Math.cos(theta),
        rJitter * Math.sin(phi) * Math.sin(theta),
        rJitter * Math.cos(phi)
    );
    nodePositions.push(pos);
    nodeDistances.push(pos.length());

    const nx = pos.x / NEURAL_RADIUS;
    const ny = pos.y / NEURAL_RADIUS;
    const nz = pos.z / NEURAL_RADIUS;
    const goldenBase = (i * 0.618033988749895) % 1.0;
    const spatialPerturb =
        Math.sin(nx * 2.3 + ny * 1.7) * 0.12 +
        Math.sin(ny * 3.1 + nz * 2.0) * 0.10 +
        Math.sin(nz * 1.9 + nx * 2.8) * 0.08;
    const hueBase = ((goldenBase + spatialPerturb) % 1.0 + 1.0) % 1.0;
    nodeHueOffset.push(hueBase);

    const mat = new THREE.MeshBasicMaterial({
        color:       new THREE.Color().setHSL(hueBase, 1.0, 0.60),
        transparent: true, opacity: 0.95, depthWrite: false,
        blending:    THREE.AdditiveBlending,
    });
    nodeMaterials.push(mat);

    const node = new THREE.Mesh(nodeGeo, mat);
    node.position.copy(pos);
    neuralGroup.add(node);
    nodeMeshes.push(node);
}

// ── Aristas ───────────────────────────────────────────────────────────────────
const edgePoints = [];
export const edgePairs = [];
for (let i = 0; i < NEURAL_NODE_COUNT; i++) {
    for (let j = i + 1; j < NEURAL_NODE_COUNT; j++) {
        if (nodePositions[i].distanceTo(nodePositions[j]) < NEURAL_CONNECT_DIST) {
            edgePoints.push(nodePositions[i], nodePositions[j]);
            edgePairs.push([i, j]);
        }
    }
}

export const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
const edgeColorArray = new Float32Array(edgePoints.length * 3);
const _initC = new THREE.Color();
for (let e = 0; e < edgePairs.length; e++) {
    const [iA, iB] = edgePairs[e];
    _initC.setHSL(nodeHueOffset[iA], 1.0, 0.45);
    edgeColorArray[e*2*3]     = _initC.r;
    edgeColorArray[e*2*3 + 1] = _initC.g;
    edgeColorArray[e*2*3 + 2] = _initC.b;
    _initC.setHSL(nodeHueOffset[iB], 1.0, 0.45);
    edgeColorArray[e*2*3 + 3] = _initC.r;
    edgeColorArray[e*2*3 + 4] = _initC.g;
    edgeColorArray[e*2*3 + 5] = _initC.b;
}
edgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeColorArray, 3));

export const neuralLineMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true,
    opacity:  isMobile ? 0.16 : 0.28,
    blending: THREE.AdditiveBlending, depthWrite: false,
});
export const neuralLines = new THREE.LineSegments(edgeGeo, neuralLineMat);
neuralGroup.add(neuralLines);

export const pulseStates = edgePairs.map(() => ({
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 2.5,
    amp:   0.5 + Math.random() * 0.5,
}));

// ── Sistema de color aurora ───────────────────────────────────────────────────
const AURORA_SPEED   = 0.040;
const AURORA_SAT     = 1.0;
const AURORA_LIGHT   = 0.50;
const LINE_LIGHT     = 0.42;

const WAVE_MAX_R  = NEURAL_RADIUS * 1.25;
const WAVE_SPEED  = 0.045;
const WAVE_WIDTH  = 1.5;
const waveRadii   = [0, WAVE_MAX_R / 3, WAVE_MAX_R * 2 / 3];

function waveIntensity(dist, waveRadius) {
    const delta = Math.abs(dist - waveRadius);
    if (delta > WAVE_WIDTH) return 0;
    return Math.pow(Math.sin((1 - delta / WAVE_WIDTH) * Math.PI * 0.5), 1.2);
}

function vNoise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy), uz = fz*fz*(3-2*fz);
    const h = (a,b,c) => { const n = Math.sin(a*127.1+b*311.7+c*74.3)*43758.5453; return n-Math.floor(n); };
    const v000=h(ix,iy,iz),  v100=h(ix+1,iy,iz),  v010=h(ix,iy+1,iz),  v110=h(ix+1,iy+1,iz);
    const v001=h(ix,iy,iz+1),v101=h(ix+1,iy,iz+1),v011=h(ix,iy+1,iz+1),v111=h(ix+1,iy+1,iz+1);
    const x0=v000+(v100-v000)*ux, x1=v010+(v110-v010)*ux;
    const x2=v001+(v101-v001)*ux, x3=v011+(v111-v011)*ux;
    const y0=x0+(x1-x0)*uy,       y1=x2+(x3-x2)*uy;
    return y0+(y1-y0)*uz;
}

const nodeBasePositions = nodePositions.map(p => p.clone());

const NOISE_DISP_AMP  = 0.18;
const NOISE_DISP_FREQ = 0.55;
const NOISE_TIME_FREQ = 0.28;

const Y_SHIFT_AMP = 0.12;

// 🔧 FIX: declarar la variable que faltaba
let neuralIntensity = 1.0;

export function setNeuralIntensity(v) { neuralIntensity = v; }
export function setNodeHSL(h, s, l)   { /* gestionado por aurora */ }

const _nc = new THREE.Color();
const _lc = new THREE.Color();

export function updateNeuralWave(time) {
    for (let w = 0; w < 3; w++) {
        waveRadii[w] += WAVE_SPEED;
        if (waveRadii[w] > WAVE_MAX_R) waveRadii[w] = 0;
    }

    const globalHueShift = (time * AURORA_SPEED) % 1.0;

    for (let idx = 0; idx < NEURAL_NODE_COUNT; idx++) {
        const base = nodeBasePositions[idx];

        const nx = base.x * NOISE_DISP_FREQ + time * NOISE_TIME_FREQ;
        const ny = base.y * NOISE_DISP_FREQ + time * NOISE_TIME_FREQ * 0.7;
        const nz = base.z * NOISE_DISP_FREQ + time * NOISE_TIME_FREQ * 0.9;
        const dispX = (vNoise(nx,        ny + 13.7, nz + 7.3)  - 0.5) * 2 * NOISE_DISP_AMP;
        const dispY = (vNoise(nx + 100,  ny + 5.1,  nz + 21.9) - 0.5) * 2 * NOISE_DISP_AMP;
        const dispZ = (vNoise(nx + 200,  ny + 31.4, nz + 3.7)  - 0.5) * 2 * NOISE_DISP_AMP;

        const worldX = base.x + dispX;
        const worldY = base.y + dispY;
        const worldZ = base.z + dispZ;

        nodeMeshes[idx].position.set(worldX, worldY, worldZ);

        const dist = Math.sqrt(worldX*worldX + worldY*worldY + worldZ*worldZ);

        const hue = (nodeHueOffset[idx] + globalHueShift) % 1.0;

        const yNorm     = Math.max(-1, Math.min(1, worldY / NEURAL_RADIUS));
        const yLightMod = yNorm * Y_SHIFT_AMP;

        let maxWave = 0;
        for (let w = 0; w < 3; w++) {
            const wi = waveIntensity(dist, waveRadii[w]);
            if (wi > maxWave) maxWave = wi;
        }

        const lightBoost = maxWave * 0.25 * neuralIntensity;
        const lightFinal = Math.min(AURORA_LIGHT + lightBoost + yLightMod, 0.72);
        _nc.setHSL(hue, AURORA_SAT, lightFinal);

        const mat = nodeMaterials[idx];
        mat.color.copy(_nc);

        const freqVariation  = 0.9 + nodeHueOffset[idx] * 1.4;
        const ampVariation   = 0.08 + nodeHueOffset[idx] * 0.10;
        const breathe   = 1 + Math.sin(time * freqVariation + idx * 0.41) * ampVariation;
        const waveScale = 1 + maxWave * 0.45;
        const sc = breathe * waveScale;
        nodeMeshes[idx].scale.set(sc, sc, sc);
    }

    const colorAttr = edgeGeo.attributes.color;
    for (let e = 0; e < edgePairs.length; e++) {
        const [iA, iB] = edgePairs[e];

        const hueA = (nodeHueOffset[iA] + globalHueShift) % 1.0;
        const hueB = (nodeHueOffset[iB] + globalHueShift) % 1.0;

        const posA = nodeMeshes[iA].position;
        const posB = nodeMeshes[iB].position;
        const yModA = Math.max(-1, Math.min(1, posA.y / NEURAL_RADIUS)) * Y_SHIFT_AMP * 0.7;
        const yModB = Math.max(-1, Math.min(1, posB.y / NEURAL_RADIUS)) * Y_SHIFT_AMP * 0.7;

        let wA = 0, wB = 0;
        const dA = posA.length(), dB = posB.length();
        for (let w = 0; w < 3; w++) {
            wA = Math.max(wA, waveIntensity(dA, waveRadii[w]));
            wB = Math.max(wB, waveIntensity(dB, waveRadii[w]));
        }

        _lc.setHSL(hueA, AURORA_SAT, Math.min(LINE_LIGHT + wA * 0.2 + yModA, 0.65));
        colorAttr.setXYZ(e*2,   _lc.r, _lc.g, _lc.b);
        _lc.setHSL(hueB, AURORA_SAT, Math.min(LINE_LIGHT + wB * 0.2 + yModB, 0.65));
        colorAttr.setXYZ(e*2+1, _lc.r, _lc.g, _lc.b);
    }
    colorAttr.needsUpdate = true;

    const avgR   = (waveRadii[0] + waveRadii[1] + waveRadii[2]) / (3 * WAVE_MAX_R);
    const baseOp = isMobile ? 0.14 : 0.22;
    const peakOp = isMobile ? 0.28 : 0.42;
    neuralLineMat.opacity = baseOp + avgR * (peakOp - baseOp);
}