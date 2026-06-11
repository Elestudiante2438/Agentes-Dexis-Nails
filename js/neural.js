import * as THREE from 'three';
import { scene } from './scene.js';
import { bubble } from './nucleus.js';

// =============================================
// MALLA NEURAL JARVIS — capa exterior azul
// =============================================
const NEURAL_NODE_COUNT   = window.innerWidth < 768 ? 80 : 130;
const NEURAL_RADIUS       = 5.85;
const NEURAL_CONNECT_DIST = 2.8;

export const nodePositions = [];

// Material individual por nodo — necesario para color independiente en ondas
const nodeMaterials = [];

export const neuralGroup = new THREE.Group();
neuralGroup.position.copy(bubble.position);
scene.add(neuralGroup);

// Colores base y de onda
const COLOR_BASE   = new THREE.Color(0x00aaff);
const COLOR_WAVE_A = new THREE.Color(0xffd700); // dorado
const COLOR_WAVE_B = new THREE.Color(0xcc44ff); // violeta
const COLOR_WAVE_C = new THREE.Color(0x00ffcc); // cian

const nodeGeo = new THREE.SphereGeometry(window.innerWidth < 768 ? 0.055 : 0.045, 8, 8);

for (let i = 0; i < NEURAL_NODE_COUNT; i++) {
    const phi      = Math.acos(1 - 2 * (i + 0.5) / NEURAL_NODE_COUNT);
    const theta    = Math.PI * (1 + Math.sqrt(5)) * i;
    const rJitter  = NEURAL_RADIUS + (Math.random() - 0.5) * 0.4;
    const pos = new THREE.Vector3(
        rJitter * Math.sin(phi) * Math.cos(theta),
        rJitter * Math.sin(phi) * Math.sin(theta),
        rJitter * Math.cos(phi)
    );
    nodePositions.push(pos);

    const mat = new THREE.MeshStandardMaterial({
        color:            COLOR_BASE.clone(),
        emissive:         new THREE.Color(0x0066ff),
        emissiveIntensity: 1.8,
        metalness:  0.0,
        roughness:  0.3,
        transparent: true,
        opacity:     0.85,
        depthWrite:  false,
    });
    nodeMaterials.push(mat);

    const node = new THREE.Mesh(nodeGeo, mat);
    node.position.copy(pos);
    neuralGroup.add(node);
}

// ─── Aristas con vertexColors ─────────────────────────────────────────────────
const edgePoints = [];
export const edgePairs = [];
for (let i = 0; i < NEURAL_NODE_COUNT; i++) {
    for (let j = i + 1; j < NEURAL_NODE_COUNT; j++) {
        const dist = nodePositions[i].distanceTo(nodePositions[j]);
        if (dist < NEURAL_CONNECT_DIST) {
            edgePoints.push(nodePositions[i], nodePositions[j]);
            edgePairs.push([i, j, dist]);
        }
    }
}

const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);

// Buffer de colores por vértice
const edgeColorArray = new Float32Array(edgePoints.length * 3);
const BASE_LINE_COLOR = new THREE.Color(0x00ccff);
for (let k = 0; k < edgePoints.length; k++) {
    edgeColorArray[k * 3]     = BASE_LINE_COLOR.r;
    edgeColorArray[k * 3 + 1] = BASE_LINE_COLOR.g;
    edgeColorArray[k * 3 + 2] = BASE_LINE_COLOR.b;
}
edgeGeo.setAttribute('color', new THREE.BufferAttribute(edgeColorArray, 3));

export const neuralLineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      0.32,
    blending:     THREE.AdditiveBlending,
    depthWrite:   false,
});
export const neuralLines = new THREE.LineSegments(edgeGeo, neuralLineMat);
neuralGroup.add(neuralLines);

// ─── Pulsos (herencia del sistema original) ───────────────────────────────────
export const pulseStates = edgePairs.map(() => ({
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 2.5,
    amp:   0.5 + Math.random() * 0.5,
}));

// ─── Sistema de ondas múltiples ───────────────────────────────────────────────
const WAVE_ORIGIN = new THREE.Vector3(0, 0.5, 0);
const WAVE_MAX_R  = 12;
const WAVE_SPEED  = 0.045;
const WAVE_WIDTH  = 1.8;

const waves = [
    { radius: 0,                color: COLOR_WAVE_A },
    { radius: WAVE_MAX_R / 3,   color: COLOR_WAVE_B },
    { radius: WAVE_MAX_R * 2/3, color: COLOR_WAVE_C },
];

