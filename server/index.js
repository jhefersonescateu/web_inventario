import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { createClient } from '@libsql/client';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// ── CONFIGURACIÓN TURSO DB (9 GB GRATIS) ────────────────────────────────────
let rawTursoUrl = process.env.TURSO_DATABASE_URL || 'https://inventario-colegios-jhefersonescateu.aws-us-east-1.turso.io';
if (rawTursoUrl.startsWith('libsql://')) {
  rawTursoUrl = rawTursoUrl.replace('libsql://', 'https://');
}
const TURSO_URL   = rawTursoUrl;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAwMTkzMTAsImlkIjoiMDFhMGM1NzEtY2IwMS03YWZjLTg2ZWYtYjQ5YmJmYjRmMjhiIiwia2lkIjoiZ01tVHpYUEZLRXIxQm01bHFwaWhOQXVDYjRvNzNZaG5CM0VjWUVJcFc2cyIsInJpZCI6IjM2OWZkMTA4LTVmYzktNDA5Ny05ZWFmLWRjNzhiN2Q4NjdkNiJ9.BQ0TRrN6TIen-KAIBl9whWTtUf6GslEV6lfd2gH1LORnKi3Q4uaNWpauUCW1NDVQOeMt7QO9OVBQXibJhqJ1CA';

const db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
let isTursoConnected = false;
let dbInitPromise = null;

// ── HELPER TABLA POR COLEGIO DINÁMICA ──────────────────────────────────────
const createdTablesSet = new Set(['inventario_quinones']);

function getSchoolTableName(codigo) {
  if (!codigo || !codigo.trim()) return 'inventario_quinones';
  const clean = codigo
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!clean || clean === 'quinones') return 'inventario_quinones';
  return `inventario_${clean}`;
}

