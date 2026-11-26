// Controlador del perfil del usuario.
// CU05 — Ver y editar mi perfil.
const { pool } = require('../config/db');

const TELEFONO_VALIDO = /^\+?[0-9 ]{8,15}$/;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/** Lee el perfil completo; si es fundación, incluye los datos de su fundación. */
async function leerPerfil(usuarioId) {
  const [filas] = await pool.execute(
    `SELECT u.usuario_id, u.nombre, u.email, u.rol, u.telefono, u.comuna, u.creado_en,
            f.fundacion_id, f.nombre AS fundacion_nombre, f.rut AS fundacion_rut,
            f.estado AS fundacion_estado
       FROM usuario u
       LEFT JOIN fundacion f ON f.usuario_id = u.usuario_id
      WHERE u.usuario_id = ?
      LIMIT 1`,
    [usuarioId]
  );
  const fila = filas[0];
  if (!fila) return null;

  return {
    id: fila.usuario_id,
    nombre: fila.nombre,
    email: fila.email,
    rol: fila.rol,
    telefono: fila.telefono,
    comuna: fila.comuna,
    creado_en: fila.creado_en,
    fundacion: fila.fundacion_id
      ? {
        id: fila.fundacion_id,
        nombre: fila.fundacion_nombre,
        rut: fila.fundacion_rut,
        estado: fila.fundacion_estado,
      }
      : null,
  };
}

/**
 * GET /api/perfil
 * Devuelve los datos de la cuenta con la sesión iniciada.
 */
async function verPerfil(req, res, next) {
  try {
    const perfil = await leerPerfil(req.usuario.id);
    if (!perfil) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.json({ perfil });
  } catch (error) {
    return next(error);
  }
}

/**
 * PUT /api/perfil
 * Body: { nombre, telefono?, comuna? }
 *
 * Solo se pueden cambiar nombre, teléfono y comuna. El correo no se edita
 * aquí porque es el dato con que se inicia sesión, y el rol solo lo puede
 * cambiar el administrador.
 *
 * Excepciones:
 *  E1 — nombre vacío o fuera de largo                → 400
 *  E2 — teléfono o comuna con formato inválido       → 400
 */
async function editarPerfil(req, res, next) {
  try {
    const nombre = texto(req.body?.nombre);
    const telefono = texto(req.body?.telefono) || null;
    const comuna = texto(req.body?.comuna) || null;

    // E1
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (nombre.length < 2 || nombre.length > 100) {
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
    }
    // E2
    if (telefono && !TELEFONO_VALIDO.test(telefono)) {
      return res.status(400).json({ error: 'El teléfono no tiene un formato válido (ej: +56 9 1234 5678)' });
    }
    if (comuna && comuna.length > 80) {
      return res.status(400).json({ error: 'La comuna no puede superar los 80 caracteres' });
    }

    await pool.execute(
      'UPDATE usuario SET nombre = ?, telefono = ?, comuna = ? WHERE usuario_id = ?',
      [nombre, telefono, comuna, req.usuario.id]
    );

    const perfil = await leerPerfil(req.usuario.id);
    return res.json({ mensaje: 'Perfil actualizado', perfil });
  } catch (error) {
    return next(error);
  }
}

module.exports = { verPerfil, editarPerfil };
