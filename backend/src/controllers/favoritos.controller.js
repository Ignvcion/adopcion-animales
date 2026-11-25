// Controlador del módulo de favoritos (CU21 y CU22).
// CU21 — Guardar / quitar animal de favoritos.
// CU22 — Listar animales favoritos del usuario autenticado.
const { pool } = require('../config/db');

/**
 * GET /api/favoritos (CU22)
 * Lista los animales guardados en favoritos por el usuario autenticado.
 */
async function listarFavoritos(req, res, next) {
  try {
    const [filas] = await pool.execute(
      `SELECT f.favorito_id,
              f.creado_en AS guardado_en,
              a.animal_id,
              a.fundacion_id,
              a.nombre,
              a.especie,
              a.raza,
              a.edad_aprox,
              a.sexo,
              a.tamano,
              a.comuna,
              a.descripcion,
              a.estado,
              fun.nombre AS fundacion_nombre,
              (
                SELECT fa.url
                  FROM foto_animal fa
                 WHERE fa.animal_id = a.animal_id
                 ORDER BY fa.es_principal DESC, fa.orden ASC, fa.foto_animal_id ASC
                 LIMIT 1
              ) AS foto_url
         FROM favorito f
         INNER JOIN animal a ON a.animal_id = f.animal_id
         INNER JOIN fundacion fun ON fun.fundacion_id = a.fundacion_id
        WHERE f.usuario_id = ?
        ORDER BY f.creado_en DESC`,
      [req.usuario.id]
    );

    return res.json({ favoritos: filas });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/favoritos (CU21)
 * Body: { animal_id }
 * Agrega un animal a los favoritos del usuario autenticado evitando duplicados.
 */
async function agregarFavorito(req, res, next) {
  try {
    const animalId = Number.parseInt(req.body?.animal_id ?? req.body?.animalId, 10);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ error: 'ID de animal inválido' });
    }

    const [animales] = await pool.execute(
      'SELECT animal_id FROM animal WHERE animal_id = ? LIMIT 1',
      [animalId]
    );
    if (animales.length === 0) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }

    const [existentes] = await pool.execute(
      'SELECT favorito_id FROM favorito WHERE usuario_id = ? AND animal_id = ? LIMIT 1',
      [req.usuario.id, animalId]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ error: 'Este animal ya está en tus favoritos' });
    }

    let resultado;
    try {
      [resultado] = await pool.execute(
        'INSERT INTO favorito (usuario_id, animal_id) VALUES (?, ?)',
        [req.usuario.id, animalId]
      );
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Este animal ya está en tus favoritos' });
      }
      throw error;
    }

    return res.status(201).json({
      mensaje: 'Animal agregado a favoritos',
      favorito: {
        favorito_id: resultado.insertId,
        usuario_id: req.usuario.id,
        animal_id: animalId,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/favoritos/:animalId (CU21)
 * Quita un animal de los favoritos del usuario autenticado.
 */
async function quitarFavorito(req, res, next) {
  try {
    const animalId = Number.parseInt(req.params.animalId, 10);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ error: 'ID de animal inválido' });
    }

    const [resultado] = await pool.execute(
      'DELETE FROM favorito WHERE usuario_id = ? AND animal_id = ?',
      [req.usuario.id, animalId]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ error: 'El animal no está en tus favoritos' });
    }

    return res.json({
      mensaje: 'Animal eliminado de favoritos',
      animal_id: animalId,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listarFavoritos,
  agregarFavorito,
  quitarFavorito,
};
