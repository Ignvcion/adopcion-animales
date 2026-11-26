// Controlador de administración de fundaciones.
// CU07 — Aprobar o rechazar fundación.
const { pool } = require('../config/db');

const ESTADOS = ['pendiente', 'aprobada', 'rechazada'];

/**
 * GET /api/admin/fundaciones?estado=pendiente|aprobada|rechazada
 * Lista las fundaciones con los datos de su responsable. Sin filtro, trae todas,
 * con las pendientes primero porque son las que esperan una decisión.
 */
async function listarFundaciones(req, res, next) {
  try {
    const estado = typeof req.query?.estado === 'string' ? req.query.estado.trim() : '';
    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Filtro de estado inválido' });
    }

    const [fundaciones] = await pool.execute(
      `SELECT f.fundacion_id, f.nombre, f.rut, f.comuna, f.descripcion, f.telefono,
              f.sitio_web, f.estado, f.motivo_rechazo, f.creado_en,
              u.usuario_id, u.nombre AS responsable_nombre, u.email AS responsable_email,
              u.telefono AS responsable_telefono
         FROM fundacion f
         INNER JOIN usuario u ON u.usuario_id = f.usuario_id
        ${estado ? 'WHERE f.estado = ?' : ''}
        ORDER BY (f.estado = 'pendiente') DESC, f.creado_en DESC`,
      estado ? [estado] : []
    );

    return res.json({ fundaciones });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/admin/fundaciones/:id
 * Body: { accion: 'aprobar' | 'rechazar', motivo? }
 *
 * Flujo normal: cambia el estado de una fundación pendiente y le deja una
 * notificación a su responsable. Una fundación aprobada ya puede iniciar sesión
 * y publicar animales.
 *
 * Excepciones:
 *  E1 — acción inválida, o rechazo sin motivo          → 400
 *  E2 — la fundación no existe                          → 404
 *  E3 — la fundación ya fue revisada (no está pendiente) → 409
 */
async function revisarFundacion(req, res, next) {
  try {
    const fundacionId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(fundacionId) || fundacionId <= 0) {
      return res.status(400).json({ error: 'ID de fundación inválido' });
    }

    const accion = typeof req.body?.accion === 'string' ? req.body.accion.trim().toLowerCase() : '';
    const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';

    // E1
    if (!['aprobar', 'rechazar'].includes(accion)) {
      return res.status(400).json({ error: "La acción debe ser 'aprobar' o 'rechazar'" });
    }
    if (accion === 'rechazar' && !motivo) {
      return res.status(400).json({ error: 'Debes indicar el motivo del rechazo' });
    }
    if (motivo.length > 255) {
      return res.status(400).json({ error: 'El motivo no puede superar los 255 caracteres' });
    }

    const [filas] = await pool.execute(
      'SELECT fundacion_id, usuario_id, nombre, estado FROM fundacion WHERE fundacion_id = ? LIMIT 1',
      [fundacionId]
    );
    const fundacion = filas[0];

    // E2
    if (!fundacion) {
      return res.status(404).json({ error: 'Fundación no encontrada' });
    }
    // E3
    if (fundacion.estado !== 'pendiente') {
      return res.status(409).json({ error: `Esta fundación ya fue revisada (estado: ${fundacion.estado})` });
    }

    const nuevoEstado = accion === 'aprobar' ? 'aprobada' : 'rechazada';
    const titulo = accion === 'aprobar'
      ? 'Tu fundación fue aprobada'
      : 'Tu solicitud de fundación fue rechazada';
    const mensaje = accion === 'aprobar'
      ? `¡Bienvenidos! ${fundacion.nombre} ya puede publicar animales en adopción.`
      : `La solicitud de ${fundacion.nombre} fue rechazada. Motivo: ${motivo}`;

    // Cambio de estado y notificación juntos
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [resultado] = await conexion.execute(
        // La condición estado = 'pendiente' evita que dos administradores la revisen a la vez
        "UPDATE fundacion SET estado = ?, motivo_rechazo = ? WHERE fundacion_id = ? AND estado = 'pendiente'",
        [nuevoEstado, accion === 'rechazar' ? motivo : null, fundacionId]
      );
      if (resultado.affectedRows === 0) {
        await conexion.rollback();
        return res.status(409).json({ error: 'Esta fundación ya fue revisada por otro administrador' });
      }
      await conexion.execute(
        `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje)
         VALUES (?, 'sistema', ?, ?)`,
        [fundacion.usuario_id, titulo, mensaje]
      );
      await conexion.commit();
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }

    return res.json({
      mensaje: accion === 'aprobar' ? 'Fundación aprobada' : 'Fundación rechazada',
      fundacion_id: fundacionId,
      estado: nuevoEstado,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listarFundaciones, revisarFundacion };
