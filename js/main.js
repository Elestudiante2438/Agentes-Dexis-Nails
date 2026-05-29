import * as THREE from 'three';

// Módulos del sistema
import { scene, camera, renderer, controls, isPageVisible } from './scene.js';
import { bubble, core, glowShell, dodecahedron, ring1, ring2, ring3, particleMat, edgesMat } from './nucleus.js';
import { neuralGroup, neuralLineMat, nodeMat, edgePairs, pulseStates, neuralIntensity } from './neural.js';
import { starsBg, ships, planetFigures } from './environment.js';
import { listeningActive, isSpeaking, currentRingSpeed } from './voice.js';
import './ui.js';

console.log('✅ Dexis — Universo 3D con malla neural Jarvis, tooltips y voz');

// =============================================
// ANIMACIÓN
// =============================================
let time = 0;
let particleHue = 0;
let ringDirection = 1;
let ringSwitchTimer = 0;

function animate() {
    requestAnimationFrame(animate);
    if (!isPageVisible) return;
    time += 0.016;

    const beat = Math.sin(time * 5) * 0.5 + Math.sin(time * 2.3) * 0.3;

    // Núcleo
    core.scale.setScalar(1 + beat * 0.05);
    glowShell.scale.setScalar(1 + beat * 0.09);
    dodecahedron.scale.setScalar(1 + beat * 0.025);
    dodecahedron.position.set(
        core.position.x + Math.sin(time * 0.7) * 0.015,
        core.position.y + Math.sin(time * 0.5) * 0.01,
        core.position.z + Math.sin(time * 0.9) * 0.02
    );
    core.rotation.y = time * 0.3;
    dodecahedron.rotation.y = time * 0.2;
    dodecahedron.rotation.x = Math.sin(time * 0.3) * 0.04;
    bubble.rotation.y -= 0.0008;
    bubble.rotation.x += 0.0003;

    // Anillos
    ringSwitchTimer += 0.016;
    if (ringSwitchTimer > 5) { ringDirection *= -1; ringSwitchTimer = 0; }
    const rs = currentRingSpeed * ringDirection;
    ring1.mesh.rotation.z += rs;
    ring1.mesh.rotation.x = Math.PI / 2 + Math.sin(time * 2.1) * 0.22;
    ring2.mesh.rotation.z += rs * 0.85;
    ring2.mesh.rotation.x += Math.sin(time * 0.7) * 0.025;
    ring2.mesh.rotation.y += Math.cos(time * 0.9) * 0.018;
    ring2.mesh.scale.setScalar(1 + Math.sin(time * 1.3) * 0.08);
    ring3.mesh.rotation.z -= rs * 0.65;
    ring3.mesh.rotation.y += Math.sin(time * 1.1) * 0.02;
    ring3.mesh.scale.setScalar(1 + Math.cos(time * 0.9) * 0.06);

    // Naves
    ships.forEach(ship => {
        const d = ship.userData;
        d.angle += d.orbitSpeed * 0.008;
        ship.position.set(
            dodecahedron.position.x + Math.cos(d.angle) * d.orbitRadius,
            dodecahedron.position.y + Math.sin(d.angle * d.yFreq) * d.yAmp,
            dodecahedron.position.z + Math.sin(d.angle) * d.orbitRadius
        );
        ship.rotation.y = d.angle;
        ship.rotation.x = Math.sin(d.angle * 2) * 0.18;
    });

    // Planetas
    planetFigures.forEach(planet => {
        const d = planet.userData;
        d.angle += d.speed;
        planet.position.set(
            Math.cos(d.angle) * d.distance,
            0.5 + Math.sin(d.angle * 2) * 0.06,
            Math.sin(d.angle) * d.distance
        );
        planet.rotation.y += 0.004;
        if (d.moon) {
            const md = d.moon.userData;
            md.angle += md.speed;
            d.moon.position.set(
                Math.cos(md.angle) * md.dist,
                Math.sin(md.angle * 0.5) * 0.15,
                Math.sin(md.angle) * md.dist
            );
        }
        if (Math.random() < 0.01) {
            d.texto = d.getTexto ? d.getTexto() : `${d.name}\nDatos no disponibles`;
        }
    });

    // Malla neural
    neuralGroup.rotation.y += 0.0005;
    neuralGroup.rotation.x += 0.00015;
    const neuralBase = (0.18 + Math.sin(time * 1.2) * 0.06) * neuralIntensity;
    neuralLineMat.opacity = Math.min(neuralBase, 0.9);
    if (Math.round(time * 60) % 2 === 0) {
        for (let s = 0; s < edgePairs.length; s++) {
            const ps = pulseStates[s];
            const glow = Math.pow(Math.max(0, Math.sin(time * ps.speed + ps.phase)), 4) * ps.amp;
            if (s % 7 === 0 && glow > 0.6) {
                neuralLineMat.opacity = Math.min(neuralBase + glow * 0.5 * neuralIntensity, 1.0);
            }
        }
    }
    const nodePulse = 1 + beat * 0.12 * neuralIntensity;
    nodeMat.emissiveIntensity = 1.4 * neuralIntensity + Math.sin(time * 3.1) * 0.4;
    neuralGroup.children.forEach(child => {
        if (child.isMesh) child.scale.setScalar(nodePulse);
    });

    // Color cíclico — partículas + malla neural
    if (!listeningActive && !isSpeaking) {
        particleHue = (particleHue + 0.004) % 1;
        particleMat.color.setHSL(particleHue, 1, 0.6);
        nodeMat.color.setHSL(particleHue, 1, 0.65);
        nodeMat.emissive.setHSL(particleHue, 1, 0.45);
        neuralLineMat.color.setHSL(particleHue, 1, 0.6);
    }

    starsBg.material.opacity = 0.4 + Math.sin(time * 2.5) * 0.28;

    controls.update();
    renderer.render(scene, camera);
}

animate();
