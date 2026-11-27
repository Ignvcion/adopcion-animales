// Controlador público de fundaciones.
// CU20 — Ver perfil público de una fundación.
const { pool } = require('../config/db');

/**
 * GET /api/fundaciones/:id (CU20)
 * Devuelve los datos públicos de una fundación aprobada y sus animales disponibles.
 */
async function obtenerPerfilPublicoFundacion(req, res, next) {
  try {
    const fundacionId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(fundacionId) || fundacionId <= 0) {
      return res.status(404).json({ error: 'Fundación no encontrada' });
    }

    const [filas] = await pool.execute(
      `SELECT f.fundacion_id,
              f.nombre,
              f.comuna,
              f.descripcion,
              f.telefono,
              u.email AS correo
         FROM fundacion f
         INNER JOIN usuario u ON u.usuario_id = f.usuario_id
        WHERE f.fundacion_id = ?
          AND f.estado = 'aprobada'
        LIMIT 1`,
      [fundacionId]
    );

    const fundacion = filas[0];
    if (!fundacion) {
      return res.status(404).json({ error: 'Fundación no encontrada' });
    }

    const [animales] = await pool.execute(
      `SELECT a.animal_id,
              a.fundacion_id,
              a.nombre,
              a.especie,
              a.raza,
              a.edad_aprox,
              a.rango_edad,
              a.sexo,
              a.tamano,
              a.comuna,
              a.descripcion,
              a.estado,
              f.nombre AS fundacion_nombre,
              (
                SELECT fa.url
                  FROM foto_animal fa
                 WHERE fa.animal_id = a.animal_id
                 ORDER BY fa.es_principal DESC, fa.orden ASC, fa.foto_animal_id ASC
                 LIMIT 1
              ) AS foto_url
         FROM animal a
         INNER JOIN fundacion f ON f.fundacion_id = a.fundacion_id
        WHERE a.fundacion_id = ?
          AND a.estado = 'disponible'
        ORDER BY a.creado_en DESC, a.animal_id DESC`,
      [fundacionId]
    );

    const [conteoAdoptados] = await pool.execute(
      `SELECT COUNT(*) AS total
         FROM animal
        WHERE fundacion_id = ?
          AND estado = 'adoptado'`,
      [fundacionId]
    );

    return res.json({
      fundacion: {
        ...fundacion,
        total_adoptados: Number(conteoAdoptados[0]?.total || 0),
      },
      animales,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  obtenerPerfilPublicoFundacion,
};