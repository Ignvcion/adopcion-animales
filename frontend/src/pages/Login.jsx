import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// CU02 — Iniciar sesión
export default function Login() {
  const { usuario, iniciarSesion } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const destino = ubicacion.state?.desde || '/panel';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Si ya hay sesión, no tiene sentido mostrar el formulario
  if (usuario) {
    return <Navigate to={destino} replace />;
  }

  async function alEnviar(evento) {
    evento.preventDefault();
    setError('');

    // E1: se valida en la vista antes de llamar a la API
    if (!email.trim() || !password) {
      setError('Debe ingresar su correo y su contraseña');
      return;
    }
    if (!EMAIL_VALIDO.test(email.trim())) {
      setError('El correo no tiene un formato válido');
      return;
    }

    setEnviando(true);
    try {
      await iniciarSesion(email.trim(), password);
      navegar(destino, { replace: true });
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <section className="tarjeta formulario">
      <h1>Iniciar sesión</h1>
      <p className="subtitulo">Entra para guardar favoritos y enviar solicitudes de adopción.</p>

      {ubicacion.state?.aviso && !error && <p className="alerta-info">{ubicacion.state.aviso}</p>}
      {error && <p className="alerta-error" role="alert">{error}</p>}

      <form onSubmit={alEnviar} noValidate>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.cl"
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" className="boton ancho" disabled={enviando}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>

      <p className="nota">
        <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
      </p>
      <p className="nota">
        ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
      </p>
    </section>
  );
}
