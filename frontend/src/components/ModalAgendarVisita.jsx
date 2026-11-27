import { useState } from 'react';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

// CU27 — Modal reutilizable para proponer/agendar una visita desde una solicitud
export default function ModalAgendarVisita({ solicitud, onCerrar, onAgendada }) {
  const { token } = useAuth();

  const [tipo, setTipo] = useState('pre_adopcion');
  const [modalidad, setModalidad] = useState('presencial');
  const [fechaHora, setFechaHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (!fechaHora) {
      setError('Debes seleccionar una fecha y hora para la visita.');
      return;
    }
    if (!lugar.trim()) {
      setError(
        modalidad === 'videollamada'
          ? 'Debes indicar el enlace de la videollamada.'
          : 'Debes indicar la dirección o punto de encuentro.'
      );
      return;
    }

    setEnviando(true);
    try {
      const resp = await pedir('/visitas', {
        metodo: 'POST',
        token,
        cuerpo: {
          solicitud_id: solicitud.solicitud_id,
          tipo,
          modalidad,
          fecha_programada: fechaHora,
          direccion_o_enlace: lugar.trim(),
          notas: notas.trim() || undefined,
        },
      });
      window.dispatchEvent(new Event('notificaciones:actualizar'));
      onAgendada?.(resp.visita);
    } catch (err) {
      setError(err.message || 'No se pudo agendar la visita.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="modal-fondo"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-visita-titulo"
    >
      <div className="tarjeta modal" style={{ maxWidth: 480 }}>
        <h2 id="modal-visita-titulo" style={{ marginTop: 0 }}>
          Agendar visita para {solicitud.animal_nombre}
        </h2>
        <p className="subtitulo" style={{ marginBottom: '1rem' }}>
          {solicitud.codigo ? `Solicitud ${solicitud.codigo} · ` : ''}
          Coordina un encuentro para conocer a {solicitud.animal_nombre}.
        </p>

        <form onSubmit={manejarSubmit} className="formulario" style={{ margin: 0, maxWidth: '100%' }}>
          <label htmlFor="visita-tipo">Tipo de visita</label>
          <select
            id="visita-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={enviando}
            style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid var(--color-borde)', borderRadius: '10px', background: '#fff' }}
          >
            <option value="pre_adopcion">Visita previa a la adopción</option>
            <option value="seguimiento">Visita de seguimiento</option>
          </select>

          <label htmlFor="visita-modalidad">Modalidad</label>
          <select
            id="visita-modalidad"
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            disabled={enviando}
            style={{ width: '100%', padding: '0.65rem 0.8rem', border: '1px solid var(--color-borde)', borderRadius: '10px', background: '#fff' }}
          >
            <option value="presencial">Presencial</option>
            <option value="videollamada">Videollamada</option>
          </select>

          <label htmlFor="visita-fecha">Fecha y hora</label>
          <input
            id="visita-fecha"
            type="datetime-local"
            value={fechaHora}
            onChange={(e) => setFechaHora(e.target.value)}
            disabled={enviando}
            required
          />

          <label htmlFor="visita-lugar">
            {modalidad === 'videollamada' ? 'Enlace de videollamada' : 'Dirección o lugar de encuentro'}
          </label>
          <input
            id="visita-lugar"
            type="text"
            maxLength={255}
            placeholder={
              modalidad === 'videollamada'
                ? 'Ej: https://meet.google.com/abc-defg-hij'
                : 'Ej: Av. Irarrázaval 1234, Ñuñoa'
            }
            value={lugar}
            onChange={(e) => setLugar(e.target.value)}
            disabled={enviando}
            required
          />

          <label htmlFor="visita-notas">Notas adicionales (opcional)</label>
          <textarea
            id="visita-notas"
            rows={3}
            maxLength={2000}
            placeholder="Indicaciones de acceso, referencias o comentarios…"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={enviando}
          />

          {error && (
            <p className="alerta-error" role="alert">
              {error}
            </p>
          )}

          <div className="acciones" style={{ marginTop: '1.25rem' }}>
            <button type="submit" className="boton" disabled={enviando}>
              {enviando ? 'Agendando…' : 'Confirmar agenda'}
            </button>
            <button
              type="button"
              className="boton boton-secundario"
              onClick={onCerrar}
              disabled={enviando}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
