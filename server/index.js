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
    console.log('🍃 Conectado exitosamente a MongoDB Atlas (Base de Datos: inventario_quinones)');
    await seedInitialInventoryIfEmpty();
  })
  .catch((err) => {
    console.error('⚠️ Error al conectar con MongoDB Atlas:', err.message);
  });

// MongoDB Schema for collection "inventario_quinones"
const inventarioQuinonesSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Equipos Tecnológicos' },
  educationalLevel: { type: String, default: 'Secundaria' },
  location: { type: String, default: 'Aula de innovación · Pabellón B' },
  responsible: { type: String, default: 'Coord. de TIC' },
  status: { type: String, default: 'Bueno' },
  specs: { type: mongoose.Schema.Types.Mixed, default: {} },
  verified: { type: Boolean, default: true }
}, { 
  timestamps: true 
});

// Model connected to collection "inventario_quinones"
const InventarioQuinones = mongoose.model('InventarioQuinones', inventarioQuinonesSchema, 'inventario_quinones');

// Seed default initial items if MongoDB collection is empty
async function seedInitialInventoryIfEmpty() {
  try {
    const count = await InventarioQuinones.countDocuments();
    if (count === 0) {
      console.log('📦 Colección inventario_quinones vacía. Insertando bienes iniciales de muestra...');
      await InventarioQuinones.insertMany([
        {
          code: 'QUI-2026-014',
          name: 'Proyector multimedia',
          category: 'Equipos Tecnológicos',
          educationalLevel: 'Secundaria',
          location: 'Aula de innovación · Pabellón B',
          responsible: 'Coord. de TIC',
          status: 'Bueno',
          verified: true,
          specs: {
            brand: 'Epson',
            model: 'PowerLite 118',
            serialNumber: 'EP-981024-X',
            peripherals: '3800 Lumens, HDMI/VGA, Incluye control y cable 10m'
          }
        },
        {
          code: 'QUI-TEC-001',
          name: 'Laptop Educativa i5',
          category: 'Equipos Tecnológicos',
          educationalLevel: 'Secundaria',
          location: 'Lab. de Cómputo',
          responsible: 'Prof. de Innovación',
          status: 'Bueno',
          verified: true,
          specs: {
            brand: 'Lenovo',
            model: 'V15 G3',
            serialNumber: 'LNV-2026-901',
            ramStorage: 'Intel Core i5, 16GB RAM, SSD 512GB'
          }
        },
        {
          code: 'QUI-MOB-001',
          name: 'Mesa Bipersonal Escolar',
          category: 'Mobiliario Escolar',
          educationalLevel: 'Primaria',
          location: 'Aula-05 · Pabellón A',
          responsible: 'Tutor de Aula',
          status: 'Bueno',
          verified: true,
          specs: {
            material: 'Madera y Fierro',
            color: 'Marrón Claro',
            dimensions: '120x50 cm'
          }
        }
      ]);
      console.log('✅ Bienes iniciales creados exitosamente en MongoDB.');
    }
  } catch (e) {
    console.error('Error al inicializar semillas:', e);
  }
}

// In-memory fallback dataset if MongoDB is temporarily connecting
let localFallbackInventory = [
  {
    id: 'QUI-2026-014',
    code: 'QUI-2026-014',
    name: 'Proyector multimedia',
    category: 'Equipos Tecnológicos',
    educationalLevel: 'Secundaria',
    location: 'Aula de innovación · Pabellón B',
    responsible: 'Coord. de TIC',
    status: 'Bueno',
    verified: true,
    specs: { brand: 'Epson', model: 'PowerLite 118' }
  }
];

// WebSocket server setup
const wss = new WebSocketServer({ server });

// Track connected desktop / client sockets
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('📱 Cliente conectado vía WebSocket (App celular / Escritorio)');

  ws.send(JSON.stringify({ 
    type: 'CONNECTED', 
    message: 'Conectado al servidor Stockpile + MongoDB Atlas',
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

// 2. Get Inventory Items from MongoDB
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
app.post('/api/inventory/save', async (req, res) => {
  const itemData = req.body;
  if (!itemData || !itemData.code) {
    return res.status(400).json({ success: false, message: 'Falta código del bien' });
  }

  try {
    if (isMongoConnected) {
      // Upsert into MongoDB collection "inventario_quinones"
      const savedDoc = await InventarioQuinones.findOneAndUpdate(
        { code: itemData.code },
        { 
          $set: {
            code: itemData.code,
            name: itemData.name,
            category: itemData.category || 'Equipos Tecnológicos',
            educationalLevel: itemData.educationalLevel || 'Secundaria',
            location: itemData.location || 'Aula de innovación · Pabellón B',
            responsible: itemData.responsible || 'Coord. de TIC',
            status: itemData.status || 'Bueno',
            specs: itemData.specs || {},
            verified: true
          }
        },
        { upsert: true, returnDocument: 'after' }
      );

      console.log(`💾 Bien guardado en MongoDB (inventario_quinones): ${savedDoc.code} - ${savedDoc.name}`);
      broadcastScanEvent({ action: 'SAVE', item: savedDoc });
      return res.json({ success: true, message: 'Bien patrimonial guardado en MongoDB Atlas', item: savedDoc });
    } else {
      // Local fallback
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
});

// 4. Scan Event Endpoint (Called when QR code is scanned via camera or loaded)
app.post('/api/scan', async (req, res) => {
  const { code, name, category, educationalLevel, location, status, responsible, specs } = req.body;
  
  console.log(`📡 QR Escaneado desde el celular: ${code}`);

  try {
    let itemToBroadcast = { code, name, category, educationalLevel, location, status, responsible, specs };

    if (isMongoConnected && code && name) {
      // Save or update in MongoDB Atlas
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
            verified: true
          }
        },
        { upsert: true, returnDocument: 'after' }
      );
      itemToBroadcast = doc;
      console.log(`🍃 Escaneo registrado automáticamente en MongoDB (inventario_quinones): ${doc.code}`);
    }

    // Retransmit scan event to Desktop App / WebSockets
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

server.listen(PORT, () => {
  console.log(`🚀 Servidor Backend Stockpile corriendo en http://localhost:${PORT}`);
  console.log(`🔌 Servicio WebSocket activo en ws://localhost:${PORT}`);
});
