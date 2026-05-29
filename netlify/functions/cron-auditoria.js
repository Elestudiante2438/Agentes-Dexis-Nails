// Netlify Scheduled Function
// Se ejecuta todos los días a las 9am (reemplaza node-cron '0 9 * * *')
const { schedule } = require('@netlify/functions');
const { calidadCodigo } = require('./_core');

const handler = async () => {
  console.log("📋 CRON: Auditoría diaria");
  await calidadCodigo.auditar();
  return { statusCode: 200 };
};

exports.handler = schedule('0 9 * * *', handler);
