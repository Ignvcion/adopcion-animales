// Controlador del módulo de notificaciones (CU28).
// CU28 — Listar notificaciones del usuario autenticado y marcarlas como leídas.
const { pool } = require('../config/db');

/**
 * GET /api/notificaciones (CU28)
 * Devuelve las notificaciones del usuario autenticado ordenadas de más reciente
 * a más antigua, junto con el conteo de no leídas.
 */
async function listarNotificaciones(req, res, next) {
  let conexion;
  try {
    conexion = await pool.getConnection();

    const [filas] = await conexion.execute(
      `SELECT n.notificacion_id,
              n.usuario_id,
              n.animal_id,
              n.solicitud_id,
              n.tipo,
              n.titulo,
              n.mensaje,
              n.leida,
              n.leida_en,
              n.creado_en,
              a.nombre AS animal_nombre,
              s.codigo AS solicitud_codigo
         FROM notificacion n
         LEFT JOIN animal a ON a.animal_id = n.animal_id
         LEFT JOIN solicitud s ON s.solicitud_id = n.solicitud_id
        WHERE n.usuario_id = ?
        ORDER BY n.creado_en DESC, n.notificacion_id DESC`,
      [req.usuario.id]
    );

    const [conteo] = await conexion.execute(
      `SELECT COUNT(*) AS no_leidas
         FROM notificacion
        WHERE usuario_id = ? AND leida = 0`,
      [req.usuario.id]
    );

    const notificaciones = filas.map((fila) => ({
      ...fila,
      leida: Boolean(fila.leida),
    }));

    return res.json({
      notificaciones,
      no_leidas: Number(conteo[0]?.no_leidas || 0),
    });
  } catch (error) {
    return next(error);
  } finally {
    if (conexion) conexion.release();
  }
}

/**
 * PATCH /api/notificaciones/leer-todas (CU28)
 * Marca todas las notificaciones no leídas del usuario autenticado como leídas.
 */
async function marcarTodasLeidas(req, res, next) {
  let conexion;
  try {
    conexion = await pool.getConnection();

    const [resultado] = await conexion.execute(
      `UPDATE notificacion
          SET leida = 1,
              leida_en = COALESCE(leida_en, NOW())
        WHERE usuario_id = ? AND leida = 0`,
      [req.usuario.id]
    );

    return res.json({
      mensaje: 'Todas las notificaciones fueron marcadas como leídas',
      actualizadas: resultado.affectedRows,
      no_leidas: 0,
    });
  } catch (error) {
    return next(error);
  } finally {
    if (conexion) conexion.release();
  }
}

/**
 * PATCH /api/notificaciones/:id/leer (CU28)
 * Marca una notificación específica del usuario autenticado como leída.
 */
async function marcarNotificacionLeida(req, res, next) {
  const notificacionId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(notificacionId) || notificacionId <= 0) {
    return res.status(400).json({ error: 'ID de notificación inválido' });
  }

  let conexion;
  try {
    conexion = await pool.getConnection();

    const [resultado] = await conexion.execute(
      `UPDATE notificacion
          SET leida = 1,
              leida_en = COALESCE(leida_en, NOW())
        WHERE notificacion_id = ? AND usuario_id = ?`,
      [notificacionId, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const [conteo] = await conexion.execute(
      `SELECT COUNT(*) AS no_leidas
         FROM notificacion
        WHERE usuario_id = ? AND leida = 0`,
      [req.usuario.id]
    );

    return res.json({
      mensaje: 'Notificación marcada como leída',
      notificacion_id: notificacionId,
      no_leidas: Number(conteo[0]?.no_leidas || 0),
    });
  } catch (error) {
    return next(error);
  } finally {
    if (conexion) conexion.release();
  }
}

module.exports = {
  listarNotificaciones,
  marcarTodasLeidas,
  marcarNotificacionLeida,
};
