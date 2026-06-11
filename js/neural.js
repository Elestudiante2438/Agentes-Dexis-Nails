import * as THREE from 'three';
import { scene } from './scene.js';
import { bubble } from './nucleus.js';

// =============================================
// MALLA NEURAL JARVIS — capa exterior
// =============================================
const NEURAL_NODE_COUNT   = window.innerWidth < 768 ? 80 : 130;
const NEURAL_RADIUS       = 4.2;
const NEURAL_CONNECT_DIST = 2.2;

export const nodePositions = [];
const nodeMaterials = [];
// Distancia de cada nodo al origen (calculada una sola vez)
const nodeDistances = [];

export const neuralGroup = new THREE.Group();
neuralGroup.position.copy(bubble.position);
scene.add(neuralGroup);

// ── Colores base y de onda ────────────────────────────────────────────────────
const COLOR_BASE   = new THREE.Color(0x0088cc);
const COLOR_WAVE_A = new THREE.Color(0xffd700); // dorado
const COLOR_WAVE_B = new THREE.Color(0xcc44ff); // violeta
const COLOR_WAVE_C = new THREE.Color(0x00ffcc); // cian
const BASE_LINE_COLOR = new THREE.Color(0x0088cc);

// FIX: tamaño de nodo más visible — desktop también sube a 0.07
const nodeGeo = new THREE.SphereGeometry(window.innerWidth < 768 ? 0.10 : 0.07, 8, 8);

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
    // FIX: distancia calculada en local (origen = centro del grupo = centro de escena)
    nodeDistances.push(pos.length());

    const mat = new THREE.MeshStandardMaterial({
        color:             COLOR_BASE.clone(),
        emissive:          COLOR_BASE.clone(),
        emissiveIntensity: 2.2,
        metalness:  0.0,
        roughness:  0.2,
        transparent: true,
        opacity:     0.9,
        depthWrite:  false,
    });
    nodeMaterials.push(mat);

    const node = new THREE.Mesh(nodeGeo, mat);
    node.position.copy(pos);
    neuralGroup.add(node);
}

// ── Aristas con vertexColors ──────────────────────────────────────────────────
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
    opacity:      0.40,
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

// ── Sistema de ondas múltiples ────────────────────────────────────────────────
// FIX: WAVE_MAX_R ajustado a NEURAL_RADIUS para que las ondas crucen visiblemente la malla
const WAVE_MAX_R  = NEURAL_RADIUS * 1.3;  // ~5.46 — las ondas pasan por todos los nodos
const WAVE_SPEED  = 0.05;                 // más rápido = más visible
const WAVE_WIDTH  = 1.4;                  // ancho del frente de onda

const waves = [
    { radius: 0,                  color: COLOR_WAVE_A },
    { radius: WAVE_MAX_R / 3,     color: COLOR_WAVE_B },
    { radius: WAVE_MAX_R * 2 / 3, color: COLOR_WAVE_C },
];

// Colores temporales reutilizables
const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
const _cA = new THREE.Color();
const _cB = new THREE.Color();

function waveIntensity(dist, waveRadius) {
    const delta = Math.abs(dist - waveRadius);
    if (delta > WAVE_WIDTH) return 0;
    return Math.pow(Math.sin((1 - delta / WAVE_WIDTH) * Math.PI * 0.5), 1.2);
}

export let neuralIntensity = 1.0;
export function setNeuralIntensity(v) { neuralIntensity = v; }
export function setNodeHSL(h, s, l) { /* gestionado por ondas */ }

// ── updateNeuralWave — llamar en el loop de animación ────────────────────────
export function updateNeuralWave(time) {
    // Avanzar radios de onda
    for (let w = 0; w < waves.length; w++) {
        waves[w].radius += WAVE_SPEED;
        if (waves[w].radius > WAVE_MAX_R) waves[w].radius = 0;
    }

    // ── Nodos ─────────────────────────────────────────────────────────────────
    for (let idx = 0; idx < NEURAL_NODE_COUNT; idx++) {
        const dist = nodeDistances[idx]; // FIX: distancia local precalculada
        let totalIntensity = 0;

        // FIX: siempre partir del color BASE, no acumular del frame anterior
        _c1.copy(COLOR_BASE);

        for (let w = 0; w < waves.length; w++) {
            const inten = waveIntensity(dist, waves[w].radius) * neuralIntensity;
            if (inten > 0.01) {
                // FIX: lerp fuerte (0.95) para que el color de onda sea claramente visible
                _c1.lerp(waves[w].color, inten * 0.95);
                totalIntensity = Math.max(totalIntensity, inten);
            }
        }

        const mat = nodeMaterials[idx];
        mat.color.copy(_c1);
        mat.emissive.copy(_c1);
        // FIX: emissiveIntensity base más alta + boost de onda
        mat.emissiveIntensity = (2.2 + totalIntensity * 3.5) * neuralIntensity;

        // FIX: pulsado individual más pronunciado
        const breathe   = 1 + Math.sin(time * 1.5 + idx * 0.41) * 0.08;
        const waveScale = 1 + totalIntensity * 0.65;
        const sc = breathe * waveScale;
        neuralGroup.children[idx].scale.set(sc, sc, sc);
    }

    // ── Líneas ────────────────────────────────────────────────────────────────
    const colorAttr = edgeGeo.attributes.color;
    for (let e = 0; e < edgePairs.length; e++) {
        const [iA, iB] = edgePairs[e];
        const dA = nodeDistances[iA];
        const dB = nodeDistances[iB];

        _cA.copy(BASE_LINE_COLOR);
        _cB.copy(BASE_LINE_COLOR);

        for (let w = 0; w < waves.length; w++) {
            const ia = waveIntensity(dA, waves[w].radius) * neuralIntensity;
            const ib = waveIntensity(dB, waves[w].radius) * neuralIntensity;
            if (ia > 0.01) _cA.lerp(waves[w].color, ia * 0.92);
            if (ib > 0.01) _cB.lerp(waves[w].color, ib * 0.92);
        }

        colorAttr.setXYZ(e*2,   _cA.r, _cA.g, _cA.b);
        colorAttr.setXYZ(e*2+1, _cB.r, _cB.g, _cB.b);
    }
    colorAttr.needsUpdate = true;

    // Opacidad dinámica de líneas
    const avgR = (waves[0].radius + waves[1].radius + waves[2].radius) / (3 * WAVE_MAX_R);
    neuralLineMat.opacity = (0.35 + avgR * 0.25) * Math.min(neuralIntensity, 1.4);
}
