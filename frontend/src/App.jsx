import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import FormularioSolicitud from './components/FormularioSolicitud.jsx';
import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import RegistroFundacion from './pages/RegistroFundacion.jsx';
import RecuperarContrasena from './pages/RecuperarContrasena.jsx';
import Panel from './pages/Panel.jsx';
import Perfil from './pages/Perfil.jsx';
import AdminFundaciones from './pages/AdminFundaciones.jsx';
import AdminUsuarios from './pages/AdminUsuarios.jsx';
import AdminEstadisticas from './pages/AdminEstadisticas.jsx';
import MisFavoritos from './pages/MisFavoritos.jsx';
import MisSolicitudes from './pages/MisSolicitudes.jsx';
import GestionFotos from './pages/GestionFotos.jsx';
import SolicitudesFundacion from './pages/SolicitudesFundacion.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';
import FichaAnimal from './pages/FichaAnimal.jsx';
import PerfilFundacion from './pages/PerfilFundacion.jsx';
import MisPublicaciones from './pages/MisPublicaciones.jsx';
import FormularioAnimal from './pages/FormularioAnimal.jsx';
import Visitas from './pages/Visitas.jsx';
import Notificaciones from './pages/Notificaciones.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Públicas */}
        <Route path="/" element={<Inicio />} />
        <Route path="/animales/:id" element={<FichaAnimal />} />
        <Route path="/fundaciones/:id" element={<PerfilFundacion />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/registro-fundacion" element={<RegistroFundacion />} />
        <Route path="/recuperar" element={<RecuperarContrasena />} />

        {/* Requieren sesión */}
        <Route element={<RutaProtegida />}>
          <Route path="/panel" element={<Panel />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/panel/notificaciones" element={<Notificaciones />} />
        </Route>

        {/* Visitas (adoptantes y fundaciones) */}
        <Route element={<RutaProtegida roles={['adoptante', 'fundacion']} />}>
          <Route path="/panel/visitas" element={<Visitas />} />
        </Route>

        {/* Exclusivas para adoptantes */}
        <Route element={<RutaProtegida roles={['adoptante']} />}>
          <Route path="/favoritos" element={<MisFavoritos />} />
          <Route path="/solicitudes" element={<MisSolicitudes />} />
          <Route path="/solicitar" element={<FormularioSolicitud />} />
        </Route>

        {/* Exclusivas para fundaciones */}
        <Route element={<RutaProtegida roles={['fundacion']} />}>
          <Route path="/panel/fotos" element={<GestionFotos />} />
          <Route path="/panel/publicaciones" element={<MisPublicaciones />} />
          <Route path="/panel/publicaciones/nueva" element={<FormularioAnimal />} />
          <Route path="/panel/publicaciones/:id/editar" element={<FormularioAnimal />} />
          <Route path="/panel/solicitudes" element={<SolicitudesFundacion />} />
        </Route>

        {/* Módulo Administración (CU07–CU09) */}
        <Route element={<RutaProtegida roles={['admin']} />}>
          <Route path="/admin/fundaciones" element={<AdminFundaciones />} />
          <Route path="/admin/usuarios" element={<AdminUsuarios />} />
          <Route path="/admin/estadisticas" element={<AdminEstadisticas />} />
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}