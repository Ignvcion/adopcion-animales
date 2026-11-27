import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import TarjetaAnimal from '../components/TarjetaAnimal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const FILTROS_INICIALES = {
  q: '',
  especie: '',
  tamano: '',
  rango_edad: '',
  sexo: '',
  comuna: '',
};

// CU15–CU16 — Catálogo público con filtros de búsqueda
export default function Inicio() {
  const { usuario, token } = useAuth();
  const navegar = useNavigate();

  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIALES);

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
        const params = new URLSearchParams();
        Object.entries(filtrosAplicados).forEach(([clave, valor]) => {
          if (valor.trim()) params.set(clave, valor.trim());
        });
        const query = params.toString();
        const ruta = query ? `/animales?${query}` : '/animales';

        const respuesta = await pedir(ruta);
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
  }, [usuario, token, filtrosAplicados]);

  function manejarCambioFiltro(e) {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  }

  function manejarBuscar(e) {
    e.preventDefault();
    setFiltrosAplicados({ ...filtros });
  }

  function manejarLimpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
    setFiltrosAplicados(FILTROS_INICIALES);
  }

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

  const hayFiltrosActivos = Object.values(filtrosAplicados).some((v) => v.trim() !== '');

  return (
    <section>
      <div className="portada">
        <h1>Encuentra a tu nuevo compañero</h1>
        <p>
          Perros y gatos de fundaciones de todo Chile esperan un hogar.
          Filtra por especie, tamaño, edad o comuna y conoce su historia.
        </p>
      </div>

      {/* CU16 — Filtros de búsqueda */}
      <form
        onSubmit={manejarBuscar}
        aria-label="Filtrar animales disponibles"
        className="filtros"
      >
        <div className="filtros__campos">
          <div>
            <label htmlFor="filtro-q">
              Nombre o raza
            </label>
            <input
              id="filtro-q"
              name="q"
              type="text"
              placeholder="Ej: Luna, Mestizo"
              value={filtros.q}
              onChange={manejarCambioFiltro}
            />
          </div>

          <div>
            <label htmlFor="filtro-especie">
              Especie
            </label>
            <select
              id="filtro-especie"
              name="especie"
              value={filtros.especie}
              onChange={manejarCambioFiltro}
            >
              <option value="">Todas</option>
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label htmlFor="filtro-tamano">
              Tamaño
            </label>
            <select
              id="filtro-tamano"
              name="tamano"
              value={filtros.tamano}
              onChange={manejarCambioFiltro}
            >
              <option value="">Todos</option>
              <option value="pequeno">Pequeño</option>
              <option value="mediano">Mediano</option>
              <option value="grande">Grande</option>
            </select>
          </div>

          <div>
            <label htmlFor="filtro-edad">
              Edad
            </label>
            <select
              id="filtro-edad"
              name="rango_edad"
              value={filtros.rango_edad}
              onChange={manejarCambioFiltro}
            >
              <option value="">Todas</option>
              <option value="cachorro">Cachorro</option>
              <option value="joven">Joven</option>
              <option value="adulto">Adulto</option>
              <option value="senior">Senior</option>
            </select>
          </div>

          <div>
            <label htmlFor="filtro-sexo">
              Sexo
            </label>
            <select
              id="filtro-sexo"
              name="sexo"
              value={filtros.sexo}
              onChange={manejarCambioFiltro}
            >
              <option value="">Todos</option>
              <option value="macho">Macho</option>
              <option value="hembra">Hembra</option>
            </select>
          </div>

          <div>
            <label htmlFor="filtro-comuna">
              Comuna
            </label>
            <input
              id="filtro-comuna"
              name="comuna"
              type="text"
              placeholder="Ej: Maipú, Santiago"
              value={filtros.comuna}
              onChange={manejarCambioFiltro}
            />
          </div>
        </div>

        <div className="filtros__acciones">
          <button type="submit" className="boton">
            Filtrar catálogo
          </button>
          {hayFiltrosActivos && (
            <button
              type="button"
              className="boton-secundario"
              onClick={manejarLimpiarFiltros}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </form>

      <div className="catalogo">
        <div className="catalogo__cabecera">
          <h2>Animales disponibles para adopción</h2>
          {!cargando && !error && (
            <span className="subtitulo">
              {animales.length}{' '}
              {animales.length === 1 ? 'animal encontrado' : 'animales encontrados'}
            </span>
          )}
        </div>

        {cargando && <p className="cargando">Cargando catálogo de animales…</p>}

        {error && (
          <p role="alert" className="alerta-error">
            {error}
          </p>
        )}

        {!cargando && !error && animales.length === 0 && (
          <p className="catalogo__vacio">
            {hayFiltrosActivos
              ? 'No encontramos animales con esos filtros. Prueba ampliando tu búsqueda.'
              : 'Por el momento no hay animales disponibles en el catálogo.'}
          </p>
        )}

        {!cargando && !error && animales.length > 0 && (
          <div className="catalogo__grilla">
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