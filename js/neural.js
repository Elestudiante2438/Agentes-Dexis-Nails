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

const NODE_SIZE = isMobile ? 0.065 : 0.065;
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

    // ── Fase de color basada en posición esférica del nodo ──────────────────
    // Combinamos phi, theta y un valor de ruido seudo-aleatorio por posición
    // para que nodos cercanos tengan colores similares (efecto aurora/zona)
    // pero el conjunto cubra todo el espectro HSL
    const nx = pos.x / NEURAL_RADIUS;
    const ny = pos.y / NEURAL_RADIUS;
    const nz = pos.z / NEURAL_RADIUS;
    // Función de ruido suave basada en posición — produce 0..1
    // Usamos combinación de senos para variación espacial continua
    const spatialNoise =
        (Math.sin(nx * 3.7 + ny * 2.1) * 0.5 + 0.5) * 0.4 +
        (Math.sin(ny * 4.3 + nz * 1.8) * 0.5 + 0.5) * 0.35 +
        (Math.sin(nz * 2.9 + nx * 3.2) * 0.5 + 0.5) * 0.25;
    // spatialNoise ∈ [0, 1] — mapea a hue [0, 1] cubriendo todo el espectro
    nodeHueOffset.push(spatialNoise % 1.0);

    const mat = new THREE.MeshBasicMaterial({
        color:       new THREE.Color().setHSL(spatialNoise % 1.0, 1.0, 0.60),
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

const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
const edgeColorArray = new Float32Array(edgePoints.length * 3);
// Inicializar con el color de posición de cada extremo
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
    opacity:  isMobile ? 0.16 : 0.38,
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
// Cada nodo tiene su hueOffset base (posición espacial).
// En cada frame, el hue actual = hueOffset + tiempo * velocidad de rotación
// → todos los colores avanzan juntos, manteniendo las zonas de color
//   pero mutando el espectro completo (aurora efecto)
//
// Además hay una onda de "brillo" que recorre la esfera para marcar pulsos
const AURORA_SPEED   = 0.018;   // velocidad de rotación del espectro HSL
const AURORA_SAT     = 1.0;     // saturación plena
const AURORA_LIGHT   = 0.50;    // luminosidad base — más bajo = color más vivo
const LINE_LIGHT     = 0.42;    // líneas más oscuras que nodos

// Onda de brillo (pulso radial — ahora solo afecta brightness, no color)
const WAVE_MAX_R  = NEURAL_RADIUS * 1.25;
const WAVE_SPEED  = 0.045;
const WAVE_WIDTH  = 1.5;
const waveRadii   = [0, WAVE_MAX_R / 3, WAVE_MAX_R * 2 / 3];

function waveIntensity(dist, waveRadius) {
    const delta = Math.abs(dist - waveRadius);
    if (delta > WAVE_WIDTH) return 0;
    return Math.pow(Math.sin((1 - delta / WAVE_WIDTH) * Math.PI * 0.5), 1.2);
}

export let neuralIntensity = 1.0;
export function setNeuralIntensity(v) { neuralIntensity = v; }
export function setNodeHSL(h, s, l)   { /* gestionado por aurora */ }

const _nc = new THREE.Color();
const _lc = new THREE.Color();

export function updateNeuralWave(time) {
    // Avanzar ondas de brillo
    for (let w = 0; w < 3; w++) {
        waveRadii[w] += WAVE_SPEED;
        if (waveRadii[w] > WAVE_MAX_R) waveRadii[w] = 0;
    }

    // Hue global que avanza con el tiempo — desplaza todo el espectro
    const globalHueShift = (time * AURORA_SPEED) % 1.0;

    // ── Nodos ─────────────────────────────────────────────────────────────────
    for (let idx = 0; idx < NEURAL_NODE_COUNT; idx++) {
        const dist = nodeDistances[idx];

        // Hue del nodo = su offset espacial + desplazamiento temporal global
        const hue = (nodeHueOffset[idx] + globalHueShift) % 1.0;

        // Intensidad de onda de brillo en este nodo
        let maxWave = 0;
        for (let w = 0; w < 3; w++) {
            const wi = waveIntensity(dist, waveRadii[w]);
            if (wi > maxWave) maxWave = wi;
        }

        // Luminosidad: base + boost de onda + boost de neuralIntensity
        const lightBoost = maxWave * 0.25 * neuralIntensity;
        const light = Math.min(AURORA_LIGHT + lightBoost, 0.82);

        // FIX: BasicMaterial — solo color, no emissive
        // Luminosidad más baja base para que el color se vea vivo, no quemado
        const lightFinal = Math.min(AURORA_LIGHT + lightBoost, 0.72);
        _nc.setHSL(hue, AURORA_SAT, lightFinal);

        const mat = nodeMaterials[idx];
        mat.color.copy(_nc);

        // FIX: frecuencia y amplitud únicas por nodo — pulsado verdaderamente individual
        // nodeHueOffset se reutiliza como seed de variación (ya es único por posición)
        const freqVariation  = 0.9 + nodeHueOffset[idx] * 1.4;   // 0.9 – 2.3 Hz
        const ampVariation   = 0.08 + nodeHueOffset[idx] * 0.10; // 8% – 18% amplitud
        const breathe   = 1 + Math.sin(time * freqVariation + idx * 0.41) * ampVariation;
        const waveScale = 1 + maxWave * 0.45;
        const sc = breathe * waveScale;
        nodeMeshes[idx].scale.set(sc, sc, sc);
    }

    // ── Líneas aurora ─────────────────────────────────────────────────────────
    const colorAttr = edgeGeo.attributes.color;
    for (let e = 0; e < edgePairs.length; e++) {
        const [iA, iB] = edgePairs[e];

        const hueA = (nodeHueOffset[iA] + globalHueShift) % 1.0;
        const hueB = (nodeHueOffset[iB] + globalHueShift) % 1.0;

        // Boost de brillo en líneas según onda
        let wA = 0, wB = 0;
        for (let w = 0; w < 3; w++) {
            wA = Math.max(wA, waveIntensity(nodeDistances[iA], waveRadii[w]));
            wB = Math.max(wB, waveIntensity(nodeDistances[iB], waveRadii[w]));
        }

        _lc.setHSL(hueA, AURORA_SAT, Math.min(LINE_LIGHT + wA * 0.2, 0.65));
        colorAttr.setXYZ(e*2,   _lc.r, _lc.g, _lc.b);
        _lc.setHSL(hueB, AURORA_SAT, Math.min(LINE_LIGHT + wB * 0.2, 0.65));
        colorAttr.setXYZ(e*2+1, _lc.r, _lc.g, _lc.b);
    }
    colorAttr.needsUpdate = true;

    // Opacidad dinámica de líneas
    const avgR   = (waveRadii[0] + waveRadii[1] + waveRadii[2]) / (3 * WAVE_MAX_R);
    const baseOp = isMobile ? 0.14 : 0.32;
    const peakOp = isMobile ? 0.28 : 0.55;
    neuralLineMat.opacity = baseOp + avgR * (peakOp - baseOp);
}