async function ensureSchoolTableExists(tableName) {
  if (!tableName) return 'inventario_quinones';
  const safeName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
  if (!safeName) return 'inventario_quinones';
  if (createdTablesSet.has(safeName)) return safeName;

  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ${safeName} (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        code          TEXT    NOT NULL UNIQUE,
        name          TEXT    NOT NULL,
        category      TEXT    DEFAULT 'Equipos Tecnológicos',
        colegio       TEXT    DEFAULT '',
        location      TEXT    DEFAULT '',
        quantity      INTEGER DEFAULT 1,
        status        TEXT    DEFAULT 'Bueno',
        situacion     TEXT    DEFAULT '',
        brand         TEXT    DEFAULT '',
        model         TEXT    DEFAULT '',
        serialNumber  TEXT    DEFAULT '',
        alto          REAL,
        ancho         REAL,
        largo         REAL,
        tipoMaterial  TEXT    DEFAULT '',
        color         TEXT    DEFAULT '',
        details       TEXT    DEFAULT '',
        notes         TEXT    DEFAULT '',
        customFields  TEXT    DEFAULT '{}',
        specs         TEXT    DEFAULT '{}',
        educationalLevel TEXT DEFAULT '',
        responsible   TEXT    DEFAULT '',
        verified      INTEGER DEFAULT 1,
        scannedByDni  TEXT    DEFAULT '',
        scannedAt     TEXT    DEFAULT '',
        created_at    TEXT    DEFAULT (datetime('now')),
        updated_at    TEXT    DEFAULT (datetime('now'))
      )
    `);
    createdTablesSet.add(safeName);
    console.log(`✨ Tabla de inventario asegurada: ${safeName}`);
  } catch (err) {
    console.error(`❌ Error al crear tabla ${safeName}:`, err.message);
  }
  return safeName;
}

async function resolveSchoolTable(colegio) {
  if (!colegio || !colegio.trim()) return 'inventario_quinones';
  const cleanCode = colegio.trim().toUpperCase();

  try {
    const res = await db.execute({
      sql: 'SELECT tabla_inventario FROM registro_colegios WHERE UPPER(codigo) = ?',
      args: [cleanCode]
    });
    if (res.rows.length > 0 && res.rows[0].tabla_inventario) {
      const tName = res.rows[0].tabla_inventario;
      await ensureSchoolTableExists(tName);
      return tName;
    }
  } catch (e) {}

  const dynamicName = getSchoolTableName(cleanCode);
  await ensureSchoolTableExists(dynamicName);
  return dynamicName;
}

// ── INICIALIZAR TABLAS EN TURSO ──────────────────────────────────────────────
async function initDatabase() {
  try {
    await db.batch([
      // Tabla general de registro de colegios y sus tablas asociadas
      `CREATE TABLE IF NOT EXISTS registro_colegios (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo              TEXT    NOT NULL UNIQUE,
        institucion         TEXT    NOT NULL,
        tabla_inventario    TEXT    NOT NULL UNIQUE,
        encargado_nombre    TEXT    DEFAULT '',
        encargado_telefono  TEXT    DEFAULT '',
        direccion           TEXT    DEFAULT '',
        activo              INTEGER DEFAULT 1,
        created_at          TEXT    DEFAULT (datetime('now'))
      )`,
      // Tabla principal por defecto de bienes patrimoniales
      `CREATE TABLE IF NOT EXISTS inventario_quinones (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        code          TEXT    NOT NULL UNIQUE,
        name          TEXT    NOT NULL,
        category      TEXT    DEFAULT 'Equipos Tecnológicos',
        colegio       TEXT    DEFAULT 'QUIÑONES',
        location      TEXT    DEFAULT '',
        quantity      INTEGER DEFAULT 1,
        status        TEXT    DEFAULT 'Bueno',
        situacion     TEXT    DEFAULT '',
        brand         TEXT    DEFAULT '',
        model         TEXT    DEFAULT '',
        serialNumber  TEXT    DEFAULT '',
        alto          REAL,
        ancho         REAL,
        largo         REAL,
        tipoMaterial  TEXT    DEFAULT '',
        color         TEXT    DEFAULT '',
        details       TEXT    DEFAULT '',
        notes         TEXT    DEFAULT '',
        customFields  TEXT    DEFAULT '{}',
        specs         TEXT    DEFAULT '{}',
        educationalLevel TEXT DEFAULT '',
        responsible   TEXT    DEFAULT '',
        verified      INTEGER DEFAULT 1,
        scannedByDni  TEXT    DEFAULT '',
        scannedAt     TEXT    DEFAULT '',
        created_at    TEXT    DEFAULT (datetime('now')),
        updated_at    TEXT    DEFAULT (datetime('now'))
      )`,
      // Tabla de sesiones de inventario por ambiente
      `CREATE TABLE IF NOT EXISTS inventario_sesiones (
        id                  TEXT    PRIMARY KEY,
        codigoInventariado  TEXT    NOT NULL,
        dni                 TEXT    NOT NULL,
        ambiente            TEXT    NOT NULL,
        colegio             TEXT    DEFAULT 'QUIÑONES',
        estado              TEXT    DEFAULT 'abierta',
        fechaInicio         TEXT    DEFAULT (datetime('now')),
        fechaFin            TEXT
      )`,
      // Tabla de detalles de escaneos por sesión
      `CREATE TABLE IF NOT EXISTS inventario_detalles (
        id               TEXT    PRIMARY KEY,
        sesionId         TEXT    NOT NULL,
        codigoBien       TEXT    NOT NULL,
        nombreBien       TEXT    DEFAULT '',
        ambienteOriginal TEXT    DEFAULT '',
        estadoBien       TEXT    NOT NULL,
        scannedAt        TEXT    DEFAULT (datetime('now')),
        FOREIGN KEY (sesionId) REFERENCES inventario_sesiones(id)
      )`,
      // Tabla de acceso para credenciales de administradores
      `CREATE TABLE IF NOT EXISTS acceso (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        email       TEXT    NOT NULL UNIQUE,
        password    TEXT    NOT NULL,
        activo      INTEGER DEFAULT 1,
        created_at  TEXT    DEFAULT (datetime('now'))
      )`,
      // Tabla de administración (compatibilidad)
      `CREATE TABLE IF NOT EXISTS administracion (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo              TEXT    NOT NULL UNIQUE,
        institucion         TEXT    NOT NULL,
        encargado_nombre    TEXT    DEFAULT '',
        encargado_telefono  TEXT    DEFAULT '',
        direccion           TEXT    DEFAULT '',
        activo              INTEGER DEFAULT 1,
        created_at          TEXT    DEFAULT (datetime('now'))
      )`,
      // Tabla de códigos de acceso (compatibilidad)
      `CREATE TABLE IF NOT EXISTS codigos_acceso (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo      TEXT    NOT NULL UNIQUE,
        institucion TEXT    NOT NULL,
        activo      INTEGER DEFAULT 1,
        created_at  TEXT    DEFAULT (datetime('now'))
      )`
    ], 'write');

    // Migraciones automáticas
    try { await db.execute(`ALTER TABLE administracion ADD COLUMN encargado_nombre TEXT DEFAULT ''`); } catch (e) {}
    try { await db.execute(`ALTER TABLE administracion ADD COLUMN encargado_telefono TEXT DEFAULT ''`); } catch (e) {}
    try { await db.execute(`ALTER TABLE administracion ADD COLUMN direccion TEXT DEFAULT ''`); } catch (e) {}

    // Insertar colegio por defecto si no existe
    await db.execute(`
      INSERT OR IGNORE INTO registro_colegios (codigo, institucion, tabla_inventario)
      VALUES ('QUIÑONES', 'I.E. JOSÉ ABELARDO QUIÑONES', 'inventario_quinones')
    `);
    await db.execute(`
      INSERT OR IGNORE INTO administracion (codigo, institucion)
      VALUES ('QUIÑONES', 'I.E. JOSÉ ABELARDO QUIÑONES')
    `);

    // Sincronizar administracion -> registro_colegios
    try {
      const adminRows = await db.execute('SELECT * FROM administracion');
      for (const row of adminRows.rows) {
        const tableN = getSchoolTableName(row.codigo);
        await db.execute({
          sql: `INSERT OR IGNORE INTO registro_colegios
                (codigo, institucion, tabla_inventario, encargado_nombre, encargado_telefono, direccion, activo)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [row.codigo, row.institucion || row.codigo, tableN, row.encargado_nombre || '', row.encargado_telefono || '', row.direccion || '', row.activo ?? 1]
        });
        await ensureSchoolTableExists(tableN);
      }
    } catch (syncErr) {
      console.error('Error al sincronizar registro_colegios:', syncErr.message);
    }

    // Insertar credenciales de administrador por defecto en la tabla acceso si no existen
    await db.execute(
      `INSERT OR IGNORE INTO acceso (email, password)
       VALUES ('admin@gmail.com', '990246774')`
    );

    isTursoConnected = true;
    console.log('🗄️  Conectado exitosamente a Turso DB (SQLite en la Nube)');
    console.log('📋 Tablas: registro_colegios | inventario_quinones | inventario_sesiones | inventario_detalles | acceso | administracion');
  } catch (err) {
    console.error('❌ Error al inicializar Turso DB:', err.message);
  }
}

