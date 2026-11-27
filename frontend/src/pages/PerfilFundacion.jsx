import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pedir } from '../api/cliente.js';

// CU20 — Ver perfil público de una fundación (actor: todos)
export default function PerfilFundacion() {
  const { id } = useParams();

  const [fundacion, setFundacion] = useState(null);
  const [animales, setAnimales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [noEncontrada, setNoEncontrada] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarFundacion() {
      setCargando(true);
      setNoEncontrada(false);
      try {
        const resp = await pedir(`/fundaciones/${id}`);
        if (!activo) return;
        setFundacion(resp.fundacion || null);
        setAnimales(resp.animales || []);
      } catch {
        if (activo) {
          setFundacion(null);
          setNoEncontrada(true);
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarFundacion();
    return () => {
      activo = false;
    };
  }, [id]);

  if (cargando) {
    return <p className="cargando">Cargando perfil de la fundación…</p>;
  }

  if (noEncontrada || !fundacion) {
    return (
      <section className="tarjeta centrada">
        <h1>Fundación no encontrada</h1>
        <p className="subtitulo">
          La fundación solicitada no existe o aún no está aprobada en la plataforma.
        </p>
        <Link to="/" className="boton" style={{ marginTop: '1rem' }}>
          Volver al catálogo
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/" className="boton-texto">
          ← Volver al catálogo
        </Link>
      </div>

      <article className="tarjeta" style={{ marginBottom: '2rem' }}>
        <div className="encabezado-seccion" style={{ marginBottom: '0.75rem' }}>
          <div>
            <h1>{fundacion.nombre}</h1>
            <p className="subtitulo" style={{ marginBottom: 0 }}>
              {fundacion.comuna}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="estado-badge estado-badge--aprobada">Fundación verificada</span>
            <span className="estado-badge estado-badge--en_revision">
              {animales.length} {animales.length === 1 ? 'disponible' : 'disponibles'}
            </span>
            {fundacion.total_adoptados > 0 && (
              <span className="estado-badge estado-badge--completada">
                {fundacion.total_adoptados}{' '}
                {fundacion.total_adoptados === 1 ? 'adopción lograda' : 'adopciones logradas'}
              </span>
            )}
          </div>
        </div>

        {fundacion.descripcion && (
          <p style={{ margin: '0.75rem 0 1rem' }}>{fundacion.descripcion}</p>
        )}

        <dl className="datos-perfil">
          {fundacion.telefono && (
            <>
              <dt>Teléfono</dt>
              <dd>{fundacion.telefono}</dd>
            </>
          )}
          {fundacion.correo && (
            <>
              <dt>Correo</dt>
              <dd>{fundacion.correo}</dd>
            </>
          )}
        </dl>
      </article>

      <h2>Animales en adopción de {fundacion.nombre}</h2>
      {animales.length === 0 ? (
        <p className="vacio">Esta fundación no tiene animales disponibles por el momento.</p>
      ) : (
        <div className="rejilla-animales" style={{ marginTop: '1rem' }}>
          {animales.map((animal) => (
            <article
              key={animal.animal_id}
              className="tarjeta"
              style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
            >
              {animal.foto_url ? (
                <img
                  src={animal.foto_url}
                  alt={animal.nombre}
                  style={{ width: '100%', height: '190px', objectFit: 'cover', borderRadius: '8px' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '190px',
                    borderRadius: '8px',
                    background: '#f4eee7',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--color-suave)',
                  }}
                >
                  Sin foto
                </div>
              )}

              <h3 style={{ margin: '0.25rem 0 0' }}>{animal.nombre}</h3>
              <p className="subtitulo" style={{ margin: 0, textTransform: 'capitalize' }}>
                {animal.especie}
                {animal.raza ? ` · ${animal.raza}` : ''} · {animal.edad_aprox}
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-suave)' }}>
                {animal.tamano === 'pequeno' ? 'Pequeño' : animal.tamano} · {animal.comuna}
              </p>

              <Link
                to={`/animales/${animal.animal_id}`}
                className="boton"
                style={{ marginTop: 'auto', textAlign: 'center' }}
              >
                Ver ficha
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}