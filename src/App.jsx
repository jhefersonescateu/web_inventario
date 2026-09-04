import React, { useState, useMemo, useEffect } from 'react';
import QRManagerModule from './components/QRManagerModule';
import AccessGate from './components/AccessGate';
import FichaPatrimonialScanner from './components/FichaPatrimonialScanner';


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
  
  // Authentication state (requires entering QUIÑONES)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('stockpile_auth') === 'true';
  });

  // Navigation Tabs state ('ficha' | 'inventory' | 'qr')
  const [activeMainTab, setActiveMainTab] = useState('ficha');
  const [selectedQrItem, setSelectedQrItem] = useState(null);

  // WebSocket connection to backend Node.js server for desktop synchronization
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket('ws://localhost:3001');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'QR_SCANNED' && data.item) {
            setItems(prev => {
              const exists = prev.some(i => i.code === data.item.code);
              if (exists) {
                return prev.map(i => i.code === data.item.code ? { ...i, ...data.item } : i);
              } else {
                return [data.item, ...prev];
              }
            });
            showToast(`📡 Sincronización en tiempo real: QR ${data.item.code}`);
          }
        } catch (e) {}
      };
    } catch (e) {}

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Save/Update Item from Ficha Patrimonial Scanner
  const handleSaveFromFicha = (savedItem) => {
    setItems(prev => {
      const exists = prev.some(i => i.code === savedItem.code || i.id === savedItem.id);
      if (exists) {
        return prev.map(i => (i.code === savedItem.code || i.id === savedItem.id) ? { ...i, ...savedItem } : i);
      } else {
        return [savedItem, ...prev];
      }
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('stockpile_auth');
    setIsAuthenticated(false);
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

  if (!isAuthenticated) {
    return <AccessGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="mobile-app-shell">
      {/* Toast alert */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Mobile App Interface */}
      <FichaPatrimonialScanner
        items={items}
        onSaveItem={handleSaveFromFicha}
        showToast={showToast}
        onLogout={handleLogout}
      />
    </div>
  );
}

