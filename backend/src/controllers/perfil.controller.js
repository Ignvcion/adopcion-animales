// Controlador del perfil del usuario.
// CU05 — Ver y editar mi perfil.
// CU10 — Cambiar contraseña.
const bcrypt = require('bcryptjs');
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

/**
 * PUT /api/perfil/contrasena
 * Body: { actual, nueva }
 * CU10 — Cambiar contraseña estando con la sesión iniciada.
 *
 * Excepciones:
 *  E1 — datos vacíos o contraseña nueva de menos de 8 caracteres → 400
 *  E2 — la contraseña nueva es igual a la actual                  → 400
 *  E3 — la contraseña actual es incorrecta                        → 401
 * (La confirmación "repite la contraseña" se revisa en la vista.)
 */
async function cambiarContrasena(req, res, next) {
  try {
    const actual = typeof req.body?.actual === 'string' ? req.body.actual : '';
    const nueva = typeof req.body?.nueva === 'string' ? req.body.nueva : '';

    // E1
    if (!actual || !nueva) {
      return res.status(400).json({ error: 'Debes ingresar tu contraseña actual y la nueva' });
    }
    if (nueva.length < 8) {
      return res.status(400).json({ error: 'La contraseña nueva debe tener al menos 8 caracteres' });
    }
    // E2
    if (nueva === actual) {
      return res.status(400).json({ error: 'La contraseña nueva debe ser distinta de la actual' });
    }

    const [filas] = await pool.execute(
      'SELECT password_hash FROM usuario WHERE usuario_id = ? LIMIT 1',
      [req.usuario.id]
    );
    if (!filas[0]) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // E3
    const coincide = await bcrypt.compare(actual, filas[0].password_hash);
    if (!coincide) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const hash = await bcrypt.hash(nueva, 10);
    await pool.execute('UPDATE usuario SET password_hash = ? WHERE usuario_id = ?', [hash, req.usuario.id]);

    return res.json({ mensaje: 'Tu contraseña fue actualizada' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { verPerfil, editarPerfil, cambiarContrasena };
