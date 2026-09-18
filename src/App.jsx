import React, { useState, useMemo, useEffect } from 'react';
import QRManagerModule from './components/QRManagerModule';
import AccessGate from './components/AccessGate';
import FichaPatrimonialScanner from './components/FichaPatrimonialScanner';
import MyInventoriedView from './components/MyInventoriedView';


// Sample School Inventory Data - I.E. José Abelardo Quiñones
const initialSchoolInventory = [
  {
    id: 'QUI-MOB-001',
    code: 'QUI-MOB-001',
    location: 'Aula-05',
    category: 'Mobiliario Escolar',
    name: 'Mesa Bipersonal Escolar',
    brand: 'MINEDU Standard',
    model: 'Estándar Secundario',
    serialNumber: 'N/A',
    details: 'Color Marrón Claro, madera prensada y estructura metálica (120x50cm)',
    quantity: 18,
    status: 'Bueno',
    notes: 'Lote 2024 asignado para estudiantes de 5to año'
  },
  {
    id: 'QUI-MOB-002',
    code: 'QUI-MOB-002',
    location: 'Aula-05',
    category: 'Mobiliario Escolar',
    name: 'Silla Pedagógica Estudiantil',
    brand: 'MINEDU',
    model: 'Reforzada 2024',
    serialNumber: 'N/A',
    details: 'Color Azul institucional, estructura tubular en fierro gris',
    quantity: 35,
    status: 'Bueno',
    notes: 'En óptimo estado de conservación'
  },
  {
    id: 'QUI-MOB-003',
    code: 'QUI-MOB-003',
    location: 'Aula-05',
    category: 'Mobiliario Escolar',
    name: 'Pizarra Acrílica Blanca',
    brand: 'Alumart',
    model: 'Mural 2.40x1.20m',
    serialNumber: 'N/A',
    details: 'Fondo blanco magnético, marco de aluminio anodizado con portalápices',
    quantity: 1,
    status: 'Bueno',
    notes: 'Instalada en pared frontal principal'
  },
  {
    id: 'QUI-TEC-001',
    code: 'QUI-TEC-001',
    location: 'Aula-05',
    category: 'Equipos Tecnológicos',
    name: 'Proyector Multimedia HD',
    brand: 'Epson',
    model: 'PowerLite 118',
    serialNumber: 'EP-981024-X',
    details: '3800 Lumens, HDMI/VGA, Altavoz integrado 16W, Control remoto',
    quantity: 1,
    status: 'Bueno',
    notes: 'Soporte fijado al techo. Incluye cable HDMI de 10 metros'
  },
  {
    id: 'QUI-TEC-002',
    code: 'QUI-TEC-002',
    location: 'Aula-05',
    category: 'Equipos Tecnológicos',
    name: 'Ecran Enrollable Mural 120"',
    brand: 'Klass',
    model: 'Manual Matte White',
    serialNumber: 'N/A',
    details: 'Formato 16:9, mecanismo de retracción asistida, bordes negros',
    quantity: 1,
    status: 'Bueno',
    notes: 'Instalado sobre la pizarra acrílica'
  },
  {
    id: 'QUI-CLI-001',
    code: 'QUI-CLI-001',
    location: 'Aula-05',
    category: 'Climatización y Audio',
    name: 'Ventilador de Techo Industrial',
    brand: 'National',
    model: 'HeavyDuty 56"',
    serialNumber: 'N/A',
    details: 'Color Blanco, 3 aspas de aluminio, selector de 5 velocidades',
    quantity: 2,
    status: 'Bueno',
    notes: 'Operativos con control de pared'
  },
  {
    id: 'QUI-MOB-004',
    code: 'QUI-MOB-004',
    location: 'Aula-05',
    category: 'Mobiliario Escolar',
    name: 'Escritorio Docente con Cajones',
    brand: 'Muebles Perú',
    model: 'Ejecutivo 1.20m',
    serialNumber: 'N/A',
    details: 'Melamina color Cedro, 2 cajones con cerradura y chapa',
    quantity: 1,
    status: 'Regular',
    notes: 'Presenta un raspón leve en el borde superior izquierdo'
  },
  {
    id: 'QUI-TEC-003',
    code: 'QUI-TEC-003',
    location: 'Lab. de Cómputo',
    category: 'Equipos Tecnológicos',
    name: 'Laptop Educativa para Alumnos',
    brand: 'Lenovo',
    model: 'V15 G3 IAP',
    serialNumber: 'LNV-2026-901',
    details: 'Intel Core i5 12va gen, 16GB RAM, SSD 512GB, Pantalla 15.6" FHD',
    quantity: 25,
    status: 'Bueno',
    notes: 'Cargadores etiquetados y guardados en gabinete blindado'
  },
  {
    id: 'QUI-TEC-004',
    code: 'QUI-TEC-004',
    location: 'Lab. de Cómputo',
    category: 'Equipos Tecnológicos',
    name: 'Router Wi-Fi 6 Institucional',
    brand: 'TP-Link',
    model: 'Archer AX55',
    serialNumber: 'TPL-8891002',
    details: 'Dual-band 3000Mbps, 4 antenas externas, puerto Gigabit',
    quantity: 2,
    status: 'Bueno',
    notes: 'Conectado al rack de red principal'
  },
  {
    id: 'QUI-TEC-005',
    code: 'QUI-TEC-005',
    location: 'Dirección',
    category: 'Equipos Tecnológicos',
    name: 'Computadora All-In-One (AIO)',
    brand: 'HP',
    model: 'ProOne 440 G9',
    serialNumber: 'HP-8CG2190XY',
    details: 'Intel Core i7, 16GB RAM, SSD 512GB, Pantalla táctil 23.8"',
    quantity: 2,
    status: 'Bueno',
    notes: 'Para gestión administrativa y emisión de certificados'
  },
  {
    id: 'QUI-TEC-006',
    code: 'QUI-TEC-006',
    location: 'Sala de Profesores',
    category: 'Equipos Tecnológicos',
    name: 'Impresora Multifuncional EcoTank',
    brand: 'Epson',
    model: 'L6270',
    serialNumber: 'EPS-V981244',
    details: 'Sistema continuo de tinta, escáner ADF, conectividad Wi-Fi',
    quantity: 1,
    status: 'Regular',
    notes: 'Requiere mantenimiento y limpieza de inyectores de tinta'
  },
  {
    id: 'QUI-MOB-005',
    code: 'QUI-MOB-005',
    location: 'Biblioteca',
    category: 'Mobiliario Escolar',
    name: 'Estante Metálico de 5 Niveles',
    brand: 'MetalServ',
    model: 'Industrial 2.00x1.00m',
    serialNumber: 'N/A',
    details: 'Acero galvanizado color Gris, capacidad 120kg por balda',
    quantity: 8,
    status: 'Bueno',
    notes: 'Almacena la colección de textos escolares y enciclopedias'
  },
  {
    id: 'QUI-LAB-001',
    code: 'QUI-LAB-001',
    location: 'Lab. de Ciencias',
    category: 'Material Didáctico',
    name: 'Microscopio Binocular Biológico',
    brand: 'Celestron',
    model: 'Labs CB2000CF',
    serialNumber: 'CEL-882109',
    details: 'Aumento hasta 2000x, iluminación LED, 4 objetivos acromáticos',
    quantity: 6,
    status: 'Bueno',
    notes: 'Con estuches rígidos antipolvo'
  },
  {
    id: 'QUI-LAB-002',
    code: 'QUI-LAB-002',
    location: 'Lab. de Ciencias',
    category: 'Material Didáctico',
    name: 'Esqueleto Humano Articulado',
    brand: '3B Scientific',
    model: 'A10 Standard 170cm',
    serialNumber: '3B-99120',
    details: 'Material de resina lavable, extremidades desmontables, base con ruedas',
    quantity: 1,
    status: 'Bueno',
    notes: 'Uso en clases de Biología y Ciencias Naturales'
  },
  {
    id: 'QUI-DEP-001',
    code: 'QUI-DEP-001',
    location: 'Almacén Deportivo',
    category: 'Artículos Deportivos',
    name: 'Kit de Balones Oficiales',
    brand: 'Walon / Molten',
    model: 'Edición Escolar',
    serialNumber: 'N/A',
    details: '10 Balones Molten Básquet N°7, 12 Balones Walon Fútbol N°5',
    quantity: 22,
    status: 'Bueno',
    notes: 'Guardados en redes de nylon reforzado'
  },
  {
    id: 'QUI-AUD-001',
    code: 'QUI-AUD-001',
    location: 'Patio Principal',
    category: 'Climatización y Audio',
    name: 'Sistema de Perifoneo / Parlante Activo',
    brand: 'Behringer',
    model: 'PK110A 350W',
    serialNumber: 'BEH-992180',
    details: 'Parlante de 10 pulgadas, 350W RMS, conectividad Bluetooth, incluye trípode',
    quantity: 2,
    status: 'Bueno',
    notes: 'Para formaciones, ceremonias y actuaciones escolares'
  },
  {
    id: 'QUI-MOB-006',
    code: 'QUI-MOB-006',
    location: 'Aula-01',
    category: 'Mobiliario Escolar',
    name: 'Mesa Hexagonal de Trabajo Grupal',
    brand: 'MINEDU',
    model: 'Primaria / Inicial',
    serialNumber: 'N/A',
    details: 'Color Amarillo/Azul, bordes redondeados antichoque',
    quantity: 6,
    status: 'Malo',
    notes: '2 mesas presentan patas inestables con soldadura rota'
  }
];

