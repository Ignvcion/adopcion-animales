import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';
import './FormularioSolicitud.css';

// CU23 — Enviar solicitud de adopción.
const TELEFONO_VALIDO = /^\+?[0-9 ]{8,15}$/;

// El animal llega por props, por el estado de la navegación o por ?animal=ID en la URL.
// Así, si la persona recarga la página, la solicitud sigue siendo para el animal correcto.
export default function FormularioSolicitud({ animal: animalProp, onCancelar, onEnviarExitoso }) {
  const ubicacion = useLocation();
  const [parametros] = useSearchParams();
  const animalInicial = animalProp ?? ubicacion.state?.animal ?? null;
  const idUrl = parametros.get('animal');

  const [animal, setAnimal] = useState(animalInicial);
  const [errorCarga, setErrorCarga] = useState('');

  useEffect(() => {
    if (animalInicial || !idUrl) return;
    pedir(`/animales/${idUrl}`)
      .then((datos) => setAnimal(datos.animal ?? datos))
      .catch(() => setErrorCarga('No encontramos ese animal. Puede que ya no esté publicado.'));
  }, [animalInicial, idUrl]);

  if (!animal) {
    if (idUrl && !errorCarga) return <p className="cargando">Cargando animal…</p>;
    return (
      <div className="tarjeta centrada">
        <h1>Elige un animal primero</h1>
        <p className="subtitulo">
          {errorCarga || 'Para postular necesitas abrir la ficha del animal que quieres adoptar.'}
        </p>
        <Link to="/" className="boton">Ver animales disponibles</Link>
      </div>
    );
  }

  return (
    <ContenidoSolicitud animal={animal} onCancelar={onCancelar} onEnviarExitoso={onEnviarExitoso} />
  );
}

