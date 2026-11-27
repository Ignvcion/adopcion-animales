import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import ModalAgendarVisita from '../components/ModalAgendarVisita.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// CU25 — Revisar solicitudes recibidas
// CU26 — Aprobar o rechazar solicitud

const FILTROS = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'en_revision', etiqueta: 'En revisión' },
  { valor: 'aprobada', etiqueta: 'Aprobadas' },
  { valor: 'rechazada', etiqueta: 'Rechazadas' },
];

const ESTADO_INFO = {
  pendiente:   { texto: 'Pendiente',   clase: 'estado-badge--pendiente' },
  en_revision: { texto: 'En revisión', clase: 'estado-badge--en_revision' },
  aprobada:    { texto: 'Aprobada',    clase: 'estado-badge--aprobada' },
  rechazada:   { texto: 'Rechazada',   clase: 'estado-badge--rechazada' },
  cancelada:   { texto: 'Cancelada',   clase: 'estado-badge--cancelada' },
  completada:  { texto: 'Completada',  clase: 'estado-badge--completada' },
};

function formatearFecha(fechaIso) {
  if (!fechaIso) return '—';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Diálogo de confirmación para Aprobar ────────────────────────────────────
function DialogoAprobar({ solicitud, onConfirmar, onCancelar, cargando }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialogo-aprobar-titulo"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(43,36,32,0.45)',
        padding: '1rem',
      }}
    >
      <div
        className="tarjeta"
        style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}
      >
        <h2 id="dialogo-aprobar-titulo" style={{ marginTop: 0, color: 'var(--color-exito)' }}>
          ¿Aprobar esta solicitud?
        </h2>
        <p style={{ color: 'var(--color-suave)', marginBottom: '1.5rem' }}>
          Aprobarás la postulación de{' '}
          <strong>{solicitud.adoptante_nombre}</strong> para adoptar a{' '}
          <strong>{solicitud.animal_nombre}</strong>.<br />
          Las demás solicitudes pendientes del mismo animal se rechazarán automáticamente.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="boton"
            style={{ background: 'var(--color-exito)' }}
            onClick={onConfirmar}
            disabled={cargando}
          >
            {cargando ? 'Aprobando…' : 'Sí, aprobar'}
          </button>
          <button
            type="button"
            className="boton"
            style={{ background: 'var(--color-suave)' }}
            onClick={onCancelar}
            disabled={cargando}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Diálogo de confirmación para Rechazar ───────────────────────────────────
