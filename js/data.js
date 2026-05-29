// =============================================
// data.js — DEXIS: datos del backend + tooltips
// =============================================

// Función para obtener datos del backend
export async function obtenerDatos(endpoint) {
    try {
        const response = await fetch(endpoint);
        if (!response.ok) return null;
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error obteniendo ${endpoint}:`, error);
        return null;
    }
}

// Datos que se mostrarán en los planetas
export let datosSistema = {
    faro: null,
    tejedora: null,
    memoria: null,
    kai: null,
    quantor: null,
    valorador: null
};

// Cargar todos los datos al iniciar
export async function cargarDatos() {
    // Faro - estado general
    const status = await obtenerDatos('/api/status');
    if (status) datosSistema.faro = status;

    // Memoria - citas
    const citas = await obtenerDatos('/api/consultar?tabla=appointments');
    if (citas) datosSistema.memoria = citas;

    // Kai - conversaciones
    const conversaciones = await obtenerDatos('/api/consultar?tabla=conversaciones');
    if (conversaciones) datosSistema.kai = conversaciones;

    // Quántor - alertas (usando status)
    if (status) datosSistema.quantor = { alertas: status.alertas || 0 };

    // Valorador - reglas (simulado por ahora)
    datosSistema.valorador = { evaluaciones_hoy: 0 };

    // Tejedora - recordatorios de hoy
    if (status && status.faro) {
        datosSistema.tejedora = { recordatorios_hoy: status.faro.recordatorios_hoy || 0 };
    }

    console.log('📊 Datos cargados:', datosSistema);
}

// ---- Tooltips ----

export function mostrarTooltip(planeta, datos) {
    let tooltip = document.getElementById('planet-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'planet-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.backgroundColor = 'rgba(0,0,0,0.85)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '12px 18px';
        tooltip.style.borderRadius = '12px';
        tooltip.style.fontSize = '14px';
        tooltip.style.fontFamily = 'monospace';
        tooltip.style.border = '1px solid #ffaa66';
        tooltip.style.backdropFilter = 'blur(8px)';
        tooltip.style.zIndex = '1000';
        tooltip.style.maxWidth = '250px';
        tooltip.style.pointerEvents = 'none';
        document.body.appendChild(tooltip);
    }

    tooltip.innerHTML = datos;
    tooltip.style.display = 'block';

    document.addEventListener('mousemove', function mover(e) {
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top  = (e.clientY + 15) + 'px';
        document.removeEventListener('mousemove', mover);
    });
}

export function ocultarTooltip() {
    const tooltip = document.getElementById('planet-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}
