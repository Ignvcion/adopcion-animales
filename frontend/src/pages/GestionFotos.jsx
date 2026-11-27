import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

// CU14 — Subir y ordenar fotos del animal (rol: fundación)
export default function GestionFotos() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const animalPreseleccionado = searchParams.get('animal');

  const [animales, setAnimales] = useState([]);
  const [animalId, setAnimalId] = useState('');
  const [fotos, setFotos] = useState([]);
  const [nuevaUrl, setNuevaUrl] = useState('');
  const [marcarPrincipal, setMarcarPrincipal] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargarAnimalesFundacion() {
      setCargando(true);
      setError('');
      try {
        const resp = await pedir('/animales/mis-publicaciones', { token });
        if (!activo) return;
        const lista = resp.animales || [];
        setAnimales(lista);
        if (lista.length > 0) {
          const existePreseleccionado = lista.some(
            (a) => String(a.animal_id) === String(animalPreseleccionado)
          );
          setAnimalId(
            existePreseleccionado ? String(animalPreseleccionado) : String(lista[0].animal_id)
          );
        }
      } catch (err) {
        if (activo) setError(err.message || 'Error al cargar los animales de tu fundación.');
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarAnimalesFundacion();
    return () => {
      activo = false;
    };
  }, [token, animalPreseleccionado]);

  useEffect(() => {
    if (!animalId) {
      setFotos([]);
      return;
    }
    let activo = true;

    async function cargarFotos() {
      setError('');
      try {
        const resp = await pedir(`/animales/${animalId}/fotos`);
        if (activo) setFotos(resp.fotos || []);
      } catch (err) {
        if (activo) setError(err.message || 'No se pudieron cargar las fotos.');
      }
    }

    cargarFotos();
    return () => {
      activo = false;
    };
  }, [animalId]);

  async function manejarAgregarFoto(e) {
    e.preventDefault();
    if (!animalId) return;

    setProcesando(true);
    setError('');
    setMensaje('');
    try {
      const resp = await pedir(`/animales/${animalId}/fotos`, {
        metodo: 'POST',
        cuerpo: { url: nuevaUrl, es_principal: marcarPrincipal },
        token,
      });
      setFotos(resp.fotos || []);
      setNuevaUrl('');
      setMarcarPrincipal(false);
      setMensaje('Foto agregada correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo agregar la foto.');
    } finally {
      setProcesando(false);
    }
  }

  async function moverFoto(indice, direccion) {
    const destino = indice + direccion;
    if (destino < 0 || destino >= fotos.length) return;

    const copia = [...fotos];
    const [movida] = copia.splice(indice, 1);
    copia.splice(destino, 0, movida);
    const ordenIds = copia.map((f) => f.foto_animal_id);

    setProcesando(true);
    setError('');
    setMensaje('');
    try {
      const resp = await pedir(`/animales/${animalId}/fotos/orden`, {
        metodo: 'PUT',
        cuerpo: { ordenIds },
        token,
      });
      setFotos(resp.fotos || []);
      setMensaje('Orden de fotos actualizado (la primera foto es la principal).');
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el orden.');
    } finally {
      setProcesando(false);
    }
  }

  async function manejarEliminarFoto(fotoId) {
    setProcesando(true);
    setError('');
    setMensaje('');
    try {
      const resp = await pedir(`/animales/${animalId}/fotos/${fotoId}`, {
        metodo: 'DELETE',
        token,
      });
      setFotos(resp.fotos || []);
      setMensaje('Foto eliminada correctamente.');
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la foto.');
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section>
      <h1>Galería de fotos de animales</h1>
      <p className="subtitulo">
        Agrega hasta 5 fotos por animal y ordénalas. La primera foto se muestra como portada en el catálogo.
      </p>

      {cargando ? (
        <p className="cargando">Cargando animales…</p>
      ) : animales.length === 0 ? (
        <p>No tienes animales publicados aún.</p>
      ) : (
        <>
          <div className="fotos-selector-grupo">
            <label htmlFor="selector-animal" className="fotos-selector-label">
              Selecciona un animal de tu fundación
            </label>
            <select
              id="selector-animal"
              value={animalId}
              onChange={(e) => {
                setAnimalId(e.target.value);
                setMensaje('');
                setError('');
              }}
              className="campo-select"
            >
              {animales.map((a) => (
                <option key={a.animal_id} value={a.animal_id}>
                  {a.nombre} ({a.especie} · {a.comuna})
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={manejarAgregarFoto} className="tarjeta fotos-formulario">
            <h2 className="fotos-formulario-titulo">
              Agregar nueva foto ({fotos.length}/5)
            </h2>

            <div className="fotos-formulario-campos">
              <input
                type="text"
                placeholder="URL de la imagen (ej: /animales/foto.jpg o https://...)"
                value={nuevaUrl}
                onChange={(e) => setNuevaUrl(e.target.value)}
                disabled={procesando || fotos.length >= 5}
                required
                className="campo-texto"
              />

              <label className="fotos-checkbox-label">
                <input
                  type="checkbox"
                  checked={marcarPrincipal}
                  onChange={(e) => setMarcarPrincipal(e.target.checked)}
                  disabled={procesando || fotos.length >= 5}
                />
                Establecer como foto principal
              </label>

              <button
                type="submit"
                className="boton fotos-btn-enviar"
                disabled={procesando || fotos.length >= 5}
              >
                {procesando ? 'Guardando…' : 'Agregar foto'}
              </button>
            </div>
          </form>

          {mensaje && (
            <p className="alerta-info" role="status">
              {mensaje}
            </p>
          )}
          {error && (
            <p className="alerta-error" role="alert">
              {error}
            </p>
          )}

          <div className="fotos-seccion-actuales">
            <h2>Fotos actuales ({fotos.length})</h2>
            {fotos.length === 0 ? (
              <p>Este animal aún no tiene fotos cargadas.</p>
            ) : (
              <div className="fotos-grid">
                {fotos.map((foto, idx) => (
                  <article key={foto.foto_animal_id} className="tarjeta fotos-tarjeta">
                    <img
                      src={foto.url}
                      alt={`Foto ${idx + 1}`}
                      className="fotos-tarjeta-img"
                    />
                    <div className="fotos-tarjeta-meta">
                      <strong>#{idx + 1}</strong>
                      {foto.es_principal ? (
                        <span className="estado-badge estado-badge--aprobada">Principal</span>
                      ) : null}
                    </div>

                    <div className="fotos-tarjeta-acciones">
                      <button
                        type="button"
                        className="boton boton-chico-tabla"
                        onClick={() => moverFoto(idx, -1)}
                        disabled={procesando || idx === 0}
                        title="Subir orden"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="boton boton-chico-tabla"
                        onClick={() => moverFoto(idx, 1)}
                        disabled={procesando || idx === fotos.length - 1}
                        title="Bajar orden"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="boton-texto fotos-btn-eliminar"
                        onClick={() => manejarEliminarFoto(foto.foto_animal_id)}
                        disabled={procesando}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}