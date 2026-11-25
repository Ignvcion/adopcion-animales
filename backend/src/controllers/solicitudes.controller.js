// Controlador del módulo de solicitudes de adopción (CU23 y CU24).
// CU23 — Enviar solicitud de adopción.
// CU24 — Consultar historial de solicitudes del usuario autenticado.
const { pool } = require('../config/db');

const TELEFONO_VALIDO = /^\+?[0-9 ]{8,15}$/;
const ESTADOS_ACTIVOS = ['pendiente', 'en_revision', 'aprobada'];

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

module.exports = {
  crearSolicitud,
  listarMisSolicitudes,
};
