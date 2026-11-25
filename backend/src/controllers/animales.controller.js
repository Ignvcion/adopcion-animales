// Controlador del módulo de animales (gestión por fundaciones).
// CU11 — Publicar animal en adopción.
// CU12 — Editar ficha de animal.
// CU13 — Archivar / cambiar estado de publicación de animal.
const { pool } = require('../config/db');

const ESPECIES_VALIDAS = ['perro', 'gato', 'otro'];
const SEXOS_VALIDOS = ['macho', 'hembra'];
const TAMANOS_VALIDOS = ['pequeno', 'mediano', 'grande'];
const ESTADOS_VALIDOS = ['disponible', 'en_proceso', 'adoptado', 'archivado'];

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/**
 * Busca la fundación aprobada asociada al usuario autenticado.
 */
async function obtenerFundacionAprobada(usuarioId) {
  const [filas] = await pool.execute(
    'SELECT fundacion_id, estado FROM fundacion WHERE usuario_id = ? LIMIT 1',
    [usuarioId]
  );
  return filas[0] || null;
}

/**
 * POST /api/animales (CU11)
 * Body: { nombre, especie, raza?, edad_aprox, sexo, tamano, comuna,
 *         descripcion, estado_salud?, requisitos_adopcion?, fotos?: string[] }
 */
