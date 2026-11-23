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
    </section>
  );
}
