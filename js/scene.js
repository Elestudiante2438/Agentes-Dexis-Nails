import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =============================================
// SCENE - Renderer, cámara, controles, luces
// =============================================

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
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = false;
controls.enableZoom = true;
controls.zoomSpeed = 0.8;
controls.enablePan = true;
controls.panSpeed = 0.5;
controls.maxPolarAngle = Math.PI * 0.72;
controls.target.set(0, 0.5, 0);

export let isPageVisible = true;
document.addEventListener('visibilitychange', () => { isPageVisible = !document.hidden; });

// =============================================
// AJUSTE DE CÁMARA (responsivo)
// =============================================
export function setTopView() {
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        camera.position.set(0, 4, 32);
        controls.minDistance = 10;
        controls.maxDistance = 35;
    } else {
        camera.position.set(0, 5, 28);
        controls.minDistance = 8;
        controls.maxDistance = 35;
    }

    controls.target.set(0, 0.5, 0);
    controls.update();
}

// Inicializar cámara
setTopView();

// Ajustar al cambiar tamaño de ventana
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    setTopView();
});

// =============================================
// LUCES
// =============================================
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

console.log('✅ Scene module loaded');
