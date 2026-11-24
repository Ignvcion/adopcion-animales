import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_VALIDO = /^\+?[0-9 ]{8,15}$/;

const VACIO = { nombre: '', email: '', telefono: '', comuna: '', password: '', confirmar: '' };

// CU01 — Registrarse como adoptante
export default function Registro() {
  const { usuario, registrarse } = useAuth();
  const navegar = useNavigate();

  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) {
    return <Navigate to="/panel" replace />;
  }

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((anterior) => ({ ...anterior, [name]: value }));
    if (errores[name]) setErrores((anterior) => ({ ...anterior, [name]: '' }));
  }

  // E1 y E2: se validan en la vista antes de llamar a la API
  function validar() {
    const nuevos = {};
    if (datos.nombre.trim().length < 2) nuevos.nombre = 'Ingresa tu nombre';
    if (!EMAIL_VALIDO.test(datos.email.trim())) nuevos.email = 'Ingresa un correo válido';
    if (datos.telefono.trim() && !TELEFONO_VALIDO.test(datos.telefono.trim())) {
      nuevos.telefono = 'Formato inválido (ej: +56 9 1234 5678)';
    }
    if (datos.password.length < 8) nuevos.password = 'Debe tener al menos 8 caracteres';
    if (datos.confirmar !== datos.password) nuevos.confirmar = 'Las contraseñas no coinciden';
    return nuevos;
  }

  async function alEnviar(evento) {
    evento.preventDefault();
    setErrorGeneral('');
    const nuevos = validar();
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      await registrarse({
        nombre: datos.nombre.trim(),
        email: datos.email.trim(),
        telefono: datos.telefono.trim(),
        comuna: datos.comuna.trim(),
        password: datos.password,
      });
      navegar('/panel', { replace: true });
    } catch (error) {
      // E3 (correo ya registrado) y cualquier error del servidor
      setErrorGeneral(error.message);
      setEnviando(false);
    }
  }

  const campo = (nombre, etiqueta, props = {}) => (
    <>
      <label htmlFor={nombre}>{etiqueta}</label>
      <input
        id={nombre}
        name={nombre}
        value={datos[nombre]}
        onChange={cambiar}
        aria-invalid={Boolean(errores[nombre])}
        {...props}
      />
      {errores[nombre] && <span className="error-campo">{errores[nombre]}</span>}
    </>
  );

  return (
    <section className="tarjeta formulario">
      <h1>Crear cuenta</h1>
      <p className="subtitulo">Regístrate para guardar favoritos y postular a adopciones.</p>

      {errorGeneral && <p className="alerta-error" role="alert">{errorGeneral}</p>}

      <form onSubmit={alEnviar} noValidate>
        {campo('nombre', 'Nombre completo *', { autoComplete: 'name' })}
        {campo('email', 'Correo electrónico *', { type: 'email', autoComplete: 'email', placeholder: 'tucorreo@ejemplo.cl' })}
        {campo('telefono', 'Teléfono', { type: 'tel', autoComplete: 'tel', placeholder: '+56 9 1234 5678' })}
        {campo('comuna', 'Comuna', { autoComplete: 'address-level2' })}
        {campo('password', 'Contraseña *', { type: 'password', autoComplete: 'new-password' })}
        {campo('confirmar', 'Repite la contraseña *', { type: 'password', autoComplete: 'new-password' })}

        <button type="submit" className="boton ancho" disabled={enviando}>
          {enviando ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>

      <p className="nota">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </section>
  );
}
