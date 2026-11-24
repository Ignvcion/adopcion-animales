import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pedir } from '../api/cliente.js';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// CU04 — Recuperar contraseña, en dos pasos:
//  1. La persona escribe su correo y se le envía un código de 6 dígitos.
//  2. Escribe el código y su nueva contraseña.
export default function RecuperarContrasena() {
  const navegar = useNavigate();

  const [paso, setPaso] = useState(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [aviso, setAviso] = useState('');
  const [codigoDesarrollo, setCodigoDesarrollo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Paso 1: pedir el código
  async function pedirCodigo(evento) {
    evento.preventDefault();
    setError('');
    if (!EMAIL_VALIDO.test(email.trim())) {
      setError('Ingresa un correo válido');
      return;
    }
    setEnviando(true);
    try {
      const respuesta = await pedir('/auth/recuperar', {
        metodo: 'POST',
        cuerpo: { email: email.trim() },
      });
      setAviso(respuesta.mensaje);
      setCodigoDesarrollo(respuesta.codigoDesarrollo || '');
      setPaso(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  // Paso 2: ingresar el código y la nueva contraseña
  async function restablecer(evento) {
    evento.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(codigo.trim())) {
      setError('El código debe tener 6 dígitos');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setEnviando(true);
    try {
      await pedir('/auth/restablecer', {
        metodo: 'POST',
        cuerpo: { email: email.trim(), codigo: codigo.trim(), password },
      });
      navegar('/login', { replace: true, state: { aviso: 'Contraseña actualizada. Ya puedes iniciar sesión.' } });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <section className="tarjeta formulario">
      <h1>Recuperar contraseña</h1>

      {error && <p className="alerta-error" role="alert">{error}</p>}

      {paso === 1 ? (
        <form onSubmit={pedirCodigo} noValidate>
          <p className="subtitulo">Escribe tu correo y te enviaremos un código para crear una contraseña nueva.</p>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.cl"
          />
          <button type="submit" className="boton ancho" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form onSubmit={restablecer} noValidate>
          <p className="alerta-info">{aviso}</p>
          {codigoDesarrollo && (
            <p className="alerta-info">
              Modo desarrollo: tu código es <strong>{codigoDesarrollo}</strong>
            </p>
          )}

          <label htmlFor="codigo">Código de 6 dígitos</label>
          <input
            id="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          />

          <label htmlFor="password">Nueva contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label htmlFor="confirmar">Repite la nueva contraseña</label>
          <input
            id="confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />

          <button type="submit" className="boton ancho" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
          <button type="button" className="boton-texto centrado" onClick={() => { setPaso(1); setCodigo(''); setError(''); }}>
            Pedir otro código
          </button>
        </form>
      )}

      <p className="nota">
        <Link to="/login">Volver a iniciar sesión</Link>
      </p>
    </section>
  );
}
