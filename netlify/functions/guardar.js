const { sql, checkApiKey, resp } = require('./_core');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
  if (!checkApiKey(event)) return resp(401, { error: 'No autorizado' });

  const { mensaje, respuesta, agente } = JSON.parse(event.body || '{}');

  if (!mensaje || !respuesta) {
    return resp(400, { error: 'Faltan campos: mensaje, respuesta' });
  }

  try {
    await sql`
      INSERT INTO conversaciones (mensaje, respuesta, agente)
      VALUES (${mensaje}, ${respuesta}, ${agente || 'Dexis'})
    `;
    return resp(200, { ok: true });
  } catch (error) {
    console.error('❌ Error guardando conversación:', error.message);
    // No falla hard — guardar conversación es secundario
    return resp(200, { ok: true, warning: 'No se guardó la conversación' });
  }
};
