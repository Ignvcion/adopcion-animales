import { useEffect, useState } from 'react';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

const TELEFONO_VALIDO = /^\+?[0-9 ]{8,15}$/;

const NOMBRE_ROL = { adoptante: 'Adoptante', fundacion: 'Fundación', admin: 'Administrador' };
const ESTADO_FUNDACION = { pendiente: 'Pendiente de aprobación', aprobada: 'Aprobada', rechazada: 'Rechazada' };

// CU05 — Ver y editar mi perfil
export default function Perfil() {
  const { token, actualizarUsuario } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [datos, setDatos] = useState({ nombre: '', telefono: '', comuna: '' });
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Al abrir la página se piden los datos actuales al backend
  useEffect(() => {
    pedir('/perfil', { token })
      .then(({ perfil: p }) => {
        setPerfil(p);
        setDatos({ nombre: p.nombre, telefono: p.telefono || '', comuna: p.comuna || '' });
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [token]);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((anterior) => ({ ...anterior, [name]: value }));
  }

  function cancelar() {
    setDatos({ nombre: perfil.nombre, telefono: perfil.telefono || '', comuna: perfil.comuna || '' });
    setEditando(false);
    setError('');
  }

  async function guardar(evento) {
    evento.preventDefault();
    setError('');
    setAviso('');

    // E1 y E2 se validan primero en la vista
    if (datos.nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (datos.telefono.trim() && !TELEFONO_VALIDO.test(datos.telefono.trim())) {
      setError('El teléfono no tiene un formato válido (ej: +56 9 1234 5678)');
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await pedir('/perfil', {
        metodo: 'PUT',
        token,
        cuerpo: { nombre: datos.nombre.trim(), telefono: datos.telefono.trim(), comuna: datos.comuna.trim() },
      });
      setPerfil(respuesta.perfil);
      actualizarUsuario({ nombre: respuesta.perfil.nombre }); // la barra superior muestra el nombre nuevo
      setEditando(false);
      setAviso('Tus datos se guardaron correctamente.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="cargando">Cargando tu perfil…</p>;
  if (!perfil) return <p className="alerta-error">{error || 'No se pudo cargar tu perfil.'}</p>;

  return (
    <section className="tarjeta formulario">
      <h1>Mi perfil</h1>
      <p className="subtitulo">{NOMBRE_ROL[perfil.rol] ?? perfil.rol}</p>

      {aviso && <p className="alerta-info">{aviso}</p>}
      {error && <p className="alerta-error" role="alert">{error}</p>}

      {!editando ? (
        <>
          <dl className="datos-perfil">
            <dt>Nombre</dt><dd>{perfil.nombre}</dd>
            <dt>Correo</dt><dd>{perfil.email}</dd>
            <dt>Teléfono</dt><dd>{perfil.telefono || 'Sin registrar'}</dd>
            <dt>Comuna</dt><dd>{perfil.comuna || 'Sin registrar'}</dd>
            {perfil.fundacion && (
              <>
                <dt>Fundación</dt><dd>{perfil.fundacion.nombre}</dd>
                <dt>RUT</dt><dd>{perfil.fundacion.rut}</dd>
                <dt>Estado</dt><dd>{ESTADO_FUNDACION[perfil.fundacion.estado] ?? perfil.fundacion.estado}</dd>
              </>
            )}
          </dl>
          <button type="button" className="boton ancho" onClick={() => { setEditando(true); setAviso(''); }}>
            Editar mis datos
          </button>
        </>
      ) : (
        <form onSubmit={guardar} noValidate>
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" value={datos.nombre} onChange={cambiar} autoComplete="name" />

          <label htmlFor="email">Correo (no se puede cambiar)</label>
          <input id="email" value={perfil.email} disabled />

          <label htmlFor="telefono">Teléfono</label>
          <input id="telefono" name="telefono" type="tel" value={datos.telefono} onChange={cambiar} placeholder="+56 9 1234 5678" />

          <label htmlFor="comuna">Comuna</label>
          <input id="comuna" name="comuna" value={datos.comuna} onChange={cambiar} />

          <button type="submit" className="boton ancho" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button type="button" className="boton-texto centrado" onClick={cancelar}>Cancelar</button>
        </form>
      )}
    </section>
  );
}
