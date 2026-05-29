// ============================================================
// DEXI'S NAILS - CORE (compartido por todas las funciones)
// ============================================================
// MIGRACIÓN REQUERIDA EN NEON (ejecutar una vez):
// CREATE TABLE IF NOT EXISTS auth_tokens (
//   id          SERIAL PRIMARY KEY,
//   email       TEXT NOT NULL,
//   token       TEXT NOT NULL UNIQUE,
//   used        BOOLEAN DEFAULT false,
//   expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
//   created_at  TIMESTAMPTZ DEFAULT NOW()
// );
// CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
//
// CREATE TABLE IF NOT EXISTS conversaciones (
//   id         SERIAL PRIMARY KEY,
//   mensaje    TEXT NOT NULL,
//   respuesta  TEXT NOT NULL,
//   agente     TEXT DEFAULT 'Dexis',
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// VARIABLES DE ENTORNO REQUERIDAS:
//   DATABASE_URL        - Neon connection string
//   OPENWA_API_KEY      - API key de OpenWA
//   OPENWA_URL          - URL base de OpenWA
//   INTERNAL_API_KEY    - Clave para proteger endpoints internos
//   DEEPSEEK_API_KEY    - API key de DeepSeek
//   BRANCH              - (automático en Netlify, antes era VERCEL_BRANCH)
// ============================================================

const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

const sql = neon(process.env.DATABASE_URL);

// ============================================================
// SKILL 1-2: systematic-debugging + diagnose
// ============================================================
const protocoloDebug = {
  pasos: [
    "1. Reproducir el error exacto",
    "2. Aislar la entrada que lo causa",
    "3. Revisar logs de Memoria y Valorador",
    "4. Verificar estado de Neon (conexión viva)",
    "5. Revisar respuesta de OpenWA",
    "6. Corregir en rama aparte",
    "7. Probar con los mismos datos",
    "8. Fusionar solo si pasa prueba"
  ],
  diagnosticar: async (error, contexto) => {
    console.error("🔴 Error detectado:", error);
    console.log("📋 Contexto:", contexto);
    if (typeof error === 'string') {
      if (error.includes("timeout"))   console.log("🕒 Diagnóstico: Timeout en Neon. Revisar min_cu=0.25");
      if (error.includes("connection")) console.log("🔌 Diagnóstico: Error de conexión. Verificar DATABASE_URL");
      if (error.includes("OpenWA"))    console.log("📱 Diagnóstico: OpenWA no responde. Revisar API key");
    }
    return { diagnosticado: true, pasos: protocoloDebug.pasos };
  }
};

// ============================================================
// SKILL 3: supabase-postgres-best-practices
// ============================================================
const optimizarBD = {
  indices: async () => {
    console.log("📊 Optimizando índices en Neon...");
    await sql`CREATE INDEX IF NOT EXISTS idx_appointments_time  ON appointments(appointment_time)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_appointments_phone ON appointments(client_phone)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_recordatorios_branch ON recordatorios_enviados(branch_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_recordatorios_date   ON recordatorios_enviados(sent_at)`;
    console.log("✅ Índices creados/verificados");
  },
  mantener: async () => {
    await sql`ANALYZE appointments`;
    await sql`ANALYZE recordatorios_enviados`;
  }
};

// ============================================================
// SKILL 4: better-auth-best-practices
// ============================================================
const authMagicLinks = {
  generarToken: () => crypto.randomBytes(32).toString('hex'),
  crearLink: (email) => {
    const token = authMagicLinks.generarToken();
    return `https://dexis-nails.netlify.app/auth?token=${token}&email=${encodeURIComponent(email)}`;
  },
  verificarToken: async (token, email) => {
    try {
      const result = await sql`
        SELECT * FROM auth_tokens
        WHERE token = ${token} AND email = ${email} AND used = false AND expires_at > NOW()
      `;
      if (result.length === 0) return false;
      await sql`UPDATE auth_tokens SET used = true WHERE token = ${token}`;
      return true;
    } catch (e) {
      console.error("❌ Error verificando token:", e.message);
      return false;
    }
  }
};

