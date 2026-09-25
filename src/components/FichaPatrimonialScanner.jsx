import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// ─── PASO 1: Categorías del Objeto ────────────────────────────────────────────
const CATEGORIES = [
  { value: 'Equipos Tecnológicos',                        emoji: '💻' },
  { value: 'Mobiliario Escolar',                          emoji: '🪑' },
  { value: 'Material Didáctico y Libros',                 emoji: '📚' },
  { value: 'Artículos Deportivos y Educación Física',     emoji: '⚽' },
  { value: 'Utensilios de Cocina y Comedor (Qali Warma)', emoji: '🍳' },
  { value: 'Arte, Música y Banda Escolar',                emoji: '🎷' },
  { value: 'Enfermería y Botiquín de Auxilios',           emoji: '🩺' },
  { value: 'Climatización y Audio',                       emoji: '❄️' },
  { value: 'Herramientas y Mantenimiento',                emoji: '🛠️' },
  { value: 'Suministros y Consumibles',                   emoji: '📦' },
];

// ─── Estado Operativo ──────────────────────────────────────────────────────────
const ESTADO_OPTIONS = [
  { value: 'Bueno',         label: '✅ Bueno / Operativo' },
  { value: 'Regular',       label: '⚠️ Regular / Desgaste' },
  { value: 'Mantenimiento', label: '🔧 En Mantenimiento' },
  { value: 'Malo',          label: '❌ Malo / Inoperativo' },
];

// ─── Tipo de Material ──────────────────────────────────────────────────────────
const TIPO_MATERIAL_OPTIONS = [
  '',
  '🪵 Madera',
  '🪵 Madera Prensada / MDF',
  '🌳 Madera Maciza',
  '🔩 Metal / Acero',
  '⚙️ Aluminio',
  '🥫 Lata / Hojalata',
  '🧴 Plástico',
  '🛡️ Plástico Reforzado',
  '🪟 Vidrio',
  '🪟 Vidrio Templado',
  '🧵 Tela / Textil',
  '⚫ Caucho / Goma',
  '🏺 Cerámica / Porcelana',
  '✨ Acero Inoxidable',
  '🧪 Fibra de Vidrio',
  '🔀 Mixto / Compuesto',
  '❓ Otro',
];

// ─── Situación del Objeto ──────────────────────────────────────────────────────
const SITUACION_OPTIONS = [
  { value: '',                           label: '— Sin especificar' },
  { value: 'En uso activo',              label: '✅ En uso activo' },
  { value: 'En uso (préstamo temporal)', label: '🔄 En uso (préstamo temporal)' },
  { value: 'Almacenado / En stock',      label: '📦 Almacenado / En stock' },
  { value: 'Almacenado (sin asignar)',   label: '🗄️ Almacenado (sin asignar)' },
  { value: 'En mantenimiento',           label: '🔧 En mantenimiento' },
  { value: 'Reservado',                  label: '🔒 Reservado' },
  { value: 'De baja / Descartado',       label: '❌ De baja / Descartado' },
];

