import React, { useState, useEffect } from 'react';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '');
  }
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${host}:3001`;
};

export default function AccessGate({ onAuthenticated }) {
  const [accessCode, setAccessCode] = useState('');
  const [dni, setDni] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Estado para el Panel Administrativo
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  // Navegación del Panel: 'list' (Ver Instituciones) | 'create' (Agregar Institución)
  const [adminTab, setAdminTab] = useState('list');

  // Formulario de Instituciones / Códigos
  const [adminCodes, setAdminCodes] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [newCodigo, setNewCodigo] = useState('');
  const [newInstitucion, setNewInstitucion] = useState('');
  const [newEncargadoNombre, setNewEncargadoNombre] = useState('');
  const [newEncargadoTelefono, setNewEncargadoTelefono] = useState('');
  const [newDireccion, setNewDireccion] = useState('');

  const [adminMsg, setAdminMsg] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Modal de Confirmación de Contraseña para acciones sensibles (Editar, Activar/Desactivar, Borrar)
  const [securityModal, setSecurityModal] = useState({
    open: false,
    type: '', // 'edit' | 'toggle' | 'delete'
    item: null,
    password: '',
    error: '',
    loading: false
  });

  // Obtener lista de códigos autorizados desde el backend
  const fetchAdminCodes = async () => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/administracion`);
      const data = await res.json();
      if (data.success && Array.isArray(data.codigos)) {
        setAdminCodes(data.codigos);
      }
    } catch (err) {
      console.error('Error al cargar lista de administración:', err);
    }
  };

  useEffect(() => {
    if (showAdminPanel && isAdminAuthenticated) {
      fetchAdminCodes();
    }
  }, [showAdminPanel, isAdminAuthenticated]);

  // Login de Administrador
  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    setAdminLoginError('');

    if (!adminEmail.trim()) {
      setAdminLoginError('⚠️ Ingrese su correo de administrador.');
      return;
    }
    if (!adminPassword) {
      setAdminLoginError('⚠️ Ingrese su contraseña.');
      return;
    }

    setAdminLoginLoading(true);

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword })
      });

      const data = await res.json();

      if (data.success) {
        setIsAdminAuthenticated(true);
        setAdminLoginError('');
        setAdminTab('list');
      } else {
        setAdminLoginError(data.message || '❌ Credenciales de administrador incorrectas.');
      }
    } catch (err) {
      console.error('Error al conectar con el servidor de autenticación:', err);
      setAdminLoginError('❌ Error de conexión al servidor. Intente nuevamente.');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  // Abrir Verificación de Contraseña para Acción Sensible
  const requestSecurityPassword = (type, item) => {
    setSecurityModal({
      open: true,
      type,
      item,
      password: '',
      error: '',
      loading: false
    });
  };

  // Confirmar Contraseña e Ejecutar Acción
  const handleConfirmSecurityAction = async (e) => {
    e.preventDefault();
    if (!securityModal.password) {
      setSecurityModal(prev => ({ ...prev, error: '⚠️ Ingrese su contraseña de administrador.' }));
      return;
    }

    setSecurityModal(prev => ({ ...prev, loading: true, error: '' }));

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail || 'admin@gmail.com', password: securityModal.password })
      });
      const data = await res.json();

      if (!data.success) {
        setSecurityModal(prev => ({ ...prev, error: '❌ Contraseña de administrador incorrecta.', loading: false }));
        return;
      }

      // Contraseña verificada -> Ejecutar la acción
      const { type, item } = securityModal;
      setSecurityModal({ open: false, type: '', item: null, password: '', error: '', loading: false });

      if (type === 'edit') {
        handleStartEdit(item);
        setAdminTab('create');
      } else if (type === 'toggle') {
        executeToggleActive(item.id, item.codigo);
      } else if (type === 'delete') {
        executeDeleteCode(item.id, item.codigo);
      }
    } catch (err) {
      setSecurityModal(prev => ({ ...prev, error: '❌ Error de conexión al validar contraseña.', loading: false }));
    }
  };

  // Agregar o Editar Código de Usuario
  const handleAddCode = async (e) => {
    e.preventDefault();
    setAdminMsg('');
    if (!newCodigo.trim()) {
      setAdminMsg('⚠️ Ingrese el código.');
      return;
    }
    setAdminLoading(true);

    const apiUrl = getApiBaseUrl();
    const isEdit = Boolean(editingId);
    const url = isEdit ? `${apiUrl}/api/administracion/${editingId}` : `${apiUrl}/api/administracion`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: newCodigo.trim(),
          institucion: newInstitucion.trim() || newCodigo.trim(),
          encargado_nombre: newEncargadoNombre.trim(),
          encargado_telefono: newEncargadoTelefono.trim(),
          direccion: newDireccion.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminMsg('✅ ' + data.message);
        handleCancelEdit();
        fetchAdminCodes();
        setAdminTab('list');
      } else {
        setAdminMsg('❌ ' + (data.message || 'Error al guardar datos.'));
      }
    } catch (err) {
      setAdminMsg('❌ Error de conexión al guardar.');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item.id);
    setNewCodigo(item.codigo || '');
    setNewInstitucion(item.institucion || '');
    setNewEncargadoNombre(item.encargado_nombre || '');
    setNewEncargadoTelefono(item.encargado_telefono || '');
    setNewDireccion(item.direccion || '');
    setAdminMsg(`✏️ Editando datos de "${item.codigo}"`);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewCodigo('');
    setNewInstitucion('');
    setNewEncargadoNombre('');
    setNewEncargadoTelefono('');
    setNewDireccion('');
  };

  // Ejecución real de Activar / Desactivar
  const executeToggleActive = async (id, codigo) => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/administracion/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        setAdminMsg(`🔄 Código "${codigo}" ${data.activo === 1 ? 'ACTIVADO' : 'DESACTIVADO'} correctamente.`);
        fetchAdminCodes();
      } else {
        setAdminMsg(`❌ ${data.message || 'Error al cambiar estado.'}`);
      }
    } catch (err) {
      setAdminMsg('❌ Error al cambiar estado del código.');
    }
  };

  // Ejecución real de Eliminar
  const executeDeleteCode = async (id, codigo) => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/administracion/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAdminMsg(`🗑️ Código "${codigo}" eliminado correctamente.`);
        fetchAdminCodes();
      } else {
        setAdminMsg(`❌ ${data.message || 'Error al eliminar.'}`);
      }
    } catch (err) {
      setAdminMsg('❌ Error al conectar para eliminar.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!accessCode.trim()) {
      setErrorMsg('Por favor ingrese el código de inventariado.');
      return;
    }
    if (!dni.trim()) {
      setErrorMsg('⚠️ Ingrese su número de DNI para identificar quién está ingresando.');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode.trim() })
      });

      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || '❌ Código incorrecto o inactivo. Acceso denegado.');
        setIsLoading(false);
        return;
      }

      // Acceso concedido — guardar sesión
      const cleanDni = dni.trim();
      sessionStorage.setItem('stockpile_auth', 'true');
      sessionStorage.setItem('stockpile_dni', cleanDni);
      sessionStorage.setItem('stockpile_colegio', data.colegio);
      sessionStorage.setItem('stockpile_institution', data.institution);

      onAuthenticated({
        code: data.colegio,
        dni: cleanDni,
        colegio: data.colegio,
        institution: data.institution
      });
    } catch (err) {
      console.error('Error al verificar acceso:', err);
      setErrorMsg('❌ Error de conexión al servidor. Verifique que el servidor esté en línea.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseAdmin = () => {
    setShowAdminPanel(false);
    setIsAdminAuthenticated(false);
    setAdminEmail('');
    setAdminPassword('');
    setAdminLoginError('');
    setAdminMsg('');
    handleCancelEdit();
    setSecurityModal({ open: false, type: '', item: null, password: '', error: '', loading: false });
  };

  return (
    <div className="access-gate-overlay">
      <div className="access-gate-card">
        {/* Top JAQ Badge Logo */}
        <div className="access-logo-circle">
          <span>JAQ</span>
        </div>

        <h1 className="access-title">Ficha Patrimonial</h1>
        <p className="access-subtitle">Control de Bienes · Registro 2026</p>
        <p className="access-institution">I.E. José Abelardo Quiñones</p>

        <div className="access-divider"></div>

        {!showAdminPanel ? (
          <form onSubmit={handleSubmit} className="access-form">
            <div className="access-field-group">
              <label htmlFor="access-code-input" className="access-label">
                🔑 Código de Inventariado Requerido
              </label>

              <div className="access-input-wrapper">
                <input
                  id="access-code-input"
                  type="text"
                  className={`access-input ${errorMsg && !accessCode ? 'access-input-error' : ''}`}
                  placeholder="Código del Colegio"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  autoFocus
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="access-field-group" style={{ marginTop: '12px' }}>
              <label htmlFor="access-dni-input" className="access-label">
                🆔 DNI del Personal / Inventariador
              </label>

              <div className="access-input-wrapper">
                <input
                  id="access-dni-input"
                  type="text"
                  className={`access-input ${errorMsg && !dni ? 'access-input-error' : ''}`}
                  placeholder="Ingrese su N° de DNI"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  autoComplete="off"
                />
              </div>
            </div>

            {errorMsg && <div className="access-error-box" style={{ marginTop: '12px' }}>{errorMsg}</div>}

            <button 
              type="submit" 
              className="access-btn-submit"
              disabled={isLoading}
              style={{ marginTop: '14px' }}
            >
              {isLoading ? 'Verificando...' : 'Ingresar al Inventario →'}
            </button>

            <button
              type="button"
              className="access-btn-admin"
              onClick={() => setShowAdminPanel(true)}
              style={{ marginTop: '10px' }}
            >
              ⚙️ Panel Administrativo / Usuarios
            </button>
          </form>
        ) : !isAdminAuthenticated ? (
          /* FORMULARIO DE INGRESO ADMINISTRADOR */
          <div className="admin-login-container" style={{ textAlign: 'left' }}>
            <div style={{ textAlign: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>🔐 Acceso Administrador</h3>
              <p style={{ fontSize: '0.82rem', color: '#64748b' }}>Ingrese sus credenciales de administrador</p>
            </div>

            <form onSubmit={handleAdminLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="access-label">📧 Correo de Administrador:</label>
                <input
                  type="email"
                  className="access-input"
                  style={{ marginTop: '4px' }}
                  placeholder="Ingrese su correo electrónico"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="access-label">🔒 Contraseña:</label>
                <input
                  type="password"
                  className="access-input"
                  style={{ marginTop: '4px' }}
                  placeholder="Ingrese su contraseña"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>

              {adminLoginError && (
                <div className="access-error-box">
                  {adminLoginError}
                </div>
              )}

              <button
                type="submit"
                className="access-btn-submit"
                disabled={adminLoginLoading}
                style={{ marginTop: '4px' }}
              >
                {adminLoginLoading ? 'Verificando...' : 'Ingresar al Panel →'}
              </button>

              <button
                type="button"
                className="access-btn-admin"
                onClick={handleCloseAdmin}
                style={{ marginTop: '4px', background: '#f1f5f9', color: '#334155' }}
              >
                ← Volver al Inventario
              </button>
            </form>
          </div>
        ) : (
          /* PANEL DE GESTIÓN CON PESTAÑAS SEPARADAS */
          <div className="admin-panel-container" style={{ textAlign: 'left' }}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>⚙️ Panel Administrativo</h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>Gestión de accesos e instituciones autorizadas</p>
            </div>

            {/* BOTONES DE NAVEGACIÓN EN PESTAÑAS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => { setAdminTab('list'); setAdminMsg(''); }}
                style={{
                  padding: '10px 8px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: adminTab === 'list' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: adminTab === 'list' ? '#eff6ff' : '#f8fafc',
                  color: adminTab === 'list' ? '#1d4ed8' : '#64748b'
                }}
              >
                🏫 Ver Instituciones ({adminCodes.length})
              </button>

              <button
                type="button"
                onClick={() => { setAdminTab('create'); handleCancelEdit(); setAdminMsg(''); }}
                style={{
                  padding: '10px 8px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: adminTab === 'create' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                  background: adminTab === 'create' ? '#f0fdf4' : '#f8fafc',
                  color: adminTab === 'create' ? '#0f766e' : '#64748b'
                }}
              >
                ➕ Agregar Institución
              </button>
            </div>

            {adminMsg && (
              <div
                className="access-error-box"
                style={{
                  marginBottom: '12px',
                  fontSize: '0.82rem',
                  background: adminMsg.includes('✅') || adminMsg.includes('🗑️') || adminMsg.includes('🔄') ? '#f0fdf4' : '#fef2f2',
                  borderColor: adminMsg.includes('✅') || adminMsg.includes('🗑️') || adminMsg.includes('🔄') ? '#bbf7d0' : '#fecaca',
                  color: adminMsg.includes('✅') || adminMsg.includes('🗑️') || adminMsg.includes('🔄') ? '#166534' : '#991b1b'
                }}
              >
                {adminMsg}
              </div>
            )}

            {/* MODAL DE CONFIRMACIÓN DE CONTRASEÑA ADMIN PARA ACCIONES */}
            {securityModal.open && (
              <div style={{ padding: '14px', background: '#fffbe0', border: '2px solid #fde68a', borderRadius: '14px', marginBottom: '14px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#92400e', marginBottom: '4px' }}>
                  🔐 Confirmación de Seguridad Requerida
                </div>
                <div style={{ fontSize: '0.78rem', color: '#78350f', marginBottom: '10px' }}>
                  Para <strong>{securityModal.type === 'delete' ? 'eliminar' : securityModal.type === 'edit' ? 'editar' : 'activar/desactivar'}</strong> el código "{securityModal.item?.codigo}", ingrese su contraseña de administrador:
                </div>

                <form onSubmit={handleConfirmSecurityAction} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="password"
                    className="access-input"
                    style={{ fontSize: '0.88rem', padding: '8px 10px' }}
                    placeholder="Contraseña de Administrador"
                    value={securityModal.password}
                    onChange={(e) => setSecurityModal(prev => ({ ...prev, password: e.target.value }))}
                    autoFocus
                  />

                  {securityModal.error && (
                    <div className="access-error-box" style={{ fontSize: '0.78rem', padding: '6px 8px' }}>
                      {securityModal.error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button
                      type="submit"
                      className="access-btn-submit"
                      disabled={securityModal.loading}
                      style={{ flex: 1, fontSize: '0.82rem', padding: '8px', margin: 0, background: '#d97706' }}
                    >
                      {securityModal.loading ? 'Verificando...' : 'Confirmar Acción'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSecurityModal({ open: false, type: '', item: null, password: '', error: '', loading: false })}
                      style={{ background: '#e2e8f0', border: 'none', borderRadius: '8px', padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '700' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* PESTAÑA 1: VER INSTITUCIONES */}
            {adminTab === 'list' && (
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Instituciones Registradas en Turso DB ({adminCodes.length}):
                </div>

                <div style={{ maxHeight: '230px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {adminCodes.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                      No hay códigos registrados aún. Haga clic en "+ Agregar Institución" para crear uno.
                    </div>
                  ) : (
                    adminCodes.map((item) => {
                      const isActivo = item.activo === 1;
                      return (
                        <div key={item.id || item.codigo} style={{ padding: '10px 12px', background: isActivo ? '#f8fafc' : '#fff5f5', borderRadius: '10px', border: `1px solid ${isActivo ? '#e2e8f0' : '#fecaca'}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: '#1e293b', fontSize: '0.92rem' }}>🔑 {item.codigo}</strong>
                              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: isActivo ? '#dcfce7' : '#fee2e2', color: isActivo ? '#166534' : '#991b1b', fontWeight: '700' }}>
                                {isActivo ? '🟢 Activo' : '🔴 Inactivo'}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => requestSecurityPassword('toggle', item)}
                                style={{ background: isActivo ? '#fef3c7' : '#dcfce7', color: isActivo ? '#92400e' : '#166534', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
                                title={isActivo ? 'Desactivar acceso (Requiere Clave Admin)' : 'Activar acceso (Requiere Clave Admin)'}
                              >
                                {isActivo ? '⏸️ Desactivar' : '▶️ Activar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => requestSecurityPassword('edit', item)}
                                style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
                                title="Editar datos (Requiere Clave Admin)"
                              >
                                ✏️ Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => requestSecurityPassword('delete', item)}
                                style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: '700' }}
                                title="Eliminar de Turso DB (Requiere Clave Admin)"
                              >
                                🗑️ Borrar
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '600' }}>🏫 {item.institucion}</div>
                          {item.encargado_nombre && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>👤 Encargado: {item.encargado_nombre}</div>
                          )}
                          {item.encargado_telefono && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📞 Tel: {item.encargado_telefono}</div>
                          )}
                          {item.direccion && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📍 Dir: {item.direccion}</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* PESTAÑA 2: AGREGAR O EDITAR INSTITUCIÓN */}
            {adminTab === 'create' && (
              <form onSubmit={handleAddCode} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="access-label" style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                    {editingId ? `✏️ Modificando Código (ID: ${editingId})` : '➕ Registrar Nueva Institución'}
                  </label>
                  {editingId && (
                    <button type="button" onClick={handleCancelEdit} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '700' }}>
                      ❌ Cancelar edición
                    </button>
                  )}
                </div>

                <div>
                  <label className="access-label" style={{ fontSize: '0.75rem' }}>🔑 Código de Ingreso (*):</label>
                  <input
                    type="text"
                    className="access-input"
                    style={{ fontSize: '0.88rem', padding: '8px 10px', marginTop: '2px' }}
                    placeholder="Ingrese el código de acceso"
                    value={newCodigo}
                    onChange={(e) => setNewCodigo(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="access-label" style={{ fontSize: '0.75rem' }}>🏫 Nombre de la Institución:</label>
                  <input
                    type="text"
                    className="access-input"
                    style={{ fontSize: '0.88rem', padding: '8px 10px', marginTop: '2px' }}
                    placeholder="Nombre completo de la institución"
                    value={newInstitucion}
                    onChange={(e) => setNewInstitucion(e.target.value)}
                  />
                </div>

                <div>
                  <label className="access-label" style={{ fontSize: '0.75rem' }}>👤 Encargado de Inventario:</label>
                  <input
                    type="text"
                    className="access-input"
                    style={{ fontSize: '0.88rem', padding: '8px 10px', marginTop: '2px' }}
                    placeholder="Nombre y Apellidos del Encargado"
                    value={newEncargadoNombre}
                    onChange={(e) => setNewEncargadoNombre(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="access-label" style={{ fontSize: '0.75rem' }}>📞 Teléfono:</label>
                    <input
                      type="text"
                      className="access-input"
                      style={{ fontSize: '0.88rem', padding: '8px 10px', marginTop: '2px' }}
                      placeholder="Teléfono Encargado"
                      value={newEncargadoTelefono}
                      onChange={(e) => setNewEncargadoTelefono(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="access-label" style={{ fontSize: '0.75rem' }}>📍 Dirección:</label>
                    <input
                      type="text"
                      className="access-input"
                      style={{ fontSize: '0.88rem', padding: '8px 10px', marginTop: '2px' }}
                      placeholder="Dirección Sede"
                      value={newDireccion}
                      onChange={(e) => setNewDireccion(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="access-btn-submit"
                  style={{ fontSize: '0.88rem', padding: '10px', borderRadius: '10px', background: editingId ? '#2563eb' : '#0d9488', marginTop: '4px' }}
                  disabled={adminLoading}
                >
                  {adminLoading ? 'Guardando...' : editingId ? '💾 Actualizar Información' : '+ Guardar Nueva Institución'}
                </button>
              </form>
            )}

            <button
              type="button"
              className="access-btn-admin"
              onClick={handleCloseAdmin}
              style={{ marginTop: '16px', background: '#f1f5f9', color: '#334155' }}
            >
              ← Cerrar Sesión Admin
            </button>
          </div>
        )}

        <div className="access-footer-note">
          🔒 Acceso restringido al personal autorizado del área de patrimonio
        </div>
      </div>
    </div>
  );
}



