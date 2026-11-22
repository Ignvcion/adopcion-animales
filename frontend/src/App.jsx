import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
    </Routes>
  );
}
