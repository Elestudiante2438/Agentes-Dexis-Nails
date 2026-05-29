import * as THREE from 'three';
import { scene } from './scene.js';
import { bubble } from './nucleus.js';

// =============================================
// MALLA NEURAL JARVIS — capa exterior azul
// =============================================
const NEURAL_NODE_COUNT  = window.innerWidth < 768 ? 80 : 130;
const NEURAL_RADIUS      = 5.85;
const NEURAL_CONNECT_DIST = 2.8;

export const nodePositions = [];
const nodeGeo = new THREE.SphereGeometry(window.innerWidth < 768 ? 0.055 : 0.045, 8, 8);
export const nodeMat = new THREE.MeshStandardMaterial({
    color: 0x00aaff, emissive: 0x0066ff, emissiveIntensity: 1.8,
    metalness: 0.0, roughness: 0.3,
    transparent: true, opacity: 0.85,
    depthWrite: false,
});

export const neuralGroup = new THREE.Group();
neuralGroup.position.copy(bubble.position);
scene.add(neuralGroup);

for (let i = 0; i < NEURAL_NODE_COUNT; i++) {
    const phi   = Math.acos(1 - 2 * (i + 0.5) / NEURAL_NODE_COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const rJitter = NEURAL_RADIUS + (Math.random() - 0.5) * 0.4;
    const pos = new THREE.Vector3(
        rJitter * Math.sin(phi) * Math.cos(theta),
        rJitter * Math.sin(phi) * Math.sin(theta),
        rJitter * Math.cos(phi)
    );
    nodePositions.push(pos);
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    node.position.copy(pos);
    neuralGroup.add(node);
}

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
export const neuralLineMat = new THREE.LineBasicMaterial({
    color: 0x00ccff,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
});
export const neuralLines = new THREE.LineSegments(edgeGeo, neuralLineMat);
neuralGroup.add(neuralLines);

export const pulseStates = edgePairs.map(() => ({
    phase: Math.random() * Math.PI * 2,
    speed: 0.8 + Math.random() * 2.5,
    amp:   0.5 + Math.random() * 0.5,
}));

export let neuralIntensity = 1.0;
export function setNeuralIntensity(v) { neuralIntensity = v; }