function DialogoRechazar({ solicitud, onConfirmar, onCancelar, cargando }) {
  const [comentario, setComentario] = useState('');
  const [errorComentario, setErrorComentario] = useState('');

  function manejarEnvio(e) {
    e.preventDefault();
    if (!comentario.trim()) {
      setErrorComentario('Debes indicar el motivo del rechazo');
      return;
    }
    onConfirmar(comentario.trim());
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialogo-rechazar-titulo"
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(43,36,32,0.45)',
        padding: '1rem',
      }}
    >
      <div className="tarjeta" style={{ maxWidth: 460, width: '100%' }}>
        <h2 id="dialogo-rechazar-titulo" style={{ marginTop: 0, color: 'var(--color-error)' }}>
          Rechazar solicitud
        </h2>
        <p style={{ color: 'var(--color-suave)' }}>
          Estás rechazando la postulación de <strong>{solicitud.adoptante_nombre}</strong> para{' '}
          <strong>{solicitud.animal_nombre}</strong>.
        </p>
        <form onSubmit={manejarEnvio} noValidate>
          <label htmlFor="comentario-rechazo" style={{ fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
            Motivo del rechazo <span style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <textarea
            id="comentario-rechazo"
            rows={4}
            style={{
              width: '100%',
              padding: '0.7rem 0.8rem',
              border: `1px solid ${errorComentario ? 'var(--color-error)' : 'var(--color-borde)'}`,
              borderRadius: '10px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            value={comentario}
            onChange={(e) => { setComentario(e.target.value); setErrorComentario(''); }}
            aria-invalid={Boolean(errorComentario)}
            aria-describedby={errorComentario ? 'error-comentario' : undefined}
            placeholder="Explica brevemente por qué no es posible aprobar esta solicitud…"
            disabled={cargando}
          />
          {errorComentario && (
            <span id="error-comentario" className="error-campo">{errorComentario}</span>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="boton"
              style={{ background: 'var(--color-error)' }}
              disabled={cargando}
            >
              {cargando ? 'Rechazando…' : 'Confirmar rechazo'}
            </button>
            <button
              type="button"
              className="boton"
              style={{ background: 'var(--color-suave)' }}
              onClick={onCancelar}
              disabled={cargando}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tarjeta de solicitud individual ─────────────────────────────────────────
function TarjetaSolicitud({ solicitud, onResuelta, onAgendarVisita }) {
  const { token } = useAuth();
  const [dialogo, setDialogo] = useState(null); // null | 'aprobar' | 'rechazar'
  const [cargandoAccion, setCargandoAccion] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  const esPendiente = solicitud.estado === 'pendiente' || solicitud.estado === 'en_revision';
  const puedeAgendarVisita = solicitud.estado === 'aprobada' || solicitud.estado === 'en_revision';
  const infoEstado = ESTADO_INFO[solicitud.estado] || { texto: solicitud.estado, clase: 'estado-badge--cancelada' };

  async function ejecutarAccion(accion, comentario) {
    setCargandoAccion(true);
    setErrorAccion('');
    try {
      await pedir(`/solicitudes/${solicitud.solicitud_id}/resolver`, {
        metodo: 'PATCH',
        token,
        cuerpo: {
          accion,
          comentario_fundacion: comentario || undefined,
        },
      });
      setDialogo(null);
      onResuelta(); // recarga la lista
    } catch (err) {
      setErrorAccion(err.message);
      setCargandoAccion(false);
    }
  }

  return (
    <>
      {dialogo === 'aprobar' && (
        <DialogoAprobar
          solicitud={solicitud}
          cargando={cargandoAccion}
          onConfirmar={() => ejecutarAccion('aprobar')}
          onCancelar={() => { setDialogo(null); setErrorAccion(''); }}
        />
      )}
      {dialogo === 'rechazar' && (
        <DialogoRechazar
          solicitud={solicitud}
          cargando={cargandoAccion}
          onConfirmar={(comentario) => ejecutarAccion('rechazar', comentario)}
          onCancelar={() => { setDialogo(null); setErrorAccion(''); }}
        />
      )}

      <article className="tarjeta solicitud-item">
        <img
          src={solicitud.animal_foto_url || '/huella.svg'}
          alt={`Foto de ${solicitud.animal_nombre}`}
          className="solicitud-item__foto"
        />

        <div className="solicitud-item__contenido">
          {/* Cabecera: animal + estado */}
          <div className="solicitud-item__cabecera">
            <div>
              <h2 className="solicitud-item__titulo">{solicitud.animal_nombre}</h2>
              <p className="solicitud-item__meta" style={{ textTransform: 'capitalize' }}>
                {solicitud.animal_especie} · {solicitud.animal_estado}
              </p>
            </div>
            <div className="solicitud-item__estado-bloque">
              <span className={`estado-badge ${infoEstado.clase}`}>{infoEstado.texto}</span>
              {solicitud.codigo && (
                <span className="solicitud-item__codigo">
                  Código: <strong>{solicitud.codigo}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Datos del adoptante */}
          <dl className="solicitud-item__detalles">
            <div>
              <dt>Postulante</dt>
              <dd>{solicitud.adoptante_nombre}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{solicitud.adoptante_email}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{solicitud.adoptante_telefono || solicitud.telefono}</dd>
            </div>
            {solicitud.adoptante_comuna && (
              <div>
                <dt>Comuna</dt>
                <dd>{solicitud.adoptante_comuna}</dd>
              </div>
            )}
            <div>
              <dt>Enviada el</dt>
              <dd>{formatearFecha(solicitud.creado_en)}</dd>
            </div>
            <div>
              <dt>Vivienda</dt>
              <dd>{solicitud.tipo_vivienda}</dd>
            </div>
            <div>
              <dt>Otros animales</dt>
              <dd>{solicitud.otros_animales ? 'Sí' : 'No'}</dd>
            </div>
          </dl>

          {/* Formulario de solicitud */}
          <details style={{ marginTop: '0.9rem' }}>
            <summary
              style={{
                cursor: 'pointer',
                color: 'var(--color-primario)',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              Ver formulario completo
            </summary>
            <dl className="solicitud-item__detalles" style={{ marginTop: '0.75rem' }}>
              <div style={{ flex: '1 1 100%' }}>
                <dt>Experiencia con animales</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{solicitud.experiencia}</dd>
              </div>
              <div style={{ flex: '1 1 100%' }}>
                <dt>Motivo de adopción</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{solicitud.motivo}</dd>
              </div>
            </dl>
          </details>

          {/* Comentario de la fundación si ya fue resuelta */}
          {solicitud.comentario_fundacion && (
            <p
              className={
                solicitud.estado === 'aprobada' ? 'alerta-info' : 'alerta-error'
              }
              style={{ marginTop: '0.75rem' }}
            >
              <strong>Tu respuesta:</strong> {solicitud.comentario_fundacion}
            </p>
          )}

          {/* Error al resolver */}
          {errorAccion && (
            <p className="alerta-error" role="alert" style={{ marginTop: '0.75rem' }}>
              {errorAccion}
            </p>
          )}

          {/* Botones de acción */}
          {(esPendiente || puedeAgendarVisita) && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {esPendiente && (
                <>
                  <button
                    type="button"
                    className="boton"
                    style={{ background: 'var(--color-exito)' }}
                    onClick={() => setDialogo('aprobar')}
                    disabled={cargandoAccion}
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    type="button"
                    className="boton"
                    style={{ background: 'var(--color-error)' }}
                    onClick={() => setDialogo('rechazar')}
                    disabled={cargandoAccion}
                  >
                    ✗ Rechazar
                  </button>
                </>
              )}
              {puedeAgendarVisita && (
                <button
                  type="button"
                  className="boton"
                  onClick={() => onAgendarVisita(solicitud)}
                  disabled={cargandoAccion}
                >
                  Agendar visita
                </button>
              )}
            </div>
          )}
        </div>
      </article>
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SolicitudesFundacion() {
  const { token } = useAuth();

  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [solicitudVisita, setSolicitudVisita] = useState(null);

  const cargarSolicitudes = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = filtro !== 'todas' ? `?estado=${filtro}` : '';
      const datos = await pedir(`/solicitudes/recibidas${params}`, { token });
      setSolicitudes(datos.solicitudes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, filtro]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const conteosPorEstado = solicitudes.reduce((acc, s) => {
    acc[s.estado] = (acc[s.estado] || 0) + 1;
    return acc;
  }, {});

  return (
    <section>
      <div className="encabezado-seccion">
        <div>
          <h1>Solicitudes recibidas</h1>
          <p className="subtitulo">
            Revisa y gestiona las postulaciones de adopción para los animales de tu fundación.
          </p>
        </div>
        <div className="acciones" style={{ marginTop: 0 }}>
          <Link to="/panel/visitas" className="boton boton-secundario">
            Mis visitas
          </Link>
          <Link to="/panel" className="boton" style={{ background: 'var(--color-suave)' }}>
            ← Panel
          </Link>
        </div>
      </div>

      {aviso && (
        <p className="alerta-info" role="status" style={{ marginBottom: '1rem' }}>
          {aviso}
        </p>
      )}

      {/* Filtros por estado */}
      <div
        role="group"
        aria-label="Filtrar por estado"
        style={{
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setFiltro(f.valor)}
            aria-pressed={filtro === f.valor}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              border: `2px solid ${filtro === f.valor ? 'var(--color-primario)' : 'var(--color-borde)'}`,
              background: filtro === f.valor ? 'var(--color-primario)' : 'var(--color-tarjeta)',
              color: filtro === f.valor ? '#fff' : 'var(--color-texto)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.88rem',
            }}
          >
            {f.etiqueta}
            {f.valor !== 'todas' && conteosPorEstado[f.valor]
              ? ` (${conteosPorEstado[f.valor]})`
              : ''}
          </button>
        ))}
      </div>

      {/* Estado de carga */}
      {cargando && <p className="cargando">Cargando solicitudes…</p>}

      {/* Error */}
      {!cargando && error && (
        <div className="alerta-error" role="alert">
          <p style={{ margin: '0 0 0.5rem' }}>{error}</p>
          <button type="button" className="boton-texto" onClick={cargarSolicitudes}>
            Reintentar
          </button>
        </div>
      )}

      {/* Sin solicitudes */}
      {!cargando && !error && solicitudes.length === 0 && (
        <div className="tarjeta centrada">
          <h2 style={{ marginTop: 0 }}>
            {filtro === 'todas'
              ? 'Aún no has recibido solicitudes'
              : `Sin solicitudes ${FILTROS.find((f) => f.valor === filtro)?.etiqueta.toLowerCase()}`}
          </h2>
          <p className="subtitulo">
            {filtro === 'todas'
              ? 'Cuando alguien postule a uno de tus animales, aparecerá aquí.'
              : 'Prueba cambiando el filtro para ver otras solicitudes.'}
          </p>
        </div>
      )}

      {/* Lista de solicitudes */}
      {!cargando && !error && solicitudes.length > 0 && (
        <div className="solicitudes-lista">
          {solicitudes.map((solicitud) => (
            <TarjetaSolicitud
              key={solicitud.solicitud_id}
              solicitud={solicitud}
              onResuelta={cargarSolicitudes}
              onAgendarVisita={(sol) => {
                setAviso('');
                setSolicitudVisita(sol);
              }}
            />
          ))}
        </div>
      )}

      {solicitudVisita && (
        <ModalAgendarVisita
          solicitud={solicitudVisita}
          onCerrar={() => setSolicitudVisita(null)}
          onAgendada={() => {
            const nombre = solicitudVisita.animal_nombre;
            setSolicitudVisita(null);
            setAviso(`Visita agendada correctamente para ${nombre}. Puedes verla en "Mis visitas".`);
          }}
        />
      )}
    </section>
  );
}
