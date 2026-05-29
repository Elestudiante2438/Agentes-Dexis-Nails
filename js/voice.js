// ============================================
// VOICE - Voz, animación, eventos y tooltips
// ============================================
import * as THREE from 'three';
import { scene, camera, renderer, controls, core, coreMat, dodecahedron, dodecaMat, ring1, ring2, ring3, particleMat, edgesMat, vertexMat, starsBg, bubble, bubbleMat, glowShell, setTopView, isPageVisible } from './scene.js';
import { planetFigures } from './planets.js';
import { datosSistema, mostrarTooltip, ocultarTooltip } from './data.js';

// ============================================
// VOZ Y DEXIS
// ============================================
let isSpeaking = false;
let listeningActive = false;
let recognition = null;
let currentRingSpeed = 0.03;
const normalRingSpeed = 0.03;
let permanentColor = null;

const _edgeColor = new THREE.Color();

export function setNucleusColor(hex) {
    _edgeColor.setHex(hex);
    coreMat.color.copy(_edgeColor);
    coreMat.emissive.copy(_edgeColor).multiplyScalar(0.6);
    dodecaMat.color.copy(_edgeColor);
    particleMat.color.copy(_edgeColor);
    vertexMat.color.copy(_edgeColor);
}

function setListeningMode() {
    bubbleMat.emissive.setHex(0x3399FF); bubbleMat.emissiveIntensity = 0.8; bubbleMat.color.setHex(0x3399FF);
    ring1.mat.emissiveIntensity = 1.2; ring2.mat.emissiveIntensity = 1.2; ring3.mat.emissiveIntensity = 1.0;
    currentRingSpeed = normalRingSpeed;
}

function setSpeakingMode() {
    bubbleMat.emissive.setHex(0xFFAA44); bubbleMat.emissiveIntensity = 1.0; bubbleMat.color.setHex(0xFFAA44);
    ring1.mat.emissiveIntensity = 1.6; ring2.mat.emissiveIntensity = 1.6; ring3.mat.emissiveIntensity = 1.4;
    currentRingSpeed = normalRingSpeed * 1.8;
    setTimeout(() => { if (listeningActive) setListeningMode(); else setSilenceMode(); }, 1200);
}

function setSilenceMode() {
    bubbleMat.emissive.setHex(0x000000); bubbleMat.emissiveIntensity = 0.0; bubbleMat.color.setHex(0x000000);
    ring1.mat.emissiveIntensity = 0.7; ring2.mat.emissiveIntensity = 0.7; ring3.mat.emissiveIntensity = 0.7;
    currentRingSpeed = normalRingSpeed;
}

async function getDexiResponse(userText) {
    const lower = userText.toLowerCase();

    if (lower.includes('dexis'))
        return { respuesta: "Soy Dexis, tu asistente. ¿En qué te ayudo?", agenteNombre: 'Dexis' };
    if (lower.includes('ayuda'))
        return { respuesta: "Claro. Puedes reservar servicios de manicura, pedicura, podología, uñas de gel, faciales, o consultar por colonias árabes. ¿Qué necesitas?", agenteNombre: 'Dexis' };

    if (!window.Dexis || typeof window.Dexis.responder !== 'function') {
        console.warn('[Dexis] window.Dexis no disponible');
        return {
            respuesta: "Estoy aquí. Mis sistemas están listos. ¿En qué te ayudo?",
            agenteNombre: 'Dexis'
        };
    }

    const respuesta = await window.Dexis.responder(userText);
    return { respuesta, agenteNombre: 'Dexis' };
}

async function processUserText(text) {
    if (!text.trim()) return;
    window.addToMemory?.('user', text);
    const { respuesta, agenteNombre } = await getDexiResponse(text);
    window.addToMemory?.('dexi', respuesta);
    speakResponse(respuesta);

    const statusEl = document.getElementById('statusMsg');
    if (statusEl) {
        statusEl.innerHTML = `🤖 Dexis: ${respuesta.substring(0, 80)}${respuesta.length > 80 ? '…' : ''}`;
        setTimeout(() => {
            if (listeningActive) statusEl.innerHTML = '🎤 Escuchando…';
            else statusEl.innerHTML = '⚪ Sistema listo';
        }, 5000);
    }

    window.guardarConversacion?.(text, respuesta, 'Dexis');
}

function speakResponse(text) {
    if (!text || isSpeaking) return;
    isSpeaking = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-CO'; u.rate = 0.9;
    u.onend = u.onerror = () => { isSpeaking = false; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
}

async function startListening() {
    if (listeningActive) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '❌ Este navegador no soporta reconocimiento de voz';
        return;
    }

    // 🔥 NUEVO: Pedir permiso de micrófono de forma explícita al tocar el botón
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Detener el stream inmediatamente, solo para obtener el permiso
        stream.getTracks().forEach(track => track.stop());
        console.log('✅ Permiso de micrófono concedido');
    } catch (err) {
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '🎤 Necesitas permitir el micrófono para usar la voz';
        console.warn('[Dexis] Permiso de micrófono denegado:', err.message);
        
        // Mostrar un mensaje más claro para el celular
        alert('📱 Para usar la voz en el celular:\n\n1. Toca el candado 🔒 en la barra de direcciones\n2. Busca "Micrófono" y cámbialo a "Permitir"\n3. Recarga la página y vuelve a intentar');
        return;
    }

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'es-CO';

    recognition.onstart = () => {
        listeningActive = true;
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '🎤 Escuchando…';
        setListeningMode();
    };

    recognition.onend = () => {
        if (listeningActive && typeof isPressing !== 'undefined' && isPressing) {
            try { recognition.start(); } catch(e) { }
        } else if (listeningActive) {
            stopListening();
        }
    };

    recognition.onerror = (event) => {
        console.warn('[Dexis] Error de reconocimiento:', event.error);
        if (event.error === 'aborted' || event.error === 'no-speech') return;
        
        if (event.error === 'not-allowed') {
            const statusEl = document.getElementById('statusMsg');
            if (statusEl) statusEl.innerHTML = '🔒 Permiso denegado. Activa el micrófono en la URL 🔒';
        } else {
            stopListening();
        }
    };

    recognition.onresult = (event) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++)
            if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
        if (finalText) {
            setSpeakingMode();
            processUserText(finalText.trim());
            setTimeout(() => { if (listeningActive) setListeningMode(); else setSilenceMode(); }, 1000);
        }
    };

    try {
        recognition.start();
    } catch(e) {
        console.warn('[Dexis] No se pudo iniciar recognition:', e.message);
    }
}