function ensureDbInitialized() {
  if (!dbInitPromise) {
    dbInitPromise = initDatabase();
  }
  return dbInitPromise;
}

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Middleware para garantizar que Turso DB y sus tablas estén listas antes de responder cualquier API
app.use(async (req, res, next) => {
  try {
    await ensureDbInitialized();
  } catch (e) {
    console.error('Error awaiting DB init:', e);
  }
  next();
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function parseJson(str) {
  try { return JSON.parse(str || '{}'); } catch { return {}; }
}

function rowToItem(row) {
  if (!row) return null;
  return {
    ...row,
    id: row.id?.toString(),
    customFields: parseJson(row.customFields),
    specs: parseJson(row.specs),
    quantity: Number(row.quantity) || 1,
    verified: Boolean(row.verified),
    alto: row.alto != null ? Number(row.alto) : null,
    ancho: row.ancho != null ? Number(row.ancho) : null,
    largo: row.largo != null ? Number(row.largo) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ── RESUMEN DE SESIÓN (encontrados, sobrantes, faltantes) ────────────────────
async function obtenerResumenSesion(sesion) {
  const sesionId = sesion.id;
  const ambiente = sesion.ambiente;
  const colegio  = sesion.colegio;

  const detallesRes = await db.execute({
    sql: 'SELECT * FROM inventario_detalles WHERE sesionId = ?',
    args: [sesionId]
  });
  const detalles = detallesRes.rows;

  let bienesSql = 'SELECT * FROM inventario_quinones WHERE LOWER(TRIM(location)) = LOWER(TRIM(?))';
  const bienesArgs = [ambiente];
  if (colegio) {
    bienesSql += ' AND UPPER(colegio) = UPPER(?)';
    bienesArgs.push(colegio.trim());
  }

  const bienesRes = await db.execute({
    sql: bienesSql,
    args: bienesArgs
  });
  const bienesDelAmbiente = bienesRes.rows;

  const codigosEscaneadosSet = new Set(detalles.map(d => (d.codigoBien || '').trim().toUpperCase()));
  const encontrados = detalles.filter(d => d.estadoBien === 'encontrado');
  const sobrantes   = detalles.filter(d => d.estadoBien === 'sobrante');
  const faltantes   = bienesDelAmbiente.filter(b => !codigosEscaneadosSet.has((b.code || '').trim().toUpperCase()));

  return {
    totales: {
      encontrados: encontrados.length,
      faltantes: faltantes.length,
      sobrantes: sobrantes.length,
      totalAmbiente: bienesDelAmbiente.length
    },
    encontrados,
    sobrantes,
    faltantes
  };
}

// ── WEBSOCKET ─────────────────────────────────────────────────────────────────
const clients = new Set();
let wss = null;

if (!process.env.VERCEL) {
  try {
    wss = new WebSocketServer({ server });
    wss.on('connection', (ws) => {
      clients.add(ws);
      console.log('📱 Cliente conectado vía WebSocket');

      ws.send(JSON.stringify({
        type: 'CONNECTED',
        message: 'Conectado al servidor Stockpile Real + Turso DB (5 GB Gratis)',
        tursoStatus: isTursoConnected ? 'connected' : 'connecting'
      }));

      ws.on('close', () => { clients.delete(ws); });
      ws.on('error', (err) => { console.error('WebSocket Error:', err); });
    });
  } catch (err) {
    console.log('⚠️ WebSocket no inicializado en entorno serverless.');
  }
}

function broadcastScanEvent(data) {
  if (!clients.size) return;
  const payload = JSON.stringify({ type: 'QR_SCANNED', timestamp: new Date().toISOString(), ...data });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  });
}

// ── REST ENDPOINTS ────────────────────────────────────────────────────────────

// 1. Login — Valida código contra la tabla general registro_colegios y verifica si está OPERATIVO
app.post('/api/auth/login', async (req, res) => {
  const { code } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, message: 'Código de colegio requerido' });
  }
  const normalized = code.trim().toUpperCase();

  try {
    // Buscar el código en registro_colegios
    let result = await db.execute({
      sql: 'SELECT * FROM registro_colegios WHERE UPPER(codigo) = ?',
      args: [normalized]
    });

    // Fallback a la tabla administracion o codigos_acceso si no está en registro_colegios
    if (result.rows.length === 0) {
      result = await db.execute({
        sql: 'SELECT * FROM administracion WHERE UPPER(codigo) = ?',
        args: [normalized]
      });
    }

    if (result.rows.length === 0) {
      console.log(`🚫 Código de acceso rechazado (no existe): ${normalized}`);
      return res.status(401).json({
        success: false,
        message: '❌ Código no autorizado. No existe en el registro de colegios.'
      });
    }

    const registro = result.rows[0];

    // VERIFICAR ESTADO OPERATIVO (activo === 1)
    if (registro.activo !== 1) {
      console.log(`⛔ Código desactivado / No operativo: ${normalized}`);
      return res.status(401).json({
        success: false,
        message: `❌ El código "${normalized}" está INACTIVO / NO OPERATIVO. Contacte al administrador para activarlo.`
      });
    }

    const institution = registro.institucion || normalized;
    const tableName = registro.tabla_inventario || getSchoolTableName(normalized);
    await ensureSchoolTableExists(tableName);

    console.log(`🔑 Login exitoso: ${normalized} → ${institution} | Tabla: ${tableName}`);
    return res.json({
      success: true,
      message: 'Acceso verificado. Código en estado Operativo.',
      colegio: normalized,
      institution,
      tabla: tableName,
      estado: 'operativo',
      year: 2026
    });
  } catch (err) {
    console.error('Error al verificar código de acceso:', err.message);
    return res.status(500).json({ success: false, message: 'Error al verificar el código. Intente nuevamente.' });
  }
});

