// =============================================
// main.js — Punto de entrada de Dexis
// Importa todos los módulos y arranca el universo
// =============================================

console.log('✅ main.js iniciado');

// Escena, cámara, luces, núcleo, partículas y estrellas
import './scene.js';

// Planetas con texturas procedurales
import './planets.js';

// Naves orbitales
import './ships.js';

// Voz, animación y eventos UI (también inicia el loop)
import { animate } from './voice.js';

// Carga de datos del backend
import { cargarDatos } from './data.js';

// Arrancar
animate();
cargarDatos();

console.log('✨ Dexis — Universo 3D mejorado ✨');
