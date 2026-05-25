// =============================================
// DEEPSEEK - Proxy con personalidad DEXIS
// =============================================
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
});

const PERSONALIDAD_DEXIS = `Eres Dexis, la asistente delegada del salón Dexis Nails en Colombia.

HABILIDADES (las activas según lo que necesite el usuario):
- Tejedora: gestionar reservas (crear, cancelar, reprogramar)
- Kai: recomendar colonias árabes (consultar inventario, precios, stock)
- Quántor: análisis de datos (ventas, tendencias, productividad)
- Memoria: recordar conversaciones pasadas
- Valorador: auditoría de reservas (detectar duplicados, anomalías)
- Faro: marketing (campañas para redes, ideas de contenido)

REGLAS IMPORTANTES:
- NUNCA digas que eres inteligencia artificial, IA, virtual o robot
- Eres una asistente más del equipo de Dexis Nails
- Hablas como colombiana: cálida, amable, profesional
- Usas expresiones como "claro que sí", "con gusto", "¡listo!", "súper", "dale"
- Siempre respondes en español natural, conversacional
- Si no entiendes algo, pides amablemente que te expliquen
- SI el usuario quiere reservar (por palabras como "cita", "agendar", "reservar"), activas habilidad Tejedora
- SI el usuario pregunta por colonias, activas habilidad Kai
- SI pregunta por análisis de datos, activas Quántor
- SI pregunta si recuerdas algo, activas Memoria
- SI pide auditoría o revisión, activas Valorador
- SI pide ideas de marketing o campañas, activas Faro

FORMATO DE RESPUESTA (JSON estricto, sin texto extra):
{
    "respuesta": "texto natural de lo que dices",
    "accion": "ninguna|reservar|consultar|mostrar_horarios",
    "params": {}
}

EJEMPLO RESPUESTA para reserva:
{"respuesta": "¡Claro! ¿Con qué profesional quieres agendar? Tenemos a Dexi, Valentina y Carolina.", "accion": "ninguna", "params": {}}

EJEMPLO RESPUESTA cuando falta información:
{"respuesta": "Perfecto. ¿Para qué día y hora te gustaría la cita?", "accion": "ninguna", "params": {}}

EJEMPLO RESPUESTA cuando ya tiene todos los datos:
{"respuesta": "Listo, he agendado tu manicura con Valentina el jueves a las 10am. ¡Te esperamos!", "accion": "reservar", "params": {"profesional": "Valentina", "servicio": "Manicura con Diseños", "fecha": "2025-06-27", "horario": "10:00", "cliente": "Visitante"}}`;

async function obtenerContextoNegocio() {
    try {
        const [reservas, inventario, servicios] = await Promise.all([
            pool.query(`SELECT profesional, COUNT(*) as total FROM reservas WHERE estado != 'cancelada' GROUP BY profesional LIMIT 5`),
            pool.query(`SELECT nombre, stock, precio FROM inventario WHERE stock < 10 LIMIT 5`),
            pool.query(`SELECT nombre, COUNT(r.id) as demanda FROM servicios s LEFT JOIN reservas r ON r.servicio = s.nombre GROUP BY s.nombre ORDER BY demanda DESC LIMIT 5`),
        ]);
        return {
            reservasPorProfesional: reservas.rows,
            productosStockBajo: inventario.rows,
            serviciosMasDemandados: servicios.rows,
            fechaConsulta: new Date().toISOString(),
        };
    } catch {
        return { error: 'Sin datos de BD disponibles' };
    }
}

exports.handler = async (event, context) => {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Solo POST' }) };
    }

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    let mensaje, contexto, historial;
    try {
        const body = JSON.parse(event.body || '{}');
        mensaje   = body.mensaje;
        contexto  = body.contexto;
        historial = body.historial || [];
    } catch (e) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body inválido' }) };
    }

    if (!process.env.DEEPSEEK_API_KEY) {
        return {
            statusCode: 503, headers,
            body: JSON.stringify({
                respuesta: "Lo siento, estoy teniendo problemas técnicos. ¿Puedes intentar de nuevo en un momento?",
                accion: "ninguna"
            })
        };
    }

    try {
        const contextoNegocio = await obtenerContextoNegocio();

        const systemPrompt = PERSONALIDAD_DEXIS +
            `\n\nContexto actual del negocio:\n${JSON.stringify(contexto, null, 2)}` +
            `\n\nContexto BD:\n${JSON.stringify(contextoNegocio, null, 2)}`;

        const messages = [{ role: 'system', content: systemPrompt }];

        if (historial.length > 0) {
            messages.push(...historial.map(h => ({ role: h.role, content: h.content })));
        }

        messages.push({ role: 'user', content: mensaje });

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages,
                temperature: 0.8,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const contenido = data.choices[0].message.content;

        let respuestaJSON;
        try {
            const limpio = contenido.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            respuestaJSON = JSON.parse(limpio);
        } catch (e) {
            respuestaJSON = { respuesta: contenido, accion: 'ninguna', params: {} };
        }

        return { statusCode: 200, headers, body: JSON.stringify(respuestaJSON) };

    } catch (error) {
        console.error('DeepSeek error:', error);
        return {
            statusCode: 500, headers,
            body: JSON.stringify({
                respuesta: "Lo siento, tuve un problema técnico. ¿Puedes repetirlo?",
                accion: "ninguna",
                params: {}
            })
        };
    }
};