const { neon } = require('@neondatabase/serverless');

exports.handler = async () => {
    const sql = neon(process.env.DATABASE_URL);
    
    try {
        await sql`SELECT 1`;
        const hoy = await sql`SELECT COUNT(*) FROM recordatorios_enviados WHERE sent_at::date = CURRENT_DATE`;
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'ok',
                faro: {
                    recordatorios_hoy: hoy[0].count,
                    timestamp: new Date().toISOString()
                },
                alertas: 0
            })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};