// 1.1 POST /api/auth/admin-login — Autenticación de Administrador consultando la tabla acceso en Turso DB
app.post('/api/auth/admin-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !email.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña son requeridos' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  try {
    const result = await db.execute({
      sql: 'SELECT * FROM acceso WHERE LOWER(email) = ? AND password = ? AND activo = 1',
      args: [cleanEmail, cleanPass]
    });

    if (result.rows.length > 0) {
      console.log(`🛡️ Acceso concedido al Panel Administrativo desde Turso DB para: ${cleanEmail}`);
      return res.json({ success: true, message: 'Autenticación de administrador exitosa.' });
    }

    console.log(`🚫 Intento fallido de login de administrador (no encontrado en tabla acceso): ${cleanEmail}`);
    return res.status(401).json({ success: false, message: '❌ Credenciales de administrador incorrectas.' });
  } catch (err) {
    console.error('Error al verificar acceso en Turso DB:', err.message);
    return res.status(500).json({ success: false, message: 'Error de servidor al validar credenciales.' });
  }
});

// 1b. GET /api/registro-colegios & GET /api/administracion — Lista general de colegios y códigos
const getSchoolsHandler = async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM registro_colegios ORDER BY created_at DESC');
    const codigos = result.rows.map(row => ({
      ...row,
      tabla_inventario: row.tabla_inventario || getSchoolTableName(row.codigo),
      estado_operativo: row.activo === 1 ? 'Operativo' : 'Inactivo'
    }));
    return res.json({ success: true, count: codigos.length, codigos });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/registro-colegios', getSchoolsHandler);
app.get('/api/administracion',     getSchoolsHandler);

