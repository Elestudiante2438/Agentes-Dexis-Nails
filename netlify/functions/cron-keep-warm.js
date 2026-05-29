// Netlify Scheduled Function
// Se ejecuta cada 4 minutos (reemplaza node-cron '*/4 * * * *')
// Mantiene Neon caliente para evitar cold starts
const { schedule } = require('@netlify/functions');
const { sql } = require('./_core');

const handler = async () => {
  await sql`SELECT 1 FROM appointments LIMIT 1`;
  console.log("🔥 Faro (cron): BD caliente");
  return { statusCode: 200 };
};

exports.handler = schedule('*/4 * * * *', handler);
