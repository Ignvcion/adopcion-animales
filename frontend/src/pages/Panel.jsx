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

      {/* Módulo Adopción y Seguimiento (CU21–CU30) */}
      <div style={{ marginTop: '2rem' }}>
        <h2>Adopciones y Solicitudes</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <Link to="/solicitud-demo" className="boton">
            Boceto: Formulario de Solicitud (CU23)
          </Link>
        </div>
      </div>
    </section>
  );
}
