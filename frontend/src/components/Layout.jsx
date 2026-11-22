import { Link, NavLink, Outlet } from 'react-router-dom';

// Estructura común de todas las páginas: barra superior, contenido y pie
export default function Layout() {
  return (
    <div className="app">
      <header className="barra">
        <Link to="/" className="marca">
          <img src="/huella.svg" alt="" width="32" height="32" />
          <span>Adopta</span>
        </Link>
        <nav className="menu">
          <NavLink to="/" end>Inicio</NavLink>
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
