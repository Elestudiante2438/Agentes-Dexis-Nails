// ============================================
// DATA - Conexión con backend y tooltips
// ============================================

export let datosSistema = {
    faro: null,
    tejedora: null,
    memoria: null,
    kai: null,
    quantor: null,
    valorador: null,
    inventario: null,
    enseres: null
};

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

export async function cargarDatos() {
    console.log('📊 Cargando datos del sistema...');
    
    const status = await obtenerDatos('/api/status');
    if (status) datosSistema.faro = status;
    
    const citas = await obtenerDatos('/api/consultar?tabla=appointments');
    if (citas) datosSistema.memoria = citas;
    
    const conversaciones = await obtenerDatos('/api/consultar?tabla=conversaciones');
    if (conversaciones) datosSistema.kai = conversaciones;
    
    if (status) datosSistema.quantor = { alertas: status.alertas || 0 };
    
    datosSistema.valorador = { evaluaciones_hoy: 0 };
    
    if (status && status.faro) {
        datosSistema.tejedora = { recordatorios_hoy: status.faro.recordatorios_hoy || 0 };
    }
    
    const inventarioData = await obtenerDatos('/api/consultar?tabla=inventario');
    if (inventarioData && inventarioData.datos) {
        datosSistema.inventario = inventarioData.datos;
    }
    
    const enseresData = await obtenerDatos('/api/consultar?tabla=enseres');
    if (enseresData && enseresData.datos) {
        datosSistema.enseres = enseresData.datos;
    }
    
    console.log('📊 Datos cargados:', {
        faro: datosSistema.faro?.status,
        citas: datosSistema.memoria?.datos?.length,
        inventario: datosSistema.inventario?.length,
        enseres: datosSistema.enseres?.length
    });
}

export function mostrarTooltip(planeta, datos) {
    let tooltip = document.getElementById('planet-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'planet-tooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        tooltip.style.backdropFilter = 'blur(8px)';
        tooltip.style.color = '#ffdd99';
        tooltip.style.padding = '10px 16px';
        tooltip.style.borderRadius = '12px';
        tooltip.style.fontSize = '12px';
        tooltip.style.fontFamily = 'monospace';
        tooltip.style.border = '1px solid #ffaa66';
        tooltip.style.zIndex = '1000';
        tooltip.style.maxWidth = '220px';
        tooltip.style.whiteSpace = 'normal';
        tooltip.style.wordWrap = 'break-word';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        document.body.appendChild(tooltip);
    }
    
    tooltip.innerHTML = datos;
    tooltip.style.display = 'block';
    
    const updatePosition = (e) => {
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        tooltip.style.left = (clientX + 15) + 'px';
        tooltip.style.top = (clientY + 15) + 'px';
    };
    
    const onMove = (e) => {
        updatePosition(e);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove);
    
    if (window.innerWidth <= 768) {
        setTimeout(() => ocultarTooltip(), 3000);
    }
}

export function ocultarTooltip() {
    const tooltip = document.getElementById('planet-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}