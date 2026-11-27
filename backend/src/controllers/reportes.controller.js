// Controlador del módulo de reportes (CU29).
// CU29 — Reportar publicación sospechosa (adoptante) y listar reportes (admin).
const { pool } = require('../config/db');

const MOTIVOS_VALIDOS = [
  'informacion_falsa',
  'maltrato',
  'cobro_indebido',
  'contenido_inapropiado',
  'otro',
];
const ESTADOS_REPORTE_VALIDOS = ['pendiente', 'en_revision', 'resuelto', 'descartado'];

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/**
 * POST /api/reportes (CU29)
 * Body: { animal_id, motivo, descripcion }
 */
async function crearReporte(req, res, next) {
  const animalId = Number.parseInt(req.body?.animal_id ?? req.body?.animalId, 10);
  if (!Number.isInteger(animalId) || animalId <= 0) {
    return res.status(400).json({ error: 'ID de animal inválido' });
  }

  const motivo = texto(req.body?.motivo).toLowerCase();
  if (!MOTIVOS_VALIDOS.includes(motivo)) {
    return res.status(400).json({
      error: 'El motivo debe ser informacion_falsa, maltrato, cobro_indebido, contenido_inapropiado u otro',
    });
  }

  const descripcion = texto(req.body?.descripcion);
  if (!descripcion || descripcion.length < 10) {
    return res.status(400).json({
      error: 'Por favor describe el motivo del reporte en al menos 10 caracteres',
    });
  }
  if (descripcion.length > 2000) {
    return res.status(400).json({ error: 'La descripción no puede superar los 2000 caracteres' });
  }

  let conexion;
  try {
    conexion = await pool.getConnection();

    const [animales] = await conexion.execute(
      `SELECT a.animal_id, a.nombre, a.estado
         FROM animal a
         INNER JOIN fundacion f ON f.fundacion_id = a.fundacion_id
        WHERE a.animal_id = ?
          AND a.estado <> 'archivado'
          AND f.estado = 'aprobada'
        LIMIT 1`,
      [animalId]
    );
    const animal = animales[0];
    if (!animal) {
      return res.status(404).json({ error: 'Publicación de animal no encontrada' });
    }

    const [existentes] = await conexion.execute(
      `SELECT reporte_id
         FROM reporte
        WHERE usuario_id = ?
          AND animal_id = ?
          AND estado IN ('pendiente', 'en_revision')
        LIMIT 1`,
      [req.usuario.id, animalId]
    );
    if (existentes.length > 0) {
      return res.status(409).json({
        error: 'Ya enviaste un reporte abierto para esta publicación',
      });
    }

    const [resultado] = await conexion.execute(
      `INSERT INTO reporte (usuario_id, animal_id, motivo, descripcion, estado)
       VALUES (?, ?, ?, ?, 'pendiente')`,
      [req.usuario.id, animalId, motivo, descripcion]
    );

    return res.status(201).json({
      mensaje: 'Reporte enviado correctamente. Nuestro equipo lo revisará a la brevedad.',
      reporte: {
        reporte_id: resultado.insertId,
        usuario_id: req.usuario.id,
        animal_id: animalId,
        motivo,
        descripcion,
        estado: 'pendiente',
      },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (conexion) conexion.release();
  }
}

/**
 * GET /api/reportes (CU29)
 * Lista los reportes recibidos para revisión del administrador.
 * Query param opcional: ?estado=pendiente|en_revision|resuelto|descartado
 */
async function listarReportes(req, res, next) {
  const estado = texto(req.query?.estado).toLowerCase();
  if (estado && !ESTADOS_REPORTE_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Filtro de estado de reporte inválido' });
  }

  let conexion;
  try {
    conexion = await pool.getConnection();

    const condiciones = estado ? ['r.estado = ?'] : [];
    const params = estado ? [estado] : [];
    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [reportes] = await conexion.execute(
      `SELECT r.reporte_id,
              r.usuario_id,
              r.animal_id,
              r.revisado_por,
              r.motivo,
              r.descripcion,
              r.estado,
              r.resolucion,
              r.creado_en,
              r.actualizado_en,
              u.nombre AS reportante_nombre,
              u.email AS reportante_email,
              a.nombre AS animal_nombre,
              a.especie AS animal_especie,
              a.estado AS animal_estado,
              f.fundacion_id,
              f.nombre AS fundacion_nombre,
              rev.nombre AS revisor_nombre
         FROM reporte r
         INNER JOIN usuario u ON u.usuario_id = r.usuario_id
         LEFT JOIN animal a ON a.animal_id = r.animal_id
         LEFT JOIN fundacion f ON f.fundacion_id = a.fundacion_id
         LEFT JOIN usuario rev ON rev.usuario_id = r.revisado_por
        ${whereClause}
        ORDER BY r.creado_en DESC, r.reporte_id DESC`,
      params
    );

    return res.json({ reportes });
  } catch (error) {
    return next(error);
  } finally {
    if (conexion) conexion.release();
  }
}

module.exports = {
  crearReporte,
  listarReportes,
};
