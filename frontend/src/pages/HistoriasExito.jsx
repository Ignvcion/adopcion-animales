import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/cliente.js';

const FILTROS_ESPECIE = [
  { valor: '', etiqueta: 'Todas' },
  { valor: 'perro', etiqueta: 'Perros' },
  { valor: 'gato', etiqueta: 'Gatos' },
  { valor: 'otro', etiqueta: 'Otros' },
];

function formatearFecha(fechaIso) {
  if (!fechaIso) return '—';
  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// CU30 — Página pública de historias de adopciones exitosas
export default function HistoriasExito() {
  const [historias, setHistorias] = useState([]);
  const [especie, setEspecie] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarHistorias = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const ruta = especie ? `/historias?especie=${especie}` : '/historias';
      const datos = await pedir(ruta);
      setHistorias(datos.historias || []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las historias de adopción.');
    } finally {
      setCargando(false);
    }
  }, [especie]);

  useEffect(() => {
    cargarHistorias();
  }, [cargarHistorias]);

  return (
    <section>
      <div className="portada" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        <h1>Historias de adopciones exitosas</h1>
        <p>
          Cada animal adoptado es una nueva oportunidad y una familia más feliz.
          Conoce algunos de los finales felices logrados junto a nuestras fundaciones.
        </p>
      </div>

      <div className="filtros-chips" role="group" aria-label="Filtrar historias por especie" style={{ justifyContent: 'center' }}>
        {FILTROS_ESPECIE.map((f) => (
          <button
            key={f.valor || 'todas'}
            type="button"
            className={`chip ${especie === f.valor ? 'chip-activo' : ''}`}
            onClick={() => setEspecie(f.valor)}
          >
            {f.etiqueta}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="cargando">Cargando historias de adopción…</p>
      ) : error ? (
        <div className="alerta-error" role="alert">
          {error}
        </div>
      ) : historias.length === 0 ? (
        <div className="tarjeta centrada">
          <h2 style={{ marginTop: 0 }}>Aún no hay adopciones registradas</h2>
          <p className="subtitulo">
            Pronto verás aquí las historias de los animales que encontraron un hogar definitivo.
          </p>
          <Link to="/" className="boton">
            Explorar catálogo disponible
          </Link>
        </div>
      ) : (
        <div className="rejilla-animales" style={{ marginTop: '1.25rem' }}>
          {historias.map((historia) => (
            <article key={historia.animal_id} className="tarjeta historia-tarjeta">
              <div className="historia-tarjeta__imagen-wrap">
                <img
                  src={historia.foto_url || '/huella.svg'}
                  alt={`Foto de ${historia.nombre}`}
                  className="historia-tarjeta__imagen"
                />
                <span className="estado-badge estado-badge--completada historia-tarjeta__badge">
                  ¡Adoptado!
                </span>
              </div>

              <div className="historia-tarjeta__cuerpo">
                <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>{historia.nombre}</h2>
                <p className="subtitulo" style={{ margin: '0 0 0.6rem', textTransform: 'capitalize', fontSize: '0.9rem' }}>
                  {historia.especie}
                  {historia.raza ? ` · ${historia.raza}` : ''} · {historia.edad_aprox} · {historia.comuna}
                </p>

                <p style={{ margin: '0 0 0.85rem', fontSize: '0.93rem', color: 'var(--color-texto)' }}>
                  {historia.descripcion}
                </p>

                <div className="historia-tarjeta__pie">
                  <Link
                    to={`/fundaciones/${historia.fundacion_id}`}
                    style={{ color: 'var(--color-primario)', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none' }}
                  >
                    {historia.fundacion_nombre}
                  </Link>
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-suave)' }}>
                    Adoptado el {formatearFecha(historia.fecha_adopcion)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
