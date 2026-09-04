import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function FichaPatrimonialScanner({ items = [], onSaveItem, showToast, onLogout }) {
  // Main asset fields
  const [currentCode, setCurrentCode] = useState('QUI-2026-014');
  const [name, setName] = useState('Proyector multimedia');
  const [category, setCategory] = useState('Equipos Tecnológicos');
  const [educationalLevel, setEducationalLevel] = useState('Secundaria');
  const [location, setLocation] = useState('Aula de innovación · Pabellón B');
  const [responsible, setResponsible] = useState('Coord. de TIC');
  const [status, setStatus] = useState('Bueno');
  const [isVerified, setIsVerified] = useState(true);

  // Dynamic Questionnaire Specs state according to object category
  const [specs, setSpecs] = useState({
    // Tech specs
    brand: 'Epson',
    model: 'PowerLite 118',
    serialNumber: 'EP-981024-X',
    ramStorage: 'N/A',
    peripherals: 'Incluye cable HDMI de 10m y control remoto',

    // Furniture specs
    material: 'Aluminio / Estructura metálica',
    color: 'Negro / Gris',
    dimensions: 'Estándar',

    // Sports specs
    sportType: 'Fútbol',
    itemQuantity: 1,

    // Kitchen/Cooking specs
    capacity: 'N/A',
    kitchenMaterial: 'Acero Inoxidable',

    // Didactic/Lab specs
    labSubject: 'Ciencias Naturales',
    hasCase: 'Sí',

    // General details/notes
    generalNotes: 'Auditado 2026 - I.E. José Abelardo Quiñones'
  });

  // Camera Scanner Modal State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);

  // Manual QR input or select from demo list
  const [manualCodeInput, setManualCodeInput] = useState('');

  // Handle auto-populating fields when a code is loaded/scanned
  const handleLoadItemByCode = (codeToSearch) => {
    if (!codeToSearch) return;
    const cleanCode = codeToSearch.trim();
    
    // Find matching item in inventory
    const found = items.find(i => i.code.toLowerCase() === cleanCode.toLowerCase());

    if (found) {
      setCurrentCode(found.code);
      setName(found.name || '');
      setCategory(found.category || 'Equipos Tecnológicos');
      setLocation(found.location || 'Aula de innovación · Pabellón B');
      setResponsible(found.responsible || 'Coord. de TIC');
      setStatus(found.status || 'Bueno');
      if (found.educationalLevel) setEducationalLevel(found.educationalLevel);
      if (found.specs) setSpecs({ ...specs, ...found.specs });
      setIsVerified(true);
      if (showToast) showToast(`🔍 Bien encontrado: ${found.code} - ${found.name}`);
    } else {
      // Create new asset item with scanned code
      setCurrentCode(cleanCode);
      setName('Nuevo bien escaneado');
      setCategory('Equipos Tecnológicos');
      setLocation('Aula de innovación · Pabellón B');
      setResponsible('Coord. de TIC');
      setStatus('Bueno');
      setIsVerified(true);
      if (showToast) showToast(`✨ Código nuevo detectado: ${cleanCode}. Complete el cuestionario.`);
    }
  };

  // Start Camera Reader using Html5Qrcode
  const startCameraScanner = async () => {
    setIsScannerOpen(true);
    setCameraError(null);
    setIsScanning(true);

    setTimeout(async () => {
      try {
        if (!html5QrcodeRef.current) {
          html5QrcodeRef.current = new Html5Qrcode('qr-reader-viewport');
        }

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        await html5QrcodeRef.current.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            console.log('📷 QR Scanned:', decodedText);
            playSuccessBeep();
            handleLoadItemByCode(decodedText);
            stopCameraScanner();
            sendScanToBackendServer(decodedText);
          },
          (errorMessage) => {}
        );
      } catch (err) {
        console.error('Camera Scanner Error:', err);
        setCameraError('No se pudo acceder a la cámara. Verifique los permisos en el navegador o use la cámara web.');
        setIsScanning(false);
      }
    }, 300);
  };

  // Stop Camera Reader
  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current && isScanning) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
    }
    setIsScanning(false);
    setIsScannerOpen(false);
  };

  // Play audio beep feedback on scan
  const playSuccessBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  };

  // Broadcast scan to Node.js server
  const sendScanToBackendServer = async (scannedCode) => {
    try {
      await fetch('http://localhost:3001/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: scannedCode,
          name,
          category,
          educationalLevel,
          location,
          status,
          responsible,
          specs
        })
      });
    } catch (e) {
      console.log('Node.js backend offline or unreached, local save active.');
    }
  };

  // Handle Form Submission ("Registrar en Stockpile →")
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Por favor ingrese el nombre del bien.');
      return;
    }

    const updatedItem = {
      id: currentCode,
      code: currentCode,
      name,
      category,
      educationalLevel,
      location,
      responsible,
      status,
      specs,
      verified: true,
      lastUpdated: new Date().toLocaleTimeString()
    };

    if (onSaveItem) {
      onSaveItem(updatedItem);
    }

    sendScanToBackendServer(currentCode);

    if (showToast) {
      showToast(`✅ Bien "${name}" (${currentCode}) guardado exitosamente.`);
    }
  };

  return (
    <div className="ficha-page-container">
      {/* Outer Mobile Container */}
      <div className="ficha-card-wrapper">
        
        {/* Navy Blue Header Bar */}
        <div className="ficha-header-navy">
          <div className="ficha-header-top font-serif">
            <div className="jaq-avatar-yellow">
              <span>JAQ</span>
            </div>
            {onLogout && (
              <button 
                type="button"
                className="btn-logout-mini" 
                onClick={onLogout}
                title="Cerrar sesión"
              >
                🔒 Salir
              </button>
            )}
          </div>

          <h1 className="ficha-header-title">Ficha Patrimonial</h1>
          <p className="ficha-header-subtitle">Control de Bienes · Registro 2026</p>
        </div>

        {/* Cream Inner Body */}
        <div className="ficha-body-cream">
          
          {/* Action Bar with Scanner Button */}
          <div className="ficha-action-bar">
            <button 
              type="button" 
              className="btn-scan-camera"
              onClick={startCameraScanner}
            >
              <span className="scan-icon">📷</span>
              <span>Escanear QR con Cámara</span>
            </button>
          </div>

          {/* Scanned Code Verification Card */}
          <div className="ficha-verified-card">
            {isVerified && (
              <div className="verified-badge-pill">
                <span className="badge-check">✓</span> Código verificado
              </div>
            )}
            
            <h2 className="ficha-code-display">{currentCode}</h2>
            <p className="ficha-location-display">📍 Nivel {educationalLevel} · {location}</p>
          </div>

          {/* Form Fields & Dynamic Category Questionnaire */}
          <form onSubmit={handleSubmit} className="ficha-form">
            
            {/* Nombre del bien */}
            <div className="ficha-field-group">
              <label className="ficha-label">Nombre del bien o bien patrimonial *</label>
              <input 
                type="text"
                className="ficha-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Computadora, Mesa, Pelota, Ollas, Impresora..."
                required
              />
            </div>

            {/* Selector de Categoría (Dispara el cuestionario dinámico) */}
            <div className="ficha-field-group">
              <label className="ficha-label">Tipo de Objeto / Categoría *</label>
              <select 
                className="ficha-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Equipos Tecnológicos">💻 Equipos Tecnológicos (PC, Laptop, Impresoras, Proyectores)</option>
                <option value="Mobiliario Escolar">🪑 Mobiliario Escolar (Mesas, Sillas, Estantes, Libreros, Pizarras)</option>
                <option value="Artículos Deportivos">⚽ Artículos Deportivos (Pelotas, Redes, Arcos, Colchonetas)</option>
                <option value="Cocina y Comedor">🍳 Enseres de Cocina y Comedor (Ollas, Cocinas, Balones de gas)</option>
                <option value="Material Didáctico y Lab">🔬 Material Didáctico y Lab (Microscopios, Maquetas, Kits)</option>
                <option value="Otros / Varios">📦 Otros / Varios</option>
              </select>
            </div>

            {/* Nivel Educativo & Responsable Side-by-Side */}
            <div className="ficha-field-row">
              <div className="ficha-field-group flex-1">
                <label className="ficha-label">Nivel Educativo</label>
                <select 
                  className="ficha-input"
                  value={educationalLevel}
                  onChange={(e) => setEducationalLevel(e.target.value)}
                >
                  <option value="Primaria">Primaria</option>
                  <option value="Secundaria">Secundaria</option>
                  <option value="Inicial">Inicial</option>
                  <option value="Administración">Administración</option>
                </select>
              </div>

              <div className="ficha-field-group flex-1">
                <label className="ficha-label">Responsable</label>
                <input 
                  type="text"
                  className="ficha-input"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="Ej: Coord. de TIC / Prof."
                />
              </div>
            </div>

            {/* Ubicación / Aula */}
            <div className="ficha-field-group">
              <label className="ficha-label">Aula / Ambiente de Ubicación</label>
              <input 
                type="text"
                className="ficha-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej: Aula-05, Lab. de Cómputo, Cocina, Patio"
              />
            </div>

            {/* ------------------------------------------------------------------
                CUESTIONARIO DINÁMICO SEGÚN LA CATEGORÍA SELECCIONADA
               ------------------------------------------------------------------ */}
            <div className="ficha-questionnaire-card">
              <h4 className="questionnaire-header-title">
                📋 Cuestionario de Detalles — {category}
              </h4>

              {/* 1. TECNOLOGÍA */}
              {category === 'Equipos Tecnológicos' && (
                <div className="questionnaire-fields">
                  <div className="ficha-field-row">
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">Marca</label>
                      <input 
                        type="text" 
                        className="ficha-input" 
                        value={specs.brand || ''} 
                        onChange={(e) => setSpecs({ ...specs, brand: e.target.value })} 
                        placeholder="Epson, HP, Lenovo" 
                      />
                    </div>
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">Modelo</label>
                      <input 
                        type="text" 
                        className="ficha-input" 
                        value={specs.model || ''} 
                        onChange={(e) => setSpecs({ ...specs, model: e.target.value })} 
                        placeholder="ProTower 280 G9" 
                      />
                    </div>
                  </div>

                  <div className="ficha-field-group">
                    <label className="ficha-label">Número de Serie (S/N)</label>
                    <input 
                      type="text" 
                      className="ficha-input" 
                      value={specs.serialNumber || ''} 
                      onChange={(e) => setSpecs({ ...specs, serialNumber: e.target.value })} 
                      placeholder="HP-8CG2190XY / N/A" 
                    />
                  </div>

                  <div className="ficha-field-group">
                    <label className="ficha-label">Procesador / RAM / Almacenamiento (Si es PC/Laptop)</label>
                    <input 
                      type="text" 
                      className="ficha-input" 
                      value={specs.ramStorage || ''} 
                      onChange={(e) => setSpecs({ ...specs, ramStorage: e.target.value })} 
                      placeholder="Core i5, 16GB RAM, SSD 512GB" 
                    />
                  </div>

                  <div className="ficha-field-group">
                    <label className="ficha-label">Accesorios / Periféricos / Tinta</label>
                    <input 
                      type="text" 
                      className="ficha-input" 
                      value={specs.peripherals || ''} 
                      onChange={(e) => setSpecs({ ...specs, peripherals: e.target.value })} 
                      placeholder="Incluye monitor, teclado, mouse / Cable HDMI" 
                    />
                  </div>
                </div>
              )}

              {/* 2. MOBILIARIO Y LIBREROS */}
              {category === 'Mobiliario Escolar' && (
                <div className="questionnaire-fields">
                  <div className="ficha-field-row">
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">Material Principal</label>
                      <select 
                        className="ficha-input"
                        value={specs.material || 'Madera'}
                        onChange={(e) => setSpecs({ ...specs, material: e.target.value })}
                      >
                        <option value="Madera y Fierro">Madera y Fierro</option>
                        <option value="Melamina">Melamina</option>
                        <option value="Metal / Acero Galvanizado">Metal / Acero</option>
                        <option value="Plástico Reforzado">Plástico Reforzado</option>
                      </select>
                    </div>
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">Color</label>
                      <input 
                        type="text" 
                        className="ficha-input" 
                        value={specs.color || ''} 
                        onChange={(e) => setSpecs({ ...specs, color: e.target.value })} 
                        placeholder="Marrón claro, Gris, Azul" 
                      />
                    </div>
                  </div>

                  <div className="ficha-field-group">
                    <label className="ficha-label">Dimensiones / Tipo (ej: Estante 5 baldas / Mesa 120x50cm)</label>
                    <input 
                      type="text" 
                      className="ficha-input" 
                      value={specs.dimensions || ''} 
                      onChange={(e) => setSpecs({ ...specs, dimensions: e.target.value })} 
                      placeholder="120x50 cm, Estante de 5 niveles..." 
                    />
                  </div>
                </div>
              )}

              {/* 3. ARTÍCULOS DEPORTIVOS */}
              {category === 'Artículos Deportivos' && (
                <div className="questionnaire-fields">
                  <div className="ficha-field-row">
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">Deporte Asignado</label>
                      <select 
                        className="ficha-input"
                        value={specs.sportType || 'Fútbol'}
                        onChange={(e) => setSpecs({ ...specs, sportType: e.target.value })}
                      >
                        <option value="Fútbol">⚽ Fútbol</option>
                        <option value="Básquet">🏀 Básquet</option>
                        <option value="Vóley">🏐 Vóley</option>
                        <option value="Atletismo / Gimnasia">🏃 Atletismo / Gimnasia</option>
                        <option value="Multideporte">🎽 Multideporte</option>
                      </select>
                    </div>
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">Unidades en Kit</label>
                      <input 
                        type="number" 
                        min="1"
                        className="ficha-input" 
                        value={specs.itemQuantity || 1} 
                        onChange={(e) => setSpecs({ ...specs, itemQuantity: parseInt(e.target.value, 10) || 1 })} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. COCINA Y COMEDOR */}
              {category === 'Cocina y Comedor' && (
                <div className="questionnaire-fields">
                  <div className="ficha-field-row">
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">Capacidad (Litros / Kilos / Balón)</label>
                      <input 
                        type="text" 
                        className="ficha-input" 
                        value={specs.capacity || ''} 
                        onChange={(e) => setSpecs({ ...specs, capacity: e.target.value })} 
                        placeholder="Ej: Olla 50 Litros / Balón 10kg" 
                      />
                    </div>
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">Material</label>
                      <input 
                        type="text" 
                        className="ficha-input" 
                        value={specs.kitchenMaterial || ''} 
                        onChange={(e) => setSpecs({ ...specs, kitchenMaterial: e.target.value })} 
                        placeholder="Aluminio, Acero Inoxidable, Fierro" 
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. MATERIAL DIDÁCTICO Y LAB */}
              {category === 'Material Didáctico y Lab' && (
                <div className="questionnaire-fields">
                  <div className="ficha-field-row">
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">Materia / Especialidad</label>
                      <input 
                        type="text" 
                        className="ficha-input" 
                        value={specs.labSubject || ''} 
                        onChange={(e) => setSpecs({ ...specs, labSubject: e.target.value })} 
                        placeholder="Biología, Química, Física, Anatomía" 
                      />
                    </div>
                    <div className="ficha-field-group flex-1">
                      <label className="ficha-label">¿Incluye Estuche / Caja?</label>
                      <select 
                        className="ficha-input"
                        value={specs.hasCase || 'Sí'}
                        onChange={(e) => setSpecs({ ...specs, hasCase: e.target.value })}
                      >
                        <option value="Sí">Sí (Estuche Rígido)</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. OTROS / DETALLES GENERALES */}
              {category === 'Otros / Varios' && (
                <div className="questionnaire-fields">
                  <div className="ficha-field-group">
                    <label className="ficha-label">Descripción General del Objeto</label>
                    <input 
                      type="text" 
                      className="ficha-input" 
                      value={specs.generalNotes || ''} 
                      onChange={(e) => setSpecs({ ...specs, generalNotes: e.target.value })} 
                      placeholder="Escriba aquí los detalles del objeto..." 
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Auditoría de Estado Pills */}
            <div className="ficha-audit-section">
              <h3 className="ficha-audit-title">Auditoría de estado</h3>
              
              <div className="ficha-status-pills">
                <button
                  type="button"
                  className={`status-pill ${status === 'Bueno' ? 'status-pill-selected-navy' : ''}`}
                  onClick={() => setStatus('Bueno')}
                >
                  Bueno
                </button>

                <button
                  type="button"
                  className={`status-pill ${status === 'Regular' ? 'status-pill-selected-amber' : ''}`}
                  onClick={() => setStatus('Regular')}
                >
                  Regular
                </button>

                <button
                  type="button"
                  className={`status-pill ${status === 'Malo' ? 'status-pill-selected-red' : ''}`}
                  onClick={() => setStatus('Malo')}
                >
                  Malo
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button type="submit" className="btn-registrar-stockpile">
              Registrar en Stockpile &rarr;
            </button>
          </form>

          {/* Quick Manual Code Picker / Tester */}
          <div className="ficha-tester-bar">
            <span className="tester-label">Probar códigos de ejemplo:</span>
            <div className="tester-chips">
              <button type="button" onClick={() => handleLoadItemByCode('QUI-2026-014')} className="chip-btn">
                QUI-2026-014
              </button>
              <button type="button" onClick={() => handleLoadItemByCode('QUI-TEC-001')} className="chip-btn">
                QUI-TEC-001
              </button>
              <button type="button" onClick={() => handleLoadItemByCode('QUI-MOB-001')} className="chip-btn">
                QUI-MOB-001
              </button>
            </div>

            <div className="manual-input-box">
              <input 
                type="text" 
                placeholder="Ingresar código manual (ej: QUI-2026-099)..."
                value={manualCodeInput}
                onChange={(e) => setManualCodeInput(e.target.value)}
                className="manual-input"
              />
              <button 
                type="button" 
                onClick={() => {
                  if (manualCodeInput) {
                    handleLoadItemByCode(manualCodeInput);
                    setManualCodeInput('');
                  }
                }}
                className="manual-btn"
              >
                Cargar
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Live Camera QR Reader Modal */}
      {isScannerOpen && (
        <div className="camera-modal-overlay">
          <div className="camera-modal-card">
            <div className="camera-modal-header">
              <h3>📷 Escáner QR de Cámara</h3>
              <button className="btn-close-modal" onClick={stopCameraScanner}>✕</button>
            </div>

            <div className="camera-viewport-container">
              <div id="qr-reader-viewport" ref={scannerRef}></div>
              
              {/* Scan Overlay Crosshair */}
              {isScanning && (
                <div className="scanner-target-reticle">
                  <div className="reticle-line"></div>
                </div>
              )}
            </div>

            {cameraError ? (
              <div className="camera-error-msg">{cameraError}</div>
            ) : (
              <p className="camera-hint">
                Apunta la cámara del smartphone hacia el código QR de la etiqueta patrimonial.
              </p>
            )}

            <button type="button" className="btn-cancel-scan" onClick={stopCameraScanner}>
              Cancelar Escaneo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
