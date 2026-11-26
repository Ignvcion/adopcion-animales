import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

const ETIQUETA_TAMANO = {
  pequeno: 'Pequeño',
  mediano: 'Mediano',
  grande: 'Grande',
};

const ETIQUETA_EDAD = {
  cachorro: 'Cachorro',
  joven: 'Joven',
  adulto: 'Adulto',
  senior: 'Senior',
};

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
        setFotoActiva(datos.fotos?.[0]?.url || datos.foto_url || '/huella.svg');

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

    navegar('/solicitar', { state: { animal } });
  }

  if (cargando) {
    return <p>Cargando ficha del animal…</p>;
  }

  if (error || !animal) {
    return (
      <section>
        <p role="alert" style={{ color: '#b91c1c', marginBottom: '1rem' }}>
          {error || 'Animal no encontrado.'}
        </p>
        <Link to="/" className="boton-secundario">
          ← Volver al catálogo
        </Link>
      </section>
    );
  }

  const fotos = animal.fotos?.length > 0
    ? animal.fotos
    : [{ foto_animal_id: 'default', url: animal.foto_url || '/huella.svg' }];

  const estaDisponible = animal.estado === 'disponible';
  const puedeInteractuarAdoptante = !usuario || usuario.rol === 'adoptante';

  return (
    <section>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to="/" className="boton-texto">
          ← Volver al catálogo
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Galería de fotos */}
        <div>
          <img
            src={fotoActiva}
            alt={`Foto principal de ${animal.nombre}`}
            style={{
              width: '100%',
              height: '340px',
              objectFit: 'cover',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          />

          {fotos.length > 1 && (
            <div
              style={{
                display: 'flex',
                gap: '0.6rem',
                marginTop: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              {fotos.map((foto, idx) => (
                <button
                  key={foto.foto_animal_id}
                  type="button"
                  onClick={() => setFotoActiva(foto.url)}
                  style={{
                    padding: 0,
                    border: fotoActiva === foto.url ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: 'transparent',
                  }}
                >
                  <img
                    src={foto.url}
                    alt={`${animal.nombre} miniatura ${idx + 1}`}
                    style={{ width: '72px', height: '56px', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Información detallada */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>{animal.nombre}</h1>
            <span
              style={{
                fontSize: '0.85rem',
                padding: '0.2rem 0.65rem',
                borderRadius: '999px',
                background: estaDisponible ? '#dcfce7' : '#fef3c7',
                color: estaDisponible ? '#166534' : '#92400e',
                fontWeight: 600,
              }}
            >
              {animal.estado.replace('_', ' ')}
            </span>
          </div>

          <p className="subtitulo" style={{ marginTop: '0.4rem' }}>
            {animal.especie}
            {animal.raza ? ` · ${animal.raza}` : ''} · {animal.comuna}
          </p>

          <dl
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(130px, 1fr))',
              gap: '0.75rem',
              marginTop: '1.25rem',
              padding: '1rem',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <dt style={{ fontSize: '0.8rem', color: '#64748b' }}>Edad aproximada</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>
                {animal.edad_aprox} ({ETIQUETA_EDAD[animal.rango_edad] || animal.rango_edad})
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.8rem', color: '#64748b' }}>Tamaño</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>
                {ETIQUETA_TAMANO[animal.tamano] || animal.tamano}
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.8rem', color: '#64748b' }}>Sexo</dt>
              <dd style={{ margin: 0, fontWeight: 600, textTransform: 'capitalize' }}>
                {animal.sexo}
              </dd>
            </div>
            <div>
              <dt style={{ fontSize: '0.8rem', color: '#64748b' }}>Comuna</dt>
              <dd style={{ margin: 0, fontWeight: 600 }}>{animal.comuna}</dd>
            </div>
          </dl>

          <div style={{ marginTop: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Sobre {animal.nombre}</h2>
            <p style={{ lineHeight: 1.6 }}>{animal.descripcion}</p>
          </div>

          {animal.estado_salud && (
            <div style={{ marginTop: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Estado de salud</h2>
              <p style={{ lineHeight: 1.6 }}>{animal.estado_salud}</p>
            </div>
          )}

          {animal.requisitos_adopcion && (
            <div style={{ marginTop: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>Requisitos de adopción</h2>
              <p style={{ lineHeight: 1.6 }}>{animal.requisitos_adopcion}</p>
            </div>
          )}

          {/* Datos de la fundación responsable */}
          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}
          >
            <h2 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>
              Fundación responsable: {animal.fundacion_nombre}
            </h2>
            {animal.fundacion_comuna && (
              <p style={{ margin: '0.2rem 0', fontSize: '0.92rem' }}>
                Ubicación: {animal.fundacion_comuna}
              </p>
            )}
            {animal.fundacion_telefono && (
              <p style={{ margin: '0.2rem 0', fontSize: '0.92rem' }}>
                Teléfono: {animal.fundacion_telefono}
              </p>
            )}
            {animal.fundacion_correo && (
              <p style={{ margin: '0.2rem 0', fontSize: '0.92rem' }}>
                Correo: {animal.fundacion_correo}
              </p>
            )}
          </div>

          {errorFav && (
            <p role="alert" style={{ color: '#b91c1c', marginTop: '0.75rem' }}>
              {errorFav}
            </p>
          )}

          {puedeInteractuarAdoptante && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
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
                className="boton-secundario"
                onClick={alternarFavorito}
                disabled={procesandoFav}
                aria-pressed={esFavorito}
              >
                {esFavorito ? '♥ En favoritos' : '♡ Guardar en favoritos'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}