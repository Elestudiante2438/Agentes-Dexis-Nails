import { setListeningMode, setSpeakingMode, setSilenceMode, setListeningActive } from './nucleus.js';
import { setNeuralIntensity } from './neural.js';

// =============================================
// VOZ Y DEXIS
// =============================================
let isSpeaking = false;
let listeningActive = false;
let recognition = null;
export let currentRingSpeed = 0.03;

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
        console.log('✅ Permiso de micrófono concedido');
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
        setListeningActive(true);
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '🎤 Escuchando…';
        setListeningMode();
        setNeuralIntensity(2.0);
    };

    recognition.onend = () => {
        if (listeningActive) {
            console.log('[Dexis] Reconocimiento terminado pero sigue activo');
        }
    };

    recognition.onerror = (event) => {
        console.warn('[Dexis] Error:', event.error);
        if (event.error === 'not-allowed') {
            const statusEl = document.getElementById('statusMsg');
            if (statusEl) statusEl.innerHTML = '🔒 Permiso denegado. Activa el micrófono en la URL 🔒';
        } else if (event.error !== 'no-speech') {
            stopListening();
        }
    };

    recognition.onresult = (event) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++)
            if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
        if (finalText) {
            setSpeakingMode();
            setNeuralIntensity(3.0);
            processUserText(finalText.trim());
            setTimeout(() => {
                if (listeningActive) {
                    setListeningMode();
                    setNeuralIntensity(2.0);
                } else {
                    setSilenceMode();
                    setNeuralIntensity(1.0);
                }
            }, 1000);
        }
    };

    try {
        recognition.start();
    } catch(e) {
        console.warn('[Dexis] No se pudo iniciar:', e.message);
    }
}

export function stopListening() {
    if (recognition) {
        try {
            recognition.stop();
        } catch(e) {
            console.warn('[Dexis] Error al detener recognition:', e.message);
        }
        recognition = null;
    }
    listeningActive = false;
    setListeningActive(false);
    const statusEl = document.getElementById('statusMsg');
    if (statusEl) statusEl.innerHTML = '⚪ Sistema listo';
    setSilenceMode();
    setNeuralIntensity(1.0);
}

async function getDexiResponse(userText) {
    const lower = userText.toLowerCase();
    if (lower.includes('dexis'))
        return { respuesta: "Soy Dexis, tu asistente. ¿En qué te ayudo?", agenteNombre: 'Dexis' };
    if (lower.includes('ayuda'))
        return { respuesta: "Claro. Puedes reservar servicios, consultar inventario o preguntar por productos. ¿Qué necesitas?", agenteNombre: 'Dexis' };
    if (!window.Dexis || typeof window.Dexis.responder !== 'function') {
        return { respuesta: "Estoy aquí. Mis sistemas están listos. ¿En qué te ayudo?", agenteNombre: 'Dexis' };
    }
    const respuesta = await window.Dexis.responder(userText);
    return { respuesta, agenteNombre: 'Dexis' };
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

function speakResponse(text) {
    if (!text || isSpeaking) return;
    isSpeaking = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-CO';
    u.rate = 0.9;
    u.onend = () => { isSpeaking = false; };
    u.onerror = () => { isSpeaking = false; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
}

console.log('✅ Voice module loaded');