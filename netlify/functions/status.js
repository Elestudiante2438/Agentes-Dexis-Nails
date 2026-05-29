const { faro, quantor, checkApiKey, resp } = require('./_core');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return resp(405, { error: 'Method not allowed' });
  if (!checkApiKey(event)) return resp(401, { error: 'No autorizado' });

  const estadoFaro = await faro();
  const alertas    = await quantor();
  return resp(200, { status: 'ok', faro: estadoFaro, alertas: alertas.alertas });
};
