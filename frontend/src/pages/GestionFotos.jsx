import { useEffect, useState } from 'react';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

// CU14 — Subir y ordenar fotos del animal (rol: fundación)
export default function GestionFotos() {
  const { usuario, token } = useAuth();

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
        const resp = await pedir('/animales');
        if (!activo) return;
        const todos = resp.animales || [];
        const propios = todos.filter(
          (a) => a.fundacion_nombre === usuario?.nombre
        );
        const lista = propios.length > 0 ? propios : todos;
        setAnimales(lista);
        if (lista.length > 0) {
          setAnimalId(String(lista[0].animal_id));
        }
      } catch (err) {
        if (activo) setError(err.message || 'Error al cargar animales.');
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarAnimalesFundacion();
    return () => {
      activo = false;
    };
  }, [usuario]);

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
        <p>Cargando animales…</p>
      ) : animales.length === 0 ? (
        <p>No tienes animales publicados aún.</p>
      ) : (
        <>
          <div style={{ marginTop: '1.25rem', maxWidth: '420px' }}>
            <label htmlFor="selector-animal" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem' }}>
              Selecciona un animal
            </label>
            <select
              id="selector-animal"
              value={animalId}
              onChange={(e) => {
                setAnimalId(e.target.value);
                setMensaje('');
                setError('');
              }}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            >
              {animales.map((a) => (
                <option key={a.animal_id} value={a.animal_id}>
                  {a.nombre} ({a.especie} · {a.comuna})
                </option>
              ))}
            </select>
          </div>

          <form
            onSubmit={manejarAgregarFoto}
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              maxWidth: '540px',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
              Agregar nueva foto ({fotos.length}/5)
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <input
                type="text"
                placeholder="URL de la imagen (ej: /animales/foto.jpg o https://...)"
                value={nuevaUrl}
                onChange={(e) => setNuevaUrl(e.target.value)}
                disabled={procesando || fotos.length >= 5}
                required
                style={{ padding: '0.55rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
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
                className="boton"
                disabled={procesando || fotos.length >= 5}
                style={{ alignSelf: 'flex-start' }}
              >
                {procesando ? 'Guardando…' : 'Agregar foto'}
              </button>
            </div>
          </form>

          {mensaje && (
            <p role="status" style={{ color: '#15803d', marginTop: '1rem' }}>
              {mensaje}
            </p>
          )}
          {error && (
            <p role="alert" style={{ color: '#b91c1c', marginTop: '1rem' }}>
              {error}
            </p>
          )}

          <div style={{ marginTop: '1.75rem' }}>
            <h2>Fotos actuales ({fotos.length})</h2>
            {fotos.length === 0 ? (
              <p>Este animal aún no tiene fotos cargadas.</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1rem',
                  marginTop: '1rem',
                }}
              >
                {fotos.map((foto, idx) => (
                  <article
                    key={foto.foto_animal_id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <img
                      src={foto.url}
                      alt={`Foto ${idx + 1}`}
                      style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '6px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>#{idx + 1}</strong>
                      {foto.es_principal ? (
                        <span style={{ fontSize: '0.8rem', background: '#dcfce7', color: '#166534', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                          Principal
                        </span>
                      ) : null}
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                      <button
                        type="button"
                        className="boton boton-chico"
                        onClick={() => moverFoto(idx, -1)}
                        disabled={procesando || idx === 0}
                        title="Subir orden"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="boton boton-chico"
                        onClick={() => moverFoto(idx, 1)}
                        disabled={procesando || idx === fotos.length - 1}
                        title="Bajar orden"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="boton-texto"
                        onClick={() => manejarEliminarFoto(foto.foto_animal_id)}
                        disabled={procesando}
                        style={{ marginLeft: 'auto', color: '#b91c1c' }}
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