import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// Categorías para el registro de bienes
const CATEGORIES = [
  'Equipos Tecnológicos',
  'Mobiliario Escolar',
  'Material Didáctico y Libros',
  'Artículos Deportivos y Educación Física',
  'Utensilios de Cocina y Comedor (Qali Warma)',
  'Climatización y Audio',
  'Herramientas y Mantenimiento',
  'Suministros y Consumibles'
];

const ESTADO_OPTIONS = [
  { value: 'Bueno',   label: '✅ Bueno / Operativo' },
  { value: 'Regular', label: '⚠️ Regular / Desgaste' },
  { value: 'Malo',    label: '❌ Malo / Inoperativo' }
];

export default function TomaInventarioSesion({
  onBackToHome,
  showToast,
  getBackendHost,
  userDni = ''
}) {
  // ── ESTADOS PRINCIPALES ──────────────────────────────────────────────────
  // step: 'INIT' (Pantalla 1) | 'INVENTORY' (Pantalla 2) | 'SUMMARY' (Pantalla 3)
  const [step, setStep] = useState('INIT');

  // Formulario Pantalla 1: Iniciar Sesión
  const [codigoInventariado, setCodigoInventariado] = useState('MANUAL-1');
  const [dni, setDni] = useState(userDni || '');
  const [ambiente, setAmbiente] = useState('');
  const [isStartingSession, setIsStartingSession] = useState(false);

  // Datos de la Sesión Activa
  const [activeSession, setActiveSession] = useState(null);
  const [resumen, setResumen] = useState({
    totales: { encontrados: 0, faltantes: 0, sobrantes: 0, totalAmbiente: 0 },
    encontrados: [],
    sobrantes: [],
    faltantes: []
  });

  // Pantalla 2: Código Manual & Búsqueda
  const [manualCode, setManualCode] = useState('MANUAL-1');
  const [isProcessingCode, setIsProcessingCode] = useState(false);

  // Modal / Formulario directo de Registro de Bien (Cuestionario)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    code: 'MANUAL-1',
    name: '',
    category: 'Mobiliario Escolar',
    status: 'Bueno',
    brand: '',
    model: '',
    serialNumber: '',
    notes: ''
  });
  const [isSavingNewItem, setIsSavingNewItem] = useState(false);

  // Cámara HTML5 QR
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const html5QrcodeRef = useRef(null);

  // Pestañas de la Pantalla 3 (Resumen)
  const [summaryTab, setSummaryTab] = useState('encontrados');

  // Modal de confirmación para finalizar
  const [isConfirmingFinish, setIsConfirmingFinish] = useState(false);
  // Ambientes ingresados automáticamente en la BD para la barrita desplegable
  const [existingAmbientes, setExistingAmbientes] = useState([]);

  // Helper para URL de Backend (Desarrollo y Producción)
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '');
    }
    const host = getBackendHost ? getBackendHost() : (typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost');
    return `http://${host}:3001`;
  };

  // Cargar ambientes registrados en la base de datos
  useEffect(() => {
    const fetchAmbientes = async () => {
      try {
        const apiUrl = getApiBaseUrl();
        const res = await fetch(`${apiUrl}/api/ambientes`);
        const data = await res.json();
        if (data.success && Array.isArray(data.ambientes)) {
          setExistingAmbientes(data.ambientes);
        }
      } catch (err) {
        console.error('Error al cargar ambientes de la BD:', err);
      }
    };
    fetchAmbientes();
  }, []);

  // Sincronizar DNI por defecto desde props
  useEffect(() => {
    if (userDni && !dni) {
      setDni(userDni);
    }
  }, [userDni, dni]);

  // Comprobar sesión activa en localStorage al montar
  useEffect(() => {
    const savedSessionId = localStorage.getItem('stockpile_active_session_id');
    if (savedSessionId) {
      cargarEstadoSesion(savedSessionId);
    }
  }, []);

  const cargarEstadoSesion = async (sessionId) => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/sesiones/${sessionId}`);
      const data = await res.json();
      if (data.success && data.sesion) {
        setActiveSession(data.sesion);
        setResumen(data.resumen || { totales: { encontrados: 0, faltantes: 0, sobrantes: 0, totalAmbiente: 0 }, encontrados: [], sobrantes: [], faltantes: [] });
        
        if (data.sesion.estado === 'abierta') {
          setStep('INVENTORY');
        } else {
          setStep('SUMMARY');
          localStorage.removeItem('stockpile_active_session_id');
        }
      } else {
        localStorage.removeItem('stockpile_active_session_id');
      }
    } catch (err) {
      console.error('Error al restaurar sesión activa:', err);
    }
  };

  // Limpiar cámara al desmontar
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (e) {
        console.log('Clean scanner instance:', e);
      }
      html5QrcodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCameraScanner = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    setTimeout(async () => {
      try {
        if (!document.getElementById('session-qr-reader')) return;

        if (html5QrcodeRef.current) {
          await stopCameraScanner();
        }

        const html5QrCode = new Html5Qrcode('session-qr-reader');
        html5QrcodeRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleProcessScannedCode(decodedText);
          },
          () => {}
        );
      } catch (err) {
        console.error('Error iniciando cámara:', err);
        setCameraError('No se pudo acceder a la cámara. Ingrese el código manualmente o verifique los permisos.');
        setIsCameraActive(false);
      }
    }, 300);
  };

  const cleanQrCode = (rawText) => {
    if (!rawText) return '';
    let str = rawText.trim();
    if (str.includes('?code=') || str.includes('&code=')) {
      const match = str.match(/[?&]code=([^&]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim().toUpperCase();
      }
    }
    if (str.startsWith('http://') || str.startsWith('https://')) {
      try {
        const u = new URL(str);
        const c = u.searchParams.get('code');
        if (c) return c.trim().toUpperCase();
      } catch (e) {}
    }
    return str.toUpperCase();
  };

  // Helper para generar el siguiente código MANUAL (MANUAL-1, MANUAL-2, MANUAL-3...)
  const generateNextManualCode = () => {
    const listCombined = [
      ...resumen.encontrados,
      ...resumen.sobrantes
    ];
    const nums = listCombined
      .map(i => {
        const m = (i.codigoBien || i.code || '').match(/MANUAL-(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    return `MANUAL-${maxNum + 1}`;
  };

  // ── 1. INICIAR SESIÓN (PANTALLA 1) ────────────────────────────────────────
  const handleIniciarSesion = async (e) => {
    e.preventDefault();

    if (!codigoInventariado.trim()) {
      showToast('⚠️ Ingrese un código de inventariado.');
      return;
    }

    if (!dni || !/^\d{8}$/.test(dni.trim())) {
      showToast('⚠️ El DNI debe ser exactamente de 8 dígitos numéricos.');
      return;
    }

    if (!ambiente.trim()) {
      showToast('⚠️ Por favor escriba el nombre del ambiente.');
      return;
    }

    setIsStartingSession(true);

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/sesiones/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigoInventariado: codigoInventariado.trim().toUpperCase(),
          dni: dni.trim(),
          ambiente: ambiente.trim()
        })
      });

      const data = await res.json();

      if (data.success && data.sesion) {
        const sessionObj = data.sesion;
        setActiveSession(sessionObj);
        localStorage.setItem('stockpile_active_session_id', sessionObj.id);

        await cargarEstadoSesion(sessionObj.id);

        setStep('INVENTORY');
        showToast(`🚀 Sesión "${sessionObj.codigoInventariado}" iniciada para: ${sessionObj.ambiente}`);
      } else {
        showToast(`❌ Error: ${data.message || 'No se pudo crear la sesión'}`);
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      showToast('❌ Error de conexión al servidor backend.');
    } finally {
      setIsStartingSession(false);
    }
  };

  // ── 2. ESCANEAR / BUSCAR BIEN EN SESIÓN (PANTALLA 2) ─────────────────────
  const handleProcessScannedCode = async (rawCode) => {
    if (isProcessingCode || !activeSession) return;
    
    const codeToSubmit = cleanQrCode(rawCode);
    if (!codeToSubmit) return;

    setIsProcessingCode(true);

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/sesiones/${activeSession.id}/escanear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoBien: codeToSubmit })
      });

      const data = await res.json();

      if (data.success) {
        showToast(data.message || `✅ Bien ${codeToSubmit} registrado.`);
        if (data.resumen) {
          setResumen(data.resumen);
        }
        setManualCode(generateNextManualCode());
      } else {
        // Si el bien no existe en la base de datos general, abrir el Cuestionario Directo
        if (res.status === 404) {
          showToast(`ℹ️ El bien "${codeToSubmit}" no está registrado. Complete la ficha para agregarlo.`);
          setNewItemForm({
            code: codeToSubmit,
            name: '',
            category: 'Mobiliario Escolar',
            status: 'Bueno',
            brand: '',
            model: '',
            serialNumber: '',
            notes: ''
          });
          setIsRegisterModalOpen(true);
        } else {
          showToast(data.message || '⚠️ El bien ya fue registrado o no pudo procesarse.');
        }
      }
    } catch (err) {
      console.error('Error al registrar escaneo:', err);
      showToast('❌ Error al comunicarse con el servidor.');
    } finally {
      setIsProcessingCode(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      showToast('⚠️ Escriba el código del bien');
      return;
    }
    handleProcessScannedCode(manualCode);
  };

  // Abrir Cuestionario Directo para Registrar Nuevo Bien
  const handleOpenDirectQuestionnaire = () => {
    const nextCode = generateNextManualCode();
    setNewItemForm({
      code: nextCode,
      name: '',
      category: 'Mobiliario Escolar',
      status: 'Bueno',
      brand: '',
      model: '',
      serialNumber: '',
      notes: ''
    });
    setIsRegisterModalOpen(true);
  };

  // ── 3. GUARDAR NUEVO BIEN DESDE EL CUESTIONARIO E INVENTARIAR EN SESIÓN ──
  const handleSaveNewItemFromForm = async (e) => {
    e.preventDefault();

    if (!newItemForm.code.trim()) {
      showToast('⚠️ Ingrese el código del bien.');
      return;
    }

    if (!newItemForm.name.trim()) {
      showToast('⚠️ Ingrese la descripción o nombre del bien.');
      return;
    }

    setIsSavingNewItem(true);

    try {
      const apiUrl = getApiBaseUrl();

      // 1. Guardar el bien en el catálogo general (location = ambiente actual de la sesión)
      const itemToSave = {
        code: newItemForm.code.trim().toUpperCase(),
        name: newItemForm.name.trim(),
        category: newItemForm.category,
        location: activeSession ? activeSession.ambiente : 'Sin Ubicación',
        status: newItemForm.status,
        brand: newItemForm.brand.trim(),
        model: newItemForm.model.trim(),
        serialNumber: newItemForm.serialNumber.trim(),
        notes: newItemForm.notes.trim(),
        scannedByDni: activeSession ? activeSession.dni : userDni
      };

      const saveRes = await fetch(`${apiUrl}/api/inventory/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemToSave)
      });

      const saveData = await saveRes.json();

      if (saveData.success) {
        // 2. Vincular de inmediato el bien recién creado a la sesión de inventario activa
        if (activeSession) {
          const scanRes = await fetch(`${apiUrl}/api/sesiones/${activeSession.id}/escanear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigoBien: itemToSave.code })
          });

          const scanData = await scanRes.json();

          if (scanData.success && scanData.resumen) {
            setResumen(scanData.resumen);
          }
        }

        showToast(`✅ Bien "${itemToSave.name}" (${itemToSave.code}) guardado e inventariado.`);
        setIsRegisterModalOpen(false);
        setManualCode(generateNextManualCode());
      } else {
        showToast(`❌ Error al guardar bien: ${saveData.message}`);
      }
    } catch (err) {
      console.error('Error al guardar bien desde formulario:', err);
      showToast('❌ Error de conexión al guardar bien.');
    } finally {
      setIsSavingNewItem(false);
    }
  };

  // ── 4. FINALIZAR SESIÓN ──────────────────────────────────────────────────
  const handleFinalizarSesion = async () => {
    if (!activeSession) return;
    setIsFinishingSession(true);

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/sesiones/${activeSession.id}/finalizar`, {
        method: 'POST'
      });

      const data = await res.json();

      if (data.success) {
        localStorage.removeItem('stockpile_active_session_id');
        setActiveSession(data.sesion);
        setResumen(data.resumen);
        stopCameraScanner();
        setIsConfirmingFinish(false);
        setStep('SUMMARY');
        showToast('🏁 Sesión de inventario finalizada exitosamente.');
      } else {
        showToast(`❌ ${data.message || 'No se pudo finalizar la sesión'}`);
      }
    } catch (err) {
      console.error('Error al finalizar sesión:', err);
      showToast('❌ Error de conexión al finalizar sesión.');
    } finally {
      setIsFinishingSession(false);
    }
  };

  const handleNuevaSesion = () => {
    localStorage.removeItem('stockpile_active_session_id');
    setActiveSession(null);
    setResumen({
      totales: { encontrados: 0, faltantes: 0, sobrantes: 0, totalAmbiente: 0 },
      encontrados: [],
      sobrantes: [],
      faltantes: []
    });
    setCodigoInventariado('MANUAL-1');
    setAmbiente('');
    setStep('INIT');
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PANTALLA 1: INICIAR INVENTARIO (CON CAMPO DE TEXTO PARA AMBIENTE)
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'INIT') {
    return (
      <div className="ficha-page-container">
        <div className="ficha-card-wrapper">
          {/* Header */}
          <div className="ficha-header-navy">
            <div className="ficha-header-top">
              <button type="button" className="btn-back-nav" onClick={onBackToHome}>
                ← Volver al Menú
              </button>
              <span className="step-pill-badge">Paso 1 de 3</span>
            </div>
            <h1 className="ficha-header-title">Iniciar Toma de Inventario</h1>
            <p className="ficha-header-subtitle">Ingrese los datos para abrir la sesión de inventario por ambiente</p>
          </div>

          {/* Formulario */}
          <div className="ficha-body-cream">
            <form onSubmit={handleIniciarSesion} className="session-init-form">
              
              {/* Campo 1: Código de Inventariado (NO EDITABLE) */}
              <div className="form-group-custom">
                <label htmlFor="codigoInventariado">
                  <span className="label-icon">🏷️</span> Código de Inventariado <span className="readonly-tag-pill">🔒 No editable</span>
                </label>
                <input
                  id="codigoInventariado"
                  type="text"
                  className="input-field-custom input-readonly-field"
                  value={codigoInventariado}
                  readOnly
                  title="Código autogenerado por el sistema"
                />
                <small className="field-hint">Código asignado automáticamente por el sistema.</small>
              </div>

              {/* Campo 2: DNI del Responsable */}
              <div className="form-group-custom">
                <label htmlFor="dniOperador">
                  <span className="label-icon">🪪</span> DNI del Responsable (8 dígitos)
                </label>
                <input
                  id="dniOperador"
                  type="text"
                  maxLength={8}
                  pattern="\d{8}"
                  inputMode="numeric"
                  className="input-field-custom"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej. 60810589"
                  required
                />
                <small className="field-hint">DNI de 8 dígitos de la persona a cargo del conteo.</small>
              </div>

              {/* Campo 3: Ambiente a Inventariar (EDITABLE + BARRITA DESPLEGABLE DE AMBIENTES EN BD) */}
              <div className="form-group-custom">
                <label htmlFor="inputAmbiente">
                  <span className="label-icon">📍</span> Ambiente a Inventariar (Editable)
                </label>
                <input
                  id="inputAmbiente"
                  type="text"
                  list="ambientes-datalist"
                  className="input-field-custom"
                  value={ambiente}
                  onChange={(e) => setAmbiente(e.target.value)}
                  placeholder="Escriba o elija un ambiente de la lista..."
                  required
                  autoComplete="off"
                />
                <datalist id="ambientes-datalist">
                  {existingAmbientes.map((amb) => (
                    <option key={amb} value={amb} />
                  ))}
                </datalist>
                <small className="field-hint">Escriba un nuevo ambiente o seleccione uno de los ingresados automáticamente en la lista desplegable.</small>
              </div>

              {/* Botón Comenzar */}
              <div className="form-actions-session">
                <button
                  type="submit"
                  disabled={isStartingSession}
                  className="btn-submit-primary"
                >
                  {isStartingSession ? '⌛ Aperturando Sesión...' : '🚀 Comenzar Inventario →'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PANTALLA 2: INVENTARIAR & REGISTRO DIRECTO POR CUESTIONARIO
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'INVENTORY' && activeSession) {
    const listCombinada = [
      ...resumen.encontrados.map(item => ({ ...item, tipoLista: 'encontrado' })),
      ...resumen.sobrantes.map(item => ({ ...item, tipoLista: 'sobrante' }))
    ].sort((a, b) => new Date(b.scannedAt || b.createdAt) - new Date(a.scannedAt || a.createdAt));

    return (
      <div className="ficha-page-container">
        <div className="ficha-card-wrapper">

          {/* Locked Header Bar */}
          <div className="session-locked-header">
            <div className="session-locked-top">
              <span className="live-status-pill">🟢 SESIÓN EN CURSO</span>
              <button 
                type="button" 
                className="btn-finish-header"
                onClick={() => setIsConfirmingFinish(true)}
              >
                🏁 Finalizar Inventario
              </button>
            </div>

            <div className="session-locked-grid">
              <div className="locked-info-item highlight-location">
                <span className="locked-label">📍 AMBIENTE:</span>
                <span className="locked-value">{activeSession.ambiente}</span>
              </div>
              <div className="locked-info-item">
                <span className="locked-label">🏷️ CÓDIGO INVENTARIADO:</span>
                <span className="locked-value">{activeSession.codigoInventariado}</span>
              </div>
              <div className="locked-info-item">
                <span className="locked-label">🪪 DNI OPERADOR:</span>
                <span className="locked-value">{activeSession.dni}</span>
              </div>
            </div>
          </div>

          {/* Contadores en Vivo */}
          <div className="live-counters-bar">
            <div className="counter-card counter-found">
              <span className="counter-icon">🟢</span>
              <div className="counter-data">
                <span className="counter-number">{resumen.totales.encontrados}</span>
                <span className="counter-label">ENCONTRADOS</span>
              </div>
            </div>

            <div className="counter-card counter-missing">
              <span className="counter-icon">🔴</span>
              <div className="counter-data">
                <span className="counter-number">{resumen.totales.faltantes}</span>
                <span className="counter-label">FALTANTES</span>
              </div>
            </div>

            <div className="counter-card counter-surplus">
              <span className="counter-icon">🟠</span>
              <div className="counter-data">
                <span className="counter-number">{resumen.totales.sobrantes}</span>
                <span className="counter-label">SOBRANTES</span>
              </div>
            </div>
          </div>

          <div className="ficha-body-cream session-inventory-body">

            {/* Opciones de Ingreso */}
            <div className="scan-controls-card">
              <h3 className="section-title-sm">📷 Escaneo / Ingreso de Bienes</h3>

              {/* Cámara escáner QR */}
              <div className="camera-toggle-group">
                {!isCameraActive ? (
                  <button 
                    type="button" 
                    className="btn-camera-start"
                    onClick={startCameraScanner}
                  >
                    📷 Activar Cámara Escáner QR
                  </button>
                ) : (
                  <button 
                    type="button" 
                    className="btn-camera-stop"
                    onClick={stopCameraScanner}
                  >
                    🛑 Apagar Cámara Escáner
                  </button>
                )}
              </div>

              {isCameraActive && (
                <div className="qr-viewport-container">
                  <div id="session-qr-reader" className="qr-reader-element"></div>
                  {cameraError && <div className="camera-error-alert">{cameraError}</div>}
                  <p className="qr-viewport-hint">Apunte la cámara al código QR del bien patrimonial.</p>
                </div>
              )}

              {/* Entrada Manual */}
              <form onSubmit={handleManualSubmit} className="manual-input-form">
                <label htmlFor="manualCodeInput" className="manual-label">
                  ⌨️ O escriba el código del bien manualmente:
                </label>
                <div className="manual-input-row">
                  <input
                    id="manualCodeInput"
                    type="text"
                    className="input-code-manual"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Ej. MANUAL-1"
                    disabled={isProcessingCode}
                  />
                  <button 
                    type="submit" 
                    className="btn-add-manual"
                    disabled={isProcessingCode || !manualCode.trim()}
                  >
                    {isProcessingCode ? '⌛...' : '➕ Registrar'}
                  </button>
                </div>
              </form>

              {/* Botón directo para llenar Ficha / Cuestionario de nuevo bien */}
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                <button
                  type="button"
                  className="btn-open-questionnaire-direct"
                  onClick={handleOpenDirectQuestionnaire}
                >
                  📝 Llenar Cuestionario Completo de Bien Manual
                </button>
              </div>
            </div>

            {/* Lista en Vivo */}
            <div className="session-scanned-list-card">
              <div className="list-card-header">
                <h3>📋 Lista en Vivo ({listCombinada.length} escaneados)</h3>
                <span className="live-pulse-dot">🟢 Sincronizado en tiempo real</span>
              </div>

              {listCombinada.length === 0 ? (
                <div className="empty-scanned-state">
                  <div className="empty-icon">📱</div>
                  <p>Aún no se ha escaneado ningún bien en esta sesión.</p>
                  <small>Escanee un código QR o use el cuestionario manual arriba.</small>
                </div>
              ) : (
                <div className="scanned-items-scroll">
                  {listCombinada.map((item, idx) => (
                    <div key={item._id || item.id || idx} className={`scanned-item-row ${item.tipoLista}`}>
                      <div className="scanned-item-status">
                        {item.tipoLista === 'encontrado' ? (
                          <span className="tag-status-found">🟢 Encontrado</span>
                        ) : (
                          <span className="tag-status-surplus">🟠 Sobrante</span>
                        )}
                      </div>

                      <div className="scanned-item-info">
                        <strong className="item-code-text">{item.codigoBien}</strong>
                        <span className="item-name-text">{item.nombreBien || 'Bien registrado'}</span>
                        {item.tipoLista === 'sobrante' && (
                          <small className="surplus-origin-text">
                            ⚠️ Pertenece a: <strong>{item.ambienteOriginal || 'Otro ambiente'}</strong>
                          </small>
                        )}
                      </div>

                      <div className="scanned-item-time">
                        {new Date(item.scannedAt || item.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botón Finalizar */}
            <div className="bottom-finish-wrapper">
              <button
                type="button"
                className="btn-finish-large"
                onClick={() => setIsConfirmingFinish(true)}
              >
                🏁 Finalizar Inventario de este Ambiente
              </button>
            </div>

          </div>
        </div>

        {/* MODAL DE CUESTIONARIO DIRECTO DE BIEN */}
        {isRegisterModalOpen && (
          <div className="modal-backdrop">
            <div className="modal-card questionnaire-modal-card">
              <div className="questionnaire-modal-header">
                <h3>📝 Cuestionario de Registro del Bien</h3>
                <button
                  type="button"
                  className="btn-close-modal-sm"
                  onClick={() => setIsRegisterModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveNewItemFromForm} className="questionnaire-form-body">
                {/* Código */}
                <div className="form-group-sm">
                  <label htmlFor="modalCode">Código del Bien:</label>
                  <input
                    id="modalCode"
                    type="text"
                    className="input-field-sm"
                    value={newItemForm.code}
                    onChange={(e) => setNewItemForm({ ...newItemForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                {/* Nombre / Descripción */}
                <div className="form-group-sm">
                  <label htmlFor="modalName">Descripción / Nombre del Bien (*):</label>
                  <input
                    id="modalName"
                    type="text"
                    className="input-field-sm"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                    placeholder="Ej. Silla de madera reforzada, Laptop Lenovo..."
                    required
                  />
                </div>

                {/* Categoría */}
                <div className="form-group-sm">
                  <label htmlFor="modalCategory">Categoría:</label>
                  <select
                    id="modalCategory"
                    className="select-field-sm"
                    value={newItemForm.category}
                    onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div className="form-group-sm">
                  <label htmlFor="modalStatus">Estado del Bien:</label>
                  <select
                    id="modalStatus"
                    className="select-field-sm"
                    value={newItemForm.status}
                    onChange={(e) => setNewItemForm({ ...newItemForm, status: e.target.value })}
                  >
                    {ESTADO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Marca / Modelo / Serie */}
                <div className="form-row-sm">
                  <div className="form-group-sm flex-1">
                    <label htmlFor="modalBrand">Marca (opcional):</label>
                    <input
                      id="modalBrand"
                      type="text"
                      className="input-field-sm"
                      value={newItemForm.brand}
                      onChange={(e) => setNewItemForm({ ...newItemForm, brand: e.target.value })}
                      placeholder="Ej. MINEDU / Epson"
                    />
                  </div>
                  <div className="form-group-sm flex-1">
                    <label htmlFor="modalModel">Modelo (opcional):</label>
                    <input
                      id="modalModel"
                      type="text"
                      className="input-field-sm"
                      value={newItemForm.model}
                      onChange={(e) => setNewItemForm({ ...newItemForm, model: e.target.value })}
                      placeholder="Ej. Estándar 2026"
                    />
                  </div>
                </div>

                {/* N° de Serie */}
                <div className="form-group-sm">
                  <label htmlFor="modalSerial">Número de Serie (opcional):</label>
                  <input
                    id="modalSerial"
                    type="text"
                    className="input-field-sm"
                    value={newItemForm.serialNumber}
                    onChange={(e) => setNewItemForm({ ...newItemForm, serialNumber: e.target.value })}
                    placeholder="Ej. SN-981240"
                  />
                </div>

                {/* Observaciones */}
                <div className="form-group-sm">
                  <label htmlFor="modalNotes">Observaciones / Detalles adicionales:</label>
                  <textarea
                    id="modalNotes"
                    className="textarea-field-sm"
                    value={newItemForm.notes}
                    onChange={(e) => setNewItemForm({ ...newItemForm, notes: e.target.value })}
                    placeholder="Detalles sobre conservación, color, patas, etc."
                    rows={2}
                  />
                </div>

                {/* Acciones */}
                <div className="modal-actions-group style-top-gap">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setIsRegisterModalOpen(false)}
                    disabled={isSavingNewItem}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-submit-primary btn-sm-save"
                    disabled={isSavingNewItem}
                  >
                    {isSavingNewItem ? '⌛ Guardando...' : '💾 Guardar e Inventariar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN DE FINALIZAR */}
        {isConfirmingFinish && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <div className="modal-header-icon">🏁</div>
              <h3>¿Desea finalizar el inventario?</h3>
              <p>
                Se cerrará la sesión de toma de inventario para <strong>{activeSession.ambiente}</strong> y se generará el informe final de bienes <strong>Encontrados ({resumen.totales.encontrados})</strong>, <strong>Faltantes ({resumen.totales.faltantes})</strong> y <strong>Sobrantes ({resumen.totales.sobrantes})</strong>.
              </p>

              <div className="modal-actions-group">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsConfirmingFinish(false)}
                  disabled={isFinishingSession}
                >
                  Continuar Inventariando
                </button>
                <button
                  type="button"
                  className="btn-modal-confirm"
                  onClick={handleFinalizarSesion}
                  disabled={isFinishingSession}
                >
                  {isFinishingSession ? '⌛ Cerrando...' : 'Sí, Finalizar Sesión'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER PANTALLA 3: FINALIZAR Y MOSTRAR RESUMEN
  // ─────────────────────────────────────────────────────────────────────────
  if (step === 'SUMMARY' && activeSession) {
    const listToDisplay = summaryTab === 'encontrados' 
      ? resumen.encontrados 
      : summaryTab === 'faltantes' 
        ? resumen.faltantes 
        : resumen.sobrantes;

    return (
      <div className="ficha-page-container">
        <div className="ficha-card-wrapper">

          {/* Header Resumen */}
          <div className="ficha-header-navy summary-header">
            <div className="summary-status-badge">
              <span>🔒 SESIÓN FINALIZADA</span>
            </div>
            <h1 className="ficha-header-title">Informe Final de Inventario</h1>
            <p className="ficha-header-subtitle">Resumen ejecutivo y control de diferencias por ambiente</p>
            
            <div className="summary-meta-grid">
              <div><strong>📍 Ambiente:</strong> {activeSession.ambiente}</div>
              <div><strong>🏷️ Código:</strong> {activeSession.codigoInventariado}</div>
              <div><strong>🪪 Operador DNI:</strong> {activeSession.dni}</div>
              <div><strong>🕒 Fecha de Cierre:</strong> {new Date(activeSession.fechaFin || Date.now()).toLocaleString()}</div>
            </div>
          </div>

          <div className="ficha-body-cream summary-body">

            {/* Metricas de Resumen */}
            <div className="summary-metrics-cards">
              <div 
                className={`metric-card metric-green ${summaryTab === 'encontrados' ? 'active-tab-card' : ''}`}
                onClick={() => setSummaryTab('encontrados')}
              >
                <div className="metric-val">{resumen.totales.encontrados}</div>
                <div className="metric-lbl">🟢 Encontrados</div>
                <small className="metric-desc">Bienes hallados en su ambiente</small>
              </div>

              <div 
                className={`metric-card metric-red ${summaryTab === 'faltantes' ? 'active-tab-card' : ''}`}
                onClick={() => setSummaryTab('faltantes')}
              >
                <div className="metric-val">{resumen.totales.faltantes}</div>
                <div className="metric-lbl">🔴 Faltantes</div>
                <small className="metric-desc">Bienes no escaneados</small>
              </div>

              <div 
                className={`metric-card metric-orange ${summaryTab === 'sobrantes' ? 'active-tab-card' : ''}`}
                onClick={() => setSummaryTab('sobrantes')}
              >
                <div className="metric-val">{resumen.totales.sobrantes}</div>
                <div className="metric-lbl">🟠 Sobrantes</div>
                <small className="metric-desc">Bienes de otros ambientes</small>
              </div>
            </div>

            {/* Navegación por pestañas del informe */}
            <div className="summary-tabs-nav">
              <button
                type="button"
                className={`tab-nav-btn ${summaryTab === 'encontrados' ? 'active' : ''}`}
                onClick={() => setSummaryTab('encontrados')}
              >
                🟢 Encontrados ({resumen.totales.encontrados})
              </button>
              <button
                type="button"
                className={`tab-nav-btn ${summaryTab === 'faltantes' ? 'active' : ''}`}
                onClick={() => setSummaryTab('faltantes')}
              >
                🔴 Faltantes ({resumen.totales.faltantes})
              </button>
              <button
                type="button"
                className={`tab-nav-btn ${summaryTab === 'sobrantes' ? 'active' : ''}`}
                onClick={() => setSummaryTab('sobrantes')}
              >
                🟠 Sobrantes ({resumen.totales.sobrantes})
              </button>
            </div>

            {/* Detalle de Lista */}
            <div className="summary-list-container">
              {listToDisplay.length === 0 ? (
                <div className="empty-summary-tab">
                  <div className="empty-tab-icon">✨</div>
                  <p>No hay registros en la categoría <strong>{summaryTab.toUpperCase()}</strong>.</p>
                </div>
              ) : (
                <div className="summary-items-grid">
                  {listToDisplay.map((item, idx) => {
                    const isFaltante = summaryTab === 'faltantes';
                    const isSobrante = summaryTab === 'sobrantes';

                    return (
                      <div key={item._id || item.id || item.code || idx} className={`summary-item-card ${summaryTab}`}>
                        <div className="item-card-top">
                          <strong className="summary-item-code">{item.codigoBien || item.code}</strong>
                          <span className={`summary-badge-pill ${summaryTab}`}>
                            {summaryTab === 'encontrados' && '✅ Encontrado'}
                            {summaryTab === 'faltantes' && '⚠️ Faltante'}
                            {summaryTab === 'sobrantes' && '🔀 Sobrante'}
                          </span>
                        </div>

                        <div className="summary-item-title">{item.nombreBien || item.name}</div>

                        <div className="summary-item-details">
                          {isFaltante && (
                            <div>📍 Pertenece a este ambiente: <strong>{item.location || activeSession.ambiente}</strong></div>
                          )}
                          {isSobrante && (
                            <div>📍 Ambiente Original: <strong>{item.ambienteOriginal || item.location || 'Otro'}</strong></div>
                          )}
                          {!isFaltante && !isSobrante && (
                            <div>📍 Ubicación: <strong>{activeSession.ambiente}</strong></div>
                          )}
                          {item.category && <div>🏷️ Categoría: {item.category}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botones de Acción Final */}
            <div className="summary-actions-footer">
              <button
                type="button"
                className="btn-new-session"
                onClick={handleNuevaSesion}
              >
                🆕 Iniciar Nueva Sesión
              </button>
              
              <button
                type="button"
                className="btn-home-session"
                onClick={onBackToHome}
              >
                🏠 Volver al Menú Principal
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return null;
}
