import { useState } from 'react';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

const VACIO = { actual: '', nueva: '', confirmar: '' };

// CU10 — Cambiar contraseña (se muestra dentro de "Mi perfil")
export default function CambiarContrasena() {
  const { token } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(VACIO);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((anterior) => ({ ...anterior, [name]: value }));
  }

  function cerrar() {
    setAbierto(false);
    setDatos(VACIO);
    setError('');
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError('');
    setAviso('');

    // Validaciones en la vista (el backend repite las mismas)
    if (!datos.actual || !datos.nueva) {
      setError('Completa tu contraseña actual y la nueva');
      return;
    }
    if (datos.nueva.length < 8) {
      setError('La contraseña nueva debe tener al menos 8 caracteres');
      return;
    }
    if (datos.nueva !== datos.confirmar) {
      setError('La contraseña nueva y su confirmación no coinciden');
      return;
    }
    if (datos.nueva === datos.actual) {
      setError('La contraseña nueva debe ser distinta de la actual');
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await pedir('/perfil/contrasena', {
        metodo: 'PUT',
        token,
        cuerpo: { actual: datos.actual, nueva: datos.nueva },
      });
      setAviso(respuesta.mensaje);
      setAbierto(false);
      setDatos(VACIO);
    } catch (err) {
      // E3: contraseña actual incorrecta, u otro error
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="bloque-contrasena">
      <h2>Contraseña</h2>
      {aviso && <p className="alerta-info">{aviso}</p>}

      {!abierto ? (
        <button type="button" className="boton boton-secundario ancho" onClick={() => { setAbierto(true); setAviso(''); }}>
          Cambiar contraseña
        </button>
      ) : (
        <form onSubmit={guardar} noValidate>
          {error && <p className="alerta-error" role="alert">{error}</p>}

          <label htmlFor="actual">Contraseña actual</label>
          <input id="actual" name="actual" type="password" autoComplete="current-password"
            value={datos.actual} onChange={cambiar} />

          <label htmlFor="nueva">Contraseña nueva</label>
          <input id="nueva" name="nueva" type="password" autoComplete="new-password"
            value={datos.nueva} onChange={cambiar} />

          <label htmlFor="confirmar">Repite la contraseña nueva</label>
          <input id="confirmar" name="confirmar" type="password" autoComplete="new-password"
            value={datos.confirmar} onChange={cambiar} />

          <button type="submit" className="boton ancho" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar contraseña'}
          </button>
          <button type="button" className="boton-texto centrado" onClick={cerrar}>Cancelar</button>
        </form>
      )}
    </div>
  );
}