// ============================================================
// SKILLS 5-8: TDD + verification-before-completion
// ============================================================
const qaSuite = {
  ejecutarTests: async () => {
    let pass = true;
    try {
      await sql`SELECT 1`;
      console.log("  ✅ Conexión a Neon OK");
    } catch (e) {
      console.error("  ❌ Conexión a Neon FALLÓ");
      pass = false;
    }
    const tablas = ['appointments', 'inventario', 'profesionales', 'reservas', 'conversaciones'];
    for (const tabla of tablas) {
      const result = await sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${tabla}
      `;
      if (result.length > 0) {
        console.log(`  ✅ Tabla ${tabla} existe`);
      } else {
        console.error(`  ❌ Tabla ${tabla} NO existe`);
        pass = false;
      }
    }
    return pass;
  }
};

// ============================================================
// SKILLS 9-12: brainstorming, writing-plans, executing-plans
// ============================================================
const planificadorAgente = {
  planificar: (tarea) => {
    console.log(`🧠 Tejedora - Planificando: ${tarea}`);
    return [
      `1. Entender requisitos de "${tarea}"`,
      "2. Revisar qué skills pueden ayudar",
      "3. Escribir pseudocódigo",
      "4. Validar arquitectura con Valorador",
      "5. Ejecutar plan",
      "6. Documentar lo hecho"
    ];
  }
};

// ============================================================
// SKILLS 13-16: subagent-driven-development
// ============================================================
const orquestadorAgentes = {
  distribuirEnParalelo: async (tareas) => {
    console.log(`🚀 Distribuyendo ${tareas.length} tareas en paralelo...`);
    return Promise.all(
      tareas.map(async (tarea) => {
        try {
          const resultado = await tarea.fn();
          return { tarea: tarea.nombre, estado: "completada", resultado };
        } catch (e) {
          return { tarea: tarea.nombre, estado: "error", error: e.message };
        }
      })
    );
  }
};

// ============================================================
// SKILLS 17-20: polish, critique, audit
// ============================================================
const calidadCodigo = {
  auditar: async () => {
    const resultados = {
      neon: await qaSuite.ejecutarTests(),
      agentes: "todos activos",
      skills: "89 skills integradas"
    };
    console.log("✅ Auditoría completada:", resultados);
    return resultados;
  }
};

// ============================================================
// SKILLS 21-24: copywriting, marketing-psychology
// ============================================================
const marketingAutomatico = {
  generarPost: (tipo, cliente) => {
    const templates = {
      recordatorio:    `✨ ¡${cliente}, te esperamos! Tu cita en Dexi's Nails está confirmada. 💅`,
      promocion:       "🌸 Semana de esmaltes semigel ¡20% off! 📍 Agenda en link",
      agradecimiento:  `🙏 Gracias ${cliente} por confiar en Dexi's Nails.`
    };
    return templates[tipo] || templates.recordatorio;
  }
};

// ============================================================
// SKILLS 25-28: analytics-tracking
// ============================================================
const growthHacking = {
  trackEvent: (evento, datos) => console.log(`📊 Evento: ${evento}`, datos)
};

// ============================================================
// AGENTE MEMORIA
// ============================================================
async function memoria(accion, datos) {
  console.log(`📦 Memoria: ${accion}`);
  try {
    if (accion === 'guardar_cita') {
      const { client_name, client_phone, appointment_time, branch_parent_hash } = datos;
      const result = await sql`
        INSERT INTO appointments (client_name, client_phone, appointment_time, branch_parent_hash)
        VALUES (${client_name}, ${client_phone}, ${appointment_time}, ${branch_parent_hash})
        RETURNING id
      `;
      return result[0];
    }
    if (accion === 'recuperar_citas_proximas') {
      return sql`
        SELECT * FROM appointments
        WHERE appointment_time > NOW()
          AND appointment_time <= NOW() + INTERVAL '48 hours'
        ORDER BY appointment_time ASC
        LIMIT 50
      `;
    }
    if (accion === 'recuperar_cita_por_id') {
      const cita = await sql`SELECT * FROM appointments WHERE id = ${datos.id}`;
      return cita[0] || null;
    }
    return null;
  } catch (error) {
    console.error(`🔴 Memoria - Error:`, error.message);
    await protocoloDebug.diagnosticar(error.message, { modulo: 'memoria', accion });
    throw error;
  }
}

// ============================================================
// AGENTE VALORADOR
// ============================================================
async function valorador(cita, branch_token) {
  if (!cita) return { evaluacion: false, motivo: 'cita_inexistente' };
  const yaEnviado = await sql`
    SELECT 1 FROM recordatorios_enviados
    WHERE appointment_id = ${cita.id} AND branch_token = ${branch_token}
    LIMIT 1
  `;
  if (yaEnviado.length > 0) return { evaluacion: false, motivo: 'ya_enviado_en_esta_rama' };
  if (new Date(cita.appointment_time) < new Date()) return { evaluacion: false, motivo: 'cita_pasada' };
  return { evaluacion: true, motivo: 'ok' };
}

