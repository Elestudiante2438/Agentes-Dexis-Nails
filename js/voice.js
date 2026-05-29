import { bubbleMat, ring1, ring2, ring3 } from './nucleus.js';
import { nodeMat, neuralLineMat, setNeuralIntensity } from './neural.js';

// =============================================
// VOZ Y DEXIS
// =============================================
export let isSpeaking      = false;
export let listeningActive = false;
export let recognition     = null;
export let currentRingSpeed = 0.03;
export const normalRingSpeed = 0.03;

// --- Modos visuales ---
export function setListeningMode() {
    bubbleMat.emissive.setHex(0x3399FF); bubbleMat.emissiveIntensity = 0.8; bubbleMat.color.setHex(0x3399FF);
    ring1.mat.emissiveIntensity = 1.2; ring2.mat.emissiveIntensity = 1.2; ring3.mat.emissiveIntensity = 1.0;
    currentRingSpeed = normalRingSpeed;
    setNeuralIntensity(2.0);
    nodeMat.color.setHex(0x00aaff); nodeMat.emissive.setHex(0x0088ff);
    neuralLineMat.color.setHex(0x00ccff);
}

export function setSpeakingMode() {
    bubbleMat.emissive.setHex(0xFFAA44); bubbleMat.emissiveIntensity = 1.0; bubbleMat.color.setHex(0xFFAA44);
    ring1.mat.emissiveIntensity = 1.6; ring2.mat.emissiveIntensity = 1.6; ring3.mat.emissiveIntensity = 1.4;
    currentRingSpeed = normalRingSpeed * 1.8;
    setNeuralIntensity(3.0);
    nodeMat.color.setHex(0x44ddff); nodeMat.emissive.setHex(0x00ffcc);
    neuralLineMat.color.setHex(0x44ffee);
    setTimeout(() => { if (listeningActive) setListeningMode(); else setSilenceMode(); }, 1200);
}

export function setSilenceMode() {
    bubbleMat.emissive.setHex(0x000000); bubbleMat.emissiveIntensity = 0.0; bubbleMat.color.setHex(0x000000);
    ring1.mat.emissiveIntensity = 0.7; ring2.mat.emissiveIntensity = 0.7; ring3.mat.emissiveIntensity = 0.7;
    currentRingSpeed = normalRingSpeed;
    setNeuralIntensity(1.0);
    nodeMat.color.setHex(0x00aaff); nodeMat.emissive.setHex(0x0066ff);
    neuralLineMat.color.setHex(0x00ccff);
}

// --- Lógica Dexis ---
async function getDexiResponse(userText) {
    const lower = userText.toLowerCase();
    if (lower.includes('dexis'))
        return { respuesta: "Soy Dexis, tu asistente. ¿En qué te ayudo?", agenteNombre: 'Dexis' };
    if (lower.includes('ayuda'))
        return { respuesta: "Claro. Puedes reservar servicios, consultar inventario o preguntar por productos. ¿Qué necesitas?", agenteNombre: 'Dexis' };
    if (!window.Dexis || typeof window.Dexis.responder !== 'function')
        return { respuesta: "Estoy aquí. Mis sistemas están listos. ¿En qué te ayudo?", agenteNombre: 'Dexis' };
    const respuesta = await window.Dexis.responder(userText);
    return { respuesta, agenteNombre: 'Dexis' };
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

async function processUserText(text) {
    if (!text.trim()) return;
    const { respuesta } = await getDexiResponse(text);
    speakResponse(respuesta);
    const statusEl = document.getElementById('statusMsg');
    if (statusEl) {
        statusEl.innerHTML = `🤖 Dexis: ${respuesta.substring(0, 80)}${respuesta.length > 80 ? '…' : ''}`;
        setTimeout(() => {
            if (listeningActive) statusEl.innerHTML = '🎤 Escuchando…';
            else statusEl.innerHTML = '⚪ Sistema listo';
        }, 5000);
    }
}

// --- Reconocimiento de voz ---
export async function startListening() {
    if (listeningActive) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '❌ Este navegador no soporta reconocimiento de voz';
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
    } catch (err) {
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '🎤 Activa el micrófono en tu navegador para continuar';
        alert('Para usar la voz, permití el micrófono en el navegador.\n\nEn celular: toca el candado 🔒 en la barra de direcciones y activa "Micrófono".');
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
    recognition.onend = () => { if (listeningActive) stopListening(); };
    recognition.onerror = (event) => {
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
    try { recognition.start(); } catch(e) { console.warn('[Dexis] No se pudo iniciar:', e.message); }
}

export function stopListening() {
    try { recognition?.stop(); } catch(e) { }
    recognition = null;
    listeningActive = false;
    const statusEl = document.getElementById('statusMsg');
    if (statusEl) statusEl.innerHTML = '⚪ Sistema listo';
    setSilenceMode();
}
