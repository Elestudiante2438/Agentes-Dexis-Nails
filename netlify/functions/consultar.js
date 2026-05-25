// =============================================
// CONSULTAR - Tablas de Neon
// =============================================
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
});

const TABLAS_PERMITIDAS = ['inventario', 'servicios', 'profesionales', 'reservas', 'conversaciones'];

const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
};

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: HEADERS, body: '' };
    if (event.httpMethod !== 'GET') return { statusCode: 405, headers: HEADERS, body: JSON.stringify({ error: 'Solo GET' }) };

    const tabla = event.queryStringParameters?.tabla;

    if (!tabla || !TABLAS_PERMITIDAS.includes(tabla)) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Tabla no válida', permitidas: TABLAS_PERMITIDAS }) };
    }

    try {
        const result = await pool.query(`SELECT * FROM ${tabla} ORDER BY id DESC LIMIT 100`);
        return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ ok: true, datos: result.rows, total: result.rows.length }) };
    } catch (error) {
        console.error('[consultar] Error:', error.message);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Error al consultar', detalle: error.message }) };
    }
};
