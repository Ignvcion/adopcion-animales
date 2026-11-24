import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import FormularioSolicitud from './components/FormularioSolicitud.jsx';
import Inicio from './pages/Inicio.jsx';
import Login from './pages/Login.jsx';
import Panel from './pages/Panel.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Públicas */}
        <Route path="/" element={<Inicio />} />
        <Route path="/login" element={<Login />} />
        <Route path="/solicitud-demo" element={<FormularioSolicitud />} />

        {/* Requieren sesión */}
        <Route element={<RutaProtegida />}>
          <Route path="/panel" element={<Panel />} />
        </Route>

        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
