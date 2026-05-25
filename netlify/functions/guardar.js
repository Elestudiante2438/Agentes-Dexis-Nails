// =============================================
// GUARDAR - Guardar conversaciones en Neon
// =============================================
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
});

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Solo POST' }) };

    let cliente = 'Visitante', mensaje, respuesta, agente;
    try {
        const body = JSON.parse(event.body || '{}');
        cliente   = body.cliente || 'Visitante';
        mensaje   = body.mensaje;
        respuesta = body.respuesta;
        agente    = body.agente;
    } catch (e) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Body inválido' }) };
    }

    if (!mensaje || !respuesta || !agente) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Faltan: mensaje, respuesta, agente' }) };
    }

    try {
        const result = await pool.query(
            `INSERT INTO conversaciones (cliente, mensaje, respuesta, agente, creada_en)
             VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
            [cliente, mensaje, respuesta, agente]
        );
        return { statusCode: 201, headers: HEADERS, body: JSON.stringify({ ok: true, id: result.rows[0].id }) };
    } catch (error) {
        console.error('[guardar] Error:', error.message);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: false, advertencia: 'Conversación no guardada en BD' }) };
    }
};
