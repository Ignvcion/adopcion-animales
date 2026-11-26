// Controlador de administración de usuarios.
// CU08 — Gestionar usuarios (listar, bloquear y reactivar).
const { pool } = require('../config/db');

const ROLES = ['adoptante', 'fundacion', 'admin'];
const ESTADOS = ['activo', 'bloqueado'];

/**
 * GET /api/admin/usuarios?q=&rol=&estado=
 * Lista los usuarios. `q` busca por nombre o correo. No devuelve contraseñas.
 */
async function listarUsuarios(req, res, next) {
  try {
    const q = typeof req.query?.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const rol = typeof req.query?.rol === 'string' ? req.query.rol.trim() : '';
    const estado = typeof req.query?.estado === 'string' ? req.query.estado.trim() : '';

    if (rol && !ROLES.includes(rol)) {
      return res.status(400).json({ error: 'Filtro de rol inválido' });
    }
    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Filtro de estado inválido' });
    }

    const condiciones = [];
    const parametros = [];
    if (q) {
      condiciones.push('(LOWER(u.nombre) LIKE ? OR LOWER(u.email) LIKE ?)');
      parametros.push(`%${q}%`, `%${q}%`);
    }
    if (rol) {
      condiciones.push('u.rol = ?');
      parametros.push(rol);
    }
    if (estado) {
      condiciones.push('u.estado = ?');
      parametros.push(estado);
    }

    const [usuarios] = await pool.execute(
      `SELECT u.usuario_id, u.nombre, u.email, u.rol, u.estado, u.telefono, u.comuna, u.creado_en,
              f.nombre AS fundacion_nombre, f.estado AS fundacion_estado
         FROM usuario u
         LEFT JOIN fundacion f ON f.usuario_id = u.usuario_id
        ${condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : ''}
        ORDER BY u.creado_en DESC
        LIMIT 200`,
      parametros
    );

    return res.json({ usuarios });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/admin/usuarios/:id/estado
 * Body: { estado: 'activo' | 'bloqueado' }
 *
 * Flujo normal: bloquea o reactiva una cuenta. Un usuario bloqueado no puede
 * iniciar sesión (lo revisa el CU02) y su sesión abierta deja de valer al
 * recargar la página (lo revisa /api/auth/yo).
 *
 * Excepciones:
 *  E1 — estado inválido                                → 400
 *  E2 — el administrador intenta bloquearse a sí mismo → 400
 *  E3 — el usuario no existe                           → 404
 *  E4 — la cuenta ya está en ese estado                → 409
 */
async function cambiarEstadoUsuario(req, res, next) {
  try {
    const usuarioId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({ error: 'ID de usuario inválido' });
    }

    const nuevoEstado = typeof req.body?.estado === 'string' ? req.body.estado.trim() : '';

    // E1
    if (!ESTADOS.includes(nuevoEstado)) {
      return res.status(400).json({ error: "El estado debe ser 'activo' o 'bloqueado'" });
    }
    // E2
    if (usuarioId === req.usuario.id && nuevoEstado === 'bloqueado') {
      return res.status(400).json({ error: 'No puedes bloquear tu propia cuenta' });
    }

    const [filas] = await pool.execute(
      'SELECT usuario_id, nombre, estado FROM usuario WHERE usuario_id = ? LIMIT 1',
      [usuarioId]
    );
    const usuario = filas[0];

    // E3
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    // E4
    if (usuario.estado === nuevoEstado) {
      return res.status(409).json({
        error: nuevoEstado === 'bloqueado' ? 'La cuenta ya está bloqueada' : 'La cuenta ya está activa',
      });
    }

    await pool.execute('UPDATE usuario SET estado = ? WHERE usuario_id = ?', [nuevoEstado, usuarioId]);

    return res.json({
      mensaje: nuevoEstado === 'bloqueado'
        ? `La cuenta de ${usuario.nombre} fue bloqueada`
        : `La cuenta de ${usuario.nombre} fue reactivada`,
      usuario_id: usuarioId,
      estado: nuevoEstado,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listarUsuarios, cambiarEstadoUsuario };
