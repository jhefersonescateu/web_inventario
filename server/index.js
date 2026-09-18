import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import mongoose from 'mongoose';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// MongoDB Atlas URI provided by user
const MONGO_URI = 'mongodb+srv://jhefersonescateu_db_user:990246774@cluster0.gfvpqxm.mongodb.net/inventario_quinones?retryWrites=true&w=majority&appName=Cluster0';

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
let isMongoConnected = false;

mongoose.connect(MONGO_URI)
  .then(async () => {
    isMongoConnected = true;
    console.log('🍃 Conectado exitosamente a MongoDB Atlas (Base de Datos Real: inventario_quinones)');
  })
  .catch((err) => {
    console.error('⚠️ Error al conectar con MongoDB Atlas:', err.message);
  });

// MongoDB Schema for collection "inventario_quinones" — Estructura Stockpile completa
const inventarioQuinonesSchema = new mongoose.Schema({
  // ── Identificación ──────────────────────────────────────────────────────────
  code:         { type: String, required: true, unique: true, index: true },
  name:         { type: String, required: true },
  category:     { type: String, default: 'Equipos Tecnológicos' },
  // ── Ubicación y Cantidad ────────────────────────────────────────────────────
  location:     { type: String, default: '' },
  quantity:     { type: Number, default: 1 },
  // ── Estado ──────────────────────────────────────────────────────────────────
  status:       { type: String, default: 'Bueno' },
  situacion:    { type: String, default: '' },
  // ── Identificación del Producto ─────────────────────────────────────────────
  brand:        { type: String, default: '' },
  model:        { type: String, default: '' },
  serialNumber: { type: String, default: '' },
  // ── Dimensiones (cm) ────────────────────────────────────────────────────────
  alto:         { type: Number, default: null },
  ancho:        { type: Number, default: null },
  largo:        { type: Number, default: null },
  // ── Características físicas ──────────────────────────────────────────────────
  tipoMaterial: { type: String, default: '' },
  color:        { type: String, default: '' },
  // ── Notas y detalles ────────────────────────────────────────────────────────
  details:      { type: String, default: '' },   // Detalles / Especificaciones Adicionales (Paso 1)
  notes:        { type: String, default: '' },   // Observaciones adicionales / Notas internas (Paso 2)
  // ── Cuestionario dinámico (Paso 2) ──────────────────────────────────────────
  customFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  // ── Campos de compatibilidad / legacy ───────────────────────────────────────
  specs:        { type: mongoose.Schema.Types.Mixed, default: {} },
  educationalLevel: { type: String, default: '' },
  responsible:  { type: String, default: '' },
  // ── Auditoría ────────────────────────────────────────────────────────────────
  verified:     { type: Boolean, default: true },
  scannedByDni: { type: String, default: '' },
  scannedAt:    { type: String, default: '' },
}, { 
  timestamps: true 
});

// Model connected to collection "inventario_quinones"
const InventarioQuinones = mongoose.model('InventarioQuinones', inventarioQuinonesSchema, 'inventario_quinones');

// In-memory fallback dataset (starts empty for real inventory)
let localFallbackInventory = [];

// WebSocket server setup
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('📱 Cliente conectado vía WebSocket (App celular / Escritorio)');

  ws.send(JSON.stringify({ 
    type: 'CONNECTED', 
    message: 'Conectado al servidor Stockpile Real + MongoDB Atlas',
    mongoStatus: isMongoConnected ? 'connected' : 'connecting'
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log('❌ Cliente desconectado del WebSocket');
  });

  ws.on('error', (err) => {
    console.error('WebSocket Error:', err);
  });
});

