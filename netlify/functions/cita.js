const { memoria, checkApiKey, resp } = require('./_core');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
  if (!checkApiKey(event)) return resp(401, { error: 'No autorizado' });

  const { client_name, client_phone, appointment_time, branch_parent_hash } = JSON.parse(event.body || '{}');
  const nueva = await memoria('guardar_cita', { client_name, client_phone, appointment_time, branch_parent_hash });
  return resp(200, { status: 'ok', cita_id: nueva.id });
};