function ContenidoSolicitud({ animal, onCancelar, onEnviarExitoso }) {
  const { token, usuario } = useAuth();
  const ubicacion = useLocation();
  const navegar = useNavigate();

  const animalId = animal.animal_id ?? animal.id;
  const edadAnimal = animal.edad_aprox ?? animal.edad ?? '';
  const fundacionAnimal = animal.fundacion_nombre ?? animal.fundacion ?? 'Fundación Responsable';

  const [formulario, setFormulario] = useState({
    telefono: '',
    tipoVivienda: '',
    experiencia: '',
    motivo: '',
    otrosAnimales: 'no',
    compromiso: false,
  });

  const [errores, setErrores] = useState({});
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [solicitudCreada, setSolicitudCreada] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormulario((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errores[name]) {
      setErrores((prev) => ({ ...prev, [name]: null }));
    }
    if (errorServidor) {
      setErrorServidor('');
    }
  };

  const validar = () => {
    const nuevosErrores = {};

    if (!formulario.telefono.trim()) {
      nuevosErrores.telefono = 'Ingresa un teléfono de contacto.';
    } else if (!TELEFONO_VALIDO.test(formulario.telefono.trim())) {
      nuevosErrores.telefono = 'Formato inválido (ej: +56 9 1234 5678).';
    }

    if (!formulario.tipoVivienda) {
      nuevosErrores.tipoVivienda = 'Selecciona el tipo de vivienda.';
    }

    if (!formulario.motivo.trim()) {
      nuevosErrores.motivo = 'Cuéntanos por qué deseas adoptar.';
    } else if (formulario.motivo.trim().length < 20) {
      nuevosErrores.motivo = 'Por favor escribe al menos 20 caracteres sobre tu motivo.';
    }

    if (!formulario.experiencia.trim()) {
      nuevosErrores.experiencia = 'Describe tu experiencia previa con mascotas.';
    }

    if (!formulario.compromiso) {
      nuevosErrores.compromiso = 'Debes aceptar el compromiso de tenencia responsable.';
    }

    return nuevosErrores;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorServidor('');

    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }

    if (!usuario || !token) {
      navegar('/login', {
        state: {
          desde: ubicacion.pathname + ubicacion.search,
          aviso: 'Inicia sesión para enviar tu solicitud de adopción.',
        },
      });
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await pedir('/solicitudes', {
        metodo: 'POST',
        token,
        cuerpo: {
          animal_id: animalId,
          telefono: formulario.telefono.trim(),
          tipo_vivienda: formulario.tipoVivienda,
          experiencia: formulario.experiencia.trim(),
          motivo: formulario.motivo.trim(),
          otros_animales: formulario.otrosAnimales,
          compromiso: formulario.compromiso,
        },
      });

      setSolicitudCreada(respuesta.solicitud);
      setConfirmado(true);
      onEnviarExitoso?.(respuesta.solicitud);
    } catch (error) {
      setErrorServidor(error.message);
    } finally {
      setEnviando(false);
    }
  };

  // -------------------------------------------------------------------
  // Vista de confirmación (éxito)
  // -------------------------------------------------------------------
  if (confirmado && solicitudCreada) {
    return (
      <section className="solicitud-contenedor">
        <div className="solicitud-card solicitud-confirmacion">
          <div className="solicitud-confirmacion__icono">✓</div>
          <h2>¡Solicitud enviada con éxito!</h2>
          <p>
            Tu postulación para adoptar a <strong>{animal.nombre}</strong> fue recibida
            por <strong>{solicitudCreada.fundacion_nombre || fundacionAnimal}</strong>. Te contactarán
            dentro de 48 a 72 horas hábiles.
          </p>

          <dl className="solicitud-confirmacion__resumen">
            <dt>Código de seguimiento</dt>
            <dd><strong>{solicitudCreada.codigo}</strong></dd>

            <dt>Teléfono de contacto registrado</dt>
            <dd>{solicitudCreada.telefono}</dd>

            <dt>Tipo de vivienda indicada</dt>
            <dd>{solicitudCreada.tipo_vivienda}</dd>

            <dt>Estado inicial</dt>
            <dd style={{ color: 'var(--color-primario)', fontWeight: 600 }}>Pendiente de revisión</dd>
          </dl>

          <div className="solicitud-acciones" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/solicitudes" className="boton">
              Ver mis solicitudes
            </Link>
            {onCancelar ? (
              <button
                type="button"
                className="boton-secundario"
                onClick={onCancelar}
              >
                Volver
              </button>
            ) : (
              <Link to="/favoritos" className="boton-secundario">
                Ir a mis favoritos
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // -------------------------------------------------------------------
  // Formulario de postulación
  // -------------------------------------------------------------------
  return (
    <section className="solicitud-contenedor">
      {/* Resumen del animal seleccionado */}
      <div className="solicitud-resumen-animal">
        <img
          src={animal.foto_url || '/huella.svg'}
          alt={`Foto de ${animal.nombre}`}
          className="solicitud-resumen-animal__foto"
        />
        <div className="solicitud-resumen-animal__info">
          <h2>Postular a la adopción de {animal.nombre}</h2>
          <p className="solicitud-resumen-animal__detalles">
            {animal.especie} · {animal.tamano} · {edadAnimal} · {animal.comuna}
          </p>
          <p className="solicitud-resumen-animal__fundacion">
            Organizado por: {fundacionAnimal}
          </p>
        </div>
      </div>

      <div className="solicitud-card">
        <header className="solicitud-card__encabezado">
          <h1>Formulario de Solicitud de Adopción</h1>
          <p>
            Por favor responde las siguientes preguntas con honestidad. Cada fundación
            evalúa las postulaciones para asegurar el bienestar y compatibilidad del animal.
          </p>
        </header>

        {errorServidor && (
          <p className="alerta-error" role="alert" style={{ marginBottom: '1.25rem' }}>
            {errorServidor}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Teléfono de contacto */}
          <div className={`solicitud-campo ${errores.telefono ? 'solicitud-campo--error' : ''}`}>
            <label htmlFor="telefono">Teléfono o WhatsApp de contacto *</label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              placeholder="+56 9 1234 5678"
              value={formulario.telefono}
              onChange={handleChange}
            />
            {errores.telefono && (
              <span className="solicitud-campo__error-msg">{errores.telefono}</span>
            )}
          </div>

          {/* Tipo de vivienda */}
          <div className={`solicitud-campo ${errores.tipoVivienda ? 'solicitud-campo--error' : ''}`}>
            <label htmlFor="tipoVivienda">Tipo de vivienda *</label>
            <select
              id="tipoVivienda"
              name="tipoVivienda"
              value={formulario.tipoVivienda}
              onChange={handleChange}
            >
              <option value="">-- Selecciona una opción --</option>
              <option value="Casa con patio cerrado">Casa con patio cerrado</option>
              <option value="Casa sin patio">Casa sin patio</option>
              <option value="Departamento con mallas de seguridad">
                Departamento con mallas de protección
              </option>
              <option value="Departamento sin mallas">Departamento sin mallas</option>
              <option value="Parcela / Terreno rural">Parcela o terreno rural</option>
            </select>
            {errores.tipoVivienda && (
              <span className="solicitud-campo__error-msg">{errores.tipoVivienda}</span>
            )}
          </div>

          {/* Motivo de adopción */}
          <div className={`solicitud-campo ${errores.motivo ? 'solicitud-campo--error' : ''}`}>
            <label htmlFor="motivo">¿Por qué deseas adoptar a {animal.nombre}? *</label>
            <p className="solicitud-campo__ayuda">
              Cuéntanos sobre tu rutina, con quién vivirá y qué espacio tendrá en tu hogar.
            </p>
            <textarea
              id="motivo"
              name="motivo"
              rows={3}
              placeholder="Ej: Busco un compañero fiel para mi familia, disponemos de tiempo para paseos y..."
              value={formulario.motivo}
              onChange={handleChange}
            />
            {errores.motivo && (
              <span className="solicitud-campo__error-msg">{errores.motivo}</span>
            )}
          </div>

          {/* Experiencia con mascotas */}
          <div className={`solicitud-campo ${errores.experiencia ? 'solicitud-campo--error' : ''}`}>
            <label htmlFor="experiencia">Experiencia previa con animales *</label>
            <p className="solicitud-campo__ayuda">
              ¿Has tenido perros o gatos antes? ¿Tienes veterinario de confianza?
            </p>
            <textarea
              id="experiencia"
              name="experiencia"
              rows={2}
              placeholder="Ej: He tenido perros antes durante 10 años, conozco los cuidados y gastos veterinarios..."
              value={formulario.experiencia}
              onChange={handleChange}
            />
            {errores.experiencia && (
              <span className="solicitud-campo__error-msg">{errores.experiencia}</span>
            )}
          </div>

          {/* Otros animales en casa */}
          <div className="solicitud-campo">
            <label>¿Viven otros animales en tu hogar actualmente?</label>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.4rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'normal' }}>
                <input
                  type="radio"
                  name="otrosAnimales"
                  value="si"
                  checked={formulario.otrosAnimales === 'si'}
                  onChange={handleChange}
                />
                Sí
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'normal' }}>
                <input
                  type="radio"
                  name="otrosAnimales"
                  value="no"
                  checked={formulario.otrosAnimales === 'no'}
                  onChange={handleChange}
                />
                No
              </label>
            </div>
          </div>

          {/* Checkbox de compromiso */}
          <div className={`solicitud-campo-checkbox ${errores.compromiso ? 'solicitud-campo--error' : ''}`}>
            <label className="solicitud-campo-checkbox__label">
              <input
                type="checkbox"
                name="compromiso"
                checked={formulario.compromiso}
                onChange={handleChange}
              />
              <span>
                <strong>Compromiso de tenencia responsable:</strong> Me comprometo a vacunar,
                desparasitar, esterilizar (si aplica), brindar atención veterinaria y jamás
                abandonar al animal. Entiendo que la fundación puede solicitar una visita previa.
              </span>
            </label>
            {errores.compromiso && (
              <span className="solicitud-campo__error-msg" style={{ display: 'block', marginTop: '0.5rem' }}>
                {errores.compromiso}
              </span>
            )}
          </div>

          {/* Botones de acción */}
          <div className="solicitud-acciones">
            {onCancelar && (
              <button
                type="button"
                className="boton-secundario"
                onClick={onCancelar}
                disabled={enviando}
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="boton"
              disabled={enviando}
            >
              {enviando ? 'Enviando solicitud…' : 'Enviar Solicitud de Adopción'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