function stopListening() {
    try { recognition?.stop(); } catch(e) { }
    recognition = null;
    listeningActive = false;
    const statusEl = document.getElementById('statusMsg');
    if (statusEl) statusEl.innerHTML = '⚪ Sistema listo';
    setSilenceMode();
}

// ============================================
// BOTONES TÁCTILES
// ============================================
const btnListen = document.getElementById('btn-listen');
const btnStop = document.getElementById('btn-stop');
const btnReset = document.getElementById('btn-reset');

let pressTimer = null;
let isPressing = false;

if (btnListen) {
    btnListen.addEventListener('mousedown', startPressToTalk);
    btnListen.addEventListener('touchstart', startPressToTalk);
    window.addEventListener('mouseup', stopPressToTalk);
    window.addEventListener('touchend', stopPressToTalk);
}

function startPressToTalk(e) {
    e.preventDefault();
    if (isPressing) return;
    isPressing = true;
    btnListen.style.background = '#6c5ce7';
    btnListen.style.transform = 'scale(0.96)';
    startListening();
    pressTimer = setTimeout(() => { if (isPressing) stopPressToTalk(); }, 10000);
}

function stopPressToTalk() {
    if (!isPressing) return;
    isPressing = false;
    if (btnListen) {
        btnListen.style.background = '';
        btnListen.style.transform = '';
    }
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    stopListening();
}

if (btnStop) {
    btnStop.addEventListener('click', () => { stopPressToTalk(); stopListening(); });
}
if (btnReset) {
    btnReset.addEventListener('click', () => { setTopView(); });
}

// ============================================
// ANIMACIÓN
// ============================================
let time = 0;
let particleHue = 0;
let ringDirection = 1;
let ringSwitchTimer = 0;

export function animate() {
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

    bubble.rotation.y -= 0.0008;
    bubble.rotation.x += 0.0003;

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

    // Naves (si existen)
    if (window.shipsArray) {
        window.shipsArray.forEach(ship => {
            const d = ship.userData;
            if (d) {
                d.angle += d.orbitSpeed * 0.008;
                ship.position.set(
                    dodecahedron.position.x + Math.cos(d.angle) * d.orbitRadius,
                    dodecahedron.position.y + Math.sin(d.angle * d.yFreq) * d.yAmp,
                    dodecahedron.position.z + Math.sin(d.angle) * d.orbitRadius
                );
                ship.rotation.y = d.angle;
                ship.rotation.x = Math.sin(d.angle * 2) * 0.18;
            }
        });
    }

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
        
        // Actualizar tooltip cada cierto tiempo
        if (Math.random() < 0.01) {
            const textoActualizado = d.getTexto ? d.getTexto() : `${d.name}\nDatos no disponibles`;
            d.texto = textoActualizado;
        }
    });

    if (!listeningActive && !isSpeaking && !permanentColor) {
        particleHue = (particleHue + 0.004) % 1;
        particleMat.color.setHSL(particleHue, 1, 0.6);
    }

    if (permanentColor) {
        const t = 0.3 + Math.sin(time * 6) * 0.4;
        _edgeColor.setHex(permanentColor);
        edgesMat.color.setRGB(_edgeColor.r * t, _edgeColor.g * t, _edgeColor.b * t);
    }

    starsBg.material.opacity = 0.4 + Math.sin(time * 2.5) * 0.28;

    controls.update();
    renderer.render(scene, camera);
}

// ============================================
// TOOLTIPS CON RAYCASTER
// ============================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planetFigures);
    
    if (intersects.length > 0) {
        const planeta = intersects[0].object;
        const texto = planeta.userData.texto || `${planeta.userData.name}\nPasa el mouse para ver datos`;
        mostrarTooltip(planeta, texto);
    } else {
        ocultarTooltip();
    }
});

// También soportar toque en celular
window.addEventListener('touchstart', (event) => {
    if (event.touches.length) {
        const touch = event.touches[0];
        mouse.x = (touch.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(touch.clientY / renderer.domElement.clientHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(planetFigures);
        
        if (intersects.length > 0) {
            const planeta = intersects[0].object;
            const texto = planeta.userData.texto || `${planeta.userData.name}\nToca para ver datos`;
            mostrarTooltip(planeta, texto);
            setTimeout(() => ocultarTooltip(), 3000);
        }
    }
});

// Atajos de teclado
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'e') { e.preventDefault(); startListening(); }
    else if (k === 'm') { e.preventDefault(); stopListening(); }
    else if (k === 'r') { e.preventDefault(); setTopView(); }
});

console.log('✅ Voice module loaded');