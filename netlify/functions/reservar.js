// =============================================
// RESERVAR - Crear reservas con validación de conflictos
// =============================================
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
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

    let profesional, servicio, fecha, horario, cliente;
    try {
        const body = JSON.parse(event.body || '{}');
        profesional = body.profesional;
        servicio    = body.servicio;
        fecha       = body.fecha;
        horario     = body.horario;
        cliente     = body.cliente;
    } catch (e) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ error: 'Body inválido' }) };
    }

    if (!profesional || !servicio || !fecha || !horario || !cliente) {
        return { statusCode: 400, headers: HEADERS, body: JSON.stringify({
            error: 'Faltan campos',
            requeridos: ['profesional', 'servicio', 'fecha', 'horario', 'cliente']
        })};
    }

    try {
        const conflicto = await pool.query(
            `SELECT id FROM reservas 
             WHERE profesional = $1 AND fecha = $2 AND horario = $3 AND estado != 'cancelada'`,
            [profesional, fecha, horario]
        );

        if (conflicto.rows.length > 0) {
            return { statusCode: 409, headers: HEADERS, body: JSON.stringify({
                error: 'Horario no disponible',
                mensaje: `${profesional} ya tiene una cita el ${fecha} a las ${horario}`
            })};
        }

        const result = await pool.query(
            `INSERT INTO reservas (profesional, servicio, fecha, horario, cliente, estado, creada_en)
             VALUES ($1, $2, $3, $4, $5, 'pendiente', NOW())
             RETURNING *`,
            [profesional, servicio, fecha, horario, cliente]
        );

        console.log(`[reservar] ${cliente} → ${servicio} con ${profesional} el ${fecha} ${horario}`);
        return { statusCode: 201, headers: HEADERS, body: JSON.stringify({ ok: true, reserva: result.rows[0] }) };

    } catch (error) {
        console.error('[reservar] Error:', error.message);
        return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ error: 'Error interno', detalle: error.message }) };
    }
};
