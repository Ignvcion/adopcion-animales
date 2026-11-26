import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatearRut, rutValido } from '../utils/rut.js';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_VALIDO = /^\+?[0-9 ]{8,15}$/;
const URL_VALIDA = /^https?:\/\/[^\s]+\.[^\s]+$/i;

const VACIO = {
  nombre: '', email: '', telefono: '', password: '', confirmar: '',
  fNombre: '', fRut: '', fComuna: '', fTelefono: '', fSitioWeb: '', fDescripcion: '',
};

// CU06 — Solicitar cuenta de fundación
export default function RegistroFundacion() {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);

  if (usuario) return <Navigate to="/panel" replace />;

  function cambiar(evento) {
    const { name } = evento.target;
    const value = name === 'fRut' ? formatearRut(evento.target.value) : evento.target.value;
    setDatos((anterior) => ({ ...anterior, [name]: value }));
    if (errores[name]) setErrores((anterior) => ({ ...anterior, [name]: '' }));
  }

  // E1 y E2: validación en la vista antes de llamar a la API
  function validar() {
    const e = {};
    if (datos.nombre.trim().length < 2) e.nombre = 'Ingresa tu nombre';
    if (!EMAIL_VALIDO.test(datos.email.trim())) e.email = 'Ingresa un correo válido';
    if (datos.telefono.trim() && !TELEFONO_VALIDO.test(datos.telefono.trim())) e.telefono = 'Formato inválido';
    if (datos.password.length < 8) e.password = 'Debe tener al menos 8 caracteres';
    if (datos.confirmar !== datos.password) e.confirmar = 'Las contraseñas no coinciden';
    if (!datos.fNombre.trim()) e.fNombre = 'Ingresa el nombre de la fundación';
    if (!rutValido(datos.fRut)) e.fRut = 'RUT inválido, revisa el dígito verificador';
    if (!datos.fComuna.trim()) e.fComuna = 'Ingresa la comuna';
    if (datos.fTelefono.trim() && !TELEFONO_VALIDO.test(datos.fTelefono.trim())) e.fTelefono = 'Formato inválido';
    if (datos.fSitioWeb.trim() && !URL_VALIDA.test(datos.fSitioWeb.trim())) e.fSitioWeb = 'Debe empezar con http:// o https://';
    return e;
  }

  async function alEnviar(evento) {
    evento.preventDefault();
    setErrorGeneral('');
    const nuevos = validar();
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      await pedir('/auth/registro-fundacion', {
        metodo: 'POST',
        cuerpo: {
          nombre: datos.nombre.trim(),
          email: datos.email.trim(),
          telefono: datos.telefono.trim(),
          password: datos.password,
          fundacion: {
            nombre: datos.fNombre.trim(),
            rut: datos.fRut,
            comuna: datos.fComuna.trim(),
            telefono: datos.fTelefono.trim(),
            sitio_web: datos.fSitioWeb.trim(),
            descripcion: datos.fDescripcion.trim(),
          },
        },
      });
      setEnviada(true);
    } catch (error) {
      // E3: correo o RUT ya registrados, u otro error del servidor
      setErrorGeneral(error.message);
    } finally {
      setEnviando(false);
    }
  }

  if (enviada) {
    return (
      <section className="tarjeta centrada">
        <h1>Solicitud enviada</h1>
        <p>
          Recibimos los datos de <strong>{datos.fNombre.trim()}</strong>. Un administrador
          revisará la solicitud y podrás iniciar sesión cuando sea aprobada.
        </p>
        <Link to="/" className="boton">Volver al inicio</Link>
      </section>
    );
  }

  const campo = (nombre, etiqueta, props = {}) => (
    <>
      <label htmlFor={nombre}>{etiqueta}</label>
      <input id={nombre} name={nombre} value={datos[nombre]} onChange={cambiar}
        aria-invalid={Boolean(errores[nombre])} {...props} />
      {errores[nombre] && <span className="error-campo">{errores[nombre]}</span>}
    </>
  );

  return (
    <section className="tarjeta formulario formulario-ancho">
      <h1>Registrar una fundación</h1>
      <p className="subtitulo">
        Publica animales en adopción y recibe solicitudes. La cuenta queda activa cuando un
        administrador la aprueba.
      </p>

      {errorGeneral && <p className="alerta-error" role="alert">{errorGeneral}</p>}

      <form onSubmit={alEnviar} noValidate>
        <fieldset>
          <legend>Persona responsable</legend>
          {campo('nombre', 'Nombre completo *', { autoComplete: 'name' })}
          {campo('email', 'Correo electrónico *', { type: 'email', autoComplete: 'email' })}
          {campo('telefono', 'Teléfono', { type: 'tel', placeholder: '+56 9 1234 5678' })}
          {campo('password', 'Contraseña *', { type: 'password', autoComplete: 'new-password' })}
          {campo('confirmar', 'Repite la contraseña *', { type: 'password', autoComplete: 'new-password' })}
        </fieldset>

        <fieldset>
          <legend>Datos de la fundación</legend>
          {campo('fNombre', 'Nombre de la fundación *')}
          {campo('fRut', 'RUT de la fundación *', { placeholder: '65.123.456-5', inputMode: 'text' })}
          {campo('fComuna', 'Comuna *')}
          {campo('fTelefono', 'Teléfono de contacto', { type: 'tel' })}
          {campo('fSitioWeb', 'Sitio web o red social', { type: 'url', placeholder: 'https://' })}
          <label htmlFor="fDescripcion">Descripción</label>
          <textarea id="fDescripcion" name="fDescripcion" rows={4} value={datos.fDescripcion}
            onChange={cambiar} placeholder="¿Qué animales rescatan? ¿Desde cuándo?" />
        </fieldset>

        <button type="submit" className="boton ancho" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </form>

      <p className="nota">¿Eres adoptante? <Link to="/registro">Crea una cuenta de adoptante</Link></p>
    </section>
  );
}
