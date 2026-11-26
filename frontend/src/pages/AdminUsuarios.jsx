import { useCallback, useEffect, useState } from 'react';
import { pedir } from '../api/cliente.js';
import { useAuth } from '../context/AuthContext.jsx';

const NOMBRE_ROL = { adoptante: 'Adoptante', fundacion: 'Fundación', admin: 'Administrador' };

// CU08 — Gestionar usuarios (listar, bloquear y reactivar)
export default function AdminUsuarios() {
  const { token, usuario: yo } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [rol, setRol] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmando, setConfirmando] = useState(null); // usuario a bloquear o reactivar
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const parametros = new URLSearchParams();
      if (busquedaAplicada) parametros.set('q', busquedaAplicada);
      if (rol) parametros.set('rol', rol);
      const consulta = parametros.toString() ? `?${parametros}` : '';
      const respuesta = await pedir(`/admin/usuarios${consulta}`, { token });
      setUsuarios(respuesta.usuarios);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [busquedaAplicada, rol, token]);

  useEffect(() => { cargar(); }, [cargar]);

  function buscar(evento) {
    evento.preventDefault();
    setBusquedaAplicada(busqueda.trim());
  }

  async function confirmarCambio() {
    const u = confirmando;
    const nuevoEstado = u.estado === 'activo' ? 'bloqueado' : 'activo';
    setProcesando(true);
    setError('');
    setAviso('');
    try {
      const respuesta = await pedir(`/admin/usuarios/${u.usuario_id}/estado`, {
        metodo: 'PATCH',
        token,
        cuerpo: { estado: nuevoEstado },
      });
      setAviso(respuesta.mensaje);
      setConfirmando(null);
      await cargar();
    } catch (err) {
      setError(err.message);
      setConfirmando(null);
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section>
      <h1>Usuarios</h1>
      <p className="subtitulo">Busca cuentas y bloquea o reactiva el acceso.</p>

      <form className="barra-busqueda" onSubmit={buscar}>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar por nombre o correo"
        />
        <select value={rol} onChange={(e) => setRol(e.target.value)} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          <option value="adoptante">Adoptantes</option>
          <option value="fundacion">Fundaciones</option>
          <option value="admin">Administradores</option>
        </select>
        <button type="submit" className="boton">Buscar</button>
      </form>

      {aviso && <p className="alerta-info">{aviso}</p>}
      {error && <p className="alerta-error" role="alert">{error}</p>}

      {cargando ? (
        <p className="cargando">Cargando usuarios…</p>
      ) : usuarios.length === 0 ? (
        <p className="vacio">No se encontraron usuarios.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.usuario_id}>
                  <td>
                    {u.nombre}
                    {u.fundacion_nombre && <span className="detalle">{u.fundacion_nombre}</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>{NOMBRE_ROL[u.rol] ?? u.rol}</td>
                  <td><span className={`estado estado-${u.estado}`}>{u.estado === 'activo' ? 'Activo' : 'Bloqueado'}</span></td>
                  <td>
                    {/* E2: el administrador no puede bloquearse a sí mismo */}
                    {u.usuario_id !== yo.id && (
                      <button
                        type="button"
                        className={`boton boton-chico-tabla ${u.estado === 'activo' ? 'boton-peligro' : ''}`}
                        onClick={() => setConfirmando(u)}
                      >
                        {u.estado === 'activo' ? 'Bloquear' : 'Reactivar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmación antes de bloquear o reactivar */}
      {confirmando && (
        <div className="modal-fondo" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmar">
          <div className="tarjeta modal">
            <h2 id="titulo-confirmar">
              {confirmando.estado === 'activo' ? 'Bloquear cuenta' : 'Reactivar cuenta'}
            </h2>
            <p>
              {confirmando.estado === 'activo'
                ? `${confirmando.nombre} no podrá iniciar sesión hasta que reactives su cuenta.`
                : `${confirmando.nombre} podrá volver a iniciar sesión.`}
            </p>
            <div className="acciones">
              <button
                type="button"
                className={`boton ${confirmando.estado === 'activo' ? 'boton-peligro' : ''}`}
                disabled={procesando}
                onClick={confirmarCambio}
              >
                {procesando ? 'Guardando…' : 'Confirmar'}
              </button>
              <button type="button" className="boton-texto" onClick={() => setConfirmando(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
