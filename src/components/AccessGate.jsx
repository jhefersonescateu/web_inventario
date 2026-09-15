import React, { useState } from 'react';

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

    const cleanInput = accessCode.trim().toUpperCase();
    const cleanDni = dni.trim();

    // Validate code: QUIÑONES or QUINONES
    if (cleanInput === 'QUIÑONES' || cleanInput === 'QUINONES') {
      if (!cleanDni) {
        setErrorMsg('⚠️ Ingrese su número de DNI para identificar quién está ingresando.');
        return;
      }
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        // Save session in sessionStorage
        sessionStorage.setItem('stockpile_auth', 'true');
        sessionStorage.setItem('stockpile_dni', cleanDni);
        onAuthenticated({ code: cleanInput, dni: cleanDni });
      }, 400);
    } else {
      setIsLoading(true);
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
          <div className="access-field-group">
            <label htmlFor="access-code-input" className="access-label">
              🔑 Código de Inventariado Requerido
            </label>

            <div className="access-input-wrapper">
              <input
                id="access-code-input"
                type="text"
                className={`access-input ${errorMsg && !accessCode ? 'access-input-error' : ''}`}
                placeholder="Ingrese código (ej: QUIÑONES)"
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
            💡 <strong>Instrucciones:</strong> Ingrese el código <code>QUIÑONES</code> y su número de DNI para registrar e identificar las lecturas de su dispositivo.
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