const categoriesList = [
  'Todas las Categorías',
  'Mobiliario Escolar',
  'Equipos Tecnológicos',
  'Material Didáctico',
  'Artículos Deportivos',
  'Climatización y Audio'
];

const defaultLocations = [
  'Todas las Ubicaciones',
  'Aula-05',
  'Aula-01',
  'Aula-02',
  'Lab. de Cómputo',
  'Biblioteca',
  'Lab. de Ciencias',
  'Dirección',
  'Sala de Profesores',
  'Patio Principal',
  'Almacén Deportivo'
];

export default function App() {
  // Real inventory items (Starts empty or loaded from MongoDB Atlas / localStorage)
  const [items, setItems] = useState(() => {
    try {
      const savedLocal = localStorage.getItem('stockpile_real_inventory');
      return savedLocal ? JSON.parse(savedLocal) : [];
    } catch (e) {
      return [];
    }
  });

  const [locations, setLocations] = useState(defaultLocations);
  
  // Authentication state (requires entering QUIÑONES + DNI)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('stockpile_auth') === 'true';
  });

  const [userDni, setUserDni] = useState(() => {
    return sessionStorage.getItem('stockpile_dni') || '';
  });

  // Active View state ('home' | 'scan' | 'inventory')
  const [activeView, setActiveView] = useState('home');
  const [autoStartCamera, setAutoStartCamera] = useState(false);

  // Count items inventoried by current user DNI
  const userInventoriedCount = useMemo(() => {
    return items.filter(item => item.scannedByDni === userDni || (!item.scannedByDni && item.operatorDni === userDni)).length;
  }, [items, userDni]);

  // Dynamic Backend Host resolution (supports localhost, local network IP, and production)
  const getBackendHost = () => {
    return typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  };

  // Auto-detect code parameter in URL (when opening page directly via QR scan e.g. ?code=QUI-2026-001)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam && codeParam.trim()) {
        setActiveView('scan');
        showToast(`📲 Escaneo detectado desde QR: ${codeParam.trim().toUpperCase()}`);
      }
    } catch (e) {}
  }, []);

  // Fetch real inventory items from MongoDB Atlas backend API on load
  useEffect(() => {
    const fetchRealInventory = async () => {
      const host = getBackendHost();
      try {
        const res = await fetch(`http://${host}:3001/api/inventory`);
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setItems(data.items);
          localStorage.setItem('stockpile_real_inventory', JSON.stringify(data.items));
        }
      } catch (err) {
        console.log('Backend offline o reconectando...');
      }
    };
    fetchRealInventory();
  }, []);

  // WebSocket connection to backend Node.js server for desktop synchronization
  useEffect(() => {
    let ws;
    const host = getBackendHost();
    try {
      ws = new WebSocket(`ws://${host}:3001`);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'QR_SCANNED' && data.item) {
            setItems(prev => {
              const exists = prev.some(i => i.code === data.item.code);
              const nextState = exists
                ? prev.map(i => i.code === data.item.code ? { ...i, ...data.item } : i)
                : [data.item, ...prev];
              localStorage.setItem('stockpile_real_inventory', JSON.stringify(nextState));
              return nextState;
            });
            showToast(`📡 Sincronización en tiempo real: QR ${data.item.code}`);
          } else if (data.type === 'QR_SCANNED' && data.action === 'DELETE') {
            setItems(prev => {
              const nextState = prev.filter(i => i.code !== data.code && i.id !== data.code);
              localStorage.setItem('stockpile_real_inventory', JSON.stringify(nextState));
              return nextState;
            });
          } else if (data.type === 'QR_SCANNED' && data.action === 'CLEAR_ALL') {
            setItems([]);
            localStorage.setItem('stockpile_real_inventory', JSON.stringify([]));
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Save/Update Item to Real Inventory (MongoDB Atlas + LocalStorage)
  const handleSaveFromFicha = (savedItem) => {
    const host = getBackendHost();
    setItems(prev => {
      const exists = prev.some(i => i.code === savedItem.code || i.id === savedItem.id);
      const nextState = exists
        ? prev.map(i => (i.code === savedItem.code || i.id === savedItem.id) ? { ...i, ...savedItem } : i)
        : [savedItem, ...prev];
      localStorage.setItem('stockpile_real_inventory', JSON.stringify(nextState));
      return nextState;
    });

    // Send POST to MongoDB Atlas API server
    fetch(`http://${host}:3001/api/inventory/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(savedItem)
    }).catch(err => console.error('Error al guardar en backend:', err));
  };

  const handleAuthenticated = (data) => {
    if (data && data.dni) {
      setUserDni(data.dni);
    }
    setIsAuthenticated(true);
    setActiveView('home');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('stockpile_auth');
    sessionStorage.removeItem('stockpile_dni');
    setIsAuthenticated(false);
    setUserDni('');
    setActiveView('home');
  };
  
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedLocation, setSelectedLocation] = useState('Todas las Ubicaciones');
  const [selectedCategory, setSelectedCategory] = useState('Todas las Categorías');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Modals state
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagItem, setTagItem] = useState(null);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    code: '',
    location: 'Aula-05',
    category: 'Mobiliario Escolar',
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    details: '',
    quantity: 1,
    status: 'Bueno',
    notes: ''
  });

  // Delete Real Item (MongoDB + LocalStorage)
  const handleDeleteItem = (id, name) => {
    const host = getBackendHost();
    if (window.confirm(`¿Está seguro de eliminar el bien "${name}" del inventario real?`)) {
      setItems(prev => {
        const nextState = prev.filter(item => item.id !== id && item.code !== id);
        localStorage.setItem('stockpile_real_inventory', JSON.stringify(nextState));
        return nextState;
      });

      // Send DELETE to backend API
      fetch(`http://${host}:3001/api/inventory/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }).catch(err => console.error('Error al borrar de backend:', err));

      showToast(`🗑️ Bien "${name}" eliminado del inventario.`);
    }
  };

  // Clear All Real Data
  const handleClearAllInventory = () => {
    const host = getBackendHost();
    if (window.confirm('⚠️ ¿Desea vaciar TODO el inventario registrado y empezar desde cero?')) {
      setItems([]);
      localStorage.setItem('stockpile_real_inventory', JSON.stringify([]));
      fetch(`http://${host}:3001/api/inventory/clear-all`, { method: 'POST' }).catch(() => {});
      showToast('🧹 Inventario vaciado por completo.');
    }
  };


  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search term
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query) ||
        item.brand.toLowerCase().includes(query) ||
        item.details.toLowerCase().includes(query) ||
        item.serialNumber.toLowerCase().includes(query);

      // Location
      const matchesLocation = selectedLocation === 'Todas las Ubicaciones' || item.location === selectedLocation;

      // Category
      const matchesCategory = selectedCategory === 'Todas las Categorías' || item.category === selectedCategory;

      // Status
      const matchesStatus = selectedStatus === 'Todos' || item.status === selectedStatus;

      return matchesSearch && matchesLocation && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, selectedLocation, selectedCategory, selectedStatus]);

  if (!isAuthenticated) {
    return <AccessGate onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="mobile-app-shell">
      {/* Toast alert */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen 1: Home Menu (Only 2 main buttons) */}
      {activeView === 'home' && (
        <div className="ficha-page-container">
          <div className="ficha-card-wrapper">
            
            {/* Header Bar */}
            <div className="ficha-header-navy">
              <div className="ficha-header-top font-serif">
                <div className="jaq-avatar-yellow">
                  <span>JAQ</span>
                </div>
                <button 
                  type="button"
                  className="btn-logout-mini" 
                  onClick={handleLogout}
                >
                  🔒 Salir
                </button>
              </div>

              <h1 className="ficha-header-title">Ficha Patrimonial</h1>
              <p className="ficha-header-subtitle">Control de Bienes · Registro 2026</p>
              <p className="ficha-institution-tag">I.E. JOSÉ ABELARDO QUIÑONES</p>

              <div className="home-user-badge">
                👤 Operador DNI: <strong>{userDni || 'No registrado'}</strong>
              </div>
            </div>

            {/* Body with ONLY the 2 Main Action Buttons requested */}
            <div className="ficha-body-cream home-menu-body">
              <h3 className="home-menu-prompt">Seleccione una opción:</h3>

              <div className="home-action-cards">
                {/* Button 1: Escanear QR */}
                <button 
                  type="button"
                  className="home-card-btn primary-scan"
                  onClick={() => {
                    setAutoStartCamera(true);
                    setActiveView('scan');
                  }}
                >
                  <div className="card-btn-icon">📷</div>
                  <div className="card-btn-content">
                    <h2>Escanear QR</h2>
                    <p>Escanee el código QR e ingrese la información del bien</p>
                  </div>
                  <div className="card-btn-arrow">→</div>
                </button>

                {/* Button 2: Revisar Inventario */}
                <button 
                  type="button"
                  className="home-card-btn secondary-inventory"
                  onClick={() => setActiveView('inventory')}
                >
                  <div className="card-btn-icon">📋</div>
                  <div className="card-btn-content">
                    <h2>Revisar Inventario</h2>
                    <p>Ver los bienes inventariados en este dispositivo</p>
                    {userInventoriedCount > 0 && (
                      <span className="home-count-badge">
                        {userInventoriedCount} {userInventoriedCount === 1 ? 'bien registrado' : 'bienes registrados'}
                      </span>
                    )}
                  </div>
                  <div className="card-btn-arrow">→</div>
                </button>
              </div>

              <div className="home-footer-note">
                🔒 Personal Autorizado · I.E. José Abelardo Quiñones
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen 2: Scan & Input Form */}
      {activeView === 'scan' && (
        <FichaPatrimonialScanner
          items={items}
          onSaveItem={handleSaveFromFicha}
          showToast={showToast}
          onLogout={handleLogout}
          userDni={userDni}
          onBackToHome={() => {
            setAutoStartCamera(false);
            setActiveView('home');
          }}
          autoStartCamera={autoStartCamera}
        />
      )}

      {/* Screen 3: Review Inventory */}
      {activeView === 'inventory' && (
        <MyInventoriedView
          items={items}
          userDni={userDni}
          onNavigateToScanner={() => {
            setAutoStartCamera(true);
            setActiveView('scan');
          }}
          showToast={showToast}
          onDeleteItem={handleDeleteItem}
          onClearAll={handleClearAllInventory}
          onBackToHome={() => setActiveView('home')}
        />
      )}
    </div>
  );
}

