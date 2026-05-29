const { tejedora, checkApiKey, resp } = require('./_core');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
  if (!checkApiKey(event)) return resp(401, { error: 'No autorizado' });

  const resultados = await tejedora();
  return resp(200, { status: 'ok', resultados });
};
