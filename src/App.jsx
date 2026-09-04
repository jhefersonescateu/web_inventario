import React, { useState, useMemo } from 'react';
import QRManagerModule from './components/QRManagerModule';


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
  const [items, setItems] = useState(initialSchoolInventory);
  const [locations, setLocations] = useState(defaultLocations);
  
  // Navigation Tabs state ('inventory' | 'qr')
  const [activeMainTab, setActiveMainTab] = useState('inventory');
  const [selectedQrItem, setSelectedQrItem] = useState(null);
  
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

  // Open modal for NEW item
  const handleOpenAddModal = () => {
    const nextNum = items.length + 1;
    const autoCode = `QUI-REG-${String(nextNum).padStart(3, '0')}`;
    setEditingItem(null);
    setFormData({
      code: autoCode,
      location: selectedLocation !== 'Todas las Ubicaciones' ? selectedLocation : 'Aula-05',
      category: 'Mobiliario Escolar',
      name: '',
      brand: '',
      model: '',
      serialNumber: 'N/A',
      details: '',
      quantity: 1,
      status: 'Bueno',
      notes: ''
    });
    setIsItemModalOpen(true);
  };

  // Open modal for EDIT item
  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      location: item.location,
      category: item.category,
      name: item.name,
      brand: item.brand || '',
      model: item.model || '',
      serialNumber: item.serialNumber || 'N/A',
      details: item.details || '',
      quantity: item.quantity,
      status: item.status,
      notes: item.notes || ''
    });
    setIsItemModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      alert('Por favor complete el nombre y el código del bien.');
      return;
    }

    if (editingItem) {
      // Update
      setItems(prev => prev.map(item => item.id === editingItem.id ? { ...formData, id: editingItem.id } : item));
      showToast(`✅ Bien "${formData.name}" actualizado correctamente.`);
    } else {
      // Create
      const newItem = {
        ...formData,
        id: formData.code || `QUI-${Date.now()}`
      };
      setItems(prev => [newItem, ...prev]);
      showToast(`📦 Nuevo bien "${formData.name}" registrado en ${formData.location}.`);
    }
    setIsItemModalOpen(false);
  };

  // Duplicate Item
  const handleDuplicateItem = (item) => {
    const nextNum = items.length + 1;
    const duplicated = {
      ...item,
      id: `QUI-DUP-${Date.now()}`,
      code: `QUI-REG-${String(nextNum).padStart(3, '0')}`,
      name: `${item.name} (Copia)`
    };
    setItems([duplicated, ...items]);
    showToast(`📋 Copia duplicada creada: ${duplicated.code}`);
  };

  // Delete Item
  const handleDeleteItem = (id, name) => {
    if (window.confirm(`¿Está seguro de eliminar el bien "${name}" del inventario?`)) {
      setItems(prev => prev.filter(item => item.id !== id));
      showToast(`🗑️ Bien "${name}" eliminado del inventario.`);
    }
  };

  // Printable QR Tag Modal
  const handleOpenTagModal = (item) => {
    setTagItem(item);
    setIsTagModalOpen(true);
  };


  // Add new classroom location
  const handleAddLocation = (e) => {
    e.preventDefault();
    if (!newLocationInput.trim()) return;
    const formatted = newLocationInput.trim();
    if (locations.includes(formatted)) {
      alert('Esta ubicación ya se encuentra registrada.');
      return;
    }
    setLocations([...locations, formatted]);
    setSelectedLocation(formatted);
    setNewLocationInput('');
    setIsLocationModalOpen(false);
    showToast(`🏫 Nueva ubicación "${formatted}" agregada con éxito.`);
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

  // Dynamic KPI Metrics
  const metrics = useMemo(() => {
    const totalRecords = filteredItems.length;
    const totalQuantityUnits = filteredItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
    
    const techCount = filteredItems
      .filter(i => i.category === 'Equipos Tecnológicos')
      .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    const furnitureCount = filteredItems
      .filter(i => i.category === 'Mobiliario Escolar')
      .reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);

    const goodCount = filteredItems.filter(i => i.status === 'Bueno').length;
    const regularCount = filteredItems.filter(i => i.status === 'Regular').length;
    const badCount = filteredItems.filter(i => i.status === 'Malo').length;

    const operationalPercent = totalRecords > 0 ? Math.round(((goodCount + regularCount) / totalRecords) * 100) : 100;

    return {
      totalRecords,
      totalQuantityUnits,
      techCount,
      furnitureCount,
      goodCount,
      regularCount,
      badCount,
      operationalPercent
    };
  }, [filteredItems]);

  // Export to Excel / CSV
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      alert('No hay datos para exportar con los filtros actuales.');
      return;
    }

    const headers = [
      'CÓDIGO',
      'UBICACIÓN',
      'CATEGORÍA',
      'BIEN / OBJETO',
      'MARCA',
      'MODELO',
      'SERIE',
      'DETALLES / ESPECIFICACIONES',
      'CANTIDAD',
      'ESTADO',
      'OBSERVACIONES'
    ];

    const csvRows = [headers.join(',')];

    filteredItems.forEach(item => {
      const row = [
        `"${item.code}"`,
        `"${item.location}"`,
        `"${item.category}"`,
        `"${item.name}"`,
        `"${item.brand}"`,
        `"${item.model}"`,
        `"${item.serialNumber}"`,
        `"${item.details.replace(/"/g, '""')}"`,
        item.quantity,
        `"${item.status}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventario_Quiñones_${selectedLocation.replace(/\s+/g, '_')}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('📊 Reporte de inventario exportado en formato Excel / CSV.');
  };

  return (
    <div className="inventory-app">
      {/* Toast alert */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar matching executive reference styling */}
      <header className="header-card">
        <div className="header-brand">
          <div className="header-logo-badge">
            🏫
          </div>
          <div className="header-title-box">
            <h1>Inventario Escolar — I.E. José Abelardo Quiñones</h1>
            <p>Módulo Institucional de Almacenamiento, Mobiliario y Equipamiento Tecnológico — Registro 2026</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAddModal}>
            <span>+</span> Registrar Nuevo Bien
          </button>
          <button className="btn btn-secondary" onClick={() => setIsLocationModalOpen(true)}>
            <span>🏫</span> + Nueva Ubicación
          </button>
          <button className="btn btn-emerald" onClick={handleExportExcel}>
            <span>📊</span> Exportar Excel (.xlsx)
          </button>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <nav className="main-nav-bar">
        <button 
          className={`nav-tab-btn ${activeMainTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('inventory')}
        >
          <span>📦</span> Libro de Control de Inventario
        </button>
        <button 
          className={`nav-tab-btn ${activeMainTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveMainTab('qr')}
        >
          <span>🏷️</span> Generador & Escáner QR de Etiquetas
          <span className="nav-tab-badge">NUEVO</span>
        </button>
      </nav>

      {activeMainTab === 'qr' ? (
        <QRManagerModule
          items={items}
          locations={locations}
          categoriesList={categoriesList}
          onAddItem={(newItem) => setItems(prev => [newItem, ...prev])}
          onUpdateItem={(updatedItem) => setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item))}
          showToast={showToast}
          initialSelectedItem={selectedQrItem}
        />
      ) : (
        <>
          {/* Dynamic Metrics Cards Bar (4 columns) */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">TOTAL DE BIENES EN VISTA</span>
                <div className="kpi-icon">📦</div>
              </div>
              <div className="kpi-value">{metrics.totalRecords} <span style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 500 }}>({metrics.totalQuantityUnits} unids)</span></div>
              <div className="kpi-subtext">Registros catalogados en {selectedLocation}</div>
            </div>

            <div className="kpi-card kpi-teal">
              <div className="kpi-header">
                <span className="kpi-title">EQUIPOS TECNOLÓGICOS</span>
                <div className="kpi-icon">💻</div>
              </div>
              <div className="kpi-value">{metrics.techCount} <span style={{ fontSize: '0.9rem', color: '#0d9488' }}>unidades</span></div>
              <div className="kpi-subtext">Laptops, Proyectores, PCs y Periféricos</div>
            </div>

            <div className="kpi-card kpi-amber">
              <div className="kpi-header">
                <span className="kpi-title">MOBILIARIO ESCOLAR</span>
                <div className="kpi-icon">🪑</div>
              </div>
              <div className="kpi-value">{metrics.furnitureCount} <span style={{ fontSize: '0.9rem', color: '#b45309' }}>unidades</span></div>
              <div className="kpi-subtext">Mesas, Sillas, Pizarras y Estantes</div>
            </div>

            <div className="kpi-card kpi-indigo">
              <div className="kpi-header">
                <span className="kpi-title">ESTADO Y CONSERVACIÓN</span>
                <div className="kpi-icon">✅</div>
              </div>
              <div className="kpi-value">{metrics.operationalPercent}% <span style={{ fontSize: '0.9rem', color: '#4f46e5' }}>Operativos</span></div>
              <div className="kpi-subtext">
                {metrics.goodCount} Óptimos | {metrics.regularCount} Regular | <span style={{ color: '#dc2626', fontWeight: 600 }}>{metrics.badCount} Malos/Baja</span>
              </div>
            </div>
          </div>

          {/* Main Table Content Card */}
          <main className="content-card">
            <div className="table-header-bar">
              <div className="table-title-row">
                <h2>
                  <span>Libro de Control de Inventario Escolar</span>
                  <span className="table-badge-subtitle">Ubicación Actual: {selectedLocation}</span>
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-amber btn-sm" 
                    onClick={() => {
                      if (filteredItems.length > 0) setSelectedQrItem(filteredItems[0]);
                      setActiveMainTab('qr');
                    }}
                  >
                    🏷️ Generar Etiquetas QR
                  </button>
                </div>
              </div>

              {/* Filters and Search Row */}
              <div className="filters-row">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar por código, nombre de bien, marca, serie, aula..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <select
                  className="filter-select"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  {locations.map((loc, idx) => (
                    <option key={idx} value={loc}>
                      📍 {loc}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categoriesList.map((cat, idx) => (
                    <option key={idx} value={cat}>
                      📁 {cat}
                    </option>
                  ))}
                </select>

                <select
                  className="filter-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="Todos">⚡ Todos los Estados</option>
                  <option value="Bueno">✓ Bueno / Operativo</option>
                  <option value="Regular">⚠️ Regular</option>
                  <option value="Malo">✕ Malo / De Baja</option>
                </select>
              </div>
            </div>

            {/* Data Table */}
            <div className="table-responsive">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>CÓDIGO</th>
                    <th>UBICACIÓN / AULA</th>
                    <th>CLASE / CATEGORÍA</th>
                    <th>NOMBRE DEL BIEN</th>
                    <th>MARCA / MODELO</th>
                    <th>ESPECIFICACIONES Y DETALLES</th>
                    <th style={{ textAlign: 'center' }}>CANT.</th>
                    <th>ESTADO</th>
                    <th style={{ textAlign: 'center' }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="code-tag">{item.code}</span>
                        </td>
                        <td>
                          <span className="location-badge">
                            📍 {item.location}
                          </span>
                        </td>
                        <td>
                          <span className="category-tag">{item.category}</span>
                        </td>
                        <td>
                          <div className="item-name">{item.name}</div>
                          {item.notes && <div className="item-details-sub">📝 {item.notes}</div>}
                        </td>
                        <td>
                          <div className="brand-text">{item.brand || 'MINEDU'}</div>
                          <div className="item-details-sub">{item.model !== 'N/A' ? item.model : ''}</div>
                        </td>
                        <td>
                          <div className="specs-text">{item.details}</div>
                          {item.serialNumber && item.serialNumber !== 'N/A' && (
                            <div className="item-details-sub" style={{ fontFamily: 'monospace' }}>
                              S/N: {item.serialNumber}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="qty-badge">{item.quantity}</span>
                        </td>
                        <td>
                          {item.status === 'Bueno' && (
                            <span className="status-badge status-bueno">✓ Bueno / Operativo</span>
                          )}
                          {item.status === 'Regular' && (
                            <span className="status-badge status-regular">⚠️ Regular</span>
                          )}
                          {item.status === 'Malo' && (
                            <span className="status-badge status-malo">✕ Malo / De baja</span>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell" style={{ justifyContent: 'center' }}>
                            <button
                              className="btn-icon"
                              title="Editar bien"
                              onClick={() => handleOpenEditModal(item)}
                            >
                              ✏️
                            </button>
                            <button
                              className="btn-icon"
                              title="Generar e Imprimir Etiqueta QR"
                              onClick={() => {
                                setSelectedQrItem(item);
                                setActiveMainTab('qr');
                              }}
                            >
                              🏷️
                            </button>
                            <button
                              className="btn-icon"
                              title="Duplicar registro"
                              onClick={() => handleDuplicateItem(item)}
                            >
                              📋
                            </button>
                            <button
                              className="btn-icon danger"
                              title="Eliminar bien"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9">
                        <div className="empty-state">
                          <div className="empty-state-icon">🔍</div>
                          <h3>No se encontraron bienes registrados</h3>
                          <p style={{ marginTop: '4px', fontSize: '0.85rem' }}>
                            No hay ítems que coincidan con la búsqueda o filtro seleccionado en <strong>{selectedLocation}</strong>.
                          </p>
                          <button 
                            className="btn btn-primary btn-sm" 
                            style={{ marginTop: '16px' }}
                            onClick={handleOpenAddModal}
                          >
                            + Registrar Primer Bien en {selectedLocation}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer info bar */}
            <div className="table-footer">
              <div>
                Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> bienes registrados en total.
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span>🏫 Institución Educativa José Abelardo Quiñones</span>
                <span>|</span>
                <span>Sistema Stockpile v2.5</span>
              </div>
            </div>
          </main>
        </>
      )}

      {/* Modal: ADD / EDIT ITEM */}
      {isItemModalOpen && (
        <div className="modal-overlay" onClick={() => setIsItemModalOpen(false)}>
          <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <span>{editingItem ? '✏️ Editar Registro de Bien' : '📦 Registrar Nuevo Bien Escolar'}</span>
              </h3>
              <button className="close-btn" onClick={() => setIsItemModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Código Patrimonial / Tag ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. QUI-MOB-001"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Ubicación / Aula *</label>
                    <select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    >
                      {locations
                        .filter(l => l !== 'Todas las Ubicaciones')
                        .map((loc, idx) => (
                          <option key={idx} value={loc}>{loc}</option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Clase / Categoría *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categoriesList
                        .filter(c => c !== 'Todas las Categorías')
                        .map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Nombre del Bien / Objeto *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Mesa bipersonal, Laptop, Proyector..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Marca</label>
                    <input
                      type="text"
                      placeholder="Ej. MINEDU, Epson, Lenovo, HP..."
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Modelo</label>
                    <input
                      type="text"
                      placeholder="Ej. PowerLite 118, V15 G3, N/A..."
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>N° de Serie (para Tecnología/Equipos)</label>
                    <input
                      type="text"
                      placeholder="Ej. LNV-2026-901 o N/A"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Cantidad *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Estado / Condición de Conservación *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Bueno">✓ Bueno / Operativo</option>
                      <option value="Regular">⚠️ Regular (Funciona con detalles)</option>
                      <option value="Malo">✕ Malo / Requiere Baja o Reparación</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Especificaciones / Descripción (Color, Medidas, Material)</label>
                    <textarea
                      rows="2"
                      placeholder="Ej. Color Marrón claro, madera prensada con patas de fierro gris (120x50cm)..."
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Observaciones Adicionales / Notas</label>
                    <input
                      type="text"
                      placeholder="Ej. Entregado en lote 2024, requiere ajuste de perno en pata derecha..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsItemModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Guardar Cambios' : 'Registrar Bien'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: PRINTABLE QR / TAG PREVIEW */}
      {isTagModalOpen && tagItem && (
        <div className="modal-overlay" onClick={() => setIsTagModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏷️ Ficha de Control Patrimonial — I.E. Quiñones</h3>
              <button className="close-btn" onClick={() => setIsTagModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="asset-tag-card">
                <div className="asset-tag-header">
                  <h4>I.E. JOSÉ ABELARDO QUIÑONES</h4>
                  <p>SISTEMA PATRIMONIAL INSTITUCIONAL</p>
                </div>
                
                <div className="asset-tag-code">{tagItem.code}</div>
                <div className="asset-tag-barcode"></div>

                <div className="asset-tag-info">
                  <p><strong>BIEN:</strong> {tagItem.name}</p>
                  <p><strong>UBICACIÓN:</strong> {tagItem.location}</p>
                  <p><strong>CATEGORÍA:</strong> {tagItem.category}</p>
                  <p><strong>MARCA/MODELO:</strong> {tagItem.brand} {tagItem.model !== 'N/A' ? tagItem.model : ''}</p>
                  {tagItem.serialNumber !== 'N/A' && <p><strong>N° SERIE:</strong> {tagItem.serialNumber}</p>}
                  <p><strong>ESTADO:</strong> {tagItem.status}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsTagModalOpen(false)}>
                Cerrar
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ Imprimir Etiqueta / QR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: GESTIONAR UBICACIONES / AULAS */}
      {isLocationModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLocationModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏫 Gestión de Aulas y Ubicaciones</h3>
              <button className="close-btn" onClick={() => setIsLocationModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAddLocation} style={{ marginBottom: '20px' }}>
                <div className="form-group">
                  <label>Nombre de la Nueva Ubicación / Aula</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Aula-06, Taller de Robótica, Auditórium..."
                      value={newLocationInput}
                      onChange={(e) => setNewLocationInput(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                      + Agregar
                    </button>
                  </div>
                </div>
              </form>

              <h4 style={{ fontSize: '0.85rem', marginBottom: '10px', color: '#475569' }}>
                Ubicaciones Registradas ({locations.length - 1}):
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {locations
                  .filter(l => l !== 'Todas las Ubicaciones')
                  .map((loc, idx) => (
                    <div 
                      key={idx} 
                      className="location-badge"
                      style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                    >
                      📍 {loc}
                    </div>
                  ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsLocationModalOpen(false)}>
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