// 1c. POST /api/registro-colegios & POST /api/administracion — Crear nuevo colegio y generar su tabla de inventario dinámica
const saveSchoolHandler = async (req, res) => {
  const { codigo, institucion, encargado_nombre, encargado_telefono, direccion } = req.body;
  if (!codigo || !codigo.trim()) {
    return res.status(400).json({ success: false, message: 'El campo "codigo" es obligatorio' });
  }
  const cleanCodigo = codigo.trim().toUpperCase();
  const cleanInst = (institucion || cleanCodigo).trim();
  const cleanEncargado = (encargado_nombre || '').trim();
  const cleanTel = (encargado_telefono || '').trim();
  const cleanDir = (direccion || '').trim();
  const tableName = getSchoolTableName(cleanCodigo);

  try {
    // 1. Crear tabla propia de inventario para este colegio
    await ensureSchoolTableExists(tableName);

    // 2. Registrar en la tabla general registro_colegios
    await db.execute({
      sql: `INSERT INTO registro_colegios (codigo, institucion, tabla_inventario, encargado_nombre, encargado_telefono, direccion, activo)
            VALUES (?, ?, ?, ?, ?, ?, 1)`,
      args: [cleanCodigo, cleanInst, tableName, cleanEncargado, cleanTel, cleanDir]
    });

    // 3. Sincronizar también en administracion y codigos_acceso por compatibilidad
    await db.execute({
      sql: `INSERT OR IGNORE INTO administracion (codigo, institucion, encargado_nombre, encargado_telefono, direccion, activo)
            VALUES (?, ?, ?, ?, ?, 1)`,
      args: [cleanCodigo, cleanInst, cleanEncargado, cleanTel, cleanDir]
    });
    await db.execute({
      sql: 'INSERT OR IGNORE INTO codigos_acceso (codigo, institucion) VALUES (?, ?)',
      args: [cleanCodigo, cleanInst]
    });

    console.log(`➕ Colegio Creado: ${cleanCodigo} (${cleanInst}) → Tabla Creada: "${tableName}"`);
    return res.json({
      success: true,
      message: `Colegio ${cleanCodigo} registrado exitosamente. Se ha creado la tabla "${tableName}" en la base de datos.`,
      codigo: cleanCodigo,
      institucion: cleanInst,
      tabla: tableName
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: `El código "${cleanCodigo}" ya existe en el registro de colegios.` });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/registro-colegios', saveSchoolHandler);
app.post('/api/administracion',     saveSchoolHandler);

// 1d. PUT /api/administracion/:id & /api/registro-colegios/:id — Editar información de un colegio
const updateSchoolHandler = async (req, res) => {
  const { id } = req.params;
  const { codigo, institucion, encargado_nombre, encargado_telefono, direccion } = req.body;
  if (!codigo || !codigo.trim()) {
    return res.status(400).json({ success: false, message: 'El código es obligatorio.' });
  }
  const cleanCodigo = codigo.trim().toUpperCase();
  const cleanInst = (institucion || cleanCodigo).trim();
  const cleanEncargado = (encargado_nombre || '').trim();
  const cleanTel = (encargado_telefono || '').trim();
  const cleanDir = (direccion || '').trim();
  const tableName = getSchoolTableName(cleanCodigo);

  try {
    await ensureSchoolTableExists(tableName);

    await db.execute({
      sql: `UPDATE registro_colegios SET codigo = ?, institucion = ?, tabla_inventario = ?, encargado_nombre = ?, encargado_telefono = ?, direccion = ? WHERE id = ?`,
      args: [cleanCodigo, cleanInst, tableName, cleanEncargado, cleanTel, cleanDir, id]
    });

    await db.execute({
      sql: `UPDATE administracion SET codigo = ?, institucion = ?, encargado_nombre = ?, encargado_telefono = ?, direccion = ? WHERE id = ? OR UPPER(codigo) = UPPER(?)`,
      args: [cleanCodigo, cleanInst, cleanEncargado, cleanTel, cleanDir, id, cleanCodigo]
    });

    console.log(`✏️ Colegio actualizado (ID: ${id}): ${cleanCodigo} -> Tabla: ${tableName}`);
    return res.json({ success: true, message: `Información de ${cleanCodigo} actualizada correctamente.`, tabla: tableName });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.put('/api/registro-colegios/:id', updateSchoolHandler);
app.put('/api/administracion/:id',     updateSchoolHandler);

// 1e. PATCH /api/administracion/:id/toggle & /api/registro-colegios/:id/toggle — Activar / Desactivar código (Estado Operativo)
const toggleSchoolHandler = async (req, res) => {
  const { id } = req.params;
  try {
    const curr = await db.execute({ sql: 'SELECT codigo, activo FROM registro_colegios WHERE id = ?', args: [id] });
    let record = curr.rows[0];
    if (!record) {
      const fallback = await db.execute({ sql: 'SELECT codigo, activo FROM administracion WHERE id = ?', args: [id] });
      record = fallback.rows[0];
    }
    if (!record) return res.status(404).json({ success: false, message: 'Código no encontrado' });

    const newStatus = record.activo === 1 ? 0 : 1;
    const codigo = record.codigo;

    await db.execute({ sql: 'UPDATE registro_colegios SET activo = ? WHERE id = ? OR UPPER(codigo) = UPPER(?)', args: [newStatus, id, codigo] });
    await db.execute({ sql: 'UPDATE administracion SET activo = ? WHERE id = ? OR UPPER(codigo) = UPPER(?)', args: [newStatus, id, codigo] });
    await db.execute({ sql: 'UPDATE codigos_acceso SET activo = ? WHERE UPPER(codigo) = UPPER(?)', args: [newStatus, codigo] });

    const statusText = newStatus === 1 ? 'ACTIVADO (Operativo)' : 'DESACTIVADO (No Operativo)';
    console.log(`🔄 Colegio ${codigo} ${statusText}`);
    return res.json({ success: true, message: `Código ${codigo} ${statusText} correctamente.`, activo: newStatus, estado: newStatus === 1 ? 'Operativo' : 'Inactivo' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.patch('/api/registro-colegios/:id/toggle', toggleSchoolHandler);
app.patch('/api/administracion/:id/toggle',     toggleSchoolHandler);

// 1f. DELETE /api/administracion/:id & /api/registro-colegios/:id — Eliminar un colegio
const deleteSchoolHandler = async (req, res) => {
  const { id } = req.params;
  try {
    const itemRes = await db.execute({ sql: 'SELECT codigo FROM registro_colegios WHERE id = ?', args: [id] });
    const item = itemRes.rows[0];
    const codigo = item ? item.codigo : '';

    await db.execute({ sql: 'DELETE FROM registro_colegios WHERE id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM administracion WHERE id = ? OR UPPER(codigo) = UPPER(?)', args: [id, codigo] });
    if (codigo) {
      await db.execute({ sql: 'DELETE FROM codigos_acceso WHERE UPPER(codigo) = UPPER(?)', args: [codigo] });
    }

    console.log(`🗑️ Colegio eliminado (ID: ${id})`);
    return res.json({ success: true, message: 'Colegio eliminado del registro.' });
  } catch (err) {
    console.error('Error al eliminar colegio:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

app.delete('/api/registro-colegios/:id', deleteSchoolHandler);
app.delete('/api/administracion/:id',     deleteSchoolHandler);

// 2. Obtener Inventario (filtrado por colegio / tabla específica)
app.get('/api/inventory', async (req, res) => {
  try {
    const { colegio } = req.query;
    const tableName = await resolveSchoolTable(colegio);
    const result = await db.execute(`SELECT * FROM ${tableName} ORDER BY updated_at DESC`);
    const items = result.rows.map(rowToItem);
    return res.json({ success: true, count: items.length, items, colegio: colegio || 'Todos', tabla: tableName, source: 'Turso DB' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Guardar / Actualizar Bien Patrimonial en la Tabla Específica del Colegio
const saveInventoryHandler = async (req, res) => {
  const d = req.body;
  if (!d || !d.code) return res.status(400).json({ success: false, message: 'Falta código del bien' });

  try {
    const code = (d.code || '').trim().toUpperCase();
    const colegioCode = (d.colegio || 'QUIÑONES').trim();
    const tableName = await resolveSchoolTable(colegioCode);

    await db.execute({
      sql: `INSERT INTO ${tableName}
              (code, name, category, colegio, location, quantity, status, situacion,
               brand, model, serialNumber, alto, ancho, largo, tipoMaterial, color,
               details, notes, customFields, specs, educationalLevel, responsible,
               verified, scannedByDni, scannedAt, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
            ON CONFLICT(code) DO UPDATE SET
              name=excluded.name, category=excluded.category, colegio=excluded.colegio,
              location=excluded.location, quantity=excluded.quantity, status=excluded.status,
              situacion=excluded.situacion, brand=excluded.brand, model=excluded.model,
              serialNumber=excluded.serialNumber, alto=excluded.alto, ancho=excluded.ancho,
              largo=excluded.largo, tipoMaterial=excluded.tipoMaterial, color=excluded.color,
              details=excluded.details, notes=excluded.notes, customFields=excluded.customFields,
              specs=excluded.specs, educationalLevel=excluded.educationalLevel,
              responsible=excluded.responsible, verified=excluded.verified,
              scannedByDni=excluded.scannedByDni, scannedAt=excluded.scannedAt,
              updated_at=datetime('now')`,
      args: [
        code,
        d.name || '',
        d.category || 'Equipos Tecnológicos',
        colegioCode.toUpperCase(),
        d.location || '',
        Number(d.quantity) || 1,
        d.status || 'Bueno',
        d.situacion || '',
        d.brand || '',
        d.model || '',
        d.serialNumber || '',
        d.alto != null ? Number(d.alto) : null,
        d.ancho != null ? Number(d.ancho) : null,
        d.largo != null ? Number(d.largo) : null,
        d.tipoMaterial || '',
        d.color || '',
        d.details || '',
        d.notes || '',
        typeof d.customFields === 'object' ? JSON.stringify(d.customFields) : (d.customFields || '{}'),
        typeof d.specs === 'object' ? JSON.stringify(d.specs) : (d.specs || '{}'),
        d.educationalLevel || '',
        d.responsible || '',
        1,
        d.scannedByDni || '',
        d.scannedAt || new Date().toLocaleString()
      ]
    });

    const saved = await db.execute({ sql: `SELECT * FROM ${tableName} WHERE code = ?`, args: [code] });
    const savedItem = rowToItem(saved.rows[0]);
    console.log(`💾 Bien guardado en ${tableName}: ${code} - ${d.name}`);
    broadcastScanEvent({ action: 'SAVE', item: savedItem, tabla: tableName });
    return res.json({ success: true, message: `Bien guardado en tabla ${tableName}`, item: savedItem, tabla: tableName });
  } catch (err) {
    console.error('Error al guardar bien:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/inventory',      saveInventoryHandler);
app.post('/api/inventory/save', saveInventoryHandler);

// 4. Eliminar Bien (de la tabla de su colegio)
app.delete('/api/inventory/:code', async (req, res) => {
  const { code } = req.params;
  const { colegio } = req.query;
  try {
    const tableName = await resolveSchoolTable(colegio);
    await db.execute({ sql: `DELETE FROM ${tableName} WHERE code = ?`, args: [code] });
    broadcastScanEvent({ action: 'DELETE', code, tabla: tableName });
    res.json({ success: true, message: `Bien ${code} eliminado de la tabla ${tableName}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Vaciar Inventario de un Colegio
app.post('/api/inventory/clear-all', async (req, res) => {
  try {
    const { colegio } = req.body;
    const tableName = await resolveSchoolTable(colegio);
    await db.execute(`DELETE FROM ${tableName}`);
    broadcastScanEvent({ action: 'CLEAR_ALL', tabla: tableName });
    res.json({ success: true, message: `Inventario de la tabla ${tableName} vaciado correctamente` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Scan Event (Para programa de escritorio)
app.post('/api/scan', async (req, res) => {
  const { code, name, category, location, status, scannedByDni, scannedAt, colegio } = req.body;
  console.log(`📡 QR Escaneado: ${code} (DNI: ${scannedByDni || 'Desconocido'})`);
  try {
    const tableName = await resolveSchoolTable(colegio);
    if (code && name) {
      await db.execute({
        sql: `INSERT INTO ${tableName} (code, name, category, colegio, location, status, scannedByDni, scannedAt, updated_at)
              VALUES (?,?,?,?,?,?,?,?,datetime('now'))
              ON CONFLICT(code) DO UPDATE SET
                name=excluded.name, category=excluded.category, colegio=excluded.colegio,
                location=excluded.location, status=excluded.status,
                scannedByDni=excluded.scannedByDni, scannedAt=excluded.scannedAt, updated_at=datetime('now')`,
        args: [
          code.trim().toUpperCase(),
          name || 'Bien escaneado',
          category || 'Equipos Tecnológicos',
          (colegio || 'QUIÑONES').toUpperCase(),
          location || '',
          status || 'Bueno',
          scannedByDni || '',
          scannedAt || new Date().toLocaleString()
        ]
      });
    }
    broadcastScanEvent({ action: 'SCAN', item: req.body, tabla: tableName });
    res.json({ success: true, message: `Escaneo registrado en tabla ${tableName} y transmitido en tiempo real`, tabla: tableName });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SESIONES DE INVENTARIO ───────────────────────────────────────────────────

// A. Ambientes registrados (para autocompletado)
app.get('/api/ambientes', async (req, res) => {
  try {
    const { colegio } = req.query;
    const tableName = await resolveSchoolTable(colegio);
    let locSql = `SELECT DISTINCT location FROM ${tableName} WHERE location IS NOT NULL AND location != ''`;
    let ambSql = "SELECT DISTINCT ambiente FROM inventario_sesiones WHERE ambiente IS NOT NULL AND ambiente != ''";
    const ambArgs = [];

    if (colegio && colegio.trim()) {
      ambSql += " AND UPPER(colegio) = UPPER(?)";
      ambArgs.push(colegio.trim());
    }

    const [locResult, ambResult] = await Promise.all([
      db.execute(locSql),
      db.execute({ sql: ambSql, args: ambArgs })
    ]);
    const setAmbs = new Set([
      ...locResult.rows.map(r => r.location),
      ...ambResult.rows.map(r => r.ambiente)
    ]);
    const ambientes = Array.from(setAmbs).filter(a => a && a.trim()).map(a => a.trim()).sort();
    return res.json({ success: true, ambientes, colegio: colegio || 'Todos', tabla: tableName });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// B. Iniciar Sesión de Inventario
app.post('/api/sesiones/iniciar', async (req, res) => {
  try {
    const { codigoInventariado, dni, ambiente, colegio } = req.body;

    if (!codigoInventariado || !codigoInventariado.trim()) {
      return res.status(400).json({ success: false, message: 'El código de inventariado es obligatorio.' });
    }
    if (!dni || !/^\d{8}$/.test(dni.trim())) {
      return res.status(400).json({ success: false, message: 'El DNI debe ser exactamente de 8 dígitos numéricos.' });
    }
    if (!ambiente || !ambiente.trim()) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar un ambiente válido.' });
    }

    const sesionId = generateId();
    const fechaInicio = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO inventario_sesiones (id, codigoInventariado, dni, ambiente, colegio, estado, fechaInicio)
            VALUES (?, ?, ?, ?, ?, 'abierta', ?)`,
      args: [sesionId, codigoInventariado.trim(), dni.trim(), ambiente.trim(), (colegio || 'QUIÑONES').toUpperCase(), fechaInicio]
    });

    const sesion = { id: sesionId, codigoInventariado: codigoInventariado.trim(), dni: dni.trim(), ambiente: ambiente.trim(), estado: 'abierta', fechaInicio };
    console.log(`📋 Sesión creada: ${sesionId} | Ambiente: ${ambiente} | DNI: ${dni}`);
    broadcastScanEvent({ action: 'SESSION_CREATED', sesion });

    return res.json({ success: true, message: 'Sesión de inventario iniciada', sesion });
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// C. Obtener estado de una Sesión por ID
app.get('/api/sesiones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.execute({ sql: 'SELECT * FROM inventario_sesiones WHERE id = ?', args: [id] });
    const sesion = result.rows[0];

    if (!sesion) return res.status(404).json({ success: false, message: 'Sesión no encontrada' });

    const resumen = await obtenerResumenSesion(sesion);
    return res.json({ success: true, sesion, resumen });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// D. Escanear Bien en una Sesión activa
app.post('/api/sesiones/:id/escanear', async (req, res) => {
  try {
    const { id } = req.params;
    const { codigoBien } = req.body;

    if (!codigoBien || !codigoBien.trim()) {
      return res.status(400).json({ success: false, message: 'Debe ingresar el código del bien' });
    }
    const codeClean = codigoBien.trim().toUpperCase();

    const sesResult = await db.execute({ sql: 'SELECT * FROM inventario_sesiones WHERE id = ?', args: [id] });
    const sesion = sesResult.rows[0];

    if (!sesion) return res.status(404).json({ success: false, message: 'Sesión no encontrada' });
    if (sesion.estado !== 'abierta') return res.status(400).json({ success: false, message: 'La sesión ya está cerrada.' });

    const tableName = await resolveSchoolTable(sesion.colegio || sesion.codigoInventariado);
    const bienResult = await db.execute({
      sql: `SELECT * FROM ${tableName} WHERE UPPER(TRIM(code)) = ?`,
      args: [codeClean]
    });
    const bien = bienResult.rows[0];
    if (!bien) return res.status(404).json({ success: false, message: `El bien "${codeClean}" no existe en el catálogo de la tabla ${tableName}.` });

    const dupResult = await db.execute({
      sql: 'SELECT id FROM inventario_detalles WHERE sesionId = ? AND UPPER(codigoBien) = ?',
      args: [id, codeClean]
    });
    if (dupResult.rows.length > 0) {
      return res.status(400).json({ success: false, isDuplicate: true, message: `⚠️ El bien "${bien.name}" ya fue escaneado en esta sesión.` });
    }

    const ambienteSesion = (sesion.ambiente || '').trim().toLowerCase();
    const ambienteBien   = (bien.location  || '').trim().toLowerCase();
    const estadoBien = ambienteBien === ambienteSesion ? 'encontrado' : 'sobrante';

    const detalleId = generateId();
    await db.execute({
      sql: `INSERT INTO inventario_detalles (id, sesionId, codigoBien, nombreBien, ambienteOriginal, estadoBien, scannedAt)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [detalleId, id, bien.code, bien.name || '', bien.location || '', estadoBien]
    });

    const detalleGuardado = { id: detalleId, sesionId: id, codigoBien: bien.code, nombreBien: bien.name, ambienteOriginal: bien.location, estadoBien };
    broadcastScanEvent({ action: 'SESSION_ITEM_SCANNED', sesionId: id, detalle: detalleGuardado, bien: rowToItem(bien) });

    const resumenActualizado = await obtenerResumenSesion(sesion);

    return res.json({
      success: true,
      message: estadoBien === 'encontrado'
        ? `✅ Bien "${bien.name}" registrado como ENCONTRADO.`
        : `🟠 Bien "${bien.name}" registrado como SOBRANTE (Pertenece a: "${bien.location || 'Sin Ubicación'}").`,
      bien: rowToItem(bien),
      detalle: detalleGuardado,
      resumen: resumenActualizado
    });
  } catch (err) {
    console.error('Error al escanear bien:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// E. Finalizar Sesión de Inventario
app.post('/api/sesiones/:id/finalizar', async (req, res) => {
  try {
    const { id } = req.params;
    const sesResult = await db.execute({ sql: 'SELECT * FROM inventario_sesiones WHERE id = ?', args: [id] });
    const sesion = sesResult.rows[0];

    if (!sesion) return res.status(404).json({ success: false, message: 'Sesión no encontrada' });

    const fechaFin = new Date().toISOString();
    await db.execute({ sql: 'UPDATE inventario_sesiones SET estado = \'cerrada\', fechaFin = ? WHERE id = ?', args: [fechaFin, id] });

    const sesionCerrada = { ...sesion, estado: 'cerrada', fechaFin };
    const resumenFinal = await obtenerResumenSesion(sesionCerrada);

    broadcastScanEvent({ action: 'SESSION_CLOSED', sesionId: id, sesion: sesionCerrada, resumen: resumenFinal });
    console.log(`🏁 Sesión ${id} cerrada. Encontrados: ${resumenFinal.totales.encontrados}, Faltantes: ${resumenFinal.totales.faltantes}, Sobrantes: ${resumenFinal.totales.sobrantes}`);

    return res.json({ success: true, message: 'Sesión finalizada correctamente.', sesion: sesionCerrada, resumen: resumenFinal });
  } catch (err) {
    console.error('Error al finalizar sesión:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── ENDPOINTS PARA INTEGRACIÓN CON PROGRAMA DE ESCRITORIO ────────────────────

// GET /api/quinones — Obtener bienes con filtros opcionales (de la tabla específica del colegio)
app.get('/api/quinones', async (req, res) => {
  try {
    const { colegio, location, category, search } = req.query;
    const tableName = await resolveSchoolTable(colegio);
    let sql = `SELECT * FROM ${tableName} WHERE 1=1`;
    const args = [];

    if (location) { sql += ' AND LOWER(location) LIKE LOWER(?)'; args.push(`%${location}%`); }
    if (category) { sql += ' AND LOWER(category) LIKE LOWER(?)'; args.push(`%${category}%`); }
    if (search) {
      sql += ' AND (LOWER(code) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?) OR LOWER(serialNumber) LIKE LOWER(?))';
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY updated_at DESC';

    const result = await db.execute({ sql, args });
    const items = result.rows.map(rowToItem);
    return res.json({ success: true, tabla: tableName, colegio: colegio || 'Predeterminado', total: items.length, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/quinones/export — Exportar formato plano para Programa de Escritorio
app.get('/api/quinones/export', async (req, res) => {
  try {
    const { colegio } = req.query;
    const tableName = await resolveSchoolTable(colegio);
    const sql = `SELECT * FROM ${tableName} ORDER BY code ASC`;

    const result = await db.execute(sql);
    const registros = result.rows.map(item => ({
      codigo:              item.code,
      nombre:              item.name,
      categoria:           item.category,
      colegio:             item.colegio || colegio || '',
      ubicacion_ambiente:  item.location || '',
      estado_conservacion: item.status || 'Bueno',
      situacion:           item.situacion || '',
      marca:               item.brand || '',
      modelo:              item.model || '',
      numero_serie:        item.serialNumber || '',
      dimensiones_alto:    item.alto || '',
      dimensiones_ancho:   item.ancho || '',
      dimensiones_largo:   item.largo || '',
      material:            item.tipoMaterial || '',
      color:               item.color || '',
      detalles:            item.details || '',
      observaciones:       item.notes || '',
      dni_auditor:         item.scannedByDni || '',
      fecha_escaneo:       item.scannedAt || '',
      creado_el:           item.created_at
    }));

    return res.json({ success: true, tabla: tableName, colegio: colegio || 'Predeterminado', formato: 'flat_export', total: registros.length, registros });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/quinones — Insertar/Actualizar bien desde programa externo
app.post('/api/quinones', async (req, res) => {
  try {
    const d = req.body;
    if (!d.code || !d.name) {
      return res.status(400).json({ success: false, message: 'Campos requeridos: code y name' });
    }
    req.body = d;
    return saveInventoryHandler(req, res);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    tursoConnected: isTursoConnected,
    database: 'Turso DB (SQLite Cloud - 5 GB Free)',
    wsClients: clients.size,
    timestamp: new Date()
  });
});

// Exportar app para despliegue Vercel Serverless Functions
export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor Backend corriendo en http://0.0.0.0:${PORT}`);
    console.log(`🔌 WebSocket activo en ws://0.0.0.0:${PORT}`);
  });
}
