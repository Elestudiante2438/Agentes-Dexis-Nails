// Netlify Scheduled Function
// Se ejecuta cada 4 horas (reemplaza node-cron '0 */4 * * *')
const { schedule } = require('@netlify/functions');
const { optimizarBD } = require('./_core');

const handler = async () => {
  console.log("🕒 CRON: Optimizando BD");
  await optimizarBD.indices();
  await optimizarBD.mantener();
  return { statusCode: 200 };
};

exports.handler = schedule('0 */4 * * *', handler);