// Broadcast helper
function broadcastScanEvent(data) {
  const payload = JSON.stringify({
    type: 'QR_SCANNED',
    timestamp: new Date().toISOString(),
    ...data
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// REST Endpoints

// 1. Verify Access Code
app.post('/api/auth/login', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Código requerido' });
  }

  const normalized = code.trim().toUpperCase();
  if (normalized === 'QUIÑONES' || normalized === 'QUINONES') {
    return res.json({
      success: true,
      message: 'Acceso verificado correctamente',
      institution: 'I.E. JOSÉ ABELARDO QUIÑONES',
      year: 2026
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Código de acceso incorrecto. Debe ser: QUIÑONES'
    });
  }
});

// 2. Get Real Inventory Items from MongoDB Atlas
app.get('/api/inventory', async (req, res) => {
  try {
    if (isMongoConnected) {
      const items = await InventarioQuinones.find().sort({ updatedAt: -1 });
      return res.json({ success: true, count: items.length, items, source: 'MongoDB Atlas' });
    } else {
      return res.json({ success: true, count: localFallbackInventory.length, items: localFallbackInventory, source: 'Memory Fallback' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Register or Update Asset Item in MongoDB
const saveInventoryHandler = async (req, res) => {
  const itemData = req.body;
  if (!itemData || !itemData.code) {
    return res.status(400).json({ success: false, message: 'Falta código del bien' });
  }

  try {
    if (isMongoConnected) {
      const savedDoc = await InventarioQuinones.findOneAndUpdate(
        { code: itemData.code },
        { 
          $set: {
            code:         itemData.code,
            name:         itemData.name,
            category:     itemData.category     || 'Equipos Tecnológicos',
            location:     itemData.location     || '',
            quantity:     itemData.quantity     || 1,
            status:       itemData.status       || 'Bueno',
            situacion:    itemData.situacion    || '',
            brand:        itemData.brand        || '',
            model:        itemData.model        || '',
            serialNumber: itemData.serialNumber || '',
            alto:         itemData.alto  != null ? itemData.alto  : null,
            ancho:        itemData.ancho != null ? itemData.ancho : null,
            largo:        itemData.largo != null ? itemData.largo : null,
            tipoMaterial: itemData.tipoMaterial || '',
            color:        itemData.color        || '',
            details:      itemData.details      || '',
            notes:        itemData.notes        || '',
            customFields: itemData.customFields || {},
            educationalLevel: itemData.educationalLevel || '',
            responsible:      itemData.responsible      || '',
            specs:            itemData.specs            || {},
            verified:     true,
            scannedByDni: itemData.scannedByDni || '',
            scannedAt:    itemData.scannedAt    || new Date().toLocaleString()
          }
        },
        { upsert: true, returnDocument: 'after' }
      );

      console.log(`💾 Bien guardado en MongoDB (inventario_quinones): ${savedDoc.code} - ${savedDoc.name}`);
      broadcastScanEvent({ action: 'SAVE', item: savedDoc });
      return res.json({ success: true, message: 'Bien patrimonial guardado en MongoDB Atlas', item: savedDoc });
    } else {
      const existingIdx = localFallbackInventory.findIndex(i => i.code === itemData.code);
      if (existingIdx >= 0) {
        localFallbackInventory[existingIdx] = { ...localFallbackInventory[existingIdx], ...itemData };
      } else {
        localFallbackInventory.unshift({ ...itemData, id: itemData.code });
      }
      broadcastScanEvent({ action: 'SAVE', item: itemData });
      return res.json({ success: true, message: 'Bien guardado localmente', item: itemData });
    }
  } catch (err) {
    console.error('Error al guardar en MongoDB:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/inventory',      saveInventoryHandler);
app.post('/api/inventory/save', saveInventoryHandler);

// 4. Delete Single Item Endpoint
app.delete('/api/inventory/:code', async (req, res) => {
  const { code } = req.params;
  try {
    if (isMongoConnected) {
      await InventarioQuinones.deleteOne({ code });
      console.log(`🗑️ Bien eliminado de MongoDB Atlas: ${code}`);
    }
    localFallbackInventory = localFallbackInventory.filter(i => i.code !== code && i.id !== code);
    broadcastScanEvent({ action: 'DELETE', code });
    res.json({ success: true, message: `Bien ${code} eliminado correctamente` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Clear All Items (Wipe test data)
app.post('/api/inventory/clear-all', async (req, res) => {
  try {
    if (isMongoConnected) {
      await InventarioQuinones.deleteMany({});
      console.log('🧹 Base de datos real en MongoDB Atlas vaciada completamente.');
    }
    localFallbackInventory = [];
    broadcastScanEvent({ action: 'CLEAR_ALL' });
    res.json({ success: true, message: 'Inventario vaciado por completo' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Scan Event Endpoint
app.post('/api/scan', async (req, res) => {
  const { code, name, category, educationalLevel, location, status, responsible, specs, scannedByDni, scannedAt } = req.body;
  
  console.log(`📡 QR Escaneado desde el celular: ${code} (DNI: ${scannedByDni || 'Desconocido'})`);

  try {
    let itemToBroadcast = { code, name, category, educationalLevel, location, status, responsible, specs, scannedByDni, scannedAt };

    if (isMongoConnected && code && name) {
      const doc = await InventarioQuinones.findOneAndUpdate(
        { code },
        { 
          $set: {
            code,
            name: name || 'Bien escaneado',
            category: category || 'Equipos Tecnológicos',
            educationalLevel: educationalLevel || 'Secundaria',
            location: location || 'Aula-05',
            responsible: responsible || 'Personal de Inventario',
            status: status || 'Bueno',
            specs: specs || {},
            verified: true,
            scannedByDni: scannedByDni || '',
            scannedAt: scannedAt || new Date().toLocaleString()
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
      itemToBroadcast = doc;
      console.log(`🍃 Escaneo registrado automáticamente en MongoDB (inventario_quinones): ${doc.code}`);
    }

    broadcastScanEvent({
      action: 'SCAN',
      item: itemToBroadcast
    });

    res.json({ 
      success: true, 
      message: 'Escaneo registrado en MongoDB Atlas y transmitido al escritorio en tiempo real',
      item: itemToBroadcast 
    });
  } catch (err) {
    console.error('Error procesando escaneo:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    mongoConnected: isMongoConnected, 
    collection: 'inventario_quinones',
    wsClients: clients.size, 
    timestamp: new Date() 
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Backend Stockpile REAL corriendo en http://0.0.0.0:${PORT} (Puerto ${PORT})`);
  console.log(`🔌 Servicio WebSocket activo en ws://0.0.0.0:${PORT}`);
});
