// Controlador del módulo de solicitudes de adopción (CU23–CU26).
// CU23 — Enviar solicitud de adopción.
// CU24 — Consultar historial de solicitudes del usuario autenticado.
// CU25 — Listar solicitudes recibidas por la fundación autenticada.
// CU26 — Aprobar o rechazar una solicitud de adopción.
const { pool } = require('../config/db');

const TELEFONO_VALIDO = /^\+?[0-9 ]{8,15}$/;
const ESTADOS_ACTIVOS = ['pendiente', 'en_revision', 'aprobada'];

// Estados que ya tienen resolución final y no pueden modificarse de nuevo
const ESTADOS_RESUELTOS = ['aprobada', 'rechazada', 'cancelada', 'completada'];

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

function normalizarBooleano(valor) {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  if (typeof valor === 'string') {
    const limpio = valor.trim().toLowerCase();
    return ['si', 'sí', 'true', '1'].includes(limpio);
  }
  return false;
}

/**
 * POST /api/solicitudes (CU23)
 * Body: { animal_id, telefono, tipo_vivienda, experiencia, motivo,
 *         otros_animales?, compromiso }
 * Registra una nueva postulación de adopción para un animal disponible.
 */
async function crearSolicitud(req, res, next) {
  try {
    const animalId = Number.parseInt(req.body?.animal_id ?? req.body?.animalId, 10);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ error: 'ID de animal inválido' });
    }

    const telefono = texto(req.body?.telefono);
    const tipoVivienda = texto(req.body?.tipo_vivienda ?? req.body?.tipoVivienda);
    const experiencia = texto(req.body?.experiencia);
    const motivo = texto(req.body?.motivo);
    const otrosAnimales = normalizarBooleano(req.body?.otros_animales ?? req.body?.otrosAnimales) ? 1 : 0;
    const compromiso = normalizarBooleano(req.body?.compromiso);

    if (!telefono || !tipoVivienda || !experiencia || !motivo) {
      return res.status(400).json({
        error: 'Teléfono, tipo de vivienda, experiencia y motivo son obligatorios',
      });
    }
    if (!TELEFONO_VALIDO.test(telefono) || telefono.length > 20) {
      return res.status(400).json({
        error: 'El teléfono no tiene un formato válido (ej: +56 9 1234 5678)',
      });
    }
    if (tipoVivienda.length > 80) {
      return res.status(400).json({ error: 'El tipo de vivienda supera el largo permitido' });
    }
    if (motivo.length < 20) {
      return res.status(400).json({
        error: 'Por favor escribe al menos 20 caracteres sobre tu motivo de adopción',
      });
    }
    if (!compromiso) {
      return res.status(400).json({
        error: 'Debes aceptar el compromiso de tenencia responsable',
      });
    }

    const [animales] = await pool.execute(
      `SELECT a.animal_id, a.nombre, a.estado, f.nombre AS fundacion_nombre
         FROM animal a
         INNER JOIN fundacion f ON f.fundacion_id = a.fundacion_id
        WHERE a.animal_id = ?
        LIMIT 1`,
      [animalId]
    );
    const animal = animales[0];
    if (!animal) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }
    if (animal.estado !== 'disponible') {
      return res.status(400).json({
        error: 'Este animal no está disponible para recibir solicitudes de adopción',
      });
    }

    const [activas] = await pool.execute(
      `SELECT solicitud_id, codigo, estado
         FROM solicitud
        WHERE usuario_id = ?
          AND animal_id = ?
          AND estado IN (?, ?, ?)
        LIMIT 1`,
      [req.usuario.id, animalId, ...ESTADOS_ACTIVOS]
    );
    if (activas.length > 0) {
      return res.status(409).json({
        error: 'Ya tienes una solicitud activa para este animal',
      });
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const [resultado] = await conexion.execute(
        `INSERT INTO solicitud (
           usuario_id, animal_id, telefono, tipo_vivienda,
           experiencia, motivo, otros_animales, compromiso, estado
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'pendiente')`,
        [req.usuario.id, animalId, telefono, tipoVivienda, experiencia, motivo, otrosAnimales]
      );

      const solicitudId = resultado.insertId;
      const codigo = `SOL-${String(solicitudId).padStart(4, '0')}`;

      await conexion.execute(
        'UPDATE solicitud SET codigo = ? WHERE solicitud_id = ?',
        [codigo, solicitudId]
      );

      await conexion.commit();

      return res.status(201).json({
        mensaje: 'Solicitud de adopción enviada correctamente',
        solicitud: {
          solicitud_id: solicitudId,
          usuario_id: req.usuario.id,
          animal_id: animalId,
          codigo,
          telefono,
          tipo_vivienda: tipoVivienda,
          experiencia,
          motivo,
          otros_animales: Boolean(otrosAnimales),
          compromiso: true,
          estado: 'pendiente',
          animal_nombre: animal.nombre,
          fundacion_nombre: animal.fundacion_nombre,
        },
      });
    } catch (err) {
      await conexion.rollback();
      throw err;
    } finally {
      conexion.release();
    }
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/solicitudes/mias (CU24)
 * Lista el historial de solicitudes de adopción del usuario autenticado.
 */
