import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { textoEspecie, textoTamano } from '../utils/etiquetas.js';

const IMAGEN_PLACEHOLDER = '/sin-foto-animal.svg';

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
        <Link to="/" className="boton boton-espaciado-superior">
          Volver al catálogo
        </Link>
      </section>
    );
  }

  return (
    <section>
      <Link to="/" className="boton-texto enlace-volver">
        ← Volver al catálogo
      </Link>

      <article className="tarjeta fundacion-cabecera">
        <div className="encabezado-seccion fundacion-cabecera-top">
          <div>
            <h1>{fundacion.nombre}</h1>
            <p className="subtitulo fundacion-subtitulo">{fundacion.comuna}</p>
          </div>
          <div className="fundacion-badges">
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
          <p className="fundacion-descripcion">{fundacion.descripcion}</p>
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
        <div className="rejilla-animales fundacion-animales-grid">
          {animales.map((animal) => {
            const tieneFoto = Boolean(animal.foto_url);
            return (
              <article key={animal.animal_id} className="tarjeta fundacion-animal-tarjeta">
                <img
                  src={tieneFoto ? animal.foto_url : IMAGEN_PLACEHOLDER}
                  alt={tieneFoto ? animal.nombre : `${animal.nombre} sin fotografía`}
                  className={`fundacion-animal-img ${
                    tieneFoto ? '' : 'fundacion-animal-img--placeholder'
                  }`}
                />

                <h3 className="fundacion-animal-titulo">{animal.nombre}</h3>
                <p className="subtitulo fundacion-animal-subtitulo">
                  {textoEspecie(animal.especie)}
                  {animal.raza ? ` · ${animal.raza}` : ''} · {animal.edad_aprox}
                </p>
                <p className="fundacion-animal-meta">
                  {textoTamano(animal.tamano)} · {animal.comuna}
                </p>

                <Link
                  to={`/animales/${animal.animal_id}`}
                  className="boton fundacion-animal-boton"
                >
                  Ver ficha
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}