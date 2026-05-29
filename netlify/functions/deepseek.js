const { checkApiKey, resp } = require('./_core');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
  if (!checkApiKey(event)) return resp(401, { error: 'No autorizado' });

  try {
    const { mensaje, contexto, historial } = JSON.parse(event.body || '{}');

    if (process.env.DEEPSEEK_API_KEY) {
      const mensajes = [
        {
          role: 'system',
          content: `Eres Dexis, asistente virtual de Dexi's Nails, salón de manicure, podología y fragancias árabes en Colombia.
Eres amable, profesional y concisa. Ayudas a agendar citas, responder preguntas sobre servicios y precios.
${contexto?.servicios?.length ? `Servicios disponibles: ${JSON.stringify(contexto.servicios)}` : ''}
${contexto?.profesionales?.length ? `Profesionales: ${JSON.stringify(contexto.profesionales)}` : ''}
Responde SIEMPRE en español. Si el cliente quiere agendar, pide: nombre, teléfono y fecha deseada.`
        },
        ...(historial || []),
        { role: 'user', content: mensaje }
      ];

      const dsResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({ model: 'deepseek-chat', messages: mensajes, max_tokens: 500, temperature: 0.7 })
      });

      if (!dsResponse.ok) throw new Error(`DeepSeek HTTP ${dsResponse.status}`);

      const data = await dsResponse.json();
      const respuesta = data.choices?.[0]?.message?.content || 'No pude procesar tu mensaje.';
      const quiereReservar = /agend|reserv|cita|quiero|necesito/i.test(mensaje);

      return resp(200, { respuesta, accion: quiereReservar ? 'iniciar_reserva' : 'ninguna', params: null });
    }

    // Fallback desarrollo
    console.warn("⚠️ DEEPSEEK_API_KEY no configurada — fallback");
    return resp(200, {
      respuesta: `Hola, soy Dexis. Recibí: "${mensaje}". ¿En qué puedo ayudarte?`,
      accion: 'ninguna',
      params: null
    });

  } catch (error) {
    console.error('❌ Error en deepseek:', error.message);
    return resp(500, { respuesta: 'Tengo un problema técnico. Intenta de nuevo.', accion: 'ninguna' });
  }
};