async function listarMisSolicitudes(req, res, next) {
  try {
    const [filas] = await pool.execute(
      `SELECT s.solicitud_id,
              s.codigo,
              s.usuario_id,
              s.animal_id,
              s.telefono,
              s.tipo_vivienda,
              s.experiencia,
              s.motivo,
              s.otros_animales,
              s.compromiso,
              s.estado,
              s.comentario_fundacion,
              s.creado_en,
              s.actualizado_en,
              a.nombre AS animal_nombre,
              a.especie AS animal_especie,
              a.tamano AS animal_tamano,
              a.edad_aprox AS animal_edad_aprox,
              a.comuna AS animal_comuna,
              a.estado AS animal_estado,
              fun.nombre AS fundacion_nombre,
              (
                SELECT fa.url
                  FROM foto_animal fa
                 WHERE fa.animal_id = a.animal_id
                 ORDER BY fa.es_principal DESC, fa.orden ASC, fa.foto_animal_id ASC
                 LIMIT 1
              ) AS animal_foto_url
         FROM solicitud s
         INNER JOIN animal a ON a.animal_id = s.animal_id
         INNER JOIN fundacion fun ON fun.fundacion_id = a.fundacion_id
        WHERE s.usuario_id = ?
        ORDER BY s.creado_en DESC`,
      [req.usuario.id]
    );

    const solicitudes = filas.map((fila) => ({
      ...fila,
      otros_animales: Boolean(fila.otros_animales),
      compromiso: Boolean(fila.compromiso),
    }));

    return res.json({ solicitudes });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/solicitudes/recibidas (CU25)
 * Lista todas las solicitudes de adopción recibidas por la fundación autenticada.
 * Solo accesible para usuarios con rol 'fundacion' y estado 'aprobada' en la tabla fundacion.
 *
 * Query param opcional: ?estado=pendiente|aprobada|rechazada|todas
 */
async function listarSolicitudesRecibidas(req, res, next) {
  try {
    // Verificar que el usuario tiene una fundación aprobada
    const [fundaciones] = await pool.execute(
      `SELECT fundacion_id FROM fundacion
        WHERE usuario_id = ? AND estado = 'aprobada'
        LIMIT 1`,
      [req.usuario.id]
    );
    if (fundaciones.length === 0) {
      return res.status(403).json({
        error: 'Tu fundación no está aprobada o no existe. No puedes ver solicitudes.',
      });
    }
    const fundacionId = fundaciones[0].fundacion_id;

    // Filtro de estado opcional
    const estadoFiltro = texto(req.query?.estado);
    const estadosValidos = ['pendiente', 'en_revision', 'aprobada', 'rechazada', 'cancelada', 'completada'];
    const usarFiltro = estadosValidos.includes(estadoFiltro);

    const baseQuery = `
      SELECT
        s.solicitud_id,
        s.codigo,
        s.estado,
        s.telefono,
        s.tipo_vivienda,
        s.experiencia,
        s.motivo,
        s.otros_animales,
        s.compromiso,
        s.comentario_fundacion,
        s.creado_en,
        s.actualizado_en,
        -- Datos del animal
        a.animal_id,
        a.nombre    AS animal_nombre,
        a.especie   AS animal_especie,
        a.estado    AS animal_estado,
        (
          SELECT fa.url
            FROM foto_animal fa
           WHERE fa.animal_id = a.animal_id
           ORDER BY fa.es_principal DESC, fa.orden ASC, fa.foto_animal_id ASC
           LIMIT 1
        ) AS animal_foto_url,
        -- Datos del adoptante
        u.usuario_id AS adoptante_id,
        u.nombre     AS adoptante_nombre,
        u.email      AS adoptante_email,
        u.telefono   AS adoptante_telefono,
        u.comuna     AS adoptante_comuna
      FROM solicitud s
      INNER JOIN animal   a ON a.animal_id    = s.animal_id
      INNER JOIN usuario  u ON u.usuario_id   = s.usuario_id
      WHERE a.fundacion_id = ?
      ${usarFiltro ? 'AND s.estado = ?' : ''}
      ORDER BY s.creado_en DESC
    `;

    const params = usarFiltro ? [fundacionId, estadoFiltro] : [fundacionId];
    const [filas] = await pool.execute(baseQuery, params);

    const solicitudes = filas.map((fila) => ({
      ...fila,
      otros_animales: Boolean(fila.otros_animales),
      compromiso: Boolean(fila.compromiso),
    }));

    return res.json({ solicitudes });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/solicitudes/:id/resolver (CU26)
 * Aprueba o rechaza una solicitud de adopción pendiente.
 * Solo puede hacerlo la fundación dueña del animal.
 *
 * Body: {
 *   accion: 'aprobar' | 'rechazar',
 *   comentario_fundacion?: string   (requerido al rechazar)
 * }
 */
async function resolverSolicitud(req, res, next) {
  const conexion = await pool.getConnection();
  try {
    const solicitudId = Number.parseInt(req.params?.id, 10);
    if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
      conexion.release();
      return res.status(400).json({ error: 'ID de solicitud inválido' });
    }

    const accion = texto(req.body?.accion).toLowerCase();
    if (!['aprobar', 'rechazar'].includes(accion)) {
      conexion.release();
      return res.status(400).json({ error: "La acción debe ser 'aprobar' o 'rechazar'" });
    }

    const comentario = texto(req.body?.comentario_fundacion ?? req.body?.comentario);
    if (accion === 'rechazar' && !comentario) {
      conexion.release();
      return res.status(400).json({
        error: 'Debes indicar un comentario al rechazar una solicitud',
      });
    }

    // Verificar que el usuario tiene una fundación aprobada
    const [fundaciones] = await conexion.execute(
      `SELECT fundacion_id FROM fundacion
        WHERE usuario_id = ? AND estado = 'aprobada'
        LIMIT 1`,
      [req.usuario.id]
    );
    if (fundaciones.length === 0) {
      conexion.release();
      return res.status(403).json({
        error: 'Tu fundación no está aprobada o no existe.',
      });
    }
    const fundacionId = fundaciones[0].fundacion_id;

    // Cargar la solicitud y verificar que pertenece a un animal de esta fundación
    const [solicitudes] = await conexion.execute(
      `SELECT s.solicitud_id, s.estado, s.usuario_id,
              a.animal_id, a.nombre AS animal_nombre, a.fundacion_id
         FROM solicitud s
         INNER JOIN animal a ON a.animal_id = s.animal_id
        WHERE s.solicitud_id = ?
        LIMIT 1`,
      [solicitudId]
    );
    if (solicitudes.length === 0) {
      conexion.release();
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const solicitud = solicitudes[0];

    // Control de autorización: la solicitud debe pertenecer a un animal de esta fundación
    if (solicitud.fundacion_id !== fundacionId) {
      conexion.release();
      return res.status(403).json({
        error: 'No tienes permiso para gestionar esta solicitud',
      });
    }

    // Validar que la solicitud no esté ya resuelta
    if (ESTADOS_RESUELTOS.includes(solicitud.estado)) {
      conexion.release();
      return res.status(409).json({
        error: `La solicitud ya fue resuelta con estado '${solicitud.estado}' y no puede modificarse`,
      });
    }

    const nuevoEstado = accion === 'aprobar' ? 'aprobada' : 'rechazada';

    await conexion.beginTransaction();

    // Actualizar estado de la solicitud
    await conexion.execute(
      `UPDATE solicitud
          SET estado = ?,
              comentario_fundacion = ?
        WHERE solicitud_id = ?`,
      [nuevoEstado, comentario || null, solicitudId]
    );

    if (accion === 'aprobar') {
      // Al aprobar: marcar el animal como 'en_proceso' y rechazar automáticamente
      // las demás solicitudes pendientes/en_revision del mismo animal
      await conexion.execute(
        `UPDATE animal SET estado = 'en_proceso' WHERE animal_id = ?`,
        [solicitud.animal_id]
      );

      await conexion.execute(
        `UPDATE solicitud
            SET estado = 'rechazada',
                comentario_fundacion = 'El animal ya tiene una solicitud aprobada.'
          WHERE animal_id = ?
            AND solicitud_id <> ?
            AND estado IN ('pendiente', 'en_revision')`,
        [solicitud.animal_id, solicitudId]
      );
    }

    // Registrar notificación para el adoptante (tabla notificacion existe en schema.sql)
    const tituloNotif = accion === 'aprobar'
      ? `¡Tu solicitud para ${solicitud.animal_nombre} fue aprobada!`
      : `Tu solicitud para ${solicitud.animal_nombre} fue rechazada`;

    const mensajeNotif = accion === 'aprobar'
      ? `¡Felicitaciones! La fundación aprobó tu postulación para adoptar a ${solicitud.animal_nombre}. Pronto se pondrán en contacto contigo.`
      : `La fundación revisó tu solicitud para ${solicitud.animal_nombre} y no pudo aprobarla en esta oportunidad.${comentario ? ` Motivo: ${comentario}` : ''}`;

    await conexion.execute(
      `INSERT INTO notificacion (usuario_id, animal_id, solicitud_id, tipo, titulo, mensaje)
       VALUES (?, ?, ?, 'solicitud', ?, ?)`,
      [solicitud.usuario_id, solicitud.animal_id, solicitudId, tituloNotif, mensajeNotif]
    );

    await conexion.commit();

    return res.json({
      mensaje: accion === 'aprobar'
        ? 'Solicitud aprobada correctamente'
        : 'Solicitud rechazada correctamente',
      solicitud_id: solicitudId,
      nuevo_estado: nuevoEstado,
    });
  } catch (error) {
    await conexion.rollback();
    return next(error);
  } finally {
    conexion.release();
  }
}

module.exports = {
  crearSolicitud,
  listarMisSolicitudes,
  listarSolicitudesRecibidas,
  resolverSolicitud,
};
