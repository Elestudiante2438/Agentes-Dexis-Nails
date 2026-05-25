// =============================================
// GUARDAR - Guardar conversaciones en Neon
// =============================================
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,
});

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Solo POST' });

    const { cliente = 'Visitante', mensaje, respuesta, agente } = req.body || {};

    if (!mensaje || !respuesta || !agente) {
        return res.status(400).json({ error: 'Faltan: mensaje, respuesta, agente' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO conversaciones (cliente, mensaje, respuesta, agente, creada_en)
             VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
            [cliente, mensaje, respuesta, agente]
        );
        res.status(201).json({ ok: true, id: result.rows[0].id });
    } catch (error) {
        console.error('[guardar] Error:', error.message);
        res.status(200).json({ ok: false, advertencia: 'Conversación no guardada en BD' });
    }
};