// ─── PASO 2: Cuestionarios Dinámicos por categoría ────────────────────────────
// El campo "notes" se agrega automáticamente al final de cada cuestionario.
const DYNAMIC_QUESTIONS = {
  'Equipos Tecnológicos': {
    title: 'Especificaciones Técnicas y Conectividad',
    fields: [
      { key: 'voltage',           label: 'Voltaje / Alimentación',        type: 'select',
        options: ['220V AC', '110V AC', 'Batería Recargable', 'USB 5V / Type-C', 'PoE (Power over Ethernet)'] },
      { key: 'ports',             label: 'Puertos / Conectividad',         type: 'text',     placeholder: 'Ej. HDMI, VGA, Wi-Fi 6, Ethernet RJ45' },
      { key: 'macAddress',        label: 'Dirección MAC / IP',             type: 'text',     placeholder: 'Ej. AA:BB:CC:DD:EE:FF / 192.168.1.50' },
      { key: 'warrantyExpiry',    label: 'Vencimiento de Garantía',        type: 'date' },
      { key: 'maintenanceStatus', label: 'Estado de Mantenimiento',        type: 'select',
        options: ['Al día / Operativo', 'Mantenimiento Preventivo Pendiente', 'En Diagnóstico / Reparación', 'Garantía Vigente'] },
      { key: 'accessories',       label: 'Accesorios Incluidos',           type: 'text',     placeholder: 'Ej. Cable de poder, Control remoto, Soporte de techo' },
    ]
  },
  'Mobiliario Escolar': {
    title: 'Materiales y Estado Estructural',
    fields: [
      { key: 'material',        label: 'Material de Fabricación',         type: 'select',
        options: ['Madera Prensada y Metal', 'Melamina con Marco de Fierro', 'Plástico Inyectado Reforzado', 'Madera Maciza (Cedro/Tornillo)', 'Aluminio y Vidrio'] },
      { key: 'dimensions',      label: 'Dimensiones (Alto x Ancho x Prof.)', type: 'text',  placeholder: 'Ej. 120cm x 50cm x 75cm' },
      { key: 'capacity',        label: 'Capacidad de Personas',           type: 'select',
        options: ['Unipersonal (1 estudiante)', 'Bipersonal (2 estudiantes)', 'Mesa Grupal (4-6 estudiantes)', 'Uso Docente / Administrativo'] },
      { key: 'color',           label: 'Color Predominante',              type: 'text',     placeholder: 'Ej. Marrón Claro, Azul Institucional, Gris Metalizado' },
      { key: 'structureState',  label: 'Estado de la Estructura',         type: 'select',
        options: ['Óptimo sin detalles', 'Requiere ajuste de pernos/soldadura', 'Superficie desgastada/rayada', 'Inestable / Para reparación'] },
    ]
  },
  'Material Didáctico y Libros': {
    title: 'Ficha Pedagógica y Editorial',
    fields: [
      { key: 'publisherOrAuthor', label: 'Editorial / Autor',              type: 'text',     placeholder: 'Ej. Santillana, MINEDU, Ediciones Corefo' },
      { key: 'isbnCode',          label: 'Código ISBN / Depósito Legal',   type: 'text',     placeholder: 'Ej. 978-612-345-678-9 / Lote MINEDU 2024' },
      { key: 'educationalLevel',  label: 'Nivel Educativo Target',         type: 'select',
        options: ['Educación Inicial', 'Educación Primaria', 'Educación Secundaria', 'Docentes / Biblioteca central'] },
      { key: 'subject',           label: 'Área Curricular / Asignatura',   type: 'select',
        options: ['Matemática', 'Comunicación', 'Ciencia y Tecnología', 'Ciencias Sociales', 'Inglés', 'Arte y Cultura', 'Robótica / STEM'] },
      { key: 'editionYear',       label: 'Año de Edición / Publicación',   type: 'number',   placeholder: 'Ej. 2024' },
    ]
  },
  'Artículos Deportivos y Educación Física': {
    title: 'Ficha de Implementación Deportiva y Educación Física',
    fields: [
      { key: 'sportType',          label: 'Disciplina / Deporte Target',   type: 'select',
        options: ['Fútbol / Balompié', 'Básquet / Baloncesto', 'Vóley / Voleibol', 'Atletismo y Gimnasia', 'Ajedrez y Juegos de Mesa', 'Psicomotricidad Inicial'] },
      { key: 'equipmentCondition', label: 'Estado de Uso y Presión',       type: 'select',
        options: ['Óptimo (Inflado / Presión correcta)', 'Requiere aire / inflador', 'Costura / Superficie desgastada', 'Inoperativo / De baja'] },
      { key: 'safetyGear',         label: 'Accesorios y Protección',       type: 'text',     placeholder: 'Ej. Incluye 10 conos, 12 chalecos/petos, colchonetas' },
      { key: 'storageBag',         label: 'Malla / Red de Almacenamiento', type: 'select',
        options: ['Guardado en Red de Nylon Reforzada', 'Estante Abierto de Almacén Deportivo', 'Caja Organizadora Plástica'] },
    ]
  },
  'Utensilios de Cocina y Comedor (Qali Warma)': {
    title: 'Ficha Técnica de Cocina Escolar y Qali Warma',
    fields: [
      { key: 'utensilMaterial',  label: 'Material Grado Alimenticio',      type: 'select',
        options: ['Acero Inoxidable Quirúrgico', 'Aluminio Reforzado', 'Plástico Térmico Grado Alimenticio', 'Vidrio Templado / Porcelana'] },
      { key: 'sanitaryStatus',   label: 'Registro e Higiene Sanitaria',    type: 'select',
        options: ['Apto y certificado para consumo escolar', 'Requiere desinfección profunda / mantenimiento', 'Desgastado para reemplazo'] },
      { key: 'capacityRations',  label: 'Capacidad de Raciones / Volumen', type: 'text',     placeholder: 'Ej. 50 Litros / 120 raciones diarias' },
      { key: 'energySupply',     label: 'Fuente de Calentamiento / Operación', type: 'select',
        options: ['Gas GLP Industrial', 'Eléctrico 220V', 'Manual / Utensilio sin energía'] },
    ]
  },
  'Arte, Música y Banda Escolar': {
    title: 'Ficha de Instrumentos Musicales y Artes Plásticas',
    fields: [
      { key: 'instrumentCategory', label: 'Familia del Instrumento / Arte', type: 'select',
        options: ['Viento Metal (Trompeta, Trombón, Tuba)', 'Viento Madera (Flauta, Clarinete)', 'Percusión (Tarola, Bombo, Platillos)', 'Cuerdas (Guitarra, Violín)', 'Artes Plásticas / Caballetes'] },
      { key: 'tuningStatus',       label: 'Estado de Calibración / Afinación', type: 'select',
        options: ['Afinado y operativo para presentaciones', 'Requiere afinación / ajuste leve', 'Parche / Llave dañada para reparación'] },
      { key: 'includesCase',       label: 'Funda / Estuche de Protección',  type: 'select',
        options: ['Sí, incluye estuche rígido original', 'Sí, funda acolchada de tela', 'Sin funda de protección'] },
    ]
  },
  'Enfermería y Botiquín de Auxilios': {
    title: 'Ficha de Emergencia Médica Escolar',
    fields: [
      { key: 'medicalCategory', label: 'Tipo de Equipo / Insumo',          type: 'select',
        options: ['Botiquín Completo de Primeros Auxilios', 'Camilla de Evacuación / Rescate', 'Equipo de Medición (Tensiómetro, Termómetro)', 'Antisépticos, Vendajes y Gasas'] },
      { key: 'expiryDate',      label: 'Fecha de Vencimiento de Medicamentos', type: 'date' },
      { key: 'sanitarySeal',   label: 'Estado de Empaque / Esterilidad',   type: 'select',
        options: ['Empaque estéril sellado de fábrica', 'Reutilizable desinfectado', 'Vencido / Para descarte'] },
    ]
  },
  'Climatización y Audio': {
    title: 'Ficha Técnica de Equipos de Clima y Sonido',
    fields: [
      { key: 'powerRating',      label: 'Potencia (Watts / Lumens / BTU)', type: 'text',     placeholder: 'Ej. 150W, 12000 BTU, 3800 Lumens' },
      { key: 'installationType', label: 'Tipo de Instalación',             type: 'select',
        options: ['Fijado en Techo', 'Mural / Colgado en Pared', 'Portátil / Móvil con Ruedas', 'Sobremesa / Consola'] },
      { key: 'hasRemote',        label: 'Control Remoto / Interruptor',    type: 'select',
        options: ['Incluye Control Remoto Inalámbrico', 'Selector de Pared Fijo', 'Sin control remoto'] },
      { key: 'lastServiceDate',  label: 'Fecha de Último Mantenimiento',   type: 'date' },
    ]
  },
  'Herramientas y Mantenimiento': {
    title: 'Ficha de Herramientas y Seguridad',
    fields: [
      { key: 'toolCategory',  label: 'Tipo de Herramienta',               type: 'select',
        options: ['Manual (Alicate, Llave, Martillo)', 'Eléctrica con Cable 220V', 'Inalámbrica a Batería', 'Medición y Calibración', 'Corte y Jardinería'] },
      { key: 'voltagePower',  label: 'Especificación Técnica / Potencia', type: 'text',     placeholder: 'Ej. 750W / 18V Litio / 1/2 pulgada' },
      { key: 'includesCase',  label: 'Maletín / Caja de Almacenamiento',  type: 'select',
        options: ['Sí, incluye maletín original', 'No, guardado en estante común'] },
      { key: 'riskLevel',     label: 'Nivel de Riesgo de Manipulación',   type: 'select',
        options: ['Bajo (Uso general)', 'Moderado (Supervisión requerida)', 'Alto (Solo personal especializado de mantenimiento)'] },
    ]
  },
  'Suministros y Consumibles': {
    title: 'Control de Lote, Vencimiento y Reorden',
    fields: [
      { key: 'expirationDate', label: 'Fecha de Vencimiento / Caducidad', type: 'date' },
      { key: 'lotNumber',      label: 'Número de Lote de Fabricación',    type: 'text',     placeholder: 'Ej. LOT-202408-B' },
      { key: 'minStock',       label: 'Punto de Reorden (Stock Mínimo Alerta)', type: 'number', placeholder: 'Ej. 5' },
      { key: 'unitMeasure',    label: 'Unidad de Medida',                  type: 'select',
        options: ['Unidades / Piezas', 'Cajas', 'Paquetes / Paqs', 'Litros / Galones', 'Rollos', 'Kits'] },
    ]
  },
};

