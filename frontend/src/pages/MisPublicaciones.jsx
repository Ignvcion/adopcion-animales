import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

const ETIQUETA_ESTADO = {
  disponible: 'Disponible',
  en_proceso: 'En proceso',
  adoptado: 'Adoptado',
  archivado: 'Archivado',
};

const CLASE_BADGE = {
  disponible: 'estado-badge--aprobada',
  en_proceso: 'estado-badge--en_revision',
  adoptado: 'estado-badge--completada',
  archivado: 'estado-badge--cancelada',
};

const FILTROS = [
  { valor: 'todos', etiqueta: 'Todas' },
  { valor: 'disponible', etiqueta: 'Disponibles' },
  { valor: 'en_proceso', etiqueta: 'En proceso' },
  { valor: 'adoptado', etiqueta: 'Adoptados' },
  { valor: 'archivado', etiqueta: 'Archivados' },
];

// CU18 (Marcar como adoptado) y CU19 (Ver mis publicaciones) — rol: fundación
export default function MisPublicaciones() {
  const { token } = useAuth();

  const [animales, setAnimales] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargarPublicaciones() {
      setCargando(true);
      setError('');
      try {
        const resp = await pedir('/animales/mis-publicaciones', { token });
        if (activo) setAnimales(resp.animales || []);
      } catch (err) {
        if (activo) setError(err.message || 'No se pudieron cargar tus publicaciones.');
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarPublicaciones();
    return () => {
      activo = false;
    };
  }, [token]);

  async function cambiarEstado(animal, nuevoEstado) {
    if (nuevoEstado === 'adoptado') {
      const confirmado = window.confirm(
        `¿Confirmas que ${animal.nombre} fue adoptado? Dejará de aparecer en el catálogo público.`
      );
      if (!confirmado) return;
    }

    setProcesandoId(animal.animal_id);
    setError('');
    setMensaje('');
    try {
      await pedir(`/animales/${animal.animal_id}/estado`, {
        metodo: 'PATCH',
        cuerpo: { estado: nuevoEstado },
        token,
      });

      setAnimales((prev) =>
        prev.map((item) =>
          item.animal_id === animal.animal_id ? { ...item, estado: nuevoEstado } : item
        )
      );

      if (nuevoEstado === 'adoptado') {
        setMensaje(`«${animal.nombre}» fue marcado como adoptado y ya no aparece en el catálogo.`);
      } else if (nuevoEstado === 'archivado') {
        setMensaje(`Publicación de «${animal.nombre}» archivada.`);
      } else {
        setMensaje(`Estado de «${animal.nombre}» actualizado a ${ETIQUETA_ESTADO[nuevoEstado]}.`);
      }
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado del animal.');
    } finally {
      setProcesandoId(null);
    }
  }

  const animalesFiltrados =
    filtroEstado === 'todos'
      ? animales
      : animales.filter((a) => a.estado === filtroEstado);

  const contarPorEstado = (valor) =>
    valor === 'todos'
      ? animales.length
      : animales.filter((a) => a.estado === valor).length;

  return (
    <section>
      <div className="encabezado-seccion">
        <div>
          <h1>Mis publicaciones</h1>
          <p className="subtitulo">
            Administra los animales publicados por tu fundación, actualiza su ficha o márcalos como adoptados.
          </p>
        </div>
        <Link to="/panel/publicaciones/nueva" className="boton">
          + Publicar animal
        </Link>
      </div>

      {!cargando && animales.length > 0 && (
        <div className="filtros-chips" role="tablist" aria-label="Filtrar publicaciones por estado">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              className={`chip ${filtroEstado === f.valor ? 'chip-activo' : ''}`}
              onClick={() => {
                setFiltroEstado(f.valor);
                setMensaje('');
                setError('');
              }}
            >
              {f.etiqueta} ({contarPorEstado(f.valor)})
            </button>
          ))}
        </div>
      )}

      {mensaje && (
        <p className="alerta-info" role="status" style={{ marginBottom: '1rem' }}>
          {mensaje}
        </p>
      )}
      {error && (
        <p className="alerta-error" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {cargando ? (
        <p className="cargando">Cargando publicaciones…</p>
      ) : animales.length === 0 ? (
        <div className="tarjeta centrada">
          <h2>Aún no tienes publicaciones</h2>
          <p className="subtitulo">
            Publica el primer animal de tu fundación para que los adoptantes puedan conocerlo.
          </p>
          <Link to="/panel/publicaciones/nueva" className="boton" style={{ marginTop: '1rem' }}>
            Publicar animal
          </Link>
        </div>
      ) : animalesFiltrados.length === 0 ? (
        <p className="vacio">No tienes publicaciones en estado «{ETIQUETA_ESTADO[filtroEstado]}».</p>
      ) : (
        <div className="solicitudes-lista">
          {animalesFiltrados.map((animal) => {
            const ocupado = procesandoId === animal.animal_id;
            return (
              <article key={animal.animal_id} className="tarjeta solicitud-item">
                {animal.foto_url ? (
                  <img
                    src={animal.foto_url}
                    alt={animal.nombre}
                    className="solicitud-item__foto"
                  />
                ) : (
                  <div
                    className="solicitud-item__foto"
                    style={{ display: 'grid', placeItems: 'center', fontSize: '0.8rem', color: 'var(--color-suave)' }}
                  >
                    Sin foto
                  </div>
                )}

                <div className="solicitud-item__contenido">
                  <div className="solicitud-item__cabecera">
                    <div>
                      <h2 className="solicitud-item__titulo">{animal.nombre}</h2>
                      <p className="solicitud-item__meta">
                        {animal.especie}
                        {animal.raza ? ` · ${animal.raza}` : ''} · {animal.edad_aprox} · {animal.sexo} ·{' '}
                        {animal.tamano === 'pequeno' ? 'pequeño' : animal.tamano} · {animal.comuna}
                      </p>
                    </div>

                    <div className="solicitud-item__estado-bloque">
                      <span className={`estado-badge ${CLASE_BADGE[animal.estado] || ''}`}>
                        {ETIQUETA_ESTADO[animal.estado] || animal.estado}
                      </span>
                      <span className="solicitud-item__codigo">ID #{animal.animal_id}</span>
                    </div>
                  </div>

                  <div className="acciones" style={{ marginTop: '1rem' }}>
                    {animal.estado !== 'adoptado' && (
                      <button
                        type="button"
                        className="boton boton-chico-tabla"
                        disabled={ocupado}
                        onClick={() => cambiarEstado(animal, 'adoptado')}
                      >
                        {ocupado ? 'Actualizando…' : 'Marcar como adoptado'}
                      </button>
                    )}

                    <Link
                      to={`/panel/publicaciones/${animal.animal_id}/editar`}
                      className="boton boton-secundario boton-chico-tabla"
                    >
                      Editar ficha
                    </Link>

                    <Link
                      to={`/panel/fotos?animal=${animal.animal_id}`}
                      className="boton boton-secundario boton-chico-tabla"
                    >
                      Gestionar fotos
                    </Link>

                    {animal.estado !== 'archivado' ? (
                      <button
                        type="button"
                        className="boton boton-secundario boton-chico-tabla"
                        disabled={ocupado}
                        onClick={() => cambiarEstado(animal, 'archivado')}
                      >
                        Archivar
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="boton boton-secundario boton-chico-tabla"
                        disabled={ocupado}
                        onClick={() => cambiarEstado(animal, 'disponible')}
                      >
                        Volver a disponible
                      </button>
                    )}

                    {animal.estado !== 'archivado' && (
                      <Link
                        to={`/animales/${animal.animal_id}`}
                        className="boton-texto"
                        style={{ marginLeft: 'auto' }}
                      >
                        Ver ficha →
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}