// Colores temporales reutilizables (evitar GC en cada frame)
const _nodeColor      = new THREE.Color();
const _lerpColor      = new THREE.Color();
const _edgeColorA     = new THREE.Color();
const _edgeColorB     = new THREE.Color();
const _hslBase        = new THREE.Color();

// Intensidad de onda con easing sinusoidal suave
function waveIntensity(dist, waveRadius) {
    const delta = Math.abs(dist - waveRadius);
    if (delta > WAVE_WIDTH) return 0;
    return Math.pow(Math.sin((1 - delta / WAVE_WIDTH) * Math.PI * 0.5), 1.5);
}

export let neuralIntensity = 1.0;
export function setNeuralIntensity(v) { neuralIntensity = v; }

// ─── setNodeHSL — usado por main.js en modo idle (sin voz activa) ─────────────
// Aplica un color HSL a todos los nodos como base (reemplaza nodeMat.color.setHSL)
export function setNodeHSL(h, s, l) {
    _hslBase.setHSL(h, s, l);
    // Solo aplica si las ondas no están dominando (intensidad baja)
    // Se mezcla suavemente para no luchar contra updateNeuralWave
    nodeMaterials.forEach(mat => {
        mat.color.lerp(_hslBase, 0.04); // lerp lento: HSL cycling no pisará las ondas
        mat.emissive.lerp(_hslBase, 0.03);
    });
}

// ─── updateNeuralWave — llamar en el loop de animación ───────────────────────
export function updateNeuralWave(time) {
    // Avanzar radios
    waves.forEach(w => {
        w.radius += WAVE_SPEED;
        if (w.radius > WAVE_MAX_R) w.radius = 0;
    });

    // ── Nodos ──────────────────────────────────────────────────────────────────
    nodePositions.forEach((pos, idx) => {
        const dist = pos.distanceTo(WAVE_ORIGIN);
        let totalIntensity = 0;
        _nodeColor.copy(nodeMaterials[idx].color); // partir del color actual (puede ser HSL ciclado)

        waves.forEach(w => {
            const inten = waveIntensity(dist, w.radius) * neuralIntensity;
            if (inten > 0) {
                _lerpColor.copy(_nodeColor).lerp(w.color, inten * 0.85);
                _nodeColor.copy(_lerpColor);
                totalIntensity = Math.max(totalIntensity, inten);
            }
        });

        const mat = nodeMaterials[idx];
        mat.color.copy(_nodeColor);
        mat.emissive.copy(_nodeColor);
        mat.emissiveIntensity = (1.8 + totalIntensity * 2.5) * neuralIntensity;

        // Escala: respiración base + pulso de onda
        const breathe   = 1 + Math.sin(time * 1.2 + idx * 0.3) * 0.04;
        const waveScale = 1 + totalIntensity * 1.4;
        const s = breathe * waveScale;
        neuralGroup.children[idx].scale.set(s, s, s);
    });

    // ── Líneas (vertexColors por arista) ──────────────────────────────────────
    const colorAttr = edgeGeo.attributes.color;

    edgePairs.forEach(([iA, iB], edgeIdx) => {
        const distA = nodePositions[iA].distanceTo(WAVE_ORIGIN);
        const distB = nodePositions[iB].distanceTo(WAVE_ORIGIN);

        _edgeColorA.set(BASE_LINE_COLOR);
        _edgeColorB.set(BASE_LINE_COLOR);

        waves.forEach(w => {
            const ia = waveIntensity(distA, w.radius) * neuralIntensity;
            const ib = waveIntensity(distB, w.radius) * neuralIntensity;
            if (ia > 0) _edgeColorA.lerp(w.color, ia * 0.9);
            if (ib > 0) _edgeColorB.lerp(w.color, ib * 0.9);
        });

        colorAttr.setXYZ(edgeIdx * 2,     _edgeColorA.r, _edgeColorA.g, _edgeColorA.b);
        colorAttr.setXYZ(edgeIdx * 2 + 1, _edgeColorB.r, _edgeColorB.g, _edgeColorB.b);
    });

    colorAttr.needsUpdate = true;

    // Opacidad dinámica de líneas
    const avgR = waves.reduce((s, w) => s + Math.min(w.radius / WAVE_MAX_R, 1), 0) / waves.length;
    neuralLineMat.opacity = (0.28 + avgR * 0.18) * neuralIntensity;
}
