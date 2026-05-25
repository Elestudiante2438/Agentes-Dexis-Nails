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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Solo GET' });

    const { tabla } = req.query;

    if (!tabla || !TABLAS_PERMITIDAS.includes(tabla)) {
        return res.status(400).json({ error: 'Tabla no válida', permitidas: TABLAS_PERMITIDAS });
    }

    try {
        const result = await pool.query(`SELECT * FROM ${tabla} ORDER BY id DESC LIMIT 100`);
        res.status(200).json({ ok: true, datos: result.rows, total: result.rows.length });
    } catch (error) {
        console.error(`[consultar] Error:`, error.message);
        res.status(500).json({ error: 'Error al consultar', detalle: error.message });
    }
};