// Cuestionario genérico para categorías sin definición
const GENERIC_QUESTIONS = {
  title: 'Información General del Objeto',
  fields: [
    { key: 'areaResponsable', label: 'Área Responsable', type: 'text', placeholder: 'Ej. Dirección, Administración, Docentes' },
    { key: 'origenObjeto',    label: 'Origen del Objeto', type: 'select',
      options: ['Donación / MINEDU', 'Compra Institucional', 'Transferencia Institucional', 'Fabricación Propia / Artesanal', 'Sin especificar'] },
  ]
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FichaPatrimonialScanner({
  items = [],
  onSaveItem,
  showToast,
  onLogout,
  userDni = '',
  onBackToHome,
  autoStartCamera = false
}) {
  // Identifier
  const [currentCode,     setCurrentCode]     = useState('');
  const [hasScannedCode,  setHasScannedCode]  = useState(false);

  // Tab: 0 = Datos Básicos, 1 = Cuestionario Dinámico
  const [activeTab, setActiveTab] = useState(0);

  // ── Tab 1: Campos obligatorios ───────────────────────────────────────────────
  const [category,    setCategory]    = useState('Equipos Tecnológicos');
  const [name,        setName]        = useState('');
  const [location,    setLocation]    = useState('');
  const [quantity,    setQuantity]    = useState(1);
  const [status,      setStatus]      = useState('Bueno');

  // ── Tab 1: Campos opcionales ─────────────────────────────────────────────────
  const [brand,        setBrand]        = useState('');
  const [model,        setModel]        = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [alto,         setAlto]         = useState('');
  const [ancho,        setAncho]        = useState('');
  const [largo,        setLargo]        = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [color,        setColor]        = useState('');
  const [situacion,    setSituacion]    = useState('');
  const [details,      setDetails]      = useState('');

  // ── Tab 2: Respuestas dinámicas + notes ──────────────────────────────────────
  const [customFields, setCustomFields] = useState({});
  const [notes,        setNotes]        = useState('');

  // ── Camera / Manual modal ───────────────────────────────────────────────────
  const [isScannerOpen,     setIsScannerOpen]     = useState(false);
  const [cameraError,       setCameraError]       = useState(null);
  const [isScanning,        setIsScanning]        = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualCodeInput,   setManualCodeInput]   = useState('');
  const scannerRef     = useRef(null);
  const html5QrcodeRef = useRef(null);

  // Auto-start camera
  useEffect(() => {
    if (autoStartCamera && !hasScannedCode) {
      const t = setTimeout(() => startCameraScanner(), 400);
      return () => clearTimeout(t);
    }
  }, [autoStartCamera, hasScannedCode]);

  // Reset dynamic fields on category change
  useEffect(() => { setCustomFields({}); setNotes(''); }, [category]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const generateUniqueManualCode = () => {
    const nums = items
      .map(i => { const m = (i.code||'').match(/MANUAL-(\d+)/i); return m ? parseInt(m[1],10) : 0; })
      .filter(n => n > 0);
    return `MANUAL-${(nums.length > 0 ? Math.max(...nums) : 0) + 1}`;
  };

  const resetForm = () => {
    setName(''); setLocation(''); setStatus('Bueno');
    setCategory('Equipos Tecnológicos'); setQuantity(1);
    setBrand(''); setModel(''); setSerialNumber('');
    setAlto(''); setAncho(''); setLargo('');
    setTipoMaterial(''); setColor(''); setSituacion(''); setDetails('');
    setCustomFields({}); setNotes(''); setActiveTab(0);
  };

  const parseQrCodeString = (rawText) => {
    if (!rawText) return '';
    let str = rawText.trim();
    // If QR contains a URL like https://.../scan?code=QUI-2026-001 or ?code=
    if (str.includes('?code=') || str.includes('&code=')) {
      const match = str.match(/[?&]code=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim().toUpperCase();
      }
    }
    // If QR is a URL ending with code parameter or path
    if (str.startsWith('http://') || str.startsWith('https://')) {
      try {
        const u = new URL(str);
        const c = u.searchParams.get('code');
        if (c) return c.trim().toUpperCase();
      } catch (e) {}
    }
    return str.toUpperCase();
  };

  const handleLoadItemByCode = (codeToSearch) => {
    if (!codeToSearch) return;
    const cleanCode = parseQrCodeString(codeToSearch);
    resetForm();
    setCurrentCode(cleanCode);
    if (showToast) showToast(`✨ Código asignado: ${cleanCode}. Complete la información.`);
    setHasScannedCode(true);
  };

  const handleManualCodeSubmit = (e) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) { alert('Por favor ingrese un código identificador.'); return; }
    let cleanCode = manualCodeInput.trim().toUpperCase();
    if (/^\d+$/.test(cleanCode)) cleanCode = `MANUAL-${cleanCode}`;
    const exists = items.some(i => (i.code||'').toUpperCase() === cleanCode);
    let finalCode = cleanCode;
    if (exists) {
      finalCode = generateUniqueManualCode();
      if (showToast) showToast(`⚠️ Código "${cleanCode}" ya existía. Asignado: "${finalCode}".`);
    }
    handleLoadItemByCode(finalCode);
    setIsManualModalOpen(false);
  };

  // ── Camera ───────────────────────────────────────────────────────────────────
  const startCameraScanner = async () => {
    setIsScannerOpen(true); setCameraError(null); setIsScanning(true);
    setTimeout(async () => {
      try {
        if (!html5QrcodeRef.current) html5QrcodeRef.current = new Html5Qrcode('qr-reader-viewport');
        await html5QrcodeRef.current.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decoded) => { playSuccessBeep(); handleLoadItemByCode(decoded); stopCameraScanner(); },
          () => {}
        );
      } catch (err) {
        setCameraError('No se pudo acceder a la cámara. Verifique los permisos.'); setIsScanning(false);
      }
    }, 300);
  };

  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current && isScanning) {
      try { await html5QrcodeRef.current.stop(); } catch {}
    }
    setIsScanning(false); setIsScannerOpen(false);
  };

  const playSuccessBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type='sine'; osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime+0.18);
    } catch {}
  };

  // ── Send to Server (estructura Stockpile) ─────────────────────────────────────
  const sendToServer = async (itemPayload) => {
    const backendBase = import.meta.env.VITE_BACKEND_URL
      ? import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')
      : `http://${typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost'}:3001`;
    const servers = [
      `${backendBase}/api/inventory/save`,
      `${backendBase}/api/inventory`,
    ];
    for (const url of servers) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemPayload),
        });
        if (res.ok) { console.log(`✅ Guardado en ${url}`); return; }
      } catch {}
    }
    console.warn('⚠️ No se pudo conectar con ningún servidor backend.');
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const tab1Valid = name.trim() && location.trim() && category && quantity >= 1 && status;

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!tab1Valid) {
      if (showToast) showToast('⚠️ Complete los campos obligatorios: Nombre, Ubicación, Categoría, Cantidad y Estado.');
      return;
    }
    const item = {
      id:           currentCode,
      code:         currentCode,
      name,
      category,
      location,
      brand,
      model,
      serialNumber,
      quantity:     Number(quantity),
      status,
      details,
      notes,
      alto:         alto  ? parseFloat(alto)  : undefined,
      ancho:        ancho ? parseFloat(ancho) : undefined,
      largo:        largo ? parseFloat(largo) : undefined,
      tipoMaterial,
      color,
      situacion,
      customFields,
      verified:     true,
      scannedByDni: userDni,
      scannedAt:    new Date().toLocaleString(),
      lastUpdated:  new Date().toLocaleTimeString(),
    };
    if (onSaveItem) onSaveItem(item);
    sendToServer(item);
    if (showToast) showToast(`✅ Bien "${name}" (${currentCode}) registrado exitosamente.`);
    setHasScannedCode(false);
    resetForm();
  };

  // ── Dynamic questionnaire config ─────────────────────────────────────────────
  const dynConfig = DYNAMIC_QUESTIONS[category] || GENERIC_QUESTIONS;
  const dynFields = dynConfig.fields || [];
  const catInfo   = CATEGORIES.find(c => c.value === category) || CATEGORIES[0];

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="ficha-page-container">
      <div className="ficha-card-wrapper">

        {/* Header */}
        <div className="ficha-header-navy">
          <div className="ficha-header-top">
            {onBackToHome
              ? <button type="button" className="btn-back-home" onClick={onBackToHome}>← Volver al Menú</button>
              : <div className="jaq-avatar-yellow"><span>JAQ</span></div>
            }
            {userDni && <span className="user-dni-pill">👤 DNI: {userDni}</span>}
            {onLogout && <button type="button" className="btn-logout-mini" onClick={onLogout} title="Cerrar sesión">🔒 Salir</button>}
          </div>
          <h1 className="ficha-header-title">Escáner &amp; Registro</h1>
          <p className="ficha-header-subtitle">
            {hasScannedCode ? `Código: ${currentCode}` : 'Escanee un código QR para ingresar la información'}
          </p>
        </div>

        {/* Body */}
        <div className="ficha-body-cream">
          {!hasScannedCode ? (
            /* STATE 1: waiting for QR */
            <div className="scan-required-wrapper">
              <div className="scan-prompt-card">
                <div className="scan-icon-pulse">📷</div>
                <h2>Escaneo de QR Requerido</h2>
                <p>Para desbloquear la ficha e ingresar la información de un bien, escanee su código QR con la cámara.</p>
                <button type="button" className="btn-scan-camera-large" onClick={startCameraScanner}>
                  <span className="scan-icon">📷</span>
                  <span>{isScanning ? 'Escanear Código QR con Cámara...' : 'Abrir Cámara y Escanear QR'}</span>
                </button>
              </div>
              <div className="ficha-tester-bar" style={{marginTop:'24px'}}>
                <span className="tester-label">Probar códigos de ejemplo:</span>
                <div className="tester-chips">
                  <button type="button" onClick={() => handleLoadItemByCode('QUI-2026-014')} className="chip-btn">QUI-2026-014</button>
                  <button type="button" onClick={() => handleLoadItemByCode('QUI-TEC-001')}  className="chip-btn">QUI-TEC-001</button>
                  <button type="button" onClick={() => handleLoadItemByCode('QUI-MOB-001')}  className="chip-btn">QUI-MOB-001</button>
                </div>
              </div>
            </div>
          ) : (
            /* STATE 2: formulario en dos pasos */
            <div className="reg-modal-wrapper">

              {/* Modal header */}
              <div className="reg-modal-header">
                <div className="reg-modal-title-row">
                  <span className="reg-modal-icon">＋</span>
                  <div>
                    <h2 className="reg-modal-title">Registrar Objeto en Inventario</h2>
                    <p className="reg-modal-subtitle">Código: <strong className="reg-modal-code">{currentCode}</strong></p>
                  </div>
                </div>
                <button type="button" className="reg-modal-close" onClick={() => { setHasScannedCode(false); resetForm(); }}>✕</button>
              </div>

              {/* Tabs */}
              <div className="reg-tabs">
                <button
                  type="button"
                  className={`reg-tab ${activeTab===0?'reg-tab-active':''}`}
                  onClick={() => setActiveTab(0)}
                >
                  1. Datos Básicos y Ubicación
                </button>
                <button
                  type="button"
                  className={`reg-tab ${activeTab===1?'reg-tab-active':''}`}
                  onClick={() => {
                    if (tab1Valid) setActiveTab(1);
                    else if (showToast) showToast('⚠️ Complete primero los campos obligatorios del Paso 1.');
                  }}
                >
                  2. Cuestionario {catInfo.emoji}
                  <span className="reg-tab-badge">{dynFields.length + 1} preguntas</span>
                </button>
              </div>

              {/* ── TAB 1: Datos Básicos ── */}
              {activeTab === 0 && (
                <div className="reg-tab-body">
                  <div className="reg-required-hint">
                    <span className="req-dot">●</span> Los campos marcados con <strong>*</strong> son obligatorios
                  </div>

                  {/* Categoría + Nombre */}
                  <div className="reg-field-row">
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Categoría del Objeto <span className="req-star">*</span></label>
                      <select className="reg-input" value={category} onChange={e => setCategory(e.target.value)}>
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.emoji} {c.value}</option>
                        ))}
                      </select>
                    </div>
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Nombre / Descripción del Objeto <span className="req-star">*</span></label>
                      <input
                        type="text" className="reg-input" value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ej. Laptop Lenovo Core i5" required
                      />
                    </div>
                  </div>

                  {/* Ubicación + Cantidad + Estado */}
                  <div className="reg-field-row">
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Ubicación / Aula <span className="req-star">*</span></label>
                      <input
                        type="text" className="reg-input" value={location}
                        onChange={e => setLocation(e.target.value)}
                        placeholder="Ej. Aula-05, Laboratorio" required
                      />
                    </div>
                    <div className="reg-field-group reg-flex-half">
                      <label className="reg-label">Cantidad <span className="req-star">*</span></label>
                      <input type="number" min="1" className="reg-input" value={quantity} onChange={e => setQuantity(e.target.value)} />
                    </div>
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Estado Operativo</label>
                      <select className="reg-input" value={status} onChange={e => setStatus(e.target.value)}>
                        {ESTADO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Separador opcional */}
                  <div className="reg-optional-separator">
                    <span>Campos opcionales — complete si dispone de la información</span>
                  </div>

                  {/* Marca + Modelo + Nro Serie */}
                  <div className="reg-field-row">
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Marca</label>
                      <input type="text" className="reg-input" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ej. Epson, HP, MINEDU" />
                    </div>
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Modelo</label>
                      <input type="text" className="reg-input" value={model} onChange={e => setModel(e.target.value)} placeholder="Ej. PowerLite 118" />
                    </div>
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Número de Serie / Código</label>
                      <input type="text" className="reg-input" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="Ej. SN-984021" />
                    </div>
                  </div>

                  {/* Dimensiones */}
                  <div className="reg-section-label">📐 Dimensiones del Objeto</div>
                  <div className="reg-field-row">
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Alto (cm)</label>
                      <input type="number" step="0.01" className="reg-input" value={alto} onChange={e => setAlto(e.target.value)} placeholder="Ej. 75" />
                    </div>
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Ancho (cm)</label>
                      <input type="number" step="0.01" className="reg-input" value={ancho} onChange={e => setAncho(e.target.value)} placeholder="Ej. 50" />
                    </div>
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Largo (cm)</label>
                      <input type="number" step="0.01" className="reg-input" value={largo} onChange={e => setLargo(e.target.value)} placeholder="Ej. 60" />
                    </div>
                  </div>

                  {/* Material + Color + Situación */}
                  <div className="reg-field-row">
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Tipo de Material</label>
                      <select className="reg-input" value={tipoMaterial} onChange={e => setTipoMaterial(e.target.value)}>
                        {TIPO_MATERIAL_OPTIONS.map((o, idx) => (
                          <option key={idx} value={o}>{o === '' ? '— Sin especificar' : o}</option>
                        ))}
                      </select>
                    </div>
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Color</label>
                      <input type="text" className="reg-input" value={color} onChange={e => setColor(e.target.value)} placeholder="Ej. Marrón, Azul, Gris" />
                    </div>
                    <div className="reg-field-group reg-flex-1">
                      <label className="reg-label">Situación del Objeto</label>
                      <select className="reg-input" value={situacion} onChange={e => setSituacion(e.target.value)}>
                        {SITUACION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Detalles / Especificaciones */}
                  <div className="reg-field-group">
                    <label className="reg-label">Detalles / Especificaciones Adicionales</label>
                    <textarea
                      className="reg-input reg-textarea" rows={3} value={details}
                      onChange={e => setDetails(e.target.value)}
                      placeholder="Texto largo sobre características físicas, instalación, observaciones físicas..."
                    />
                  </div>

                  {/* CTA para ir al paso 2 */}
                  {tab1Valid && (
                    <div className="reg-next-cta">
                      <div className="reg-next-cta-info">
                        <span className="reg-next-cta-emoji">{catInfo.emoji}</span>
                        <div>
                          <p className="reg-next-cta-title">Cuestionario listo para {category}</p>
                          <p className="reg-next-cta-sub">Haz clic en "Siguiente" para ingresar los {dynFields.length} campos específicos de esta categoría.</p>
                        </div>
                      </div>
                      <button type="button" className="btn-next-tab" onClick={() => setActiveTab(1)}>Siguiente →</button>
                    </div>
                  )}

                  <div className="reg-bottom-actions">
                    <button type="button" className="btn-cancel-reg" onClick={() => { setHasScannedCode(false); resetForm(); }}>Cancelar</button>
                    <button type="button" className="btn-save-sqlite" onClick={handleSubmit} disabled={!tab1Valid}>💾 Guardar Registro</button>
                  </div>
                </div>
              )}

              {/* ── TAB 2: Cuestionario Dinámico ── */}
              {activeTab === 1 && (
                <div className="reg-tab-body">
                  <div className="reg-dyn-header">
                    <span className="reg-dyn-emoji">{catInfo.emoji}</span>
                    <div>
                      <h3 className="reg-dyn-title">{dynConfig.title}</h3>
                      <p className="reg-dyn-sub">Formulario adaptado para: <strong>{category}</strong></p>
                    </div>
                  </div>

                  {/* Render preguntas dinámicas en pares */}
                  {(() => {
                    const rows = [];
                    for (let i = 0; i < dynFields.length; i += 2) {
                      const q1 = dynFields[i];
                      const q2 = dynFields[i+1];
                      const single = !q2;
                      rows.push(
                        <div key={i} className={single ? 'reg-field-group' : 'reg-field-row'}>
                          {[q1, q2].filter(Boolean).map(q => (
                            <div key={q.key} className={`reg-field-group ${single ? '' : 'reg-flex-1'}`}>
                              <label className="reg-label">{q.label}</label>
                              {q.type === 'select' && (
                                <select
                                  className="reg-input"
                                  value={customFields[q.key] || ''}
                                  onChange={e => setCustomFields(p => ({...p, [q.key]: e.target.value}))}
                                >
                                  <option value="">— Seleccionar —</option>
                                  {q.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              )}
                              {q.type === 'text' && (
                                <input
                                  type="text" className="reg-input"
                                  value={customFields[q.key] || ''}
                                  onChange={e => setCustomFields(p => ({...p, [q.key]: e.target.value}))}
                                  placeholder={q.placeholder}
                                />
                              )}
                              {q.type === 'number' && (
                                <input
                                  type="number" min="0" className="reg-input"
                                  value={customFields[q.key] || ''}
                                  onChange={e => setCustomFields(p => ({...p, [q.key]: e.target.value}))}
                                  placeholder={q.placeholder}
                                />
                              )}
                              {q.type === 'date' && (
                                <input
                                  type="date" className="reg-input"
                                  value={customFields[q.key] || ''}
                                  onChange={e => setCustomFields(p => ({...p, [q.key]: e.target.value}))}
                                />
                              )}
                              {q.type === 'textarea' && (
                                <textarea
                                  className="reg-input reg-textarea" rows={2}
                                  value={customFields[q.key] || ''}
                                  onChange={e => setCustomFields(p => ({...p, [q.key]: e.target.value}))}
                                  placeholder={q.placeholder}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return rows;
                  })()}

                  {/* Campo notes — siempre al final del Tab 2 */}
                  <div className="reg-notes-separator">
                    <span>📝 Notas Generales</span>
                  </div>
                  <div className="reg-field-group">
                    <label className="reg-label">Observaciones adicionales / Notas internas</label>
                    <textarea
                      className="reg-input reg-textarea" rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Ej. Entregado mediante acta de recepción Lote 2024. Requiere revisión en 6 meses..."
                    />
                  </div>

                  <div className="reg-bottom-actions">
                    <button type="button" className="btn-back-tab" onClick={() => setActiveTab(0)}>← Volver a Datos Básicos</button>
                    <button type="button" className="btn-cancel-reg" onClick={() => { setHasScannedCode(false); resetForm(); }}>Cancelar</button>
                    <button type="button" className="btn-save-sqlite" onClick={handleSubmit}>💾 Guardar Registro</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MANUAL CODE MODAL */}
      {isManualModalOpen && (
        <div className="camera-modal-overlay">
          <div className="camera-modal-card">
            <div className="camera-modal-header">
              <h3>⌨️ Ingreso Manual (Sin QR)</h3>
              <button type="button" className="btn-close-modal" onClick={() => setIsManualModalOpen(false)}>✕</button>
            </div>
            <p className="camera-hint" style={{textAlign:'left',marginBottom:'12px'}}>
              Se asignará automáticamente el siguiente código disponible:
            </p>
            <form onSubmit={handleManualCodeSubmit}>
              <div className="access-input-wrapper">
                <div className="manual-code-readonly-display">
                  <span className="manual-code-icon">🏷️</span>
                  <span className="manual-code-value">{manualCodeInput}</span>
                  <span className="manual-code-badge">Auto</span>
                </div>
              </div>
              <div className="manual-modal-buttons" style={{marginTop:'16px',display:'flex',gap:'10px'}}>
                <button type="button" className="btn-cancel-scan" style={{flex:1}} onClick={() => setIsManualModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-registrar-stockpile" style={{flex:1.5,marginTop:0}}>Ingresar Datos →</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMERA MODAL */}
      {isScannerOpen && (
        <div className="camera-modal-overlay">
          <div className="camera-modal-card">
            <div className="camera-modal-header">
              <h3>📷 Escáner QR de Cámara</h3>
              <button className="btn-close-modal" onClick={stopCameraScanner}>✕</button>
            </div>
            <div className="camera-viewport-container">
              <div id="qr-reader-viewport" ref={scannerRef}></div>
              {isScanning && <div className="scanner-target-reticle"><div className="reticle-line"></div></div>}
            </div>
            {cameraError ? (
              <div className="camera-error-box">
                <div className="camera-error-msg">⚠️ {cameraError}</div>
                <button 
                  type="button" 
                  className="btn-manual-entry-fallback"
                  onClick={() => {
                    stopCameraScanner();
                    setManualCodeInput(generateUniqueManualCode());
                    setIsManualModalOpen(true);
                  }}
                >
                  ⌨️ Usar Ingreso Manual (Sin QR)
                </button>
              </div>
            ) : (
              <p className="camera-hint">Apunta la cámara hacia el código QR de la etiqueta patrimonial.</p>
            )}
            <button type="button" className="btn-cancel-scan" onClick={stopCameraScanner}>Cancelar Escaneo</button>
          </div>
        </div>
      )}
    </div>
  );
}