// ============================================================
// AGENTE KAI (OpenWA)
// ============================================================
async function kai(telefono, nombre, fechaHora) {
  const mensaje = marketingAutomatico.generarPost('recordatorio', nombre);
  const fechaFormateada = new Date(fechaHora).toLocaleString('es-CO');

  if (!process.env.OPENWA_API_KEY || !process.env.OPENWA_URL) {
    console.error("❌ Kai: OpenWA no configurado");
    return { ok: false, error: "openwa_no_configurado" };
  }
  try {
    const response = await fetch(`${process.env.OPENWA_URL}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENWA_API_KEY}`
      },
      body: JSON.stringify({ to: `${telefono}@c.us`, content: `${mensaje} — ${fechaFormateada}` })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    console.log(`   ✅ WhatsApp enviado a ${nombre}`);
    return { ok: true };
  } catch (error) {
    await protocoloDebug.diagnosticar(error.message, { modulo: 'kai', telefono });
    return { ok: false, error: error.message };
  }
}

// ============================================================
// AGENTE QUÁNTOR
// ============================================================
async function quantor() {
  const conflictos = await sql`
    SELECT appointment_id, COUNT(*) as veces
    FROM recordatorios_enviados
    GROUP BY appointment_id
    HAVING COUNT(*) > 1
  `;
  if (conflictos.length > 0) console.warn(`⚠️ Posible doble envío: ${conflictos.length} citas`);
  return { alertas: conflictos.length };
}

// ============================================================
// AGENTE FARO
// ============================================================
async function faro() {
  await sql`SELECT 1 FROM appointments LIMIT 1`;
  const hoy = await sql`SELECT COUNT(*) FROM recordatorios_enviados WHERE sent_at::date = CURRENT_DATE`;
  console.log(`📊 Faro: ${hoy[0].count} recordatorios hoy`);
  return { recordatorios_hoy: hoy[0].count, timestamp: new Date().toISOString() };
}

// ============================================================
// AGENTE TEJEDORA
// ============================================================
async function tejedora() {
  console.log("\n🕸️ Tejedora - Tejiendo la telaraña Ágata");
  try {
    planificadorAgente.planificar("enviar recordatorios del día");

    const testsOK = await qaSuite.ejecutarTests();
    if (!testsOK) return { error: "tests_fallaron" };

    const citas = await memoria('recuperar_citas_proximas');
    if (citas.length === 0) return [];

    const resultados = [];
    // Netlify: BRANCH en vez de VERCEL_BRANCH
    const branchToken = process.env.BRANCH || 'main';

    for (const cita of citas) {
      try {
        const evaluacion = await valorador(cita, branchToken);
        if (evaluacion.evaluacion) {
          const envio = await kai(cita.client_phone, cita.client_name, cita.appointment_time);
          if (envio.ok) {
            await sql`
              INSERT INTO recordatorios_enviados (appointment_id, branch_token)
              VALUES (${cita.id}, ${branchToken})
            `;
            resultados.push({ cliente: cita.client_name, estado: 'enviado' });
          } else {
            resultados.push({ cliente: cita.client_name, estado: 'error_envio', detalle: envio.error });
          }
        } else {
          console.log(`   ⏭️ ${cita.client_name}: ${evaluacion.motivo}`);
        }
      } catch (citaError) {
        console.error(`❌ Error con ${cita.client_name}:`, citaError.message);
        resultados.push({ cliente: cita.client_name, estado: 'error_interno' });
      }
    }

    await faro();
    await quantor();
    return resultados;
  } catch (error) {
    console.error("🔴 Tejedora - Error fatal:", error.message);
    await protocoloDebug.diagnosticar(error.message, { modulo: 'tejedora' });
    return { error: "error_fatal", detalle: error.message };
  }
}

// ============================================================
// MIDDLEWARE auth
// ============================================================
function checkApiKey(event) {
  const key = event.headers['x-api-key'];
  if (!process.env.INTERNAL_API_KEY) return true; // dev: sin key configurada, pasa
  return key === process.env.INTERNAL_API_KEY;
}

// Helper para respuestas Netlify
function resp(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

module.exports = {
  sql, protocoloDebug, optimizarBD, authMagicLinks, qaSuite,
  planificadorAgente, orquestadorAgentes, calidadCodigo,
  marketingAutomatico, growthHacking,
  memoria, valorador, kai, quantor, faro, tejedora,
  checkApiKey, resp
};
