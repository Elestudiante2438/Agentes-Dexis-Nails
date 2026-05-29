import { camera, renderer, setTopView } from './scene.js';
import { planetFigures } from './environment.js';
import { startListening, stopListening } from './voice.js';

// =============================================
// TOOLTIPS PARA PLANETAS
// =============================================
function mostrarTooltip(planeta, datos) {
    let tooltip = document.getElementById('planet-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'planet-tooltip';
        tooltip.style.cssText = `
            position:fixed; background:rgba(0,0,0,0.9); backdrop-filter:blur(8px);
            color:#ffdd99; padding:8px 12px; border-radius:10px; font-size:11px;
            font-family:monospace; border:1px solid #ffaa66; z-index:1000;
            max-width:180px; white-space:normal; word-wrap:break-word;
            pointer-events:none; box-shadow:0 4px 12px rgba(0,0,0,0.5);
        `;
        document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = datos;
    tooltip.style.display = 'block';

    const vector = planeta.position.clone();
    vector.project(camera);
    const x = (vector.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
    const y = (-vector.y * 0.5 + 0.5) * renderer.domElement.clientHeight;

    let left = x + 15;
    let top  = y - 15;
    const tooltipRect = tooltip.getBoundingClientRect();
    if (left + tooltipRect.width  > window.innerWidth)  left = x - tooltipRect.width  - 15;
    if (top  + tooltipRect.height > window.innerHeight) top  = y - tooltipRect.height - 15;
    if (top  < 0) top  = 10;
    if (left < 0) left = 10;
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';

    if (window.innerWidth <= 768) setTimeout(() => ocultarTooltip(), 2500);
}

function ocultarTooltip() {
    const tooltip = document.getElementById('planet-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

// --- Raycaster ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(planetFigures);
    if (intersects.length > 0) {
        const planeta = intersects[0].object;
        mostrarTooltip(planeta, planeta.userData.texto || `${planeta.userData.name}\nPasa el mouse para ver datos`);
    } else {
        ocultarTooltip();
    }
});

window.addEventListener('touchstart', (event) => {
    if (event.touches.length) {
        const touch = event.touches[0];
        mouse.x = (touch.clientX / renderer.domElement.clientWidth) * 2 - 1;
        mouse.y = -(touch.clientY / renderer.domElement.clientHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(planetFigures);
        if (intersects.length > 0) {
            const planeta = intersects[0].object;
            mostrarTooltip(planeta, planeta.userData.texto || `${planeta.userData.name}\nToca para ver datos`);
        }
    }
});

// =============================================
// BOTONES TÁCTILES (Push-to-Talk)
// =============================================
const btnListen = document.getElementById('btn-listen');
const btnStop   = document.getElementById('btn-stop');
const btnReset  = document.getElementById('btn-reset');
let pressTimer  = null;
let isPressing  = false;

function startPressToTalk(e) {
    e.preventDefault();
    if (isPressing) return;
    isPressing = true;
    if (btnListen) { btnListen.style.background = '#6c5ce7'; btnListen.style.transform = 'scale(0.96)'; }
    startListening();
    pressTimer = setTimeout(() => { if (isPressing) stopPressToTalk(); }, 10000);
}

function stopPressToTalk() {
    if (!isPressing) return;
    isPressing = false;
    if (btnListen) { btnListen.style.background = ''; btnListen.style.transform = ''; }
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    stopListening();
}

if (btnListen) {
    btnListen.addEventListener('mousedown', startPressToTalk);
    btnListen.addEventListener('touchstart', startPressToTalk);
    window.addEventListener('mouseup', stopPressToTalk);
    window.addEventListener('touchend', stopPressToTalk);
}
if (btnStop)  btnStop.addEventListener('click',  () => { stopPressToTalk(); stopListening(); });
if (btnReset) btnReset.addEventListener('click', () => setTopView());

// =============================================
// TECLADO
// =============================================
window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'e') { e.preventDefault(); startListening(); }
    else if (k === 'm') { e.preventDefault(); stopListening(); }
    else if (k === 'r') { e.preventDefault(); setTopView(); }
});
