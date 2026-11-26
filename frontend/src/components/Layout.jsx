import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Estructura común de todas las páginas: barra superior, contenido y pie
export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  const navegar = useNavigate();

  // CU03 — Cerrar sesión y volver al inicio
  function salir() {
    cerrarSesion();
    navegar('/', { replace: true });
  }

  return (
    <div className="app">
      <header className="barra">
        <Link to="/" className="marca">
          <img src="/huella.svg" alt="" width="32" height="32" />
          <span>Adopta</span>
        </Link>
        <nav className="menu">
          <NavLink to="/" end>Inicio</NavLink>
          {usuario ? (
            <>
              {usuario.rol === 'adoptante' && (
                <>
                  <NavLink to="/favoritos">Mis favoritos</NavLink>
                  <NavLink to="/solicitudes">Mis solicitudes</NavLink>
                </>
              )}
              <NavLink to="/panel">Panel</NavLink>
              <NavLink to="/perfil">{usuario.nombre}</NavLink>
              <button type="button" className="boton-texto" onClick={salir}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <NavLink to="/registro">Crear cuenta</NavLink>
              <NavLink to="/login" className="boton boton-chico">Iniciar sesión</NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="contenido">
        <Outlet />
      </main>

      <footer className="pie">
        <p>Adopta · Proyecto de Ingeniería en Computación e Informática</p>
      </footer>
    </div>
  );
}