async function publicarAnimal(req, res, next) {
  try {
    const fundacion = await obtenerFundacionAprobada(req.usuario.id);
    if (!fundacion || fundacion.estado !== 'aprobada') {
      return res.status(403).json({
        error: 'Tu fundación debe estar aprobada para publicar animales',
      });
    }

    const nombre = texto(req.body?.nombre);
    const especie = texto(req.body?.especie).toLowerCase();
    const raza = texto(req.body?.raza) || null;
    const edadAprox = texto(req.body?.edad_aprox);
    const sexo = texto(req.body?.sexo).toLowerCase();
    const tamano = texto(req.body?.tamano).toLowerCase();
    const comuna = texto(req.body?.comuna);
    const descripcion = texto(req.body?.descripcion);
    const estadoSalud = texto(req.body?.estado_salud) || null;
    const requisitosAdopcion = texto(req.body?.requisitos_adopcion) || null;

    if (!nombre || !especie || !edadAprox || !sexo || !tamano || !comuna || !descripcion) {
      return res.status(400).json({
        error: 'Nombre, especie, edad aproximada, sexo, tamaño, comuna y descripción son obligatorios',
      });
    }
    if (nombre.length > 100 || comuna.length > 80 || edadAprox.length > 50) {
      return res.status(400).json({ error: 'Uno o más campos superan el largo permitido' });
    }
    if (!ESPECIES_VALIDAS.includes(especie)) {
      return res.status(400).json({ error: 'La especie debe ser perro, gato u otro' });
    }
    if (!SEXOS_VALIDOS.includes(sexo)) {
      return res.status(400).json({ error: 'El sexo debe ser macho o hembra' });
    }
    if (!TAMANOS_VALIDOS.includes(tamano)) {
      return res.status(400).json({ error: 'El tamaño debe ser pequeno, mediano o grande' });
    }

    const fotos = Array.isArray(req.body?.fotos)
      ? req.body.fotos.map((url) => texto(url)).filter(Boolean)
      : [];

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const [resultado] = await conexion.execute(
        `INSERT INTO animal (
           fundacion_id, nombre, especie, raza, edad_aprox, sexo, tamano,
           comuna, descripcion, estado_salud, requisitos_adopcion, estado
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disponible')`,
        [
          fundacion.fundacion_id, nombre, especie, raza, edadAprox, sexo, tamano,
          comuna, descripcion, estadoSalud, requisitosAdopcion,
        ]
      );

      const animalId = resultado.insertId;

      for (let i = 0; i < fotos.length; i += 1) {
        await conexion.execute(
          `INSERT INTO foto_animal (animal_id, url, es_principal, orden)
           VALUES (?, ?, ?, ?)`,
          [animalId, fotos[i], i === 0 ? 1 : 0, i + 1]
        );
      }

      await conexion.commit();

      return res.status(201).json({
        mensaje: 'Animal publicado correctamente',
        animal: {
          animal_id: animalId,
          fundacion_id: fundacion.fundacion_id,
          nombre,
          especie,
          raza,
          edad_aprox: edadAprox,
          sexo,
          tamano,
          comuna,
          descripcion,
          estado_salud: estadoSalud,
          requisitos_adopcion: requisitosAdopcion,
          estado: 'disponible',
          fotos,
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
 * PUT /api/animales/:id (CU12)
 * Edita los datos de un animal perteneciente a la fundación autenticada.
 */
async function editarAnimal(req, res, next) {
  try {
    const animalId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ error: 'ID de animal inválido' });
    }

    const fundacion = await obtenerFundacionAprobada(req.usuario.id);
    if (!fundacion || fundacion.estado !== 'aprobada') {
      return res.status(403).json({ error: 'No tienes una fundación aprobada' });
    }

    const [existentes] = await pool.execute(
      'SELECT animal_id, fundacion_id FROM animal WHERE animal_id = ? LIMIT 1',
      [animalId]
    );
    const animal = existentes[0];
    if (!animal) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }
    if (animal.fundacion_id !== fundacion.fundacion_id) {
      return res.status(403).json({ error: 'No puedes editar animales de otra fundación' });
    }

    const nombre = texto(req.body?.nombre);
    const especie = texto(req.body?.especie).toLowerCase();
    const raza = texto(req.body?.raza) || null;
    const edadAprox = texto(req.body?.edad_aprox);
    const sexo = texto(req.body?.sexo).toLowerCase();
    const tamano = texto(req.body?.tamano).toLowerCase();
    const comuna = texto(req.body?.comuna);
    const descripcion = texto(req.body?.descripcion);
    const estadoSalud = texto(req.body?.estado_salud) || null;
    const requisitosAdopcion = texto(req.body?.requisitos_adopcion) || null;

    if (!nombre || !especie || !edadAprox || !sexo || !tamano || !comuna || !descripcion) {
      return res.status(400).json({
        error: 'Nombre, especie, edad aproximada, sexo, tamaño, comuna y descripción son obligatorios',
      });
    }
    if (!ESPECIES_VALIDAS.includes(especie)) {
      return res.status(400).json({ error: 'La especie debe ser perro, gato u otro' });
    }
    if (!SEXOS_VALIDOS.includes(sexo)) {
      return res.status(400).json({ error: 'El sexo debe ser macho o hembra' });
    }
    if (!TAMANOS_VALIDOS.includes(tamano)) {
      return res.status(400).json({ error: 'El tamaño debe ser pequeno, mediano o grande' });
    }

    await pool.execute(
      `UPDATE animal
          SET nombre = ?, especie = ?, raza = ?, edad_aprox = ?, sexo = ?,
              tamano = ?, comuna = ?, descripcion = ?, estado_salud = ?,
              requisitos_adopcion = ?
        WHERE animal_id = ?`,
      [
        nombre, especie, raza, edadAprox, sexo, tamano,
        comuna, descripcion, estadoSalud, requisitosAdopcion, animalId,
      ]
    );

    return res.json({
      mensaje: 'Ficha del animal actualizada',
      animal: {
        animal_id: animalId,
        nombre,
        especie,
        raza,
        edad_aprox: edadAprox,
        sexo,
        tamano,
        comuna,
        descripcion,
        estado_salud: estadoSalud,
        requisitos_adopcion: requisitosAdopcion,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PATCH /api/animales/:id/estado (CU13)
 * Body: { estado: 'disponible' | 'en_proceso' | 'adoptado' | 'archivado' }
 * Si no se envía estado, archiva la publicación por defecto.
 */
async function cambiarEstadoAnimal(req, res, next) {
  try {
    const animalId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ error: 'ID de animal inválido' });
    }

    const nuevoEstado = req.body?.estado
      ? texto(req.body.estado).toLowerCase()
      : 'archivado';

    if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
      return res.status(400).json({
        error: 'El estado debe ser disponible, en_proceso, adoptado o archivado',
      });
    }

    const fundacion = await obtenerFundacionAprobada(req.usuario.id);
    if (!fundacion || fundacion.estado !== 'aprobada') {
      return res.status(403).json({ error: 'No tienes una fundación aprobada' });
    }

    const [existentes] = await pool.execute(
      'SELECT animal_id, fundacion_id FROM animal WHERE animal_id = ? LIMIT 1',
      [animalId]
    );
    const animal = existentes[0];
    if (!animal) {
      return res.status(404).json({ error: 'Animal no encontrado' });
    }
    if (animal.fundacion_id !== fundacion.fundacion_id) {
      return res.status(403).json({ error: 'No puedes modificar animales de otra fundación' });
    }

    await pool.execute(
      'UPDATE animal SET estado = ? WHERE animal_id = ?',
      [nuevoEstado, animalId]
    );

    return res.json({
      mensaje: 'Estado del animal actualizado',
      animal_id: animalId,
      estado: nuevoEstado,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  publicarAnimal,
  editarAnimal,
  cambiarEstadoAnimal,
};