import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

const FILTROS = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'programada', etiqueta: 'Programadas' },
  { valor: 'confirmada', etiqueta: 'Confirmadas' },
  { valor: 'reprogramada', etiqueta: 'Reprogramadas' },
  { valor: 'realizada', etiqueta: 'Realizadas' },
  { valor: 'cancelada', etiqueta: 'Canceladas' },
];

const ESTADO_VISITA_INFO = {
  programada: { texto: 'Programada', clase: 'estado-badge--pendiente' },
  confirmada: { texto: 'Confirmada', clase: 'estado-badge--aprobada' },
  reprogramada: { texto: 'Reprogramada', clase: 'estado-badge--en_revision' },
  realizada: { texto: 'Realizada', clase: 'estado-badge--completada' },
  cancelada: { texto: 'Cancelada', clase: 'estado-badge--cancelada' },
};

const ETIQUETA_TIPO = {
  pre_adopcion: 'Pre-adopción',
  seguimiento: 'Seguimiento',
};

function parsearFechaUtc(fechaIso) {
  if (!fechaIso) return null;
  if (fechaIso instanceof Date) return Number.isNaN(fechaIso.getTime()) ? null : fechaIso;
  const texto = String(fechaIso).trim();
  const normalizado = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(texto)
    ? `${texto.replace(' ', 'T')}Z`
    : texto;
  const fecha = new Date(normalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function formatearFechaHora(fechaIso) {
  const fecha = parsearFechaUtc(fechaIso);
  if (!fecha) return '—';
  return fecha.toLocaleString('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function aInputDatetimeLocal(fechaIso) {
  const fecha = parsearFechaUtc(fechaIso);
  if (!fecha) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}` +
    `T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
  );
}

// CU27 — Vista de visitas agendadas para adoptantes y fundaciones
export default function Visitas() {
  const { usuario, token } = useAuth();

  const [visitas, setVisitas] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [procesandoId, setProcesandoId] = useState(null);

  const [reprogramando, setReprogramando] = useState(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoLugar, setNuevoLugar] = useState('');
  const [nuevasNotas, setNuevasNotas] = useState('');
  const [errorReprogramar, setErrorReprogramar] = useState('');

  const cargarVisitas = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const params = filtro !== 'todas' ? `?estado=${filtro}` : '';
      const datos = await pedir(`/visitas/mias${params}`, { token });
      setVisitas(datos.visitas || []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las visitas.');
    } finally {
      setCargando(false);
    }
  }, [token, filtro]);

  useEffect(() => {
    cargarVisitas();
  }, [cargarVisitas]);

  async function cambiarEstado(visitaId, cuerpo, textoExito) {
    setProcesandoId(visitaId);
    setError('');
    setAviso('');
    try {
      await pedir(`/visitas/${visitaId}/estado`, {
        metodo: 'PATCH',
        token,
        cuerpo,
      });
      setAviso(textoExito);
      window.dispatchEvent(new Event('notificaciones:actualizar'));
      await cargarVisitas();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la visita.');
    } finally {
      setProcesandoId(null);
    }
  }

  function abrirReprogramar(visita) {
    setReprogramando(visita);
    setNuevaFecha(aInputDatetimeLocal(visita.fecha_programada));
    setNuevoLugar(visita.direccion_o_enlace || '');
    setNuevasNotas(visita.notas || '');
    setErrorReprogramar('');
  }

  async function enviarReprogramacion(e) {
    e.preventDefault();
    if (!reprogramando) return;
    setErrorReprogramar('');

    if (!nuevaFecha) {
      setErrorReprogramar('Debes elegir una nueva fecha y hora.');
      return;
    }

    const fechaObj = new Date(nuevaFecha);
    if (Number.isNaN(fechaObj.getTime())) {
      setErrorReprogramar('La fecha y hora ingresadas no son válidas.');
      return;
    }

    setProcesandoId(reprogramando.visita_id);
    try {
      await pedir(`/visitas/${reprogramando.visita_id}/estado`, {
        metodo: 'PATCH',
        token,
        cuerpo: {
          estado: 'reprogramada',
          fecha_programada: fechaObj.toISOString(),
          direccion_o_enlace: nuevoLugar.trim() || undefined,
          notas: nuevasNotas.trim(),
        },
      });
      setReprogramando(null);
      setAviso('Visita reprogramada correctamente.');
      window.dispatchEvent(new Event('notificaciones:actualizar'));
      await cargarVisitas();
    } catch (err) {
      setErrorReprogramar(err.message || 'No se pudo reprogramar la visita.');
    } finally {
      setProcesandoId(null);
    }
  }

  const esFundacion = usuario?.rol === 'fundacion';

  return (
    <section>
      <div className="encabezado-seccion">
        <div>
          <h1>Mis visitas</h1>
          <p className="subtitulo">
            Revisa, confirma o reprograma las visitas coordinadas para conocer a los animales.
          </p>
        </div>
        <div className="acciones acciones--sin-margen">
          <Link
            to={esFundacion ? '/panel/solicitudes' : '/solicitudes'}
            className="boton boton-secundario"
          >
            {esFundacion ? 'Ir a solicitudes' : 'Mis solicitudes'}
          </Link>
          <Link to="/panel" className="boton boton-neutro">
            ← Panel
          </Link>
        </div>
      </div>

      <div className="filtros-chips" role="group" aria-label="Filtrar visitas por estado">
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            className={`chip ${filtro === f.valor ? 'chip-activo' : ''}`}
            onClick={() => {
              setFiltro(f.valor);
              setAviso('');
            }}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {aviso && (
        <p className="alerta-info alerta--inferior" role="status">
          {aviso}
        </p>
      )}

      {error && (
        <div className="alerta-error alerta--inferior" role="alert">
          {error}
        </div>
      )}

      {cargando ? (
        <p className="cargando">Cargando visitas…</p>
      ) : visitas.length === 0 ? (
        <div className="tarjeta estado-vacio">
          <h2 className="estado-vacio__titulo">No hay visitas registradas</h2>
          <p className="estado-vacio__texto">
            Puedes agendar una visita desde una solicitud aprobada o en revisión.
          </p>
          <Link
            to={esFundacion ? '/panel/solicitudes' : '/solicitudes'}
            className="boton"
          >
            {esFundacion ? 'Ver solicitudes recibidas' : 'Ver mis solicitudes'}
          </Link>
        </div>
      ) : (
        <div className="solicitudes-lista">
          {visitas.map((visita) => {
            const infoEstado = ESTADO_VISITA_INFO[visita.estado] || {
              texto: visita.estado,
              clase: 'estado-badge--cancelada',
            };
            const cerrada = visita.estado === 'cancelada' || visita.estado === 'realizada';
            const ocupada = procesandoId === visita.visita_id;

            return (
              <article key={visita.visita_id} className="tarjeta solicitud-item">
                <img
                  src={visita.animal_foto_url || '/huella.svg'}
                  alt={`Foto de ${visita.animal_nombre}`}
                  className="solicitud-item__foto"
                />

                <div className="solicitud-item__contenido">
                  <div className="solicitud-item__cabecera">
                    <div>
                      <h2 className="solicitud-item__titulo">{visita.animal_nombre}</h2>
                      <p className="solicitud-item__meta">
                        {visita.animal_especie} · {ETIQUETA_TIPO[visita.tipo] || visita.tipo} ·{' '}
                        {visita.modalidad}
                      </p>
                      <p className="solicitud-item__fundacion">
                        {esFundacion
                          ? `Adoptante: ${visita.adoptante_nombre}`
                          : `Fundación: ${visita.fundacion_nombre}`}
                      </p>
                    </div>

                    <div className="solicitud-item__estado-bloque">
                      <span className={`estado-badge ${infoEstado.clase}`}>{infoEstado.texto}</span>
                      {visita.solicitud_codigo && (
                        <span className="solicitud-item__codigo">
                          Solicitud: <strong>{visita.solicitud_codigo}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <dl className="solicitud-item__detalles">
                    <div>
                      <dt>Fecha y hora</dt>
                      <dd>{formatearFechaHora(visita.fecha_programada)}</dd>
                    </div>
                    <div>
                      <dt>{visita.modalidad === 'videollamada' ? 'Enlace' : 'Lugar'}</dt>
                      <dd>{visita.direccion_o_enlace || 'Por confirmar'}</dd>
                    </div>
                  </dl>

                  {visita.notas && (
                    <p className="alerta-info alerta--compacta">
                      <strong>Notas:</strong> {visita.notas}
                    </p>
                  )}

                  {!cerrada && (
                    <div className="acciones">
                      {visita.estado !== 'confirmada' && visita.usuario_id !== usuario?.id && (
                        <button
                          type="button"
                          className="boton boton-exito boton-chico-tabla"
                          disabled={ocupada}
                          onClick={() =>
                            cambiarEstado(
                              visita.visita_id,
                              { estado: 'confirmada' },
                              `Visita para ${visita.animal_nombre} confirmada.`
                            )
                          }
                        >
                          Confirmar
                        </button>
                      )}

                      <button
                        type="button"
                        className="boton boton-secundario boton-chico-tabla"
                        disabled={ocupada}
                        onClick={() => abrirReprogramar(visita)}
                      >
                        Reprogramar
                      </button>

                      {esFundacion && (
                        <button
                          type="button"
                          className="boton boton-chico-tabla"
                          disabled={ocupada}
                          onClick={() =>
                            cambiarEstado(
                              visita.visita_id,
                              { estado: 'realizada' },
                              `Visita para ${visita.animal_nombre} marcada como realizada.`
                            )
                          }
                        >
                          Marcar realizada
                        </button>
                      )}

                      <button
                        type="button"
                        className="boton boton-peligro boton-chico-tabla"
                        disabled={ocupada}
                        onClick={() =>
                          cambiarEstado(
                            visita.visita_id,
                            { estado: 'cancelada' },
                            `Visita para ${visita.animal_nombre} cancelada.`
                          )
                        }
                      >
                        Cancelar visita
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {reprogramando && (
        <div
          className="modal-fondo"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-reprogramar-titulo"
        >
          <div className="tarjeta modal modal--mediana">
            <h2 id="modal-reprogramar-titulo">
              Reprogramar visita — {reprogramando.animal_nombre}
            </h2>
            <form onSubmit={enviarReprogramacion} className="formulario formulario--modal">
              <label htmlFor="reprog-fecha">Nueva fecha y hora</label>
              <input
                id="reprog-fecha"
                type="datetime-local"
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                disabled={procesandoId === reprogramando.visita_id}
                required
              />

              <label htmlFor="reprog-lugar">Lugar o enlace</label>
              <input
                id="reprog-lugar"
                type="text"
                maxLength={255}
                value={nuevoLugar}
                onChange={(e) => setNuevoLugar(e.target.value)}
                disabled={procesandoId === reprogramando.visita_id}
              />

              <label htmlFor="reprog-notas">Notas (opcional)</label>
              <textarea
                id="reprog-notas"
                rows={3}
                maxLength={2000}
                value={nuevasNotas}
                onChange={(e) => setNuevasNotas(e.target.value)}
                disabled={procesandoId === reprogramando.visita_id}
              />

              {errorReprogramar && (
                <p className="alerta-error" role="alert">
                  {errorReprogramar}
                </p>
              )}

              <div className="acciones acciones--espaciadas">
                <button
                  type="submit"
                  className="boton"
                  disabled={procesandoId === reprogramando.visita_id}
                >
                  {procesandoId === reprogramando.visita_id ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  className="boton boton-secundario"
                  onClick={() => setReprogramando(null)}
                  disabled={procesandoId === reprogramando.visita_id}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
