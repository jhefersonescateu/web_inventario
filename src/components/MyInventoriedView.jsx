import React, { useState, useMemo } from 'react';

export default function MyInventoriedView({ 
  items = [], 
  userDni = '', 
  onNavigateToScanner, 
  showToast,
  onDeleteItem,
  onClearAll,
  onBackToHome
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Todos');

  // Display all real items registered in the system
  const myItems = useMemo(() => {
    return items;
  }, [items]);

  // Apply search & status filter
  const filteredMyItems = useMemo(() => {
    return myItems.filter(item => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        (item.name || '').toLowerCase().includes(q) ||
        (item.code || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.location || '').toLowerCase().includes(q);

      const matchesStatus = selectedStatusFilter === 'Todos' || item.status === selectedStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [myItems, searchTerm, selectedStatusFilter]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = myItems.length;
    const good = myItems.filter(i => i.status === 'Bueno').length;
    const regular = myItems.filter(i => i.status === 'Regular').length;
    const bad = myItems.filter(i => i.status === 'Malo').length;
    return { total, good, regular, bad };
  }, [myItems]);

  return (
    <div className="ficha-page-container">
      <div className="ficha-card-wrapper">
        
        {/* Navy Header Card */}
        <div className="ficha-header-navy">
          <div className="ficha-header-top">
            {onBackToHome ? (
              <button 
                type="button" 
                className="btn-back-home"
                onClick={onBackToHome}
              >
                ← Volver al Menú
              </button>
            ) : (
              <div className="jaq-avatar-yellow">
                <span>JAQ</span>
              </div>
            )}
            <div className="user-dni-pill">
              👤 DNI: <strong>{userDni || 'No registrado'}</strong>
            </div>
          </div>

          <h1 className="ficha-header-title">Revisar Inventario</h1>
          <p className="ficha-header-subtitle">
            Bienes inventariados en este dispositivo
          </p>
        </div>

        {/* Cream Inner Body */}
        <div className="ficha-body-cream">
          
          {/* Quick Action bar to switch back to scanner */}
          <div className="ficha-action-bar" style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn-scan-camera"
              style={{ flex: 1 }}
              onClick={onNavigateToScanner}
            >
              <span className="scan-icon">📷</span>
              <span>+ Escanear Nuevo Bien QR</span>
            </button>
            {onClearAll && myItems.length > 0 && (
              <button 
                type="button"
                className="btn-rescan-qr"
                style={{ background: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5' }}
                onClick={onClearAll}
              >
                🧹 Vaciar Todo
              </button>
            )}
          </div>

          {/* Stats Summary Banner */}
          <div className="my-inventory-stats-card">
            <div className="stats-header">
              <span className="stats-title">📊 Resumen de tu Registro</span>
              <span className="stats-badge-total">{stats.total} {stats.total === 1 ? 'Bien' : 'Bienes'}</span>
            </div>

            <div className="stats-row">
              <div className="stat-box good">
                <span className="stat-count">{stats.good}</span>
                <span className="stat-label">Bueno</span>
              </div>
              <div className="stat-box regular">
                <span className="stat-count">{stats.regular}</span>
                <span className="stat-label">Regular</span>
              </div>
              <div className="stat-box bad">
                <span className="stat-count">{stats.bad}</span>
                <span className="stat-label">Malo</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          {myItems.length > 0 && (
            <div className="my-inventory-filter-bar">
              <input
                type="text"
                className="ficha-input my-search-input"
                placeholder="🔍 Buscar por código, nombre o aula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="filter-pills-row">
                {['Todos', 'Bueno', 'Regular', 'Malo'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    className={`filter-pill-btn ${selectedStatusFilter === st ? 'active' : ''}`}
                    onClick={() => setSelectedStatusFilter(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items List */}
          {filteredMyItems.length > 0 ? (
            <div className="my-items-list">
              {filteredMyItems.map((item, index) => (
                <div key={item.id || item.code || index} className="my-item-card">
                  <div className="my-item-card-header">
                    <div className="my-item-code-tag">
                      <span className="code-symbol">🏷️</span> {item.code}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {item.code && (item.code.toUpperCase().includes('MANUAL') || item.code.toUpperCase().includes('MAN-')) && (
                        <span className="badge-manual-item">
                          ⌨️ Sin QR
                        </span>
                      )}
                      <span className={`status-badge-pill ${
                        item.status === 'Bueno' ? 'badge-good' : 
                        item.status === 'Regular' ? 'badge-regular' : 'badge-bad'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="my-item-name">{item.name}</h3>

                  <div className="my-item-meta">
                    <span>📍 {item.location || 'Sin ubicación'}</span>
                    <span>📂 {item.category || 'General'}</span>
                    {item.educationalLevel && <span>🎓 {item.educationalLevel}</span>}
                  </div>

                  {item.scannedAt && (
                    <div className="my-item-timestamp">
                      🕒 Registrado: {item.scannedAt}
                    </div>
                  )}

                  {/* Optional Specs preview if available */}
                  {item.specs && Object.keys(item.specs).length > 0 && (
                    <div className="my-item-specs-box">
                      {item.specs.brand && <span><strong>Marca:</strong> {item.specs.brand} </span>}
                      {item.specs.model && <span><strong>Modelo:</strong> {item.specs.model} </span>}
                      {item.specs.serialNumber && <span><strong>S/N:</strong> {item.specs.serialNumber} </span>}
                      {item.specs.material && <span><strong>Material:</strong> {item.specs.material} </span>}
                    </div>
                  )}

                  <div className="my-item-actions">
                    {onDeleteItem && (
                      <button 
                        type="button"
                        className="btn-item-delete"
                        onClick={() => onDeleteItem(item.id || item.code, item.name)}
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : myItems.length > 0 ? (
            /* No results matching search */
            <div className="empty-inventory-box">
              <div className="empty-icon">🔍</div>
              <h4>No se encontraron coincidencias</h4>
              <p>Intenta ajustar el filtro de búsqueda.</p>
            </div>
          ) : (
            /* 0 items inventoried by this DNI yet */
            <div className="empty-inventory-box">
              <div className="empty-icon">📦</div>
              <h3>Aún no has registrado bienes</h3>
              <p>
                No hay bienes registrados en este dispositivo con el DNI <strong>{userDni}</strong>.
              </p>
              <button 
                type="button" 
                className="btn-registrar-stockpile"
                style={{ marginTop: '16px', maxWidth: '280px', margin: '16px auto 0' }}
                onClick={onNavigateToScanner}
              >
                📷 Comenzar Escaneo QR
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
