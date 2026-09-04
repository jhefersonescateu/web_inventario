import React, { useState } from 'react';

export default function AccessGate({ onAuthenticated }) {
  const [accessCode, setAccessCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!accessCode.trim()) {
      setErrorMsg('Por favor ingrese el código de inventariado.');
      return;
    }

    setIsLoading(true);

    const cleanInput = accessCode.trim().toUpperCase();

    // Validate code: QUIÑONES or QUINONES
    if (cleanInput === 'QUIÑONES' || cleanInput === 'QUINONES') {
      setTimeout(() => {
        setIsLoading(false);
        // Save session in sessionStorage
        sessionStorage.setItem('stockpile_auth', 'true');
        onAuthenticated(cleanInput);
      }, 500);
    } else {
      setTimeout(() => {
        setIsLoading(false);
        setErrorMsg('❌ Código incorrecto. Debe ingresar: QUIÑONES');
      }, 400);
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
          <label htmlFor="access-code-input" className="access-label">
            🔑 Código de Inventariado Requerido
          </label>

          <div className="access-input-wrapper">
            <input
              id="access-code-input"
              type="text"
              className={`access-input ${errorMsg ? 'access-input-error' : ''}`}
              placeholder="Ingrese código (ej: QUIÑONES)"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              autoFocus
              autoComplete="off"
            />
          </div>

          {errorMsg && <div className="access-error-box">{errorMsg}</div>}

          <div className="access-hint">
            💡 <strong>Sugerencia:</strong> Ingrese <code>QUIÑONES</code> para ingresar al sistema de escaneo e inventario.
          </div>

          <button 
            type="submit" 
            className="access-btn-submit"
            disabled={isLoading}
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
