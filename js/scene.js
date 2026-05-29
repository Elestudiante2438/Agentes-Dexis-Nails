// =============================================
// scene.js — Three.js, luces, núcleo, partículas, estrellas
// Secciones 1–5
// =============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---- 1. CONFIGURACIÓN GLOBAL ----

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.003);

export const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.05;
controls.autoRotate     = false;
controls.enableZoom     = true;
controls.zoomSpeed      = 0.8;
controls.enablePan      = true;
controls.panSpeed       = 0.5;
controls.maxPolarAngle  = Math.PI * 0.72;
controls.target.set(0, 0.5, 0);

const sceneRadius = 7.5;

export function setTopView() {
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

export let isPageVisible = true;
document.addEventListener('visibilitychange', () => { isPageVisible = !document.hidden; });

// ---- 2. LUCES ----

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

// ---- 3. NÚCLEO EN CAPAS + DODECAEDRO + ANILLOS ----

export const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: 0x000000,
    metalness: 0.85, roughness: 0.1,
    transparent: true, opacity: 0.08,
    side: THREE.DoubleSide, depthWrite: false,
});
const bubble = new THREE.Mesh(new THREE.SphereGeometry(5.5, 64, 64), bubbleMat);
bubble.position.set(0, 0.5, 0);
scene.add(bubble);

export const coreMat = new THREE.MeshStandardMaterial({
    color: 0x44cc88, emissive: 0x22aa55, emissiveIntensity: 1.2,
    metalness: 1.0, roughness: 0.0,
});
export const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 64, 64), coreMat);
core.position.set(0, 0.5, 0);
core.castShadow = true;
scene.add(core);

const glowMat = new THREE.MeshStandardMaterial({
    color: 0x88ffcc, emissive: 0x44ddaa, emissiveIntensity: 0.4,
    metalness: 0.6, roughness: 0.3,
    transparent: true, opacity: 0.3, depthWrite: false,
});
export const glowShell = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), glowMat);
glowShell.position.copy(core.position);
scene.add(glowShell);

const dodecaGeo = new THREE.DodecahedronGeometry(1.05, 0);
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
export const ring1 = makeRing(1.45, 0.022, 0xaa44ff, 0x6622bb, Math.PI / 2, 0);
export const ring2 = makeRing(1.58, 0.016, 0xff8844, 0xcc4411, Math.PI / 3, Math.PI / 3);
export const ring3 = makeRing(1.68, 0.012, 0x44ddff, 0x1188aa, Math.PI / 5, Math.PI * 0.7);

// ---- 4. PARTÍCULAS ----

const particleCount = 2500;
const pPos = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    const r     = 1.8 + Math.random() * 1.2;
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
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

// ---- 5. ESTRELLAS DE FONDO ----

const starCount = 2500;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPos[i*3]   = (Math.random() - 0.5) * 500;
    starPos[i*3+1] = (Math.random() - 0.5) * 250;
    starPos[i*3+2] = (Math.random() - 0.5) * 180 - 50;
}
const starGeo = new THREE.BufferGeometry();
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
export const starsBg = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7,
    blending: THREE.AdditiveBlending, depthWrite: false,
}));
scene.add(starsBg);

export { bubble };
