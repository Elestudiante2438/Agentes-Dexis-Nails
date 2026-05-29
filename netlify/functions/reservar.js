const { sql, checkApiKey, resp } = require('./_core');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
  if (!checkApiKey(event)) return resp(401, { error: 'No autorizado' });

  const { client_name, client_phone, appointment_time, servicio } = JSON.parse(event.body || '{}');

  if (!client_name || !client_phone || !appointment_time) {
    return resp(400, { error: 'Faltan datos: client_name, client_phone, appointment_time' });
  }

  try {
    // Intentar tabla reservas primero (estructura completa con campo servicio)
    const result = await sql`
      INSERT INTO reservas (client_name, client_phone, appointment_time, servicio)
      VALUES (${client_name}, ${client_phone}, ${appointment_time}, ${servicio || null})
      RETURNING id
    `;
    return resp(200, { ok: true, cita_id: result[0].id });
  } catch {
    // Fallback a appointments si reservas no tiene columna servicio todavía
    try {
      const result = await sql`
        INSERT INTO appointments (client_name, client_phone, appointment_time, branch_parent_hash)
        VALUES (${client_name}, ${client_phone}, ${appointment_time}, ${'web'})
        RETURNING id
      `;
      return resp(200, { ok: true, cita_id: result[0].id });
    } catch (error) {
      console.error('❌ Error en reservar:', error.message);
      return resp(500, { error: 'Error al crear reserva' });
    }
  }
};
