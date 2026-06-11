import { setListeningMode, setSpeakingMode, setSilenceMode, setListeningActive } from './nucleus.js';
import { setWarpVoice, setWarpListen, setWarpIdle } from './environment.js';
import { setNeuralIntensity } from './neural.js';

let isSpeaking = false;
let listeningActive = false;
let recognition = null;
export let currentRingSpeed = 0.03;

async function callDeepSeekDirectly(userText) {
    try {
        const response = await fetch('/.netlify/functions/deepseek', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje: userText, contexto: {} })
        });
        const data = await response.json();
        return data.respuesta || "No pude procesar tu mensaje. Intenta de nuevo.";
    } catch (err) {
        console.error('[Voice] Error llamando a deepseek:', err);
        return "Tengo un problema técnico. Intenta en unos segundos.";
    }
}

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
        window.listeningActive = true;
        setListeningActive(true);
        const statusEl = document.getElementById('statusMsg');
        if (statusEl) statusEl.innerHTML = '🎤 Escuchando…';
        setListeningMode();
        setNeuralIntensity(2.0);
        setWarpListen();
    };

    recognition.onend = () => {
        // Si sigue activo, reiniciamos (para móvil)
        if (listeningActive) {
            console.log('[Voice] Reconocimiento terminado pero sigue activo, reiniciando...');
            try { recognition.start(); } catch(e) { console.warn(e); }
        }
    };

    recognition.onerror = (event) => {
        console.warn('[Voice] Error:', event.error);
        if (event.error === 'not-allowed') {
            const statusEl = document.getElementById('statusMsg');
            if (statusEl) statusEl.innerHTML = '🔒 Permiso denegado. Activa el micrófono en la URL 🔒';
        } else if (event.error !== 'no-speech') {
            stopListening();
        }
    };

    recognition.onresult = async (event) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i++)
            if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
        if (finalText) {
            setSpeakingMode();
            setNeuralIntensity(3.0);
            const respuesta = await callDeepSeekDirectly(finalText.trim());
            speakResponse(respuesta);
            const statusEl = document.getElementById('statusMsg');
            if (statusEl) {
                statusEl.innerHTML = `🤖 Dexis: ${respuesta.substring(0, 80)}${respuesta.length > 80 ? '…' : ''}`;
                setTimeout(() => {
                    if (listeningActive) statusEl.innerHTML = '🎤 Escuchando…';
                    else statusEl.innerHTML = '⚪ Sistema listo';
                }, 5000);
            }
            setTimeout(() => {
                if (listeningActive) {
                    setListeningMode();
                    setNeuralIntensity(2.0);
                    setWarpListen();
                } else {
                    setSilenceMode();
                    setNeuralIntensity(1.0);
                    setWarpIdle();
                }
            }, 1000);
        }
    };

    try {
        recognition.start();
    } catch(e) {
        console.warn('[Voice] No se pudo iniciar:', e.message);
    }
}

export function stopListening() {
    if (recognition) {
        try { recognition.stop(); } catch(e) { console.warn(e); }
        recognition = null;
    }
    listeningActive = false;
    window.listeningActive = false;
    setListeningActive(false);
    const statusEl = document.getElementById('statusMsg');
    if (statusEl) statusEl.innerHTML = '⚪ Sistema listo';
    setSilenceMode();
    setNeuralIntensity(1.0);
    setWarpIdle();
}

function speakResponse(text) {
    if (!text || isSpeaking) return;
    isSpeaking = true;
    window.isSpeaking = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-CO';
    u.rate = 0.9;
    u.onend = () => { isSpeaking = false; window.isSpeaking = false; };
    u.onerror = () => { isSpeaking = false; window.isSpeaking = false; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
}

window.startListening = startListening;
window.stopListening = stopListening;

console.log('✅ Voice module loaded (direct fetch)');