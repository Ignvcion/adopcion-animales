// Controlador de autenticación.
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

module.exports = { login };
