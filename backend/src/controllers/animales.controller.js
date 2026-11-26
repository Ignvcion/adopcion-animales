// Controlador del módulo de animales (gestión por fundaciones y catálogo).
// CU11 — Publicar animal en adopción.
// CU12 — Editar ficha de animal.
// CU13 — Archivar / cambiar estado de publicación de animal.
// CU14 — Subir y ordenar fotos del animal.
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
 * Verifica que el animal exista y pertenezca a la fundación indicada.
 */
async function verificarPropiedadAnimal(animalId, fundacionId) {
  const [filas] = await pool.execute(
    'SELECT animal_id, fundacion_id FROM animal WHERE animal_id = ? LIMIT 1',
    [animalId]
  );
  const animal = filas[0];
  if (!animal) return { status: 404, error: 'Animal no encontrado' };
  if (animal.fundacion_id !== fundacionId) {
    return { status: 403, error: 'No puedes modificar animales de otra fundación' };
  }
  return { animal };
}

/**
 * Obtiene la galería ordenada de un animal.
 */
async function obtenerFotosDeAnimal(conexion, animalId) {
  const [fotos] = await conexion.execute(
    `SELECT foto_animal_id, animal_id, url, es_principal, orden, creado_en
       FROM foto_animal
      WHERE animal_id = ?
      ORDER BY es_principal DESC, orden ASC, foto_animal_id ASC`,
    [animalId]
  );
  return fotos;
}

/**
 * Valida y normaliza los campos comunes de publicar (CU11) y editar (CU12).
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

    const propiedad = await verificarPropiedadAnimal(animalId, fundacion.fundacion_id);
    if (propiedad.error) {
      return res.status(propiedad.status).json({ error: propiedad.error });
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

    const propiedad = await verificarPropiedadAnimal(animalId, fundacion.fundacion_id);
    if (propiedad.error) {
      return res.status(propiedad.status).json({ error: propiedad.error });
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

/**
 * POST /api/animales/:id/fotos (CU14)
 * Agrega una foto (por URL o ruta) a la galería del animal, respetando el límite de 5.
 * Body: { url: string, es_principal?: boolean }
 */
