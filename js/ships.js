// =============================================
// ships.js — Naves espaciales
// Sección 7
// =============================================

import * as THREE from 'three';
import { scene } from './scene.js';

// Materiales compartidos entre todas las naves
const _wingMat    = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.95, roughness: 0.1 });
const _exhaustMat = new THREE.MeshStandardMaterial({ color: 0xaa8866, emissive: 0x221100, emissiveIntensity: 0.3 });
const _wingGeo    = new THREE.BoxGeometry(0.08, 0.015, 0.04);

function createShip(color = 0x88aaff) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.13, 8),
        new THREE.MeshStandardMaterial({
            color, emissive: color, emissiveIntensity: 0.12,
            metalness: 0.85, roughness: 0.15
        })
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const lWing = new THREE.Mesh(_wingGeo, _wingMat); lWing.position.set(-0.065, 0, 0.01);
    const rWing = new THREE.Mesh(_wingGeo, _wingMat); rWing.position.set( 0.065, 0, 0.01);
    group.add(lWing, rWing);

    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.055, 6), _exhaustMat);
    exhaust.position.z = -0.06;
    group.add(exhaust);

    return group;
}

export const ships = [];

for (let i = 0; i < 12; i++) {
    const ship = createShip(new THREE.Color().setHSL(i / 12, 0.7, 0.6).getHex());
    ship.userData = {
        orbitRadius: 1.6 + Math.random() * 0.8,
        orbitSpeed:  -(0.3 + Math.random() * 0.4),
        angle:       (i / 12) * Math.PI * 2,
        yAmp:        0.1 + Math.random() * 0.15,
        yFreq:       0.5 + Math.random() * 1.0,
    };
    scene.add(ship);
    ships.push(ship);
}
