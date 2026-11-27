// Controlador del módulo de historias de adopciones exitosas (CU30).
// CU30 — Listar públicamente los animales que ya fueron adoptados.
const { pool } = require('../config/db');

const ESPECIES_VALIDAS = ['perro', 'gato', 'otro'];
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/**
 * GET /api/historias (CU30)
 * Endpoint público que devuelve los animales adoptados de fundaciones aprobadas.
 * Query param opcional: ?especie=perro|gato|otro
 */
async function listarHistoriasExito(req, res, next) {
  const especie = texto(req.query?.especie).toLowerCase();
  if (especie && !ESPECIES_VALIDAS.includes(especie)) {
    return res.status(400).json({ error: 'Filtro de especie inválido' });
  }

  let conexion;
  try {
    conexion = await pool.getConnection();

    const condiciones = ["a.estado = 'adoptado'", "f.estado = 'aprobada'"];
    const params = [];

    if (especie) {
      condiciones.push('a.especie = ?');
      params.push(especie);
    }

    const [historias] = await conexion.execute(
      `SELECT a.animal_id,
              a.nombre,
              a.especie,
              a.raza,
              a.edad_aprox,
              a.rango_edad,
              a.sexo,
              a.tamano,
              a.comuna,
              a.descripcion,
              a.actualizado_en AS fecha_adopcion,
              f.fundacion_id,
              f.nombre AS fundacion_nombre,
              f.comuna AS fundacion_comuna,
              (
                SELECT fa.url
                  FROM foto_animal fa
                 WHERE fa.animal_id = a.animal_id
                 ORDER BY fa.es_principal DESC, fa.orden ASC, fa.foto_animal_id ASC
                 LIMIT 1
              ) AS foto_url
         FROM animal a
         INNER JOIN fundacion f ON f.fundacion_id = a.fundacion_id
        WHERE ${condiciones.join(' AND ')}
        ORDER BY a.actualizado_en DESC, a.animal_id DESC`,
      params
    );

    return res.json({ historias });
  } catch (error) {
    return next(error);
  } finally {
    if (conexion) conexion.release();
  }
}

module.exports = {
  listarHistoriasExito,
};
