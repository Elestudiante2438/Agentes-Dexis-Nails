exports.handler = async (event) => {
    try {
        const { mensaje, contexto, historial } = JSON.parse(event.body || '{}');

        if (!mensaje) {
            return {
                statusCode: 400,
                body: JSON.stringify({ respuesta: 'Mensaje vacío', accion: 'ninguna' })
            };
        }

        // System prompt con contexto dinámico
        let systemContent = `Eres Dexis, asistente delegada por Dexis Nails, un salón de belleza especializado en uñas, podología y faciales en Colombia. También comercializas colonias y perfumes de marcas árabes.
Nunca digas que eres IA, inteligencia artificial, virtual o robot.
Responde siempre en español colombiano, de forma cálida, concisa y profesional.
Máximo 2-3 oraciones por respuesta para que suene natural en voz.`;

        if (contexto?.servicios?.length) {
            systemContent += `\nServicios disponibles: ${JSON.stringify(contexto.servicios)}`;
        }
        if (contexto?.inventario?.length) {
            systemContent += `\nInventario: ${JSON.stringify(contexto.inventario)}`;
        }
        if (contexto?.profesionales?.length) {
            systemContent += `\nProfesionales: ${JSON.stringify(contexto.profesionales)}`;
        }
        if (contexto?.hora_actual) {
            systemContent += `\nHora actual: ${contexto.hora_actual}`;
        }

        // Construir mensajes
        const messages = [{ role: 'system', content: systemContent }];

        // Historial previo (últimos 6 turnos)
        if (historial?.length) {
            historial.slice(-6).forEach(h => messages.push(h));
        }

        // Mensaje actual
        messages.push({ role: 'user', content: mensaje });

        // Llamar a DeepSeek
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages,
                max_tokens: 300,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('❌ DeepSeek API error:', response.status, err);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    respuesta: 'Tengo un problema técnico en este momento. Intenta en unos segundos.',
                    accion: 'ninguna',
                    params: null
                })
            };
        }

        const data = await response.json();
        const respuesta = data.choices?.[0]?.message?.content?.trim()
            || 'No pude generar una respuesta. ¿Puedes repetir?';

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ respuesta, accion: 'ninguna', params: null })
        };

    } catch (error) {
        console.error('❌ Error en deepseek.js:', error.message);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                respuesta: 'Tengo un problema técnico. Intenta de nuevo.',
                accion: 'ninguna',
                params: null
            })
        };
    }
};
