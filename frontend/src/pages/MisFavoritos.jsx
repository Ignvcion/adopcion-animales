import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import TarjetaAnimal from '../components/TarjetaAnimal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// CU22 — Listar animales favoritos del usuario autenticado
export default function MisFavoritos() {
  const { token } = useAuth();
  const navegar = useNavigate();

  const [favoritos, setFavoritos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarFavoritos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const datos = await pedir('/favoritos', { token });
      setFavoritos(datos.favoritos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => {
    cargarFavoritos();
  }, [cargarFavoritos]);

  function alCambiarFavorito(animalId, quedoEnFavoritos) {
    if (!quedoEnFavoritos) {
      setFavoritos((prev) => prev.filter((item) => item.animal_id !== animalId));
    }
  }

  function irAPostular(animal) {
    navegar('/solicitar', { state: { animal } });
  }

  return (
    <section>
      <div className="encabezado-seccion">
        <div>
          <h1>Mis favoritos</h1>
          <p className="subtitulo">
            Animales que guardaste para seguir de cerca o iniciar su proceso de adopción.
          </p>
        </div>
        <Link to="/solicitudes" className="boton-secundario">
          Ver mis solicitudes
        </Link>
      </div>

      {cargando && <p className="cargando">Cargando tus favoritos…</p>}

      {!cargando && error && (
        <div className="alerta-error" role="alert">
          <p style={{ margin: '0 0 0.5rem' }}>{error}</p>
          <button type="button" className="boton-texto" onClick={cargarFavoritos}>
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && favoritos.length === 0 && (
        <div className="tarjeta centrada">
          <h2 style={{ marginTop: 0 }}>Aún no tienes animales favoritos</h2>
          <p className="subtitulo">
            Guarda los animales que te interesen para compararlos y postular cuando estés listo.
          </p>
          <Link to="/" className="boton">
            Explorar animales
          </Link>
        </div>
      )}

      {!cargando && !error && favoritos.length > 0 && (
        <div className="rejilla-animales">
          {favoritos.map((animal) => (
            <TarjetaAnimal
              key={animal.animal_id}
              animal={animal}
              esFavorito
              onToggleFavorito={alCambiarFavorito}
              onPostular={irAPostular}
            />
          ))}
        </div>
      )}
    </section>
  );
}
