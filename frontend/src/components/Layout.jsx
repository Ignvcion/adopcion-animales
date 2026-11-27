import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

// Estructura común de todas las páginas: barra superior, contenido y pie
export default function Layout() {
  const { usuario, token, cerrarSesion } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const [noLeidas, setNoLeidas] = useState(0);
  const [recientes, setRecientes] = useState([]);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const campanaRef = useRef(null);

  const cargarNotificaciones = useCallback(async () => {
    if (!usuario || !token) {
      setNoLeidas(0);
      setRecientes([]);
      return;
    }
    try {
      const datos = await pedir('/notificaciones', { token });
      setNoLeidas(datos.no_leidas || 0);
      setRecientes((datos.notificaciones || []).slice(0, 5));
    } catch {
      // No interrumpir la navegación si falla el conteo de notificaciones
    }
  }, [usuario, token]);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones, ubicacion.pathname]);

  useEffect(() => {
    const actualizar = () => cargarNotificaciones();
    window.addEventListener('notificaciones:actualizar', actualizar);
    return () => window.removeEventListener('notificaciones:actualizar', actualizar);
  }, [cargarNotificaciones]);

  // Al cambiar de página se cierran el panel de notificaciones y el menú móvil
  useEffect(() => {
    setPanelAbierto(false);
    setMenuAbierto(false);
  }, [ubicacion.pathname]);

  useEffect(() => {
    function manejarClickExterno(e) {
      if (campanaRef.current && !campanaRef.current.contains(e.target)) {
        setPanelAbierto(false);
      }
    }
    document.addEventListener('mousedown', manejarClickExterno);
    return () => document.removeEventListener('mousedown', manejarClickExterno);
  }, []);

  async function marcarRapidaComoLeida(notificacionId) {
    if (!token) return;
    try {
      const resp = await pedir(`/notificaciones/${notificacionId}/leer`, {
        metodo: 'PATCH',
        token,
      });
      setNoLeidas(resp.no_leidas ?? 0);
      setRecientes((prev) =>
        prev.map((n) => (n.notificacion_id === notificacionId ? { ...n, leida: true } : n))
      );
      window.dispatchEvent(new Event('notificaciones:actualizar'));
    } catch {
      // Ignorar fallo silencioso en vista previa rápida
    }
  }

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
        <button
          type="button"
          className="menu-boton"
          aria-expanded={menuAbierto}
          aria-controls="menu-principal"
          onClick={() => setMenuAbierto((prev) => !prev)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            {menuAbierto ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
          Menú
        </button>
        <nav id="menu-principal" className={`menu${menuAbierto ? ' abierto' : ''}`} aria-label="Principal">
          <NavLink to="/" end>Inicio</NavLink>
          <NavLink to="/historias">Historias</NavLink>
          {usuario ? (
            <>
              {usuario.rol === 'adoptante' && (
                <>
                  <NavLink to="/favoritos">Mis favoritos</NavLink>
                  <NavLink to="/solicitudes">Mis solicitudes</NavLink>
                </>
              )}
              <div className="campana-contenedor" ref={campanaRef}>
                <button
                  type="button"
                  className="campana-boton"
                  aria-label={`Notificaciones (${noLeidas} sin leer)`}
                  aria-expanded={panelAbierto}
                  onClick={() => setPanelAbierto((prev) => !prev)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {noLeidas > 0 && (
                    <span className="campana-contador">{noLeidas > 99 ? '99+' : noLeidas}</span>
                  )}
                </button>

                {panelAbierto && (
                  <div className="tarjeta campana-desplegable" role="region" aria-label="Notificaciones recientes">
                    <div className="campana-desplegable__cabecera">
                      <strong>Notificaciones</strong>
                      <Link to="/panel/notificaciones" className="campana-desplegable__ver-todas">
                        Ver todas
                      </Link>
                    </div>

                    {recientes.length === 0 ? (
                      <p className="subtitulo" style={{ margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
                        No tienes notificaciones aún.
                      </p>
                    ) : (
                      <ul className="campana-lista">
                        {recientes.map((n) => (
                          <li
                            key={n.notificacion_id}
                            className={`campana-lista__item ${!n.leida ? 'campana-lista__item--no-leida' : ''}`}
                          >
                            <div className="campana-lista__titulo">{n.titulo}</div>
                            <p className="campana-lista__mensaje">{n.mensaje}</p>
                            {!n.leida && (
                              <button
                                type="button"
                                className="boton-texto"
                                style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}
                                onClick={() => marcarRapidaComoLeida(n.notificacion_id)}
                              >
                                Marcar como leída
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
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
        <p>Adopta. Proyecto de Ingeniería en Computación e Informática.</p>
      </footer>
    </div>
  );
}
