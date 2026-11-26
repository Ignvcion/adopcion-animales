import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import TarjetaAnimal from '../components/TarjetaAnimal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// CU15 — Ver catálogo público de animales disponibles
export default function Inicio() {
  const { usuario, token } = useAuth();
  const navegar = useNavigate();

  const [animales, setAnimales] = useState([]);
  const [favoritosIds, setFavoritosIds] = useState(new Set());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargarCatalogo() {
      setCargando(true);
      setError('');
      try {
        const respuesta = await pedir('/animales');
        if (!activo) return;
        setAnimales(respuesta.animales || []);

        if (usuario?.rol === 'adoptante' && token) {
          try {
            const respFav = await pedir('/favoritos', { token });
            if (!activo) return;
            const ids = new Set(
              (respFav.favoritos || []).map((fav) => fav.animal_id)
            );
            setFavoritosIds(ids);
          } catch {
            // Si falla la carga de favoritos, el catálogo sigue visible
          }
        } else {
          setFavoritosIds(new Set());
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'No se pudo cargar el catálogo de animales.');
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarCatalogo();
    return () => {
      activo = false;
    };
  }, [usuario, token]);

  function manejarToggleFavorito(animalId, agregado) {
    setFavoritosIds((prev) => {
      const siguiente = new Set(prev);
      if (agregado) {
        siguiente.add(animalId);
      } else {
        siguiente.delete(animalId);
      }
      return siguiente;
    });
  }

  return (
    <section>
      <div className="portada">
        <h1>Encuentra a tu nuevo compañero</h1>
        <p>
          Perros y gatos de fundaciones de todo Chile esperan un hogar.
          Explora los animales disponibles y conoce su historia.
        </p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <h2>Animales disponibles para adopción</h2>
          {!cargando && !error && (
            <span className="subtitulo">
              {animales.length}{' '}
              {animales.length === 1 ? 'animal disponible' : 'animales disponibles'}
            </span>
          )}
        </div>

        {cargando && <p>Cargando catálogo de animales…</p>}

        {error && (
          <p role="alert" style={{ color: '#b91c1c' }}>
            {error}
          </p>
        )}

        {!cargando && !error && animales.length === 0 && (
          <p>Por el momento no hay animales disponibles en el catálogo.</p>
        )}

        {!cargando && !error && animales.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {animales.map((animal) => (
              <TarjetaAnimal
                key={animal.animal_id}
                animal={animal}
                esFavorito={favoritosIds.has(animal.animal_id)}
                onToggleFavorito={manejarToggleFavorito}
                onVerFicha={(id) => navegar(`/animales/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}