// =============================================
// DEXIS - ORQUESTADOR CON DEEPSEEK
// Un solo asistente, 6 habilidades
// No dice "IA", "inteligente", "virtual", "robot"
// =============================================

let conversationMemory = [];

async function llamarDeepSeek(mensaje, contexto) {
    try {
        const response = await fetch('/.netlify/functions/deepseek', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensaje, contexto, historial: conversationMemory.slice(-6) })
        });

        if (!response.ok) {
            console.warn('[Dexis] deepseek HTTP error:', response.status, response.statusText);
            return { respuesta: 'Tengo un problema técnico en este momento. Intenta en unos segundos.', accion: 'ninguna' };
        }

        const data = await response.json();

        if (!data || !data.respuesta) {
            console.warn('[Dexis] deepseek devolvió respuesta vacía:', data);
            return { respuesta: 'Recibí una respuesta incompleta. ¿Puedes repetir tu pregunta?', accion: 'ninguna' };
        }

        return data;

    } catch (err) {
        console.error('[Dexis] Error de red llamando a deepseek:', err.message);
        return { respuesta: 'No me pude conectar ahora mismo. Verifica tu conexión o intenta de nuevo.', accion: 'ninguna' };
    }
}

async function ejecutarAccion(accion, params) {
    if (accion === 'reservar' && params) {
        try {
            const r = await fetch('/.netlify/functions/reservar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            return await r.json();
        } catch (err) {
            console.warn('[Dexis] Error ejecutando acción reservar:', err.message);
        }
    }
    return { ok: true };
}

async function responder(mensaje) {
    // 🔧 FIX: evitar que se envíe "undefined" a DeepSeek
    if (!mensaje || mensaje === 'undefined') return "No te escuché bien. ¿Puedes repetir?";

    // Saludo inicial
    if (!mensaje || mensaje.trim() === '') {
        return "¡Hola! Soy Dexis, tu asistente delegado por Dexis Nails para orientarte. Somos un salón de belleza especializado en uñas, podología, faciales. También comercializamos colonias y perfumes de marcas árabes. ¿En qué puedo ayudarte hoy?";
    }

    // Guardar mensaje en memoria
    conversationMemory.push({ role: 'user', content: mensaje });

    // Obtener contexto de Neon (con fallback si falla)
    let servicios = [], inventario = [], profesionales = [];
    try {
        const [sRes, iRes, pRes] = await Promise.all([
            fetch('/.netlify/functions/consultar?tabla=servicios').then(r => r.json()),
            fetch('/.netlify/functions/consultar?tabla=inventario').then(r => r.json()),
            fetch('/.netlify/functions/consultar?tabla=profesionales').then(r => r.json())
        ]);
        servicios    = sRes.datos || [];
        inventario   = iRes.datos || [];
        profesionales = pRes.datos || [];
    } catch (e) {
        console.warn('[Dexis] Neon no disponible, usando contexto vacío');
    }

    const contexto = {
        servicios,
        inventario,
        profesionales,
        hora_actual: new Date().toLocaleString('es-CO'),
        conversacion_reciente: conversationMemory.slice(-4)
    };

    // Llamar a DeepSeek
    const respuestaObj = await llamarDeepSeek(mensaje, contexto);

    // Ejecutar acción si viene
    if (respuestaObj.accion && respuestaObj.accion !== 'ninguna') {
        await ejecutarAccion(respuestaObj.accion, respuestaObj.params);
    }

    // Guardar conversación en segundo plano
    fetch('/.netlify/functions/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mensaje,
            respuesta: respuestaObj.respuesta,
            agente: 'Dexis'
        })
    }).catch(() => {});

    // Guardar en memoria local
    conversationMemory.push({ role: 'assistant', content: respuestaObj.respuesta });
    if (conversationMemory.length > 10) conversationMemory.shift();

    return respuestaObj.respuesta;
}

// =============================================
// EXPORTAR PARA main.js
// =============================================

window.Dexis = { responder };

window.agentes = {
    Tejedora:  { responder: async (texto) => await responder(texto) },
    Kai:       { responder: async (texto) => await responder(texto) },
    'Quántor': { responder: async (texto) => await responder(texto) },
    Memoria:   { responder: async (texto) => await responder(texto) },
    Valorador: { responder: async (texto) => await responder(texto) },
    Faro:      { responder: async (texto) => await responder(texto) }
};

window.decidirAgente = (texto) => {
    const lower = texto.toLowerCase();
    if (lower.includes('cita') || lower.includes('reserva') || lower.includes('agendar')) return 'Tejedora';
    if (lower.includes('colonia') || lower.includes('perfume') || lower.includes('recomendación')) return 'Kai';
    if (lower.includes('stock') || lower.includes('inventario') || lower.includes('reabastecer')) return 'Quántor';
    if (lower.includes('recuerda') || lower.includes('última conversación')) return 'Memoria';
    if (lower.includes('auditar') || lower.includes('revisar reservas')) return 'Valorador';
    if (lower.includes('campaña') || lower.includes('marketing') || lower.includes('faro') || lower.includes('tendencias')) return 'Faro';
    return 'Tejedora';
};

console.log('🤖 Dexis orquestador listo (con fix para undefined)');