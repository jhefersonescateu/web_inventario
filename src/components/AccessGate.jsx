import React, { useState } from 'react';

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
        setErrorMsg(data.message || '❌ Código incorrecto. Acceso denegado.');
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
                placeholder="Código del Colegio (ej: QUIÑONES, SANMARTIN)"
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
                placeholder="Ingrese su N° de DNI (ej: 74839201)"
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 10))}
                autoComplete="off"
              />
            </div>
          </div>

          {errorMsg && <div className="access-error-box" style={{ marginTop: '12px' }}>{errorMsg}</div>}

          <div className="access-hint" style={{ marginTop: '12px' }}>
            💡 <strong>Instrucciones Multi-Colegio:</strong> Ingrese el código de su colegio (ej: <code>QUIÑONES</code>, <code>SANMARTIN</code>) y su DNI. Se cargará o creará automáticamente la base de datos de dicho colegio.
          </div>

          <button 
            type="submit" 
            className="access-btn-submit"
            disabled={isLoading}
            style={{ marginTop: '8px' }}
          >
            {isLoading ? 'Verificando...' : 'Ingresar al Inventario →'}
          </button>
        </form>

        <div className="access-footer-note">
          🔒 Acceso restringido al personal autorizado del área de patrimonio
        </div>
      </div>
    </div>
  );
}

