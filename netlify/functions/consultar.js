const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
    const sql = neon(process.env.DATABASE_URL);
    const { tabla } = event.queryStringParameters || {};

    const tablasPermitidas = ['servicios', 'inventario', 'profesionales', 'reservas', 'appointments'];

    if (!tablasPermitidas.includes(tabla)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Tabla no permitida' })
        };
    }

    try {
        let datos;

        if (tabla === 'inventario') {
            datos = await sql`SELECT * FROM inventario LIMIT 100`;
        } else if (tabla === 'servicios') {
            datos = await sql`SELECT * FROM servicios LIMIT 100`;
        } else if (tabla === 'profesionales') {
            datos = await sql`SELECT * FROM profesionales LIMIT 100`;
        } else if (tabla === 'reservas') {
            datos = await sql`SELECT * FROM reservas LIMIT 100`;
        } else if (tabla === 'appointments') {
            datos = await sql`SELECT * FROM appointments LIMIT 100`;
        } else {
            datos = [];
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ datos })
        };
    } catch (error) {
        console.error('❌ Error en /api/consultar:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};