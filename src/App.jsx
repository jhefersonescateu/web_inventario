import React, { useState, useMemo, useEffect } from 'react';
import QRManagerModule from './components/QRManagerModule';
import AccessGate from './components/AccessGate';
import FichaPatrimonialScanner from './components/FichaPatrimonialScanner';
import MyInventoriedView from './components/MyInventoriedView';
import TomaInventarioSesion from './components/TomaInventarioSesion';


// Clean production inventory initial state
const initialSchoolInventory = [];

const categoriesList = [
  'Todas las Categorías',
  'Mobiliario Escolar',
  'Equipos Tecnológicos',
  'Material Didáctico',
  'Artículos Deportivos',
  'Climatización y Audio'
];

const defaultLocations = [
  'Todas las Ubicaciones'
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
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('stockpile_auth') === 'true';
  });

  const [userDni, setUserDni] = useState(() => {
    return sessionStorage.getItem('stockpile_dni') || '';
  });

  const [colegioCode, setColegioCode] = useState(() => {
    return sessionStorage.getItem('stockpile_colegio') || 'QUIÑONES';
  });

  const [institutionName, setInstitutionName] = useState(() => {
    return sessionStorage.getItem('stockpile_institution') || 'I.E. JOSÉ ABELARDO QUIÑONES';
  });

  // Active View state ('home' | 'scan' | 'inventory')
  const [activeView, setActiveView] = useState('home');
  const [autoStartCamera, setAutoStartCamera] = useState(false);

  // Count items inventoried by current user DNI
  const userInventoriedCount = useMemo(() => {
    return items.filter(item => item.scannedByDni === userDni || (!item.scannedByDni && item.operatorDni === userDni)).length;
  }, [items, userDni]);

  // Dynamic Backend API & WebSocket resolution for Production & Development
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '');
    }
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.port === '5173' || window.location.port === '3000') {
        return `http://${window.location.hostname}:3001`;
      }
      return window.location.origin;
    }
    return '';
  };

  const getWsUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) {
      try {
        const u = new URL(import.meta.env.VITE_BACKEND_URL);
        const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${u.host}`;
      } catch (e) {}
    }
    const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
    return `ws://${host}:3001`;
  };

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

  // Fetch real inventory items from backend API on load, scoped to current colegio
  useEffect(() => {
    const fetchRealInventory = async () => {
      const apiUrl = getApiBaseUrl();
      try {
        const res = await fetch(`${apiUrl}/api/inventory?colegio=${encodeURIComponent(colegioCode)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setItems(data.items);
          localStorage.setItem('stockpile_real_inventory', JSON.stringify(data.items));
        }
      } catch (err) {
        console.log('Backend offline o reconectando...');
      }
    };
    if (isAuthenticated) {
      fetchRealInventory();
    }
  }, [isAuthenticated, colegioCode]);

  // WebSocket connection to backend server for desktop synchronization
  useEffect(() => {
    let ws;
    const wsUrl = getWsUrl();
    try {
      ws = new WebSocket(wsUrl);
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

  // Save/Update Item to Real Inventory
  const handleSaveFromFicha = (savedItem) => {
    const apiUrl = getApiBaseUrl();
    const itemWithColegio = {
      ...savedItem,
      colegio: savedItem.colegio || colegioCode
    };

    setItems(prev => {
      const exists = prev.some(i => i.code === itemWithColegio.code || i.id === itemWithColegio.id);
      const nextState = exists
        ? prev.map(i => (i.code === itemWithColegio.code || i.id === itemWithColegio.id) ? { ...i, ...itemWithColegio } : i)
        : [itemWithColegio, ...prev];
      localStorage.setItem('stockpile_real_inventory', JSON.stringify(nextState));
      return nextState;
    });

    fetch(`${apiUrl}/api/inventory/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemWithColegio)
    }).catch(err => console.error('Error al guardar en backend:', err));
  };

  const handleAuthenticated = (data) => {
    if (data && data.dni) {
      setUserDni(data.dni);
    }
    if (data && data.colegio) {
      setColegioCode(data.colegio);
    }
    if (data && data.institution) {
      setInstitutionName(data.institution);
    }
    setIsAuthenticated(true);
    setActiveView('home');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('stockpile_auth');
    sessionStorage.removeItem('stockpile_dni');
    sessionStorage.removeItem('stockpile_colegio');
    sessionStorage.removeItem('stockpile_institution');
    setIsAuthenticated(false);
    setUserDni('');
    setColegioCode('QUIÑONES');
    setInstitutionName('I.E. JOSÉ ABELARDO QUIÑONES');
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
              <p className="ficha-institution-tag">{institutionName}</p>

              <div className="home-user-badge">
                👤 Operador DNI: <strong>{userDni || 'No registrado'}</strong> | 🏫 Código: <strong>{colegioCode}</strong>
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
                    <p>Ingresar bienes escaneando únicamente el código QR con la cámara</p>
                  </div>
                  <div className="card-btn-arrow">→</div>
                </button>

                {/* Button 2: Inventario de forma manual */}
                <button 
                  type="button"
                  className="home-card-btn session-inventory-btn"
                  onClick={() => setActiveView('session')}
                >
                  <div className="card-btn-icon">📝</div>
                  <div className="card-btn-content">
                    <h2>Inventario de forma manual</h2>
                    <p>Iniciar sesión de toma de inventario por ambiente y control de faltantes/sobrantes</p>
                  </div>
                  <div className="card-btn-arrow">→</div>
                </button>

                {/* Button 3: Revisar Inventario */}
                <button 
                  type="button"
                  className="home-card-btn secondary-inventory"
                  onClick={() => setActiveView('inventory')}
                >
                  <div className="card-btn-icon">📋</div>
                  <div className="card-btn-content">
                    <h2>Revisar Inventario</h2>
                    <p>Ver y consultar los bienes inventariados en el sistema</p>
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

      {/* Screen 3: Toma de Inventario por Ambiente */}
      {activeView === 'session' && (
        <TomaInventarioSesion
          onBackToHome={() => setActiveView('home')}
          showToast={showToast}
          getBackendHost={getBackendHost}
          userDni={userDni}
        />
      )}

      {/* Screen 4: Review Inventory */}
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

