import { useCallback, useEffect, useState } from 'react';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

const FILTROS = [
  { valor: 'pendiente', texto: 'Pendientes' },
  { valor: 'aprobada', texto: 'Aprobadas' },
  { valor: 'rechazada', texto: 'Rechazadas' },
  { valor: '', texto: 'Todas' },
];

const ETIQUETA_ESTADO = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' };

// CU07 — Aprobar o rechazar fundación
export default function AdminFundaciones() {
  const { token } = useAuth();
  const [filtro, setFiltro] = useState('pendiente');
  const [fundaciones, setFundaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [rechazando, setRechazando] = useState(null); // fundación con el formulario de rechazo abierto
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const consulta = filtro ? `?estado=${filtro}` : '';
      const respuesta = await pedir(`/admin/fundaciones${consulta}`, { token });
      setFundaciones(respuesta.fundaciones);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtro, token]);

  useEffect(() => { cargar(); }, [cargar]);

  async function revisar(fundacion, accion) {
    // E1: el rechazo exige motivo (también lo valida el backend)
    if (accion === 'rechazar' && !motivo.trim()) {
      setError('Escribe el motivo del rechazo');
      return;
    }
    setProcesando(true);
    setError('');
    setAviso('');
    try {
      await pedir(`/admin/fundaciones/${fundacion.fundacion_id}`, {
        metodo: 'PATCH',
        token,
        cuerpo: { accion, motivo: motivo.trim() },
      });
      setAviso(`${fundacion.nombre} fue ${accion === 'aprobar' ? 'aprobada' : 'rechazada'}.`);
      setRechazando(null);
      setMotivo('');
      await cargar();
    } catch (err) {
      // E3: ya revisada por otro administrador, u otro error
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section>
      <h1>Fundaciones</h1>
      <p className="subtitulo">Revisa las solicitudes de nuevas fundaciones antes de que puedan publicar animales.</p>

      <div className="filtros-chips" role="tablist">
        {FILTROS.map((f) => (
          <button
            key={f.texto}
            type="button"
            className={`chip ${filtro === f.valor ? 'chip-activo' : ''}`}
            onClick={() => setFiltro(f.valor)}
          >
            {f.texto}
          </button>
        ))}
      </div>

      {aviso && <p className="alerta-info">{aviso}</p>}
      {error && <p className="alerta-error" role="alert">{error}</p>}

      {cargando ? (
        <p className="cargando">Cargando fundaciones…</p>
      ) : fundaciones.length === 0 ? (
        <p className="vacio">No hay fundaciones {filtro ? `${ETIQUETA_ESTADO[filtro].toLowerCase()}s` : ''}.</p>
      ) : (
        <div className="lista-admin">
          {fundaciones.map((f) => (
            <article key={f.fundacion_id} className="tarjeta tarjeta-admin">
              <header className="tarjeta-admin__cabecera">
                <h2>{f.nombre}</h2>
                <span className={`estado estado-${f.estado}`}>{ETIQUETA_ESTADO[f.estado]}</span>
              </header>

              <dl className="datos-perfil">
                <dt>RUT</dt><dd>{f.rut}</dd>
                <dt>Comuna</dt><dd>{f.comuna}</dd>
                <dt>Responsable</dt><dd>{f.responsable_nombre} ({f.responsable_email})</dd>
                {f.telefono && (<><dt>Teléfono</dt><dd>{f.telefono}</dd></>)}
                {f.sitio_web && (<><dt>Sitio web</dt><dd><a href={f.sitio_web} target="_blank" rel="noreferrer">{f.sitio_web}</a></dd></>)}
                {f.descripcion && (<><dt>Descripción</dt><dd>{f.descripcion}</dd></>)}
                {f.motivo_rechazo && (<><dt>Motivo del rechazo</dt><dd>{f.motivo_rechazo}</dd></>)}
              </dl>

              {f.estado === 'pendiente' && (
                rechazando === f.fundacion_id ? (
                  <div className="formulario-rechazo">
                    <label htmlFor={`motivo-${f.fundacion_id}`}>Motivo del rechazo</label>
                    <textarea
                      id={`motivo-${f.fundacion_id}`}
                      rows={3}
                      maxLength={255}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej: el RUT no corresponde a una organización registrada"
                    />
                    <div className="acciones">
                      <button type="button" className="boton boton-peligro" disabled={procesando}
                        onClick={() => revisar(f, 'rechazar')}>
                        Confirmar rechazo
                      </button>
                      <button type="button" className="boton-texto" onClick={() => { setRechazando(null); setMotivo(''); }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="acciones">
                    <button type="button" className="boton" disabled={procesando} onClick={() => revisar(f, 'aprobar')}>
                      Aprobar
                    </button>
                    <button type="button" className="boton boton-secundario" disabled={procesando}
                      onClick={() => { setRechazando(f.fundacion_id); setMotivo(''); setError(''); }}>
                      Rechazar
                    </button>
                  </div>
                )
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
