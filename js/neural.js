import * as THREE from 'three';
import { scene } from './scene.js';
import { bubble } from './nucleus.js';

// =============================================
// MALLA NEURAL JARVIS
// =============================================
const isMobile = window.innerWidth < 768;
const NEURAL_NODE_COUNT   = isMobile ? 80 : 130;
const NEURAL_RADIUS       = 4.2;
const NEURAL_CONNECT_DIST = 2.2;

export const nodePositions = [];
const nodeMaterials = [];
const nodeDistances = [];

export const neuralGroup = new THREE.Group();
neuralGroup.position.copy(bubble.position);
scene.add(neuralGroup);

// ── Colores ───────────────────────────────────────────────────────────────────
// FIX: base azul cian puro — las ondas lo van a colorear temporalmente
const COLOR_BASE   = new THREE.Color(0x00aaff);  // azul cian
const COLOR_WAVE_A = new THREE.Color(0xffd700);  // dorado
const COLOR_WAVE_B = new THREE.Color(0xaa44ff);  // violeta (menos saturado)
const COLOR_WAVE_C = new THREE.Color(0x00ffcc);  // cian esmeralda
const BASE_LINE_COLOR = new THREE.Color(0x0077bb);

// FIX: nodos más pequeños en mobile — 0.065 en mobile, 0.065 en desktop también
// El problema era 0.10 en mobile = demasiado grande con 80 nodos
const NODE_SIZE = isMobile ? 0.065 : 0.065;
const nodeGeo = new THREE.SphereGeometry(NODE_SIZE, 8, 8);

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

    const mat = new THREE.MeshStandardMaterial({
        color:             COLOR_BASE.clone(),
        emissive:          COLOR_BASE.clone(),
        emissiveIntensity: 2.0,
        metalness:  0.0,
        roughness:  0.2,
        transparent: true,
        opacity:     0.88,
        depthWrite:  false,
    });
    nodeMaterials.push(mat);

    const node = new THREE.Mesh(nodeGeo, mat);
    node.position.copy(pos);
    neuralGroup.add(node);
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

const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
const edgeColorArray = new Float32Array(edgePoints.length * 3);
for (let k = 0; k < edgePoints.length; k++) {
    edgeColorArray[k*3]   = BASE_LINE_COLOR.r;
    edgeColorArray[k*3+1] = BASE_LINE_COLOR.g;
    edgeColorArray[k*3+2] = BASE_LINE_COLOR.b;
}
edgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeColorArray, 3));

export const neuralLineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent:  true,
    // FIX: líneas más sutiles en mobile para que no se vea como red sólida
    opacity:      isMobile ? 0.22 : 0.35,
    blending:     THREE.AdditiveBlending,
    depthWrite:   false,
});
export const neuralLines = new THREE.LineSegments(edgeGeo, neuralLineMat);
neuralGroup.add(neuralLines);

export const pulseStates = edgePairs.map(() => ({
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 2.5,
    amp:   0.5 + Math.random() * 0.5,
}));

// ── Sistema de ondas ──────────────────────────────────────────────────────────
const WAVE_MAX_R = NEURAL_RADIUS * 1.25;  // ~5.25 — cruza toda la malla
const WAVE_SPEED = 0.04;
const WAVE_WIDTH = 1.2;

const waves = [
    { radius: 0,                  color: COLOR_WAVE_A },
    { radius: WAVE_MAX_R / 3,     color: COLOR_WAVE_B },
    { radius: WAVE_MAX_R * 2 / 3, color: COLOR_WAVE_C },
];

const _c1 = new THREE.Color();
const _cA = new THREE.Color();
const _cB = new THREE.Color();

function waveIntensity(dist, waveRadius) {
    const delta = Math.abs(dist - waveRadius);
    if (delta > WAVE_WIDTH) return 0;
    return Math.pow(Math.sin((1 - delta / WAVE_WIDTH) * Math.PI * 0.5), 1.4);
}

export let neuralIntensity = 1.0;
export function setNeuralIntensity(v) { neuralIntensity = v; }
export function setNodeHSL(h, s, l) { /* gestionado por ondas */ }

export function updateNeuralWave(time) {
    for (let w = 0; w < waves.length; w++) {
        waves[w].radius += WAVE_SPEED;
        if (waves[w].radius > WAVE_MAX_R) waves[w].radius = 0;
    }

    for (let idx = 0; idx < NEURAL_NODE_COUNT; idx++) {
        const dist = nodeDistances[idx];
        let totalIntensity = 0;

        // FIX: siempre partir de COLOR_BASE limpio — sin acumulación entre frames
        _c1.copy(COLOR_BASE);

        for (let w = 0; w < waves.length; w++) {
            const inten = waveIntensity(dist, waves[w].radius) * neuralIntensity;
            if (inten > 0.02) {
                // FIX: lerp al 80% máximo para que siempre se vea algo del color base
                _c1.lerp(waves[w].color, Math.min(inten * 0.88, 0.80));
                totalIntensity = Math.max(totalIntensity, inten);
            }
        }

        const mat = nodeMaterials[idx];
        mat.color.copy(_c1);
        mat.emissive.copy(_c1);
        mat.emissiveIntensity = (2.0 + totalIntensity * 2.8) * neuralIntensity;

        // Pulso individual: respiración base moderada + boost de onda
        const breathe   = 1 + Math.sin(time * 1.4 + idx * 0.41) * 0.06;
        const waveScale = 1 + totalIntensity * 0.45;
        const sc = breathe * waveScale;
        neuralGroup.children[idx].scale.set(sc, sc, sc);
    }

    // ── Líneas ────────────────────────────────────────────────────────────────
    const colorAttr = edgeGeo.attributes.color;
    for (let e = 0; e < edgePairs.length; e++) {
        const [iA, iB] = edgePairs[e];

        _cA.copy(BASE_LINE_COLOR);
        _cB.copy(BASE_LINE_COLOR);

        for (let w = 0; w < waves.length; w++) {
            const ia = waveIntensity(nodeDistances[iA], waves[w].radius) * neuralIntensity;
            const ib = waveIntensity(nodeDistances[iB], waves[w].radius) * neuralIntensity;
            if (ia > 0.02) _cA.lerp(waves[w].color, ia * 0.85);
            if (ib > 0.02) _cB.lerp(waves[w].color, ib * 0.85);
        }

        colorAttr.setXYZ(e*2,   _cA.r, _cA.g, _cA.b);
        colorAttr.setXYZ(e*2+1, _cB.r, _cB.g, _cB.b);
    }
    colorAttr.needsUpdate = true;

    const avgR = (waves[0].radius + waves[1].radius + waves[2].radius) / (3 * WAVE_MAX_R);
    // FIX: opacidad de líneas dinámica pero con techo bajo en mobile
    const baseOpacity = isMobile ? 0.18 : 0.30;
    const peakOpacity = isMobile ? 0.32 : 0.55;
    neuralLineMat.opacity = (baseOpacity + avgR * (peakOpacity - baseOpacity)) * Math.min(neuralIntensity, 1.3);
}
