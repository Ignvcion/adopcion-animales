import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

const ETIQUETA_TIPO = {
  solicitud: 'Solicitud',
  visita: 'Visita',
  adopcion: 'Adopción',
  reporte: 'Reporte',
  sistema: 'Sistema',
};

function formatearFechaHora(fechaIso) {
  if (!fechaIso) return '—';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// CU28 — Bandeja de notificaciones del usuario autenticado
export default function Notificaciones() {
  const { usuario, token } = useAuth();

  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [soloNoLeidas, setSoloNoLeidas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const cargarNotificaciones = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await pedir('/notificaciones', { token });
      setNotificaciones(datos.notificaciones || []);
      setNoLeidas(datos.no_leidas || 0);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar tus notificaciones.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  async function marcarLeida(notificacionId) {
    setProcesando(true);
    setError('');
    try {
      const resp = await pedir(`/notificaciones/${notificacionId}/leer`, {
        metodo: 'PATCH',
        token,
      });
      setNotificaciones((prev) =>
        prev.map((n) =>
          n.notificacion_id === notificacionId
            ? { ...n, leida: true, leida_en: new Date().toISOString() }
            : n
        )
      );
      setNoLeidas(resp.no_leidas ?? 0);
      window.dispatchEvent(new Event('notificaciones:actualizar'));
    } catch (err) {
      setError(err.message || 'No se pudo marcar la notificación como leída.');
    } finally {
      setProcesando(false);
    }
  }

  async function marcarTodas() {
    setProcesando(true);
    setError('');
    try {
      await pedir('/notificaciones/leer-todas', {
        metodo: 'PATCH',
        token,
      });
      setNotificaciones((prev) =>
        prev.map((n) => ({ ...n, leida: true, leida_en: n.leida_en || new Date().toISOString() }))
      );
      setNoLeidas(0);
      window.dispatchEvent(new Event('notificaciones:actualizar'));
    } catch (err) {
      setError(err.message || 'No se pudieron marcar todas como leídas.');
    } finally {
      setProcesando(false);
    }
  }

  function rutaRelacionada(notif) {
    if (notif.tipo === 'visita' && (usuario?.rol === 'adoptante' || usuario?.rol === 'fundacion')) {
      return { to: '/panel/visitas', texto: 'Ver visitas' };
    }
    if (notif.tipo === 'solicitud') {
      if (usuario?.rol === 'fundacion') return { to: '/panel/solicitudes', texto: 'Ver solicitudes' };
      if (usuario?.rol === 'adoptante') return { to: '/solicitudes', texto: 'Mis solicitudes' };
    }
    if (notif.animal_id) {
      return { to: `/animales/${notif.animal_id}`, texto: 'Ver animal' };
    }
    return null;
  }

  const visibles = soloNoLeidas
    ? notificaciones.filter((n) => !n.leida)
    : notificaciones;

  return (
    <section>
      <div className="encabezado-seccion">
        <div>
          <h1>Notificaciones</h1>
          <p className="subtitulo">
            {noLeidas > 0
              ? `Tienes ${noLeidas} ${noLeidas === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}.`
              : 'Estás al día con todas tus notificaciones.'}
          </p>
        </div>

        <div className="acciones" style={{ marginTop: 0 }}>
          {noLeidas > 0 && (
            <button
              type="button"
              className="boton"
              disabled={procesando}
              onClick={marcarTodas}
            >
              Marcar todas como leídas
            </button>
          )}
          <Link to="/panel" className="boton boton-secundario">
            ← Panel
          </Link>
        </div>
      </div>

      <div className="filtros-chips" role="group" aria-label="Filtrar notificaciones">
        <button
          type="button"
          className={`chip ${!soloNoLeidas ? 'chip-activo' : ''}`}
          onClick={() => setSoloNoLeidas(false)}
        >
          Todas ({notificaciones.length})
        </button>
        <button
          type="button"
          className={`chip ${soloNoLeidas ? 'chip-activo' : ''}`}
          onClick={() => setSoloNoLeidas(true)}
        >
          No leídas ({noLeidas})
        </button>
      </div>

      {error && (
        <p className="alerta-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {cargando ? (
        <p className="cargando">Cargando notificaciones…</p>
      ) : visibles.length === 0 ? (
        <div className="tarjeta centrada">
          <h2 style={{ marginTop: 0 }}>
            {soloNoLeidas ? 'No tienes notificaciones sin leer' : 'Aún no tienes notificaciones'}
          </h2>
          <p className="subtitulo">
            Aquí recibirás avisos sobre tus solicitudes, visitas y adopciones.
          </p>
        </div>
      ) : (
        <div className="solicitudes-lista">
          {visibles.map((notif) => {
            const enlace = rutaRelacionada(notif);
            return (
              <article
                key={notif.notificacion_id}
                className={`tarjeta notificacion-item ${!notif.leida ? 'notificacion-item--no-leida' : ''}`}
              >
                <div className="notificacion-item__cabecera">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="estado-badge estado-badge--en_revision">
                      {ETIQUETA_TIPO[notif.tipo] || notif.tipo}
                    </span>
                    {!notif.leida && (
                      <span className="estado-badge estado-badge--pendiente">Nueva</span>
                    )}
                    {notif.solicitud_codigo && (
                      <span className="solicitud-item__codigo">{notif.solicitud_codigo}</span>
                    )}
                  </div>
                  <time className="solicitud-item__codigo" dateTime={notif.creado_en}>
                    {formatearFechaHora(notif.creado_en)}
                  </time>
                </div>

                <h2 className="notificacion-item__titulo">{notif.titulo}</h2>
                <p className="notificacion-item__mensaje">{notif.mensaje}</p>

                <div className="acciones" style={{ marginTop: '0.9rem' }}>
                  {!notif.leida && (
                    <button
                      type="button"
                      className="boton boton-chico-tabla"
                      disabled={procesando}
                      onClick={() => marcarLeida(notif.notificacion_id)}
                    >
                      Marcar como leída
                    </button>
                  )}
                  {enlace && (
                    <Link to={enlace.to} className="boton boton-secundario boton-chico-tabla">
                      {enlace.texto}
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
