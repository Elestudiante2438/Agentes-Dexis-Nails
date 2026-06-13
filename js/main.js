import * as THREE from 'three';
import { scene, camera, renderer, controls, setTopView, isPageVisible } from './scene.js';
import { bubble, core, coreMat, dodecahedron, dodecaMat, ring1, ring2, ring3, particleMat, edgesMat, vertexMat, glowShell, ringState, updateMorphs } from './nucleus.js';
import { neuralGroup, neuralLineMat, setNeuralIntensity, setNodeHSL, updateNeuralWave, edgePairs, pulseStates } from './neural.js';
import { starsBg, planetFigures, ships, updateWarp, updatePlanetTrails } from './environment.js';
import './voice.js';
import './ui.js';

// =============================================
// ORQUESTADOR PRINCIPAL
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

    // Morph targets — boca/oído del core
    updateMorphs();

    // TEST TEMPORAL — borrar después de verificar
    if (time > 3 && time < 6) {
        core.morphTargetInfluences[0] = 1; // boca al máximo
    } else if (time > 6 && time < 9) {
        core.morphTargetInfluences[0] = 0;
        core.morphTargetInfluences[1] = 1; // oído al máximo
    } else if (time > 9) {
        core.morphTargetInfluences[0] = 0;
        core.morphTargetInfluences[1] = 0; // esfera pura
    }

    // Anillos — tilt oscilante independiente por eje, más vivos
    ringSwitchTimer += 0.016;
    if (ringSwitchTimer > 5) { ringDirection *= -1; ringSwitchTimer = 0; }
    const rs = ringState.speed * ringDirection;
    if (ring1?.mesh) {
        ring1.mesh.rotation.z += rs;
        ring1.mesh.rotation.x = Math.PI / 2 + Math.sin(time * 2.1) * 0.28;
        ring1.mesh.rotation.y  = Math.cos(time * 1.3) * 0.15;
    }
    if (ring2?.mesh) {
        ring2.mesh.rotation.z += rs * 0.85;
        ring2.mesh.rotation.x += Math.sin(time * 0.7) * 0.025;
        ring2.mesh.rotation.y += Math.cos(time * 0.9) * 0.018;
        ring2.mesh.rotation.z += Math.sin(time * 1.5) * 0.008;
        ring2.mesh.scale.setScalar(1 + Math.sin(time * 1.3) * 0.08);
    }
    if (ring3?.mesh) {
        ring3.mesh.rotation.z -= rs * 0.65;
        ring3.mesh.rotation.y += Math.sin(time * 1.1) * 0.022;
        ring3.mesh.rotation.x  = Math.PI / 5 + Math.cos(time * 0.8) * 0.20;
        ring3.mesh.scale.setScalar(1 + Math.cos(time * 0.9) * 0.06);
    }

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
        const phaseOffset = d.phaseOffset ?? (planet.userData.phaseOffset = Math.random() * Math.PI * 2);
        const bobAmp   = d.bobAmp   ?? (planet.userData.bobAmp   = 0.08 + Math.random() * 0.12);
        const bobFreq  = d.bobFreq  ?? (planet.userData.bobFreq  = 0.3  + Math.random() * 0.4);
        planet.position.set(
            Math.cos(d.angle) * d.distance,
            0.5 + Math.sin(time * bobFreq + phaseOffset) * bobAmp,
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
            const textoActualizado = d.getTexto ? d.getTexto() : `${d.name}\nDatos no disponibles`;
            d.texto = textoActualizado;
        }
    });

    // Estelas de planetas
    updatePlanetTrails();

    // Malla neural
    if (neuralGroup) {
        neuralGroup.rotation.y += 0.0006;
        neuralGroup.rotation.x += 0.00022;
        neuralGroup.rotation.z += Math.sin(time * 0.17) * 0.00018;
    }
    updateNeuralWave(time);

    // Partículas + cycling de color en modo idle
    if (!window.listeningActive && !window.isSpeaking) {
        particleHue = (particleHue + 0.004) % 1;
        particleMat.color.setHSL(particleHue, 1, 0.6);
        setNodeHSL(particleHue, 1, 0.65);
    }

    // Warp
    updateWarp();

    controls.update();
    renderer.render(scene, camera);
}

animate();

console.log('✅ Dexis — Universo 3D con malla neural Jarvis + morph targets activos');
