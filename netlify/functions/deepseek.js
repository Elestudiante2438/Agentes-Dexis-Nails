exports.handler = async (event) => {
    try {
        const { mensaje, contexto, historial } = JSON.parse(event.body || '{}');

        // Respuesta simulada pero útil para voz
        let respuesta = `Hola, soy Dexis. Recibí tu mensaje: "${mensaje}". `;

        if (contexto?.servicios?.length) {
            respuesta += `Tenemos ${contexto.servicios.length} servicios disponibles. `;
        }
        
        if (contexto?.inventario?.length) {
            respuesta += `Contamos con ${contexto.inventario.length} productos en inventario. `;
        }

        respuesta += `¿En qué más puedo ayudarte?`;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                respuesta,
                accion: 'ninguna',
                params: null
            })
        };
    } catch (error) {
        console.error('❌ Error en /api/deepseek:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                respuesta: 'Tengo un problema técnico. Intenta de nuevo.',
                accion: 'ninguna'
            })
        };
    }
};