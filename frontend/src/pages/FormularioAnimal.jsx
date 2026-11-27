import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

const ESTADO_INICIAL = {
  nombre: '',
  especie: 'perro',
  raza: '',
  edad_aprox: '',
  rango_edad: 'joven',
  sexo: 'macho',
  tamano: 'mediano',
  comuna: '',
  descripcion: '',
  estado_salud: '',
  requisitos_adopcion: '',
  foto_url: '',
};

// CU11 (Publicar animal) y CU12 (Editar publicación de animal) — rol: fundación
export default function FormularioAnimal() {
  const { id } = useParams();
  const esEdicion = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [form, setForm] = useState(ESTADO_INICIAL);
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!esEdicion) return;
    let activo = true;

    async function cargarAnimal() {
      setCargando(true);
      setError('');
      try {
        const resp = await pedir('/animales/mis-publicaciones', { token });
        if (!activo) return;
        const encontrado = (resp.animales || []).find(
          (item) => String(item.animal_id) === String(id)
        );
        if (!encontrado) {
          setError('No se encontró la publicación solicitada en tu fundación.');
          return;
        }
        setForm({
          nombre: encontrado.nombre || '',
          especie: encontrado.especie || 'perro',
          raza: encontrado.raza || '',
          edad_aprox: encontrado.edad_aprox || '',
          rango_edad: encontrado.rango_edad || 'joven',
          sexo: encontrado.sexo || 'macho',
          tamano: encontrado.tamano || 'mediano',
          comuna: encontrado.comuna || '',
          descripcion: encontrado.descripcion || '',
          estado_salud: encontrado.estado_salud || '',
          requisitos_adopcion: encontrado.requisitos_adopcion || '',
          foto_url: '',
        });
      } catch (err) {
        if (activo) setError(err.message || 'Error al cargar los datos del animal.');
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarAnimal();
    return () => {
      activo = false;
    };
  }, [esEdicion, id, token]);

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');

    const payload = {
      nombre: form.nombre,
      especie: form.especie,
      raza: form.raza,
      edad_aprox: form.edad_aprox,
      rango_edad: form.rango_edad,
      sexo: form.sexo,
      tamano: form.tamano,
      comuna: form.comuna,
      descripcion: form.descripcion,
      estado_salud: form.estado_salud,
      requisitos_adopcion: form.requisitos_adopcion,
    };

    if (!esEdicion && form.foto_url.trim()) {
      payload.fotos = [form.foto_url.trim()];
    }

    try {
      await pedir(esEdicion ? `/animales/${id}` : '/animales', {
        metodo: esEdicion ? 'PUT' : 'POST',
        cuerpo: payload,
        token,
      });
      navigate('/panel/publicaciones');
    } catch (err) {
      setError(err.message || 'No se pudo guardar la publicación.');
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <p className="cargando">Cargando ficha del animal…</p>;
  }

  return (
    <section>
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/panel/publicaciones" className="boton-texto">
          ← Volver a mis publicaciones
        </Link>
      </div>

      <form onSubmit={manejarSubmit} className="tarjeta formulario formulario-ancho">
        <h1>{esEdicion ? 'Editar publicación' : 'Publicar animal en adopción'}</h1>
        <p className="subtitulo">
          {esEdicion
            ? 'Actualiza los datos de la ficha del animal.'
            : 'Completa los datos básicos del animal para publicarlo en el catálogo.'}
        </p>

        {error && (
          <p className="alerta-error" role="alert">
            {error}
          </p>
        )}

        <label htmlFor="nombre">Nombre *</label>
        <input
          id="nombre"
          type="text"
          maxLength={100}
          required
          value={form.nombre}
          onChange={(e) => actualizarCampo('nombre', e.target.value)}
        />

        <label htmlFor="especie">Especie *</label>
        <select
          id="especie"
          value={form.especie}
          onChange={(e) => actualizarCampo('especie', e.target.value)}
          style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '10px', border: '1px solid var(--color-borde)', background: '#fff' }}
        >
          <option value="perro">Perro</option>
          <option value="gato">Gato</option>
          <option value="otro">Otro</option>
        </select>

        <label htmlFor="raza">Raza (opcional)</label>
        <input
          id="raza"
          type="text"
          maxLength={100}
          placeholder="Ej: Mestizo, Poodle, Siamés"
          value={form.raza}
          onChange={(e) => actualizarCampo('raza', e.target.value)}
        />

        <label htmlFor="edad_aprox">Edad aproximada *</label>
        <input
          id="edad_aprox"
          type="text"
          maxLength={50}
          required
          placeholder="Ej: 8 meses, 2 años"
          value={form.edad_aprox}
          onChange={(e) => actualizarCampo('edad_aprox', e.target.value)}
        />

        <label htmlFor="rango_edad">Rango de edad *</label>
        <select
          id="rango_edad"
          value={form.rango_edad}
          onChange={(e) => actualizarCampo('rango_edad', e.target.value)}
          style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '10px', border: '1px solid var(--color-borde)', background: '#fff' }}
        >
          <option value="cachorro">Cachorro</option>
          <option value="joven">Joven</option>
          <option value="adulto">Adulto</option>
          <option value="senior">Senior</option>
        </select>

        <label htmlFor="sexo">Sexo *</label>
        <select
          id="sexo"
          value={form.sexo}
          onChange={(e) => actualizarCampo('sexo', e.target.value)}
          style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '10px', border: '1px solid var(--color-borde)', background: '#fff' }}
        >
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
        </select>

        <label htmlFor="tamano">Tamaño *</label>
        <select
          id="tamano"
          value={form.tamano}
          onChange={(e) => actualizarCampo('tamano', e.target.value)}
          style={{ width: '100%', padding: '0.7rem 0.8rem', borderRadius: '10px', border: '1px solid var(--color-borde)', background: '#fff' }}
        >
          <option value="pequeno">Pequeño</option>
          <option value="mediano">Mediano</option>
          <option value="grande">Grande</option>
        </select>

        <label htmlFor="comuna">Comuna *</label>
        <input
          id="comuna"
          type="text"
          maxLength={80}
          required
          placeholder="Ej: Santiago, Providencia, Maipú"
          value={form.comuna}
          onChange={(e) => actualizarCampo('comuna', e.target.value)}
        />

        <label htmlFor="descripcion">Descripción y personalidad *</label>
        <textarea
          id="descripcion"
          rows={4}
          required
          value={form.descripcion}
          onChange={(e) => actualizarCampo('descripcion', e.target.value)}
        />

        <label htmlFor="estado_salud">Estado de salud (opcional)</label>
        <input
          id="estado_salud"
          type="text"
          maxLength={255}
          placeholder="Ej: Vacunado, desparasitado y esterilizado"
          value={form.estado_salud}
          onChange={(e) => actualizarCampo('estado_salud', e.target.value)}
        />

        <label htmlFor="requisitos_adopcion">Requisitos de adopción (opcional)</label>
        <textarea
          id="requisitos_adopcion"
          rows={3}
          placeholder="Ej: Hogar con patio cerrado o malla en balcones"
          value={form.requisitos_adopcion}
          onChange={(e) => actualizarCampo('requisitos_adopcion', e.target.value)}
        />

        {!esEdicion && (
          <>
            <label htmlFor="foto_url">URL de foto principal (opcional)</label>
            <input
              id="foto_url"
              type="text"
              maxLength={500}
              placeholder="Ej: /animales/foto.jpg o https://..."
              value={form.foto_url}
              onChange={(e) => actualizarCampo('foto_url', e.target.value)}
            />
          </>
        )}

        <button type="submit" className="boton ancho" disabled={guardando}>
          {guardando
            ? 'Guardando…'
            : esEdicion
              ? 'Guardar cambios'
              : 'Publicar animal'}
        </button>
      </form>
    </section>
  );
}