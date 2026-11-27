import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import ModalAgendarVisita from '../components/ModalAgendarVisita.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ESTADO_INFO = {
  pendiente: { texto: 'Pendiente de revisión', clase: 'estado-badge--pendiente' },
  en_revision: { texto: 'En revisión', clase: 'estado-badge--en_revision' },
  aprobada: { texto: 'Aprobada', clase: 'estado-badge--aprobada' },
  completada: { texto: 'Adopción completada', clase: 'estado-badge--completada' },
  rechazada: { texto: 'Rechazada', clase: 'estado-badge--rechazada' },
  cancelada: { texto: 'Cancelada', clase: 'estado-badge--cancelada' },
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

// CU24 — Historial de solicitudes de adopción del usuario autenticado
export default function MisSolicitudes() {
  const { token } = useAuth();

  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [solicitudVisita, setSolicitudVisita] = useState(null);

  const cargarSolicitudes = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await pedir('/solicitudes/mias', { token });
      setSolicitudes(datos.solicitudes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  return (
    <section>
      <div className="encabezado-seccion">
        <div>
          <h1>Mis solicitudes de adopción</h1>
          <p className="subtitulo">
            Revisa el estado y seguimiento de todas las postulaciones que has enviado.
          </p>
        </div>
        <div className="acciones" style={{ marginTop: 0 }}>
          <Link to="/panel/visitas" className="boton boton-secundario">
            Mis visitas
          </Link>
          <Link to="/favoritos" className="boton-secundario boton">
            Ir a mis favoritos
          </Link>
        </div>
      </div>

      {aviso && (
        <p className="alerta-info" role="status" style={{ marginBottom: '1rem' }}>
          {aviso}
        </p>
      )}

      {cargando && <p className="cargando">Cargando tus solicitudes…</p>}

      {!cargando && error && (
        <div className="alerta-error" role="alert">
          <p style={{ margin: '0 0 0.5rem' }}>{error}</p>
          <button type="button" className="boton-texto" onClick={cargarSolicitudes}>
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && solicitudes.length === 0 && (
        <div className="tarjeta estado-vacio">
          <h2 className="estado-vacio__titulo">Aún no has enviado solicitudes</h2>
          <p className="estado-vacio__texto">
            Aún no has enviado solicitudes de adopción. Explora el catálogo y postula a tu próximo compañero.
          </p>
          <Link to="/" className="boton">
            Explorar catálogo
          </Link>
        </div>
      )}

      {!cargando && !error && solicitudes.length > 0 && (
        <div className="solicitudes-lista">
          {solicitudes.map((solicitud) => {
            const infoEstado = ESTADO_INFO[solicitud.estado] || {
              texto: solicitud.estado,
              clase: 'estado-badge--cancelada',
            };

            return (
              <article key={solicitud.solicitud_id} className="tarjeta solicitud-item">
                <img
                  src={solicitud.animal_foto_url || '/huella.svg'}
                  alt={`Foto de ${solicitud.animal_nombre}`}
                  className="solicitud-item__foto"
                />

                <div className="solicitud-item__contenido">
                  <div className="solicitud-item__cabecera">
                    <div>
                      <h2 className="solicitud-item__titulo">{solicitud.animal_nombre}</h2>
                      <p className="solicitud-item__meta">
                        {solicitud.animal_especie} · {solicitud.animal_tamano} · {solicitud.animal_edad_aprox} · {solicitud.animal_comuna}
                      </p>
                      <p className="solicitud-item__fundacion">
                        Fundación: {solicitud.fundacion_nombre}
                      </p>
                    </div>

                    <div className="solicitud-item__estado-bloque">
                      <span className={`estado-badge ${infoEstado.clase}`}>
                        {infoEstado.texto}
                      </span>
                      {solicitud.codigo && (
                        <span className="solicitud-item__codigo">
                          Código: <strong>{solicitud.codigo}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <dl className="solicitud-item__detalles">
                    <div>
                      <dt>Fecha de envío</dt>
                      <dd>{formatearFecha(solicitud.creado_en)}</dd>
                    </div>
                    <div>
                      <dt>Vivienda</dt>
                      <dd>{solicitud.tipo_vivienda}</dd>
                    </div>
                    <div>
                      <dt>Teléfono</dt>
                      <dd>{solicitud.telefono}</dd>
                    </div>
                  </dl>

                  {solicitud.comentario_fundacion && (
                    <p className="alerta-info" style={{ marginTop: '0.75rem' }}>
                      <strong>Respuesta de la fundación:</strong> {solicitud.comentario_fundacion}
                    </p>
                  )}

                  {(solicitud.estado === 'aprobada' || solicitud.estado === 'en_revision') && (
                    <div className="acciones" style={{ marginTop: '1rem' }}>
                      <button
                        type="button"
                        className="boton boton-chico-tabla"
                        onClick={() => {
                          setAviso('');
                          setSolicitudVisita(solicitud);
                        }}
                      >
                        Agendar visita
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {solicitudVisita && (
        <ModalAgendarVisita
          solicitud={solicitudVisita}
          onCerrar={() => setSolicitudVisita(null)}
          onAgendada={() => {
            const nombre = solicitudVisita.animal_nombre;
            setSolicitudVisita(null);
            setAviso(`Visita propuesta correctamente para ${nombre}. Puedes revisarla en "Mis visitas".`);
          }}
        />
      )}
    </section>
  );
}
