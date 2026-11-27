import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

// Nombres y colores de cada estado, en el orden en que se muestran
const ANIMALES = [
  { clave: 'disponible', texto: 'Disponibles', color: 'var(--color-primario)' },
  { clave: 'en_proceso', texto: 'En proceso', color: 'var(--color-acento)' },
  { clave: 'adoptado', texto: 'Adoptados', color: 'var(--color-exito)' },
  { clave: 'archivado', texto: 'Archivados', color: 'var(--color-borde-fuerte)' },
];
const SOLICITUDES = [
  { clave: 'pendiente', texto: 'Pendientes', color: 'var(--color-acento)' },
  { clave: 'en_revision', texto: 'En revisión', color: 'var(--color-primario)' },
  { clave: 'aprobada', texto: 'Aprobadas', color: 'var(--color-exito)' },
  { clave: 'completada', texto: 'Completadas', color: '#0f5132' },
  { clave: 'rechazada', texto: 'Rechazadas', color: 'var(--color-error)' },
  { clave: 'cancelada', texto: 'Canceladas', color: 'var(--color-borde-fuerte)' },
];

/** Barra horizontal dividida en tramos, uno por estado, proporcional a su cantidad. */
function BarraEstados({ titulo, total, valores, segmentos }) {
  return (
    <section className="estadistica">
      <header className="estadistica__cabecera">
        <h2>{titulo}</h2>
        <span className="estadistica__total">{total}</span>
      </header>

      {total === 0 ? (
        <p className="vacio-chico">Todavía no hay registros.</p>
      ) : (
        <>
          <div className="barra-estados" role="img"
            aria-label={segmentos.map((s) => `${s.texto}: ${valores[s.clave]}`).join(', ')}>
            {segmentos.filter((s) => valores[s.clave] > 0).map((s) => (
              <span key={s.clave} style={{ flexGrow: valores[s.clave], background: s.color }} />
            ))}
          </div>
          <ul className="leyenda">
            {segmentos.map((s) => (
              <li key={s.clave}>
                <span className="leyenda__punto" style={{ background: s.color }} />
                {s.texto}
                <strong>{valores[s.clave]}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// CU09 — Ver panel de estadísticas
export default function AdminEstadisticas() {
  const { token } = useAuth();
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    pedir('/admin/estadisticas', { token })
      .then(setDatos)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p className="alerta-error" role="alert">{error}</p>;
  if (!datos) return <p className="cargando">Calculando estadísticas…</p>;

  const { usuarios, fundaciones, animales, solicitudes, adopciones } = datos;

  return (
    <div className="panel-estadisticas">
      <header className="encabezado-seccion">
        <h1>Estadísticas de la plataforma</h1>
        <p className="subtitulo">Usuarios, fundaciones, animales y solicitudes registrados hasta hoy.</p>
      </header>

      {/* Lo más importante de la plataforma, en una frase */}
      <section className="resumen-adopciones">
        <p className="resumen-adopciones__cifra">{adopciones}</p>
        <p className="resumen-adopciones__texto">
          {adopciones === 1 ? 'animal ya encontró hogar' : 'animales ya encontraron hogar'}
          {' '}gracias a {fundaciones.por_estado.aprobada}{' '}
          {fundaciones.por_estado.aprobada === 1 ? 'fundación' : 'fundaciones'}.
        </p>
      </section>

      {/* Lo que requiere acción del administrador */}
      {fundaciones.por_estado.pendiente > 0 && (
        <Link to="/admin/fundaciones" className="aviso-accion">
          {fundaciones.por_estado.pendiente === 1
            ? 'Hay 1 fundación esperando revisión'
            : `Hay ${fundaciones.por_estado.pendiente} fundaciones esperando revisión`}
          <span>Revisar</span>
        </Link>
      )}

      <div className="rejilla-estadisticas">
        <BarraEstados titulo="Animales publicados" total={animales.total}
          valores={animales.por_estado} segmentos={ANIMALES} />
        <BarraEstados titulo="Solicitudes de adopción" total={solicitudes.total}
          valores={solicitudes.por_estado} segmentos={SOLICITUDES} />
      </div>

      <section className="estadistica">
        <h2>Comunidad</h2>
        <dl className="cifras">
          <div><dt>Adoptantes</dt><dd>{usuarios.por_rol.adoptante}</dd></div>
          <div><dt>Fundaciones</dt><dd>{usuarios.por_rol.fundacion}</dd></div>
          <div><dt>Administradores</dt><dd>{usuarios.por_rol.admin}</dd></div>
          <div><dt>Cuentas bloqueadas</dt><dd>{usuarios.bloqueados}</dd></div>
          <div><dt>Perros</dt><dd>{animales.por_especie.perro}</dd></div>
          <div><dt>Gatos</dt><dd>{animales.por_especie.gato}</dd></div>
          <div><dt>Solicitudes en los últimos 7 días</dt><dd>{solicitudes.ultimos_7_dias}</dd></div>
        </dl>
      </section>
    </div>
  );
}
