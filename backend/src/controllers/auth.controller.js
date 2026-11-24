// Controlador de autenticación.
// CU01 — Registrarse como adoptante.
// CU02 — Iniciar sesión.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Hash de relleno: si el correo no existe se compara igual contra algo,
// así la respuesta tarda lo mismo y no revela qué correos están registrados.
const HASH_RELLENO = bcrypt.hashSync('contraseña-de-relleno', 10);

function crearToken(usuario) {
  return jwt.sign(
    { id: usuario.usuario_id, rol: usuario.rol, nombre: usuario.nombre },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRA || '8h' }
  );
}

function datosPublicos(usuario) {
  return {
    id: usuario.usuario_id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 *
 * Flujo normal: valida los datos, busca al usuario, compara la contraseña
 * y entrega un token JWT junto con los datos básicos del usuario.
 *
 * Excepciones:
 *  E1 — datos incompletos o correo con formato inválido   → 400
 *  E2 — correo o contraseña incorrectos                   → 401
 *  E3 — cuenta bloqueada por el administrador             → 403
 *  E4 — fundación pendiente de aprobación o rechazada     → 403
 */
async function login(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    // E1: se valida antes de consultar la base de datos
    if (!email || !password) {
      return res.status(400).json({ error: 'Debe ingresar su correo y su contraseña' });
    }
    if (!EMAIL_VALIDO.test(email)) {
      return res.status(400).json({ error: 'El correo no tiene un formato válido' });
    }

    const [filas] = await pool.execute(
      `SELECT u.usuario_id, u.nombre, u.email, u.password_hash, u.rol, u.estado,
              f.estado AS fundacion_estado
         FROM usuario u
         LEFT JOIN fundacion f ON f.usuario_id = u.usuario_id
        WHERE u.email = ?
        LIMIT 1`,
      [email]
    );
    const usuario = filas[0];

    // E2: mismo mensaje si el correo no existe o si la contraseña no coincide
    const coincide = await bcrypt.compare(password, usuario ? usuario.password_hash : HASH_RELLENO);
    if (!usuario || !coincide) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    // E3
    if (usuario.estado === 'bloqueado') {
      return res.status(403).json({ error: 'Tu cuenta está bloqueada. Contacta al administrador.' });
    }

    // E4
    if (usuario.rol === 'fundacion' && usuario.fundacion_estado !== 'aprobada') {
      const mensaje = usuario.fundacion_estado === 'rechazada'
        ? 'La solicitud de tu fundación fue rechazada.'
        : 'Tu fundación aún está pendiente de aprobación por el administrador.';
      return res.status(403).json({ error: mensaje });
    }

    return res.json({
      token: crearToken(usuario),
      usuario: datosPublicos(usuario),
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/auth/yo
 * Devuelve el usuario de la sesión actual. El frontend lo usa al recargar
 * la página para comprobar que el token guardado sigue siendo válido y que
 * la cuenta no fue bloqueada mientras tanto.
 */
async function usuarioActual(req, res, next) {
  try {
    const [filas] = await pool.execute(
      'SELECT usuario_id, nombre, email, rol, estado FROM usuario WHERE usuario_id = ? LIMIT 1',
      [req.usuario.id]
    );
    const usuario = filas[0];
    if (!usuario || usuario.estado === 'bloqueado') {
      return res.status(401).json({ error: 'Sesión no válida. Inicia sesión de nuevo.' });
    }
    return res.json({ usuario: datosPublicos(usuario) });
  } catch (error) {
    return next(error);
  }
}

const TELEFONO_VALIDO = /^\+?[0-9 ]{8,15}$/;

/**
 * POST /api/auth/registro
 * Body: { nombre, email, password, telefono?, comuna? }
 *
 * Flujo normal: valida los datos, crea la cuenta con rol 'adoptante',
 * guarda la contraseña cifrada y deja la sesión iniciada (devuelve el token).
 *
 * Excepciones:
 *  E1 — campos obligatorios vacíos o con formato inválido   → 400
 *  E2 — contraseña de menos de 8 caracteres                  → 400
 *  E3 — el correo ya está registrado                         → 409
 */
async function registro(req, res, next) {
  try {
    const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
    const nombre = texto(req.body?.nombre);
    const email = texto(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const telefono = texto(req.body?.telefono) || null;
    const comuna = texto(req.body?.comuna) || null;

    // E1
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios' });
    }
    if (nombre.length < 2 || nombre.length > 100) {
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
    }
    if (!EMAIL_VALIDO.test(email) || email.length > 150) {
      return res.status(400).json({ error: 'El correo no tiene un formato válido' });
    }
    if (telefono && !TELEFONO_VALIDO.test(telefono)) {
      return res.status(400).json({ error: 'El teléfono no tiene un formato válido (ej: +56 9 1234 5678)' });
    }
    if (comuna && comuna.length > 80) {
      return res.status(400).json({ error: 'La comuna es demasiado larga' });
    }
    // E2
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // E3: se revisa antes de insertar para dar un mensaje claro
    const [existentes] = await pool.execute(
      'SELECT usuario_id FROM usuario WHERE email = ? LIMIT 1',
      [email]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);
    let resultado;
    try {
      [resultado] = await pool.execute(
        `INSERT INTO usuario (nombre, email, password_hash, rol, estado, telefono, comuna)
         VALUES (?, ?, ?, 'adoptante', 'activo', ?, ?)`,
        [nombre, email, hash, telefono, comuna]
      );
    } catch (error) {
      // E3 también si dos personas se registran con el mismo correo al mismo tiempo
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ese correo ya está registrado' });
      }
      throw error;
    }

    const usuario = { usuario_id: resultado.insertId, nombre, email, rol: 'adoptante' };
    return res.status(201).json({
      token: crearToken(usuario),
      usuario: datosPublicos(usuario),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { registro, login, usuarioActual };
