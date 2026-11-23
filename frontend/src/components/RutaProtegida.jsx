import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Protege un grupo de rutas: exige sesión y, opcionalmente, ciertos roles.
 * Uso: <Route element={<RutaProtegida roles={['admin']} />}> ... </Route>
 */
export default function RutaProtegida({ roles }) {
  const { usuario, verificando } = useAuth();
  const ubicacion = useLocation();

  if (verificando) {
    return <p className="cargando">Cargando…</p>;
  }
  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }
  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
