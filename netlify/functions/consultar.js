const { sql, checkApiKey, resp } = require('./_core');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return resp(405, { error: 'Method not allowed' });
  if (!checkApiKey(event)) return resp(401, { error: 'No autorizado' });

  const tabla = event.queryStringParameters?.tabla;
  const tablasPermitidas = ['servicios', 'inventario', 'profesionales', 'reservas', 'appointments'];

  if (!tabla || !tablasPermitidas.includes(tabla)) {
    return resp(400, { error: `Tabla no permitida. Opciones: ${tablasPermitidas.join(', ')}` });
  }

  try {
    // Seguro: tabla ya validada contra whitelist estricta
    const datos = await sql.unsafe(`SELECT * FROM ${tabla} LIMIT 100`);
    return resp(200, { datos });
  } catch (error) {
    console.error('❌ Error en consultar:', error.message);
    return resp(500, { error: 'Error al consultar', datos: [] });
  }
};
