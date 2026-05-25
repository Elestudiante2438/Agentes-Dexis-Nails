// =============================================
// RESERVAR - Crear reservas con validación de conflictos
// =============================================
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
});

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    const { profesional, servicio, fecha, horario, cliente } = req.body || {};

    if (!profesional || !servicio || !fecha || !horario || !cliente) {
        return res.status(400).json({
            error: 'Faltan campos',
            requeridos: ['profesional', 'servicio', 'fecha', 'horario', 'cliente']
        });
    }

    try {
        const conflicto = await pool.query(
            `SELECT id FROM reservas 
             WHERE profesional = $1 AND fecha = $2 AND horario = $3 AND estado != 'cancelada'`,
            [profesional, fecha, horario]
        );

        if (conflicto.rows.length > 0) {
            return res.status(409).json({
                error: 'Horario no disponible',
                mensaje: `${profesional} ya tiene una cita el ${fecha} a las ${horario}`
            });
        }

        const result = await pool.query(
            `INSERT INTO reservas (profesional, servicio, fecha, horario, cliente, estado, creada_en)
             VALUES ($1, $2, $3, $4, $5, 'pendiente', NOW())
             RETURNING *`,
            [profesional, servicio, fecha, horario, cliente]
        );

        console.log(`[reservar] Nueva reserva: ${cliente} → ${servicio} con ${profesional} el ${fecha} ${horario}`);
        res.status(201).json({ ok: true, reserva: result.rows[0] });

    } catch (error) {
        console.error('[reservar] Error:', error.message);
        res.status(500).json({ error: 'Error interno', detalle: error.message });
    }
};