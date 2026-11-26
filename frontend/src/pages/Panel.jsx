import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NOMBRE_ROL = {
  adoptante: 'Adoptante',
  fundacion: 'Fundación',
  admin: 'Administrador',
};

// Página de bienvenida después de iniciar sesión.
// Cada módulo agrega aquí los accesos de su rol.
export default function Panel() {
  const { usuario } = useAuth();

  return (
    <section>
      <h1>Hola, {usuario.nombre}</h1>
      <p className="subtitulo">Entraste como {NOMBRE_ROL[usuario.rol] ?? usuario.rol}.</p>

      {/* Módulo Adopción y Seguimiento (CU21–CU24) */}
      {usuario.rol === 'adoptante' && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Adopciones y Solicitudes</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link to="/favoritos" className="boton">
              Mis favoritos
            </Link>
            <Link to="/solicitudes" className="boton">
              Mis solicitudes
            </Link>
          </div>
        </div>
      )}

      {/* Módulo Animales y Fundaciones (CU11–CU14) */}
      {usuario.rol === 'fundacion' && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Gestión de animales</h2>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link to="/panel/fotos" className="boton">
              Subir y ordenar fotos
            </Link>
          </div>
        </div>
      )}

      {/* Módulo Solicitudes Fundación (CU25–CU26) */}
      {usuario.rol === 'fundacion' && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Solicitudes de adopción recibidas</h2>
          <p className="subtitulo">Revisa y gestiona las postulaciones para los animales de tu fundación.</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Link to="/panel/solicitudes" className="boton">
              Ver solicitudes recibidas
            </Link>
          </div>
        </div>
      )}

      {/* Módulo Administración (CU07–CU09) */}
      {usuario.rol === 'admin' && (
        <div className="seccion-panel">
          <h2>Administración</h2>
          <div className="acciones">
            <Link to="/admin/estadisticas" className="boton">Ver estadísticas</Link>
            <Link to="/admin/fundaciones" className="boton">Revisar fundaciones</Link>
            <Link to="/admin/usuarios" className="boton">Gestionar usuarios</Link>
          </div>
        </div>
      )}
    </section>
  );
}