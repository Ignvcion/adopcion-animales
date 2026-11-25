// Controlador del módulo de animales (gestión por fundaciones).
// CU11 — Publicar animal en adopción.
// CU12 — Editar ficha de animal.
// CU13 — Archivar / cambiar estado de publicación de animal.
const { pool } = require('../config/db');

const ESPECIES_VALIDAS = ['perro', 'gato', 'otro'];
const RANGOS_EDAD_VALIDOS = ['cachorro', 'joven', 'adulto', 'senior'];
const SEXOS_VALIDOS = ['macho', 'hembra'];
const TAMANOS_VALIDOS = ['pequeno', 'mediano', 'grande'];
const ESTADOS_VALIDOS = ['disponible', 'en_proceso', 'adoptado', 'archivado'];
const MAX_FOTOS = 5;

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
 * Valida y normaliza los campos comunes de publicar (CU11) y editar (CU12).
 * Devuelve { error } si algún dato es inválido, o { datos } si está correcto.
 */
function validarDatosAnimal(body) {
  const nombre = texto(body?.nombre);
  const especie = texto(body?.especie).toLowerCase();
  const raza = texto(body?.raza) || null;
  const edadAprox = texto(body?.edad_aprox);
  const rangoEdad = texto(body?.rango_edad).toLowerCase();
  const sexo = texto(body?.sexo).toLowerCase();
  const tamano = texto(body?.tamano).toLowerCase();
  const comuna = texto(body?.comuna);
  const descripcion = texto(body?.descripcion);
  const estadoSalud = texto(body?.estado_salud) || null;
  const requisitosAdopcion = texto(body?.requisitos_adopcion) || null;

  if (!nombre || !especie || !edadAprox || !rangoEdad || !sexo || !tamano || !comuna || !descripcion) {
    return {
      error: 'Nombre, especie, edad aproximada, rango de edad, sexo, tamaño, comuna y descripción son obligatorios',
    };
  }
  if (nombre.length > 100) {
    return { error: 'El nombre no puede superar los 100 caracteres' };
  }
  if (raza && raza.length > 100) {
    return { error: 'La raza no puede superar los 100 caracteres' };
  }
  if (edadAprox.length > 50) {
    return { error: 'La edad aproximada no puede superar los 50 caracteres' };
  }
  if (comuna.length > 80) {
    return { error: 'La comuna no puede superar los 80 caracteres' };
  }
  if (estadoSalud && estadoSalud.length > 255) {
    return { error: 'El estado de salud no puede superar los 255 caracteres' };
  }
  if (!ESPECIES_VALIDAS.includes(especie)) {
    return { error: 'La especie debe ser perro, gato u otro' };
  }
  if (!RANGOS_EDAD_VALIDOS.includes(rangoEdad)) {
    return { error: 'El rango de edad debe ser cachorro, joven, adulto o senior' };
  }
  if (!SEXOS_VALIDOS.includes(sexo)) {
    return { error: 'El sexo debe ser macho o hembra' };
  }
  if (!TAMANOS_VALIDOS.includes(tamano)) {
    return { error: 'El tamaño debe ser pequeno, mediano o grande' };
  }

  return {
    datos: {
      nombre,
      especie,
      raza,
      edadAprox,
      rangoEdad,
      sexo,
      tamano,
      comuna,
      descripcion,
      estadoSalud,
      requisitosAdopcion,
    },
  };
}

/**
 * POST /api/animales (CU11)
 * Body: { nombre, especie, raza?, edad_aprox, rango_edad, sexo, tamano, comuna,
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

    const { error, datos } = validarDatosAnimal(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const fotos = Array.isArray(req.body?.fotos)
      ? req.body.fotos.map((url) => texto(url)).filter(Boolean)
      : [];

    if (fotos.length > MAX_FOTOS) {
      return res.status(400).json({
        error: `Se permite un máximo de ${MAX_FOTOS} fotos por animal`,
      });
    }
    if (fotos.some((url) => url.length > 500)) {
      return res.status(400).json({
        error: 'Cada URL de foto no puede superar los 500 caracteres',
      });
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const [resultado] = await conexion.execute(
        `INSERT INTO animal (
           fundacion_id, nombre, especie, raza, edad_aprox, rango_edad, sexo, tamano,
           comuna, descripcion, estado_salud, requisitos_adopcion, estado
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'disponible')`,
        [
          fundacion.fundacion_id,
          datos.nombre,
          datos.especie,
          datos.raza,
          datos.edadAprox,
          datos.rangoEdad,
          datos.sexo,
          datos.tamano,
          datos.comuna,
          datos.descripcion,
          datos.estadoSalud,
          datos.requisitosAdopcion,
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
          nombre: datos.nombre,
          especie: datos.especie,
          raza: datos.raza,
          edad_aprox: datos.edadAprox,
          rango_edad: datos.rangoEdad,
          sexo: datos.sexo,
          tamano: datos.tamano,
          comuna: datos.comuna,
          descripcion: datos.descripcion,
          estado_salud: datos.estadoSalud,
          requisitos_adopcion: datos.requisitosAdopcion,
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

    const { error, datos } = validarDatosAnimal(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    await pool.execute(
      `UPDATE animal
          SET nombre = ?, especie = ?, raza = ?, edad_aprox = ?, rango_edad = ?,
              sexo = ?, tamano = ?, comuna = ?, descripcion = ?, estado_salud = ?,
              requisitos_adopcion = ?
        WHERE animal_id = ?`,
      [
        datos.nombre,
        datos.especie,
        datos.raza,
        datos.edadAprox,
        datos.rangoEdad,
        datos.sexo,
        datos.tamano,
        datos.comuna,
        datos.descripcion,
        datos.estadoSalud,
        datos.requisitosAdopcion,
        animalId,
      ]
    );

    return res.json({
      mensaje: 'Ficha del animal actualizada',
      animal: {
        animal_id: animalId,
        nombre: datos.nombre,
        especie: datos.especie,
        raza: datos.raza,
        edad_aprox: datos.edadAprox,
        rango_edad: datos.rangoEdad,
        sexo: datos.sexo,
        tamano: datos.tamano,
        comuna: datos.comuna,
        descripcion: datos.descripcion,
        estado_salud: datos.estadoSalud,
        requisitos_adopcion: datos.requisitosAdopcion,
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