async function agregarFotoAnimal(req, res, next) {
  try {
    const animalId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ error: 'ID de animal inválido' });
    }

    const url = texto(req.body?.url);
    if (!url) {
      return res.status(400).json({ error: 'La URL de la foto es obligatoria' });
    }
    if (url.length > 500) {
      return res.status(400).json({ error: 'La URL de la foto no puede superar los 500 caracteres' });
    }

    const fundacion = await obtenerFundacionAprobada(req.usuario.id);
    if (!fundacion || fundacion.estado !== 'aprobada') {
      return res.status(403).json({ error: 'No tienes una fundación aprobada' });
    }

    const propiedad = await verificarPropiedadAnimal(animalId, fundacion.fundacion_id);
    if (propiedad.error) {
      return res.status(propiedad.status).json({ error: propiedad.error });
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const actuales = await obtenerFotosDeAnimal(conexion, animalId);
      if (actuales.length >= MAX_FOTOS) {
        await conexion.rollback();
        return res.status(400).json({
          error: `El animal ya tiene el máximo de ${MAX_FOTOS} fotos permitidas`,
        });
      }

      const marcarPrincipal = actuales.length === 0 || Boolean(req.body?.es_principal);
      if (marcarPrincipal) {
        await conexion.execute(
          'UPDATE foto_animal SET es_principal = 0 WHERE animal_id = ?',
          [animalId]
        );
      }

      const nuevoOrden = actuales.length + 1;
      await conexion.execute(
        `INSERT INTO foto_animal (animal_id, url, es_principal, orden)
         VALUES (?, ?, ?, ?)`,
        [animalId, url, marcarPrincipal ? 1 : 0, nuevoOrden]
      );

      const fotos = await obtenerFotosDeAnimal(conexion, animalId);
      await conexion.commit();

      return res.status(201).json({
        mensaje: 'Foto agregada correctamente',
        fotos,
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
 * PUT /api/animales/:id/fotos/orden (CU14)
 * Reordena las fotos de un animal y define como principal la primera de la lista.
 * Body: { ordenIds: number[] }
 */
async function ordenarFotosAnimal(req, res, next) {
  try {
    const animalId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(animalId) || animalId <= 0) {
      return res.status(400).json({ error: 'ID de animal inválido' });
    }

    const ordenIds = Array.isArray(req.body?.ordenIds)
      ? req.body.ordenIds.map((id) => Number.parseInt(id, 10))
      : [];

    if (ordenIds.length === 0 || ordenIds.some((id) => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({ error: 'Debes enviar una lista válida de IDs de fotos' });
    }

    const idsUnicos = new Set(ordenIds);
    if (idsUnicos.size !== ordenIds.length) {
      return res.status(400).json({ error: 'La lista de orden contiene IDs duplicados' });
    }

    const fundacion = await obtenerFundacionAprobada(req.usuario.id);
    if (!fundacion || fundacion.estado !== 'aprobada') {
      return res.status(403).json({ error: 'No tienes una fundación aprobada' });
    }

    const propiedad = await verificarPropiedadAnimal(animalId, fundacion.fundacion_id);
    if (propiedad.error) {
      return res.status(propiedad.status).json({ error: propiedad.error });
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const actuales = await obtenerFotosDeAnimal(conexion, animalId);
      if (actuales.length !== ordenIds.length) {
        await conexion.rollback();
        return res.status(400).json({
          error: 'Debes incluir todas las fotos actuales del animal para reordenarlas',
        });
      }

      const idsActuales = new Set(actuales.map((f) => f.foto_animal_id));
      if (ordenIds.some((id) => !idsActuales.has(id))) {
        await conexion.rollback();
        return res.status(400).json({
          error: 'Alguna de las fotos indicadas no pertenece a este animal',
        });
      }

      for (let i = 0; i < ordenIds.length; i += 1) {
        await conexion.execute(
          `UPDATE foto_animal
              SET orden = ?, es_principal = ?
            WHERE foto_animal_id = ? AND animal_id = ?`,
          [i + 1, i === 0 ? 1 : 0, ordenIds[i], animalId]
        );
      }

      const fotos = await obtenerFotosDeAnimal(conexion, animalId);
      await conexion.commit();

      return res.json({
        mensaje: 'Orden de fotos actualizado',
        fotos,
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
 * DELETE /api/animales/:id/fotos/:fotoId (CU14)
 * Elimina una foto de la galería y reajusta el orden y la foto principal si corresponde.
 */
async function eliminarFotoAnimal(req, res, next) {
  try {
    const animalId = Number.parseInt(req.params.id, 10);
    const fotoId = Number.parseInt(req.params.fotoId, 10);
    if (!Number.isInteger(animalId) || animalId <= 0 || !Number.isInteger(fotoId) || fotoId <= 0) {
      return res.status(400).json({ error: 'ID de animal o foto inválido' });
    }

    const fundacion = await obtenerFundacionAprobada(req.usuario.id);
    if (!fundacion || fundacion.estado !== 'aprobada') {
      return res.status(403).json({ error: 'No tienes una fundación aprobada' });
    }

    const propiedad = await verificarPropiedadAnimal(animalId, fundacion.fundacion_id);
    if (propiedad.error) {
      return res.status(propiedad.status).json({ error: propiedad.error });
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const [resultado] = await conexion.execute(
        'DELETE FROM foto_animal WHERE foto_animal_id = ? AND animal_id = ?',
        [fotoId, animalId]
      );

      if (resultado.affectedRows === 0) {
        await conexion.rollback();
        return res.status(404).json({ error: 'Foto no encontrada para este animal' });
      }

      const restantes = await obtenerFotosDeAnimal(conexion, animalId);
      for (let i = 0; i < restantes.length; i += 1) {
        await conexion.execute(
          'UPDATE foto_animal SET orden = ?, es_principal = ? WHERE foto_animal_id = ?',
          [i + 1, i === 0 ? 1 : 0, restantes[i].foto_animal_id]
        );
      }

      const fotos = await obtenerFotosDeAnimal(conexion, animalId);
      await conexion.commit();

      return res.json({
        mensaje: 'Foto eliminada correctamente',
        fotos,
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

module.exports = {
  publicarAnimal,
  editarAnimal,
  cambiarEstadoAnimal,
  agregarFotoAnimal,
  ordenarFotosAnimal,
  eliminarFotoAnimal,
};