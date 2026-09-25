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

// ── INICIALIZAR TABLAS EN TURSO ──────────────────────────────────────────────
async function initDatabase() {
  try {
    await db.batch([
      // Tabla principal de bienes patrimoniales
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
      // Tabla de administración para controlar códigos de acceso autorizados por institución
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
      // Tabla de códigos de acceso (mantenida por compatibilidad)
      `CREATE TABLE IF NOT EXISTS codigos_acceso (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo      TEXT    NOT NULL UNIQUE,
        institucion TEXT    NOT NULL,
        activo      INTEGER DEFAULT 1,
        created_at  TEXT    DEFAULT (datetime('now'))
      )`
    ], 'write');

    // Migraciones automáticas para agregar columnas si la tabla ya existía
    try { await db.execute(`ALTER TABLE administracion ADD COLUMN encargado_nombre TEXT DEFAULT ''`); } catch (e) {}
    try { await db.execute(`ALTER TABLE administracion ADD COLUMN encargado_telefono TEXT DEFAULT ''`); } catch (e) {}
    try { await db.execute(`ALTER TABLE administracion ADD COLUMN direccion TEXT DEFAULT ''`); } catch (e) {}

    // Insertar credenciales de administrador por defecto en la tabla acceso si no existen
    await db.execute(
      `INSERT OR IGNORE INTO acceso (email, password)
       VALUES ('admin@gmail.com', '990246774')`
    );

    isTursoConnected = true;
    console.log('🗄️  Conectado exitosamente a Turso DB (5 GB Gratis - SQLite en la Nube)');
    console.log('📋 Tablas: inventario_quinones | inventario_sesiones | inventario_detalles | acceso | administracion | codigos_acceso');
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

// 1. Login — Valida código de acceso únicamente contra la tabla administracion en Turso DB
app.post('/api/auth/login', async (req, res) => {
  const { code } = req.body;
  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, message: 'Código de colegio requerido' });
  }
  const normalized = code.trim().toUpperCase();

  try {
    // Buscar el código en la tabla administracion
    let result = await db.execute({
      sql: 'SELECT * FROM administracion WHERE UPPER(codigo) = ? AND activo = 1',
      args: [normalized]
    });

    // Fallback a la tabla codigos_acceso si la principal no lo encuentra
    if (result.rows.length === 0) {
      result = await db.execute({
        sql: 'SELECT * FROM codigos_acceso WHERE UPPER(codigo) = ? AND activo = 1',
        args: [normalized]
      });
    }

    if (result.rows.length === 0) {
      console.log(`🚫 Código de acceso rechazado: ${normalized}`);
      return res.status(401).json({
        success: false,
        message: '❌ Código no autorizado. No existe en la tabla de administración.'
      });
    }

    const registro = result.rows[0];
    const institution = registro.institucion;
    console.log(`🔑 Login exitoso desde administración: ${normalized} → ${institution}`);
    return res.json({ success: true, message: 'Acceso verificado', colegio: normalized, institution, year: 2026 });
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

// 1b. GET /api/administracion — Obtener lista de códigos autorizados
app.get('/api/administracion', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM administracion ORDER BY created_at DESC');
    return res.json({ success: true, count: result.rows.length, codigos: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1c. POST /api/administracion — Agregar un nuevo código autorizado con encargado y dirección
app.post('/api/administracion', async (req, res) => {
  const { codigo, institucion, encargado_nombre, encargado_telefono, direccion } = req.body;
  if (!codigo || !codigo.trim()) {
    return res.status(400).json({ success: false, message: 'El campo "codigo" es obligatorio' });
  }
  const cleanCodigo = codigo.trim().toUpperCase();
  const cleanInst = (institucion || cleanCodigo).trim();
  const cleanEncargado = (encargado_nombre || '').trim();
  const cleanTel = (encargado_telefono || '').trim();
  const cleanDir = (direccion || '').trim();

  try {
    await db.execute({
      sql: `INSERT INTO administracion (codigo, institucion, encargado_nombre, encargado_telefono, direccion)
            VALUES (?, ?, ?, ?, ?)`,
      args: [cleanCodigo, cleanInst, cleanEncargado, cleanTel, cleanDir]
    });
    // Sincronizar también en codigos_acceso
    await db.execute({
      sql: 'INSERT OR IGNORE INTO codigos_acceso (codigo, institucion) VALUES (?, ?)',
      args: [cleanCodigo, cleanInst]
    });

    console.log(`➕ Código agregado a administración: ${cleanCodigo} (${cleanInst}) - Encargado: ${cleanEncargado}`);
    return res.json({ success: true, message: `Código ${cleanCodigo} registrado exitosamente.` });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, message: `El código "${cleanCodigo}" ya existe en la tabla de administración.` });
    }
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1d. PUT /api/administracion/:id — Editar información de un código existente
app.put('/api/administracion/:id', async (req, res) => {
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

  try {
    const oldRes = await db.execute({ sql: 'SELECT codigo FROM administracion WHERE id = ?', args: [id] });
    const oldCodigo = oldRes.rows[0]?.codigo;

    await db.execute({
      sql: `UPDATE administracion SET codigo = ?, institucion = ?, encargado_nombre = ?, encargado_telefono = ?, direccion = ? WHERE id = ?`,
      args: [cleanCodigo, cleanInst, cleanEncargado, cleanTel, cleanDir, id]
    });

    if (oldCodigo) {
      await db.execute({
        sql: 'UPDATE codigos_acceso SET codigo = ?, institucion = ? WHERE UPPER(codigo) = UPPER(?)',
        args: [cleanCodigo, cleanInst, oldCodigo]
      });
    }

    console.log(`✏️ Código de administración actualizado (ID: ${id}): ${cleanCodigo}`);
    return res.json({ success: true, message: `Información de ${cleanCodigo} actualizada correctamente.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1e. PATCH /api/administracion/:id/toggle — Activar / Desactivar código
app.patch('/api/administracion/:id/toggle', async (req, res) => {
  const { id } = req.params;
  try {
    const curr = await db.execute({ sql: 'SELECT codigo, activo FROM administracion WHERE id = ?', args: [id] });
    if (!curr.rows[0]) return res.status(404).json({ success: false, message: 'Código no encontrado' });

    const newStatus = curr.rows[0].activo === 1 ? 0 : 1;
    const codigo = curr.rows[0].codigo;

    await db.execute({ sql: 'UPDATE administracion SET activo = ? WHERE id = ?', args: [newStatus, id] });
    await db.execute({ sql: 'UPDATE codigos_acceso SET activo = ? WHERE UPPER(codigo) = UPPER(?)', args: [newStatus, codigo] });

    const statusText = newStatus === 1 ? 'activado' : 'desactivado';
    console.log(`🔄 Código ${codigo} ${statusText} (ID: ${id})`);
    return res.json({ success: true, message: `Código ${codigo} ${statusText} correctamente.`, activo: newStatus });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 1f. DELETE /api/administracion/:id — Eliminar un código de usuario/institución
app.delete('/api/administracion/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const itemRes = await db.execute({ sql: 'SELECT codigo FROM administracion WHERE id = ?', args: [id] });
    const item = itemRes.rows[0];

    await db.execute({ sql: 'DELETE FROM administracion WHERE id = ?', args: [id] });
    if (item && item.codigo) {
      await db.execute({ sql: 'DELETE FROM codigos_acceso WHERE UPPER(codigo) = UPPER(?)', args: [item.codigo] });
    }

    console.log(`🗑️ Código de administración eliminado (ID: ${id})`);
    return res.json({ success: true, message: 'Código eliminado exitosamente.' });
  } catch (err) {
    console.error('Error al eliminar de administración:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Obtener Inventario (filtrado por colegio)
app.get('/api/inventory', async (req, res) => {
  try {
    const { colegio } = req.query;
    let result;
    if (colegio && colegio.trim()) {
      result = await db.execute({
        sql: 'SELECT * FROM inventario_quinones WHERE UPPER(colegio) = UPPER(?) ORDER BY updated_at DESC',
        args: [colegio.trim()]
      });
    } else {
      result = await db.execute('SELECT * FROM inventario_quinones ORDER BY updated_at DESC');
    }
    const items = result.rows.map(rowToItem);
    return res.json({ success: true, count: items.length, items, colegio: colegio || 'Todos', source: 'Turso DB' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Guardar / Actualizar Bien Patrimonial (INSERT OR REPLACE)
const saveInventoryHandler = async (req, res) => {
  const d = req.body;
  if (!d || !d.code) return res.status(400).json({ success: false, message: 'Falta código del bien' });

  try {
    const code = (d.code || '').trim().toUpperCase();
    await db.execute({
      sql: `INSERT INTO inventario_quinones
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
        (d.colegio || 'QUIÑONES').toUpperCase(),
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

    const saved = await db.execute({ sql: 'SELECT * FROM inventario_quinones WHERE code = ?', args: [code] });
    const savedItem = rowToItem(saved.rows[0]);
    console.log(`💾 Bien guardado en Turso DB: ${code} - ${d.name}`);
    broadcastScanEvent({ action: 'SAVE', item: savedItem });
    return res.json({ success: true, message: 'Bien guardado en Turso DB (5 GB Gratis)', item: savedItem });
  } catch (err) {
    console.error('Error al guardar bien:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/inventory',      saveInventoryHandler);
app.post('/api/inventory/save', saveInventoryHandler);

// 4. Eliminar Bien
app.delete('/api/inventory/:code', async (req, res) => {
  const { code } = req.params;
  try {
    await db.execute({ sql: 'DELETE FROM inventario_quinones WHERE code = ?', args: [code] });
    broadcastScanEvent({ action: 'DELETE', code });
    res.json({ success: true, message: `Bien ${code} eliminado` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Vaciar Inventario de un Colegio
app.post('/api/inventory/clear-all', async (req, res) => {
  try {
    const { colegio } = req.body;
    if (colegio) {
      await db.execute({ sql: 'DELETE FROM inventario_quinones WHERE UPPER(colegio) = UPPER(?)', args: [colegio] });
    } else {
      await db.execute('DELETE FROM inventario_quinones');
    }
    broadcastScanEvent({ action: 'CLEAR_ALL' });
    res.json({ success: true, message: 'Inventario vaciado correctamente' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Scan Event (Para programa de escritorio)
app.post('/api/scan', async (req, res) => {
  const { code, name, category, location, status, scannedByDni, scannedAt, colegio } = req.body;
  console.log(`📡 QR Escaneado: ${code} (DNI: ${scannedByDni || 'Desconocido'})`);
  try {
    if (code && name) {
      await db.execute({
        sql: `INSERT INTO inventario_quinones (code, name, category, colegio, location, status, scannedByDni, scannedAt, updated_at)
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
    broadcastScanEvent({ action: 'SCAN', item: req.body });
    res.json({ success: true, message: 'Escaneo registrado en Turso DB y transmitido en tiempo real' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── SESIONES DE INVENTARIO ───────────────────────────────────────────────────

// A. Ambientes registrados (para autocompletado)
app.get('/api/ambientes', async (req, res) => {
  try {
    const { colegio } = req.query;
    let locSql = "SELECT DISTINCT location FROM inventario_quinones WHERE location IS NOT NULL AND location != ''";
    let ambSql = "SELECT DISTINCT ambiente FROM inventario_sesiones WHERE ambiente IS NOT NULL AND ambiente != ''";
    const locArgs = [];
    const ambArgs = [];

    if (colegio && colegio.trim()) {
      locSql += " AND UPPER(colegio) = UPPER(?)";
      ambSql += " AND UPPER(colegio) = UPPER(?)";
      locArgs.push(colegio.trim());
      ambArgs.push(colegio.trim());
    }

    const [locResult, ambResult] = await Promise.all([
      db.execute({ sql: locSql, args: locArgs }),
      db.execute({ sql: ambSql, args: ambArgs })
    ]);
    const setAmbs = new Set([
      ...locResult.rows.map(r => r.location),
      ...ambResult.rows.map(r => r.ambiente)
    ]);
    const ambientes = Array.from(setAmbs).filter(a => a && a.trim()).map(a => a.trim()).sort();
    return res.json({ success: true, ambientes, colegio: colegio || 'Todos' });
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

    const bienResult = await db.execute({
      sql: 'SELECT * FROM inventario_quinones WHERE UPPER(TRIM(code)) = ?',
      args: [codeClean]
    });
    const bien = bienResult.rows[0];
    if (!bien) return res.status(404).json({ success: false, message: `El bien "${codeClean}" no existe en el catálogo.` });

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

// GET /api/quinones — Obtener bienes con filtros opcionales
app.get('/api/quinones', async (req, res) => {
  try {
    const { colegio, location, category, search } = req.query;
    let sql = 'SELECT * FROM inventario_quinones WHERE 1=1';
    const args = [];

    if (colegio) { sql += ' AND UPPER(colegio) = UPPER(?)'; args.push(colegio); }
    if (location) { sql += ' AND LOWER(location) LIKE LOWER(?)'; args.push(`%${location}%`); }
    if (category) { sql += ' AND LOWER(category) LIKE LOWER(?)'; args.push(`%${category}%`); }
    if (search) {
      sql += ' AND (LOWER(code) LIKE LOWER(?) OR LOWER(name) LIKE LOWER(?) OR LOWER(serialNumber) LIKE LOWER(?))';
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY updated_at DESC';

    const result = await db.execute({ sql, args });
    const items = result.rows.map(rowToItem);
    return res.json({ success: true, tabla: 'inventario_quinones', total: items.length, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/quinones/export — Exportar formato plano para Programa de Escritorio
app.get('/api/quinones/export', async (req, res) => {
  try {
    const { colegio } = req.query;
    let sql = 'SELECT * FROM inventario_quinones';
    const args = [];
    if (colegio) { sql += ' WHERE UPPER(colegio) = UPPER(?)'; args.push(colegio); }
    sql += ' ORDER BY code ASC';

    const result = await db.execute({ sql, args });
    const registros = result.rows.map(item => ({
      codigo:              item.code,
      nombre:              item.name,
      categoria:           item.category,
      colegio:             item.colegio || '',
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

    return res.json({ success: true, tabla: 'inventario_quinones', formato: 'flat_export', total: registros.length, registros });
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
