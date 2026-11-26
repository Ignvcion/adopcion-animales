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
import MisFavoritos from './pages/MisFavoritos.jsx';
import MisSolicitudes from './pages/MisSolicitudes.jsx';
import GestionFotos from './pages/GestionFotos.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Públicas */}
        <Route path="/" element={<Inicio />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/registro-fundacion" element={<RegistroFundacion />} />
        <Route path="/recuperar" element={<RecuperarContrasena />} />

        {/* Requieren sesión */}
        <Route element={<RutaProtegida />}>
          <Route path="/panel" element={<Panel />} />
          <Route path="/perfil" element={<Perfil />} />
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
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}