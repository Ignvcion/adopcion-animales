import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';
import { textoEdad, textoEspecie, textoEstado, textoSexo, textoTamano } from '../utils/etiquetas.js';

const IMAGEN_PLACEHOLDER = '/sin-foto-animal.svg';

const MOTIVOS_REPORTE = [
  { valor: 'informacion_falsa', etiqueta: 'Información falsa o engañosa' },
  { valor: 'maltrato', etiqueta: 'Posible maltrato animal' },
  { valor: 'cobro_indebido', etiqueta: 'Cobro indebido por adopción' },
  { valor: 'contenido_inapropiado', etiqueta: 'Contenido inapropiado' },
  { valor: 'otro', etiqueta: 'Otro motivo' },
];

// CU17 — Ver ficha completa del animal
export default function FichaAnimal() {
  const { id } = useParams();
  const { usuario, token } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const [animal, setAnimal] = useState(null);
  const [fotoActiva, setFotoActiva] = useState('');
  const [esFavorito, setEsFavorito] = useState(false);
  const [procesandoFav, setProcesandoFav] = useState(false);
  const [errorFav, setErrorFav] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // CU29 — Reportar publicación sospechosa
  const [modalReporte, setModalReporte] = useState(false);
  const [motivoReporte, setMotivoReporte] = useState('informacion_falsa');
  const [descripcionReporte, setDescripcionReporte] = useState('');
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [errorReporte, setErrorReporte] = useState('');
  const [avisoReporte, setAvisoReporte] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargarFicha() {
      setCargando(true);
      setError('');
      try {
        const resp = await pedir(`/animales/${id}`);
        if (!activo) return;
        const datos = resp.animal;
        setAnimal(datos);
        setFotoActiva(datos.fotos?.[0]?.url || datos.foto_url || IMAGEN_PLACEHOLDER);

        if (usuario?.rol === 'adoptante' && token) {
          try {
            const respFav = await pedir('/favoritos', { token });
            if (!activo) return;
            const encontrado = (respFav.favoritos || []).some(
              (f) => f.animal_id === datos.animal_id
            );
            setEsFavorito(encontrado);
          } catch {
            // Si falla favoritos, la ficha sigue visible
          }
        } else {
          setEsFavorito(false);
        }
      } catch (err) {
        if (activo) {
          setError(err.message || 'No se pudo cargar la ficha del animal.');
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarFicha();
    return () => {
      activo = false;
    };
  }, [id, usuario, token]);

  async function alternarFavorito() {
    if (!animal) return;
    setErrorFav('');

    if (!usuario || !token) {
      navegar('/login', {
        state: {
          desde: ubicacion.pathname,
          aviso: 'Inicia sesión para guardar animales en tus favoritos.',
        },
      });
      return;
    }

    setProcesandoFav(true);
    try {
      if (esFavorito) {
        await pedir(`/favoritos/${animal.animal_id}`, { metodo: 'DELETE', token });
        setEsFavorito(false);
      } else {
        await pedir('/favoritos', {
          metodo: 'POST',
          cuerpo: { animal_id: animal.animal_id },
          token,
        });
        setEsFavorito(true);
      }
    } catch (err) {
      if (!esFavorito && err.status === 409) {
        setEsFavorito(true);
      } else {
        setErrorFav(err.message);
      }
    } finally {
      setProcesandoFav(false);
    }
  }

  function manejarPostular() {
    if (!animal) return;

    if (!usuario || !token) {
      navegar('/login', {
        state: {
          desde: ubicacion.pathname,
          aviso: 'Inicia sesión como adoptante para postular a la adopción.',
        },
      });
      return;
    }

    navegar(`/solicitar?animal=${animal.animal_id ?? animal.id}`, { state: { animal } });
  }

  async function manejarEnviarReporte(e) {
    e.preventDefault();
    if (!animal) return;
    setErrorReporte('');

    const limpia = descripcionReporte.trim();
    if (limpia.length < 10) {
      setErrorReporte('Describe el motivo del reporte en al menos 10 caracteres.');
      return;
    }

    setEnviandoReporte(true);
    try {
      const resp = await pedir('/reportes', {
        metodo: 'POST',
        token,
        cuerpo: {
          animal_id: animal.animal_id,
          motivo: motivoReporte,
          descripcion: limpia,
        },
      });
      setModalReporte(false);
      setDescripcionReporte('');
      setAvisoReporte(resp.mensaje || 'Reporte enviado correctamente.');
    } catch (err) {
      setErrorReporte(err.message || 'No se pudo enviar el reporte.');
    } finally {
      setEnviandoReporte(false);
    }
  }

  if (cargando) {
    return <p className="cargando">Cargando ficha del animal…</p>;
  }

  if (error || !animal) {
    return (
      <section>
        <p className="alerta-error" role="alert">
          {error || 'Animal no encontrado.'}
        </p>
        <Link to="/" className="boton boton-secundario boton-espaciado-superior">
          ← Volver al catálogo
        </Link>
      </section>
    );
  }

  const fotos = animal.fotos?.length > 0
    ? animal.fotos
    : [{ foto_animal_id: 'default', url: animal.foto_url || IMAGEN_PLACEHOLDER }];

  const usaPlaceholder = fotoActiva === IMAGEN_PLACEHOLDER;
  const estaDisponible = animal.estado === 'disponible';
  const puedeInteractuarAdoptante = !usuario || usuario.rol === 'adoptante';

  return (
    <section>
      <Link to="/" className="boton-texto enlace-volver">
        ← Volver al catálogo
      </Link>

      <div className="ficha-rejilla">
        {/* Galería de fotos */}
        <div className="ficha-galeria">
          <img
            src={fotoActiva}
            alt={usaPlaceholder ? `${animal.nombre} sin fotografía` : `Foto principal de ${animal.nombre}`}
            className={`ficha-foto-principal ${usaPlaceholder ? 'ficha-foto-principal--placeholder' : ''}`}
          />

          {fotos.length > 1 && (
            <div className="ficha-miniaturas">
              {fotos.map((foto, idx) => (
                <button
                  key={foto.foto_animal_id}
                  type="button"
                  onClick={() => setFotoActiva(foto.url)}
                  className={`ficha-miniatura-btn ${fotoActiva === foto.url ? 'ficha-miniatura-btn--activa' : ''}`}
                >
                  <img
                    src={foto.url}
                    alt={`${animal.nombre} miniatura ${idx + 1}`}
                    className="ficha-miniatura-img"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información detallada */}
        <div className="ficha-info">
          <div className="ficha-cabecera">
            <h1 className="ficha-titulo">{animal.nombre}</h1>
            <span
              className={`ficha-estado ${
                estaDisponible ? 'ficha-estado--disponible' : 'ficha-estado--no-disponible'
              }`}
            >
              {textoEstado(animal.estado)}
            </span>
          </div>

          <p className="subtitulo ficha-subtitulo">
            {textoEspecie(animal.especie)}
            {animal.raza ? ` · ${animal.raza}` : ''} · {animal.comuna}
          </p>

          <dl className="ficha-datos-grid">
            <div>
              <dt className="ficha-dato-etiqueta">Edad aproximada</dt>
              <dd className="ficha-dato-valor">
                {animal.edad_aprox} ({textoEdad(animal.rango_edad)})
              </dd>
            </div>
            <div>
              <dt className="ficha-dato-etiqueta">Tamaño</dt>
              <dd className="ficha-dato-valor">
                {textoTamano(animal.tamano)}
              </dd>
            </div>
            <div>
              <dt className="ficha-dato-etiqueta">Sexo</dt>
              <dd className="ficha-dato-valor">
                {textoSexo(animal.sexo)}
              </dd>
            </div>
            <div>
              <dt className="ficha-dato-etiqueta">Comuna</dt>
              <dd className="ficha-dato-valor">{animal.comuna}</dd>
            </div>
          </dl>

          {errorFav && (
            <p className="alerta-error" role="alert">
              {errorFav}
            </p>
          )}

          {avisoReporte && (
            <p className="alerta-info" role="status">
              {avisoReporte}
            </p>
          )}

          {puedeInteractuarAdoptante && (
            <div className="ficha-acciones-principales">
              <button
                type="button"
                className="boton"
                onClick={manejarPostular}
                disabled={!estaDisponible}
              >
                {estaDisponible ? 'Postular a adopción' : 'No disponible para postular'}
              </button>

              <button
                type="button"
                className="boton boton-secundario"
                onClick={alternarFavorito}
                disabled={procesandoFav}
                aria-pressed={esFavorito}
              >
                {esFavorito ? '♥ En favoritos' : '♡ Guardar en favoritos'}
              </button>

              {usuario?.rol === 'adoptante' && (
                <button
                  type="button"
                  className="boton-texto ficha-btn-reportar"
                  onClick={() => {
                    setErrorReporte('');
                    setModalReporte(true);
                  }}
                >
                  ⚑ Reportar publicación
                </button>
              )}
            </div>
          )}

          <div className="ficha-bloque">
            <h2 className="ficha-bloque-titulo">Sobre {animal.nombre}</h2>
            <p className="ficha-parrafo">{animal.descripcion}</p>
          </div>

          {animal.estado_salud && (
            <div className="ficha-bloque">
              <h2 className="ficha-bloque-titulo">Estado de salud</h2>
              <p className="ficha-parrafo">{animal.estado_salud}</p>
            </div>
          )}

          {animal.requisitos_adopcion && (
            <div className="ficha-bloque">
              <h2 className="ficha-bloque-titulo">Requisitos de adopción</h2>
              <p className="ficha-parrafo">{animal.requisitos_adopcion}</p>
            </div>
          )}

          {/* Datos de la fundación responsable */}
          <div className="tarjeta ficha-fundacion">
            <h2 className="ficha-fundacion-titulo">
              Fundación responsable:{' '}
              <Link
                to={`/fundaciones/${animal.fundacion_id}`}
                className="ficha-fundacion-enlace"
              >
                {animal.fundacion_nombre}
              </Link>
            </h2>
            {animal.fundacion_comuna && (
              <p className="ficha-fundacion-dato">Ubicación: {animal.fundacion_comuna}</p>
            )}
            {animal.fundacion_telefono && (
              <p className="ficha-fundacion-dato">Teléfono: {animal.fundacion_telefono}</p>
            )}
            {animal.fundacion_correo && (
              <p className="ficha-fundacion-dato">Correo: {animal.fundacion_correo}</p>
            )}
          </div>
        </div>
      </div>

      {modalReporte && (
        <div
          className="modal-fondo"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-reporte-titulo"
        >
          <div className="tarjeta modal modal-reporte">
            <h2 id="modal-reporte-titulo" className="modal-titulo">
              Reportar publicación de {animal.nombre}
            </h2>
            <p className="subtitulo modal-subtitulo">
              Si detectaste información engañosa o irregularidades, cuéntanos para revisarlo.
            </p>

            <form onSubmit={manejarEnviarReporte} className="formulario formulario-modal">
              <label htmlFor="reporte-motivo">Motivo del reporte</label>
              <select
                id="reporte-motivo"
                value={motivoReporte}
                onChange={(e) => setMotivoReporte(e.target.value)}
                disabled={enviandoReporte}
                className="campo-select"
              >
                {MOTIVOS_REPORTE.map((m) => (
                  <option key={m.valor} value={m.valor}>
                    {m.etiqueta}
                  </option>
                ))}
              </select>

              <label htmlFor="reporte-descripcion">Descripción</label>
              <textarea
                id="reporte-descripcion"
                rows={4}
                maxLength={2000}
                placeholder="Explica brevemente qué observaste en esta publicación…"
                value={descripcionReporte}
                onChange={(e) => setDescripcionReporte(e.target.value)}
                disabled={enviandoReporte}
                required
              />

              {errorReporte && (
                <p className="alerta-error" role="alert">
                  {errorReporte}
                </p>
              )}

              <div className="acciones modal-acciones">
                <button type="submit" className="boton boton-peligro" disabled={enviandoReporte}>
                  {enviandoReporte ? 'Enviando…' : 'Enviar reporte'}
                </button>
                <button
                  type="button"
                  className="boton boton-secundario"
                  onClick={() => setModalReporte(false)}
                  disabled={enviandoReporte}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}