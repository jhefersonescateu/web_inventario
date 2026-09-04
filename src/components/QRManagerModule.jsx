import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function QRManagerModule({ items, locations, categoriesList, onAddItem, onUpdateItem, showToast }) {
  const [activeSubTab, setActiveSubTab] = useState('generator'); // 'generator' | 'scanner'

  // Auto-calculate next available number for the selected prefix (Defaults to 1)
  const getAutoBatchStartNumber = (prefix = 'QUI-2026-') => {
    let maxNum = 0;
    items.forEach(item => {
      if (item.code.startsWith(prefix)) {
        const numPart = item.code.replace(prefix, '');
        const val = parseInt(numPart, 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    });
    return maxNum + 1; // Default is 1
  };

  // Generator State - Hojas de QRs Vacíos
  const [codePrefix, setCodePrefix] = useState('QUI-2026-');
  const [startSeqNum, setStartSeqNum] = useState(() => getAutoBatchStartNumber('QUI-2026-'));
  const [totalQrCount, setTotalQrCount] = useState(15); // Default: 15 stickers per A4 page (3 cols x 5 rows)
  const [institutionHeader, setInstitutionHeader] = useState('I.E. JOSÉ ABELARDO QUIÑONES');
  const [tagSubheader, setTagSubheader] = useState('CONTROL PATRIMONIAL 2026');
  const [webScanUrl, setWebScanUrl] = useState('https://stockpile-quinones.app/scan?code=');
  const [stickerCols, setStickerCols] = useState(3); // 3 columns grid per sheet
  const [qrThemeColor] = useState('#1e3a8a');
  const [showPrintConfirmBanner, setShowPrintConfirmBanner] = useState(false);

  // Print Batch & open confirmation
  const handlePrintBatch = () => {
    window.print();
    setShowPrintConfirmBanner(true);
  };

  // User confirms the sheet was actually printed physically -> advance sequence
  const handleConfirmPrinted = () => {
    const count = parseInt(totalQrCount) || 1;
    const nextStart = Number(startSeqNum) + count;
    setStartSeqNum(nextStart);
    setShowPrintConfirmBanner(false);
    showToast(`✅ Impresión confirmada. Siguiente correlativo libre avanzado a ${codePrefix}${String(nextStart).padStart(3, '0')}.`);
  };

  // User cancelled or didn't print -> keep sequence intact
  const handleCancelPrintConfirm = () => {
    setShowPrintConfirmBanner(false);
    showToast(`ℹ️ Impresión no confirmada. El correlativo se mantiene en ${codePrefix}${String(startSeqNum).padStart(3, '0')}.`);
  };

  // Reset sequence to 1
  const handleResetToFirst = () => {
    setStartSeqNum(1);
    showToast('🔄 Correlativo reiniciado al inicio: 1');
  };




  // Scanner & Web Questionnaire Simulation State
  const [inputScanCode, setInputScanCode] = useState('');
  const [scannedItemData, setScannedItemData] = useState(null);
  const [isNewUnassignedQr, setIsNewUnassignedQr] = useState(false);
  const [isScanningSimulated, setIsScanningSimulated] = useState(false);

  // Questionnaire form state
  const [questionnaireData, setQuestionnaireData] = useState({
    code: '',
    name: '',
    location: locations[1] || 'Aula-05',
    category: categoriesList[1] || 'Mobiliario Escolar',
    brand: '',
    model: '',
    serialNumber: 'N/A',
    quantity: 1,
    status: 'Bueno',
    details: '',
    notes: 'Registrado desde escaneo de QR pegado en objeto'
  });

  // Audit state update for existing items
  const [auditStatus, setAuditStatus] = useState('Bueno');
  const [auditLocation, setAuditLocation] = useState('');
  const [auditNote, setAuditNote] = useState('');

  // Generate sequence of empty QR codes array
  const generatedBatchQrs = Array.from({ length: Math.max(1, parseInt(totalQrCount) || 1) }, (_, idx) => {
    const seq = Number(startSeqNum) + idx;
    const codeStr = `${codePrefix}${String(seq).padStart(3, '0')}`;
    const registered = items.find(i => i.code === codeStr);
    return {
      code: codeStr,
      registeredItem: registered || null,
      fullUrl: `${webScanUrl}${encodeURIComponent(codeStr)}`
    };
  });

  // Handle Scan Action
  const handleSimulateScanCode = (codeToScan) => {
    const targetCode = (codeToScan || inputScanCode).trim().toUpperCase();
    if (!targetCode) {
      alert('Ingresa o selecciona un código QR para simular el escaneo.');
      return;
    }

    setIsScanningSimulated(true);
    setTimeout(() => {
      setIsScanningSimulated(false);
      const existing = items.find(i => i.code.toLowerCase() === targetCode.toLowerCase());

      if (existing) {
        // Objeto ya registrado -> Modo Auditoría Anual
        setIsNewUnassignedQr(false);
        setScannedItemData(existing);
        setAuditStatus(existing.status);
        setAuditLocation(existing.location);
        setAuditNote(existing.notes || '');
        showToast(`📋 QR Reconocido: Objeto "${existing.name}" en ${existing.location}. Modo Auditoría.`);
      } else {
        // Objeto Nuevo / QR Vacío -> Modo Llenado de Cuestionario
        setIsNewUnassignedQr(true);
        setScannedItemData(null);
        setQuestionnaireData({
          code: targetCode,
          name: '',
          location: locations[1] || 'Aula-05',
          category: categoriesList[1] || 'Mobiliario Escolar',
          brand: '',
          model: '',
          serialNumber: 'N/A',
          quantity: 1,
          status: 'Bueno',
          details: 'Objeto físico etiquetado con QR',
          notes: 'Registrado desde formulario web de QR'
        });
        showToast(`🆕 QR Vacío Escaneado (${targetCode}): Completa la información del objeto.`);
      }
    }, 500);
  };

  // Submit Questionnaire for New QR
  const handleSaveQuestionnaireNewItem = (e) => {
    e.preventDefault();
    if (!questionnaireData.name.trim()) {
      alert('Por favor ingrese el nombre del objeto (Ej. Mesa bipersonal, Silla, Laptop...)');
      return;
    }

    const newItem = {
      ...questionnaireData,
      id: questionnaireData.code || `QUI-QR-${Date.now()}`
    };

    onAddItem(newItem);
    showToast(`🎉 ¡Información guardada! El bien "${newItem.name}" ahora está registrado con el QR ${newItem.code}.`);
    
    // Switch to viewing registered status
    setScannedItemData(newItem);
    setIsNewUnassignedQr(false);
    setAuditStatus(newItem.status);
    setAuditLocation(newItem.location);
    setAuditNote(newItem.notes);
  };

  // Submit Audit Update for Existing QR
  const handleSaveAuditUpdate = (e) => {
    e.preventDefault();
    if (!scannedItemData) return;

    const updated = {
      ...scannedItemData,
      status: auditStatus,
      location: auditLocation,
      notes: auditNote.trim() ? auditNote : scannedItemData.notes
    };

    onUpdateItem(updated);
    setScannedItemData(updated);
    showToast(`✅ Auditoría 2026 actualizada: Objeto "${updated.name}" en estado [${updated.status}].`);
  };

  return (
    <div className="qr-module-container">
      {/* Top Banner */}
      <div className="qr-header-banner">
        <div className="qr-banner-info">
          <h2>📄 Generador de Hojas de QRs Vacíos y Cuestionario Web</h2>
          <p>
            <strong>Flujo de trabajo:</strong> 1° Imprime hojas con la cantidad de QRs vacíos que necesites. 
            2° Pégalos en las sillas, mesas o laptops. 3° Escanea el QR con un celular para llenar la información del objeto y enviarla a este programa. 
            4° El próximo año, solo escanéalo para auditoría rápida (Bueno, Regular o Malo).
          </p>
        </div>

        <div className="qr-subtabs">
          <button 
            className={`qr-tab-btn ${activeSubTab === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('generator')}
          >
            🖨️ 1. Generar e Imprimir Hojas de QRs Vacíos
          </button>
          <button 
            className={`qr-tab-btn ${activeSubTab === 'scanner' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('scanner')}
          >
            📱 2. Cuestionario Web / Auditoría Anual al Escanear
          </button>
        </div>
      </div>

      {/* SUBTAB 1: GENERADOR DE HOJAS DE QRS VACÍOS */}
      {activeSubTab === 'generator' && (
        <div className="qr-workspace-grid">
          {/* Controls to configure batch sheet */}
          <div className="qr-controls-card">
            <h3 className="qr-section-title">⚙️ Configurar Hoja de Etiquetas QR Vacías</h3>

            <div className="qr-form-row">
              <div className="form-group">
                <label>Cantidad de QRs a Imprimir por Hoja:</label>
                <input 
                  type="number" 
                  min="1" 
                  max="120"
                  value={totalQrCount}
                  onChange={(e) => setTotalQrCount(parseInt(e.target.value) || 1)}
                  style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e3a8a' }}
                />
              </div>

              <div className="form-group">
                <label>Prefijo del Código Patrimonial:</label>
                <input 
                  type="text" 
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value)}
                  placeholder="Ej. QUI-2026-"
                />
              </div>
            </div>

            <div className="qr-form-row">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0 }}>Código de Inicio (Automático):</label>
                  <span 
                    style={{ 
                      fontSize: '0.72rem', 
                      background: '#dcfce7', 
                      color: '#15803d', 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      fontWeight: 600
                    }}
                  >
                    🔒 Automático
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    readOnly
                    value={`${codePrefix}${String(startSeqNum).padStart(3, '0')}`}
                    style={{ 
                      fontWeight: 'bold', 
                      fontSize: '1rem',
                      color: '#059669', 
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #86efac',
                      cursor: 'not-allowed'
                    }}
                  />
                  <button 
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleResetToFirst}
                    title="Reiniciar correlativo a 1"
                  >
                    🔄
                  </button>
                </div>
                <small style={{ color: '#047857', display: 'block', marginTop: '6px', fontSize: '0.78rem', fontWeight: 600 }}>
                  📍 Hoja a imprimir: {codePrefix}{String(startSeqNum).padStart(3, '0')} al {codePrefix}{String(startSeqNum + totalQrCount - 1).padStart(3, '0')}
                </small>
              </div>

              <div className="form-group">
                <label>Columnas por Hoja de Pegatinas:</label>
                <select value={stickerCols} onChange={(e) => setStickerCols(parseInt(e.target.value))}>
                  <option value={2}>2 Columnas (Etiquetas Grandes 8x5 cm)</option>
                  <option value={3}>3 Columnas (Etiquetas Medias 6x4 cm)</option>
                  <option value={4}>4 Columnas (Etiquetas Compactas 4x3 cm)</option>
                </select>
              </div>
            </div>


            <div className="qr-form-row">
              <div className="form-group">
                <label>Nombre Institucional en la Etiqueta:</label>
                <input 
                  type="text" 
                  value={institutionHeader}
                  onChange={(e) => setInstitutionHeader(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Subtítulo o Leyenda:</label>
                <input 
                  type="text" 
                  value={tagSubheader}
                  onChange={(e) => setTagSubheader(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group mb-4">
              <label>Enlace del Cuestionario Web (al escanear con Celular):</label>
              <input 
                type="text" 
                value={webScanUrl}
                onChange={(e) => setWebScanUrl(e.target.value)}
                placeholder="https://tudominio.com/scan?code="
              />
              <small style={{ color: '#64748b', display: 'block', marginTop: '4px', fontSize: '0.78rem' }}>
                🔗 Al escanear la pegatina pegada en el mueble, el celular abrirá esta dirección con la ficha de registro vacía.
              </small>
            </div>

            <div className="qr-action-buttons" style={{ marginTop: '20px' }}>
              <button className="btn btn-primary btn-lg w-full" onClick={handlePrintBatch}>
                🖨️ Imprimir Hoja con {totalQrCount} Etiquetas QR
              </button>
            </div>

            {showPrintConfirmBanner && (
              <div style={{ marginTop: '16px', background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                <h4 style={{ color: '#1e3a8a', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '6px' }}>
                  🖨️ ¿La hoja de pegatinas se imprimió físicamente con éxito?
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#334155', marginBottom: '14px' }}>
                  Para evitar desperdiciar correlativos, confirma si realmente imprimiste el papel:
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    className="btn btn-emerald btn-sm"
                    onClick={handleConfirmPrinted}
                    style={{ fontWeight: 'bold' }}
                  >
                    ✅ Sí, la imprimí (Avanzar correlativo)
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={handleCancelPrintConfirm}
                  >
                    ❌ Cancelé / No imprimí (Mantener número)
                  </button>
                </div>
              </div>
            )}


          </div>

          {/* Printable Sheet Live Preview */}
          <div className="qr-preview-card">
            <div className="qr-preview-header">
              <h3>📄 Vista Previa de Hoja de Impresión ({totalQrCount} Pegatinas)</h3>
              <span className="badge-live">QRs vacíos listos para pegar</span>
            </div>

            <div className="printable-area-wrapper" style={{ maxHeight: '520px', overflowY: 'auto' }}>
              <div 
                className="printable-grid-sheet"
                style={{ gridTemplateColumns: `repeat(${stickerCols}, 1fr)` }}
              >
                {generatedBatchQrs.map((item, idx) => (
                  <div key={idx} className="printable-tag printable-tag-small grid-item-tag">
                    <div className="tag-header-institution">
                      <span className="tag-icon" style={{ fontSize: '18px' }}>🏫</span>
                      <div>
                        <div className="tag-title" style={{ fontSize: '0.75rem' }}>{institutionHeader}</div>
                        <div className="tag-sub" style={{ fontSize: '0.62rem' }}>{tagSubheader}</div>
                      </div>
                    </div>

                    <div className="tag-body" style={{ gap: '8px' }}>
                      <div className="tag-qr-box">
                        <QRCodeSVG 
                          value={item.fullUrl}
                          size={65}
                          fgColor={qrThemeColor}
                          level="M"
                        />
                        <div className="tag-code-text" style={{ fontSize: '0.68rem' }}>{item.code}</div>
                      </div>

                      <div className="tag-details-box" style={{ fontSize: '0.68rem' }}>
                        {item.registeredItem ? (
                          <>
                            <div className="tag-field"><span className="lbl">ASIGNADO:</span> <strong className="val-sm">{item.registeredItem.name}</strong></div>
                            <div className="tag-field"><span className="lbl">AULA:</span> <span className="val-badge-sm">📍 {item.registeredItem.location}</span></div>
                          </>
                        ) : (
                          <>
                            <div className="tag-field" style={{ color: '#0284c7', fontWeight: 600 }}>✨ QR VACÍO SIN ASIGNAR</div>
                            <div className="tag-field" style={{ color: '#64748b', fontSize: '0.62rem' }}>Pegar en objeto y escanear para registrar datos</div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="tag-footer" style={{ fontSize: '0.58rem' }}>
                      ESCANEAR PARA REGISTRAR EN STOCKPILE
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="qr-preview-instructions">
              💡 <strong>Rango Generado:</strong> Desde <code>{generatedBatchQrs[0]?.code}</code> hasta <code>{generatedBatchQrs[generatedBatchQrs.length - 1]?.code}</code>. Haz clic en <strong>Imprimir Hoja</strong> para recortar y pegar las pegatinas en los objetos.
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: CUESTIONARIO WEB / SIMULADOR DE ESCANEO */}
      {activeSubTab === 'scanner' && (
        <div className="qr-scanner-workspace">
          {/* Phone Mockup with Camera Scanner */}
          <div className="scanner-phone-mockup">
            <div className="phone-screen">
              <div className="phone-camera-header">
                <span className="camera-dot"></span>
                <span>SITIO WEB DE ESCANEO DE PEGAS</span>
              </div>

              <div className="camera-viewfinder">
                <div className={`scan-laser ${isScanningSimulated ? 'scanning' : ''}`}></div>
                <div className="viewfinder-corners">
                  <div className="corner top-left"></div>
                  <div className="corner top-right"></div>
                  <div className="corner bottom-left"></div>
                  <div className="corner bottom-right"></div>
                </div>

                <div className="camera-overlay-content">
                  <span className="camera-icon">📷</span>
                  <p>Escaneando pegatina QR pegada al objeto...</p>
                </div>
              </div>

              <div className="phone-controls">
                <label className="phone-lbl">Selecciona un QR para simular el escaneo:</label>
                
                {/* Section for Blank QRs */}
                <div style={{ marginBottom: '8px' }}>
                  <small style={{ color: '#38bdf8', fontSize: '0.72rem', fontWeight: 700 }}>🆕 Probar QRs Vacíos (Recién pegados):</small>
                  <div className="sim-buttons-grid" style={{ marginTop: '4px' }}>
                    <button 
                      className="sim-btn new-tag"
                      onClick={() => handleSimulateScanCode(`${codePrefix}${String(startSeqNum).padStart(3, '0')}`)}
                    >
                      <span>✨</span> QR Vacío: {codePrefix}{String(startSeqNum).padStart(3, '0')}
                    </button>
                    <button 
                      className="sim-btn new-tag"
                      onClick={() => handleSimulateScanCode(`${codePrefix}${String(startSeqNum + 1).padStart(3, '0')}`)}
                    >
                      <span>✨</span> QR Vacío: {codePrefix}{String(startSeqNum + 1).padStart(3, '0')}
                    </button>
                  </div>
                </div>

                {/* Section for Existing Registered QRs */}
                <div>
                  <small style={{ color: '#cbd5e1', fontSize: '0.72rem', fontWeight: 700 }}>📋 Probar QRs Ya Registrados (Auditoría):</small>
                  <div className="sim-buttons-grid" style={{ marginTop: '4px' }}>
                    {items.slice(0, 4).map((i) => (
                      <button 
                        key={i.id} 
                        className="sim-btn"
                        onClick={() => handleSimulateScanCode(i.code)}
                      >
                        <span>🏷️</span> {i.code}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <input 
                    type="text"
                    placeholder="Escribir o pegar código de QR..."
                    value={inputScanCode}
                    onChange={(e) => setInputScanCode(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  />
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSimulateScanCode(inputScanCode)}
                  >
                    Escanear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form / Questionnaire View */}
          <div className="scanner-form-card">
            {isNewUnassignedQr ? (
              /* ESCENARIO A: Cuestionario de Registro para QR Vacío */
              <>
                <div className="scanner-form-header">
                  <h3>✨ Cuestionario Web: Asignar Datos a QR Vacío</h3>
                  <span className="status-sync-badge new">
                    🆕 QR Vacío: {questionnaireData.code}
                  </span>
                </div>

                <p className="scanner-form-desc">
                  <strong>¡Pegatina vacía detectada!</strong> Has escaneado el código <code>{questionnaireData.code}</code> pegado en el objeto físico. Rellena esta ficha una sola vez para guardar el objeto en Stockpile:
                </p>

                <form onSubmit={handleSaveQuestionnaireNewItem} className="form-grid">
                  <div className="form-group">
                    <label>Código del QR *</label>
                    <input 
                      type="text"
                      readOnly 
                      value={questionnaireData.code}
                      style={{ fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#f1f5f9' }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Ubicación / Aula donde está el objeto *</label>
                    <select
                      value={questionnaireData.location}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, location: e.target.value })}
                    >
                      {locations.filter(l => l !== 'Todas las Ubicaciones').map((loc, idx) => (
                        <option key={idx} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>¿Qué objeto es? (Nombre del Bien) *</label>
                    <input 
                      type="text"
                      required
                      placeholder="Ej. Mesa Escolar Bipersonal, Silla Azul, Laptop Lenovo..."
                      value={questionnaireData.name}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, name: e.target.value })}
                      style={{ fontSize: '1rem', fontWeight: 600 }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Categoría *</label>
                    <select
                      value={questionnaireData.category}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, category: e.target.value })}
                    >
                      {categoriesList.filter(c => c !== 'Todas las Categorías').map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Estado Inicial de Conservación *</label>
                    <select
                      value={questionnaireData.status}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, status: e.target.value })}
                    >
                      <option value="Bueno">✓ Bueno / Operativo</option>
                      <option value="Regular">⚠️ Regular (Funciona con detalles)</option>
                      <option value="Malo">✕ Malo / Para reparación</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Marca (Opcional)</label>
                    <input 
                      type="text"
                      placeholder="Ej. MINEDU, Epson, Lenovo..."
                      value={questionnaireData.brand}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, brand: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Cantidad *</label>
                    <input 
                      type="number"
                      min="1"
                      value={questionnaireData.quantity}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Especificaciones / Detalles del Objeto</label>
                    <textarea
                      rows="2"
                      placeholder="Ej. Madera prensada marrón con estructura de fierro gris..."
                      value={questionnaireData.details}
                      onChange={(e) => setQuestionnaireData({ ...questionnaireData, details: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width" style={{ marginTop: '8px' }}>
                    <button type="submit" className="btn btn-emerald btn-lg w-full">
                      💾 Guardar y Vincular Objeto a este QR en Stockpile
                    </button>
                  </div>
                </form>
              </>
            ) : scannedItemData ? (
              /* ESCENARIO B: Auditoría Anual para Objeto Ya Registrado */
              <>
                <div className="scanner-form-header">
                  <h3>✅ Auditoría Anual — Control de Estado 2026</h3>
                  <span className="status-sync-badge existing">
                    ID: {scannedItemData.code}
                  </span>
                </div>

                <div className="scanner-form-desc" style={{ borderLeftColor: '#059669', background: '#f0fdf4' }}>
                  <strong>Objeto Reconocido en Sistema:</strong> Este QR ya pertenece al bien <strong>"{scannedItemData.name}"</strong> en <strong>{scannedItemData.location}</strong>. 
                  Usa este formulario para la revisión del próximo año:
                </div>

                <form onSubmit={handleSaveAuditUpdate} className="form-grid">
                  <div className="form-group">
                    <label>Código del Bien:</label>
                    <input type="text" readOnly value={scannedItemData.code} style={{ fontWeight: 'bold' }} />
                  </div>

                  <div className="form-group">
                    <label>Nombre del Bien:</label>
                    <input type="text" readOnly value={scannedItemData.name} />
                  </div>

                  <div className="form-group">
                    <label>Ubicación Actual (Aula):</label>
                    <select
                      value={auditLocation}
                      onChange={(e) => setAuditLocation(e.target.value)}
                    >
                      {locations.filter(l => l !== 'Todas las Ubicaciones').map((loc, idx) => (
                        <option key={idx} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#1e3a8a', fontWeight: 'bold' }}>🔍 Estado en la Auditoría Anual *</label>
                    <select
                      value={auditStatus}
                      onChange={(e) => setAuditStatus(e.target.value)}
                      style={{ border: '2px solid #2563eb', fontWeight: 600 }}
                    >
                      <option value="Bueno">✓ Bueno / Operativo</option>
                      <option value="Regular">⚠️ Regular (Desgaste normal)</option>
                      <option value="Malo">✕ Malo / De baja (Dar de baja)</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label>Nota de Inspección del Próximo Año:</label>
                    <input 
                      type="text"
                      placeholder="Ej. Inspeccionado el 2027: pataleta suelta, se mantiene en aula..."
                      value={auditNote}
                      onChange={(e) => setAuditNote(e.target.value)}
                    />
                  </div>

                  <div className="form-group full-width" style={{ marginTop: '10px' }}>
                    <button type="submit" className="btn btn-primary btn-lg w-full">
                      ⚡ Guardar Auditoría Anual en Stockpile
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* ESTADO INICIAL SIN SELECCIÓN */
              <div className="empty-state">
                <div className="empty-state-icon">📱</div>
                <h3>Simulador de Escaneo Web Móvil</h3>
                <p style={{ marginTop: '6px', fontSize: '0.85rem' }}>
                  Haz clic en cualquiera de los botones de la izquierda (ej. <strong>"✨ QR Vacío: QUI-2026-001"</strong>) para probar cómo un profesor o técnico escaneará la pegatina vacía con su celular y guardará los datos en este programa.
                </p>
                <button 
                  className="btn btn-primary" 
                  style={{ marginTop: '16px' }}
                  onClick={() => handleSimulateScanCode(`${codePrefix}${String(startSeqNum).padStart(3, '0')}`)}
                >
                  🚀 Probar Escaneo de QR Vacío
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
