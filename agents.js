// =============================================
// DEXIS - ORQUESTADOR CON DEEPSEEK
// Un solo asistente, 6 habilidades
// No dice "IA", "inteligente", "virtual", "robot"
// =============================================

let conversationMemory = [];

async function llamarDeepSeek(mensaje, contexto) {
    const response = await fetch('/.netlify/functions/deepseek', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, contexto, historial: conversationMemory.slice(-6) })
    });
    const data = await response.json();
    return data;
}

async function ejecutarAccion(accion, params) {
    if (accion === 'reservar' && params) {
        const r = await fetch('/.netlify/functions/reservar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        return await r.json();
    }
    return { ok: true };
}

async function responder(mensaje) {
    // Saludo inicial si no hay mensaje
    if (!mensaje || mensaje.trim() === '') {
        return "¡Hola! Soy Dexis, tu asistente delegado por Dexis Nails para orientarte. Somos un salón de belleza especializado en uñas, podología, faciales. También comercializamos colonias y perfumes de marcas árabes. ¿En qué puedo ayudarte hoy?";
    }

    // Guardar mensaje en memoria
    conversationMemory.push({ role: 'user', content: mensaje });

    // Obtener contexto de Neon (con fallback a datos vacíos si falla)
    let servicios = [], inventario = [], profesionales = [];
    try {
        const [sRes, iRes, pRes] = await Promise.all([
            fetch('/.netlify/functions/consultar?tabla=servicios').then(r => r.json()),
            fetch('/.netlify/functions/consultar?tabla=inventario').then(r => r.json()),
            fetch('/.netlify/functions/consultar?tabla=profesionales').then(r => r.json())
        ]);
        servicios = sRes.datos || [];
        inventario = iRes.datos || [];
        profesionales = pRes.datos || [];
    } catch (e) {
        console.warn('Neon no disponible, usando contexto vacío');
    }

    const contexto = {
        servicios,
        inventario,
        profesionales,
        hora_actual: new Date().toLocaleString('es-CO'),
        conversacion_reciente: conversationMemory.slice(-4)
    };

    // Llamar a DeepSeek (Dexis)
    const respuesta = await llamarDeepSeek(mensaje, contexto);

    // Ejecutar acción si viene
    if (respuesta.accion && respuesta.accion !== 'ninguna') {
        await ejecutarAccion(respuesta.accion, respuesta.params);
    }

    // Guardar conversación en segundo plano (no bloquea)
    fetch('/.netlify/functions/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mensaje,
            respuesta: respuesta.respuesta,
            agente: 'Dexis'
        })
    }).catch(() => {});

    // Guardar en memoria local
    conversationMemory.push({ role: 'assistant', content: respuesta.respuesta });
    if (conversationMemory.length > 10) conversationMemory.shift();

    return respuesta.respuesta;
}

// =============================================
// EXPORTAR PARA main.js
// =============================================

// 1. La función responder principal
window.Dexis = { responder };

// 2. La estructura de agentes que espera main.js
window.agentes = {
    Tejedora: { responder: async (texto, contexto) => await responder(texto) },
    Kai: { responder: async (texto, contexto) => await responder(texto) },
    Quántor: { responder: async (texto, contexto) => await responder(texto) },
    Memoria: { responder: async (texto, contexto) => await responder(texto) },
    Valorador: { responder: async (texto, contexto) => await responder(texto) },
    Faro: { responder: async (texto, contexto) => await responder(texto) }
};

// 3. El selector de agente que espera main.js
window.decidirAgente = (texto, contexto) => {
    const lower = texto.toLowerCase();
    if (lower.includes('cita') || lower.includes('reserva') || lower.includes('agendar')) return 'Tejedora';
    if (lower.includes('colonia') || lower.includes('perfume') || lower.includes('recomendación')) return 'Kai';
    if (lower.includes('stock') || lower.includes('inventario') || lower.includes('reabastecer')) return 'Quántor';
    if (lower.includes('recuerda') || lower.includes('última conversación')) return 'Memoria';
    if (lower.includes('auditar') || lower.includes('revisar reservas')) return 'Valorador';
    if (lower.includes('campaña') || lower.includes('marketing') || lower.includes('faro') || lower.includes('tendencias')) return 'Faro';
    return 'Tejedora';
};

console.log('🤖 Dexis orquestador listo (con agentes exportados)');