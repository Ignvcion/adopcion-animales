// Controlador de recuperación de contraseña.
// CU04 — Recuperar contraseña con un código temporal de 6 dígitos.
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MINUTOS_VIGENCIA = 15;
const MAX_INTENTOS = 5;
const MENSAJE_ENVIADO = 'Si el correo está registrado, te enviamos un código para restablecer tu contraseña.';
const MENSAJE_CODIGO_MALO = 'El código es incorrecto o expiró. Pide uno nuevo si es necesario.';

/** Se guarda el hash del código, no el código: si alguien lee la base, no le sirve. */
function hashCodigo(codigo) {
  return crypto.createHash('sha256').update(codigo).digest('hex');
}

/** Compara dos hashes en tiempo constante (no revela cuántos caracteres coinciden). */
function mismoHash(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/auth/recuperar
 * Body: { email }
 *
 * Paso 1: genera un código de 6 dígitos válido por 15 minutos.
 * Responde siempre el mismo mensaje, exista o no el correo, para no revelar
 * qué cuentas están registradas (E1).
 *
 * Como el proyecto aún no tiene servidor de correo, en desarrollo el código
 * se muestra en la consola del backend y se devuelve en la respuesta.
 */
async function pedirCodigo(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_VALIDO.test(email)) {
      return res.status(400).json({ error: 'Ingresa un correo válido' });
    }

    const [filas] = await pool.execute(
      "SELECT usuario_id FROM usuario WHERE email = ? AND estado = 'activo' LIMIT 1",
      [email]
    );
    const usuario = filas[0];

    // E1: correo no registrado → misma respuesta, sin crear código
    if (!usuario) {
      return res.json({ mensaje: MENSAJE_ENVIADO });
    }

    // Se anulan los códigos anteriores que no se usaron: solo vale el último
    await pool.execute(
      'UPDATE recuperacion_contrasena SET usado_en = NOW() WHERE usuario_id = ? AND usado_en IS NULL',
      [usuario.usuario_id]
    );

    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await pool.execute(
      `INSERT INTO recuperacion_contrasena (usuario_id, codigo_hash, expira_en)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ${MINUTOS_VIGENCIA} MINUTE))`,
      [usuario.usuario_id, hashCodigo(codigo)]
    );

    const respuesta = { mensaje: MENSAJE_ENVIADO };
    if (process.env.NODE_ENV === 'development') {
      console.log(`[CU04] Código de recuperación para ${email}: ${codigo}`);
      respuesta.codigoDesarrollo = codigo;
    }
    return res.json(respuesta);
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/auth/restablecer
 * Body: { email, codigo, password }
 *
 * Paso 2: si el código es correcto y no expiró, cambia la contraseña.
 *
 * Excepciones:
 *  E2 — datos vacíos, código sin 6 dígitos o contraseña corta   → 400
 *  E3 — código incorrecto, vencido o ya usado                    → 400
 *  E4 — 5 intentos fallidos: el código se anula                 → 400
 */
async function restablecer(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const codigo = typeof req.body?.codigo === 'string' ? req.body.codigo.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    // E2
    if (!email || !codigo || !password) {
      return res.status(400).json({ error: 'Correo, código y nueva contraseña son obligatorios' });
    }
    if (!/^\d{6}$/.test(codigo)) {
      return res.status(400).json({ error: 'El código debe tener 6 dígitos' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const [filas] = await pool.execute(
      `SELECT r.recuperacion_id, r.codigo_hash, r.intentos, u.usuario_id
         FROM usuario u
         JOIN recuperacion_contrasena r ON r.usuario_id = u.usuario_id
        WHERE u.email = ? AND u.estado = 'activo'
          AND r.usado_en IS NULL AND r.expira_en > NOW()
        ORDER BY r.recuperacion_id DESC
        LIMIT 1`,
      [email]
    );
    const solicitud = filas[0];

    // E3: no hay código vigente para ese correo
    if (!solicitud) {
      return res.status(400).json({ error: MENSAJE_CODIGO_MALO });
    }

    if (!mismoHash(hashCodigo(codigo), solicitud.codigo_hash)) {
      const intentos = solicitud.intentos + 1;
      // E4: al quinto intento fallido el código deja de servir
      if (intentos >= MAX_INTENTOS) {
        await pool.execute(
          'UPDATE recuperacion_contrasena SET intentos = ?, usado_en = NOW() WHERE recuperacion_id = ?',
          [intentos, solicitud.recuperacion_id]
        );
        return res.status(400).json({ error: 'Superaste los intentos permitidos. Pide un código nuevo.' });
      }
      await pool.execute(
        'UPDATE recuperacion_contrasena SET intentos = ? WHERE recuperacion_id = ?',
        [intentos, solicitud.recuperacion_id]
      );
      return res.status(400).json({ error: MENSAJE_CODIGO_MALO });
    }

    // Código correcto: se cambia la contraseña y se marca el código como usado,
    // las dos cosas juntas (transacción) para que no quede a medias
    const hash = await bcrypt.hash(password, 10);
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      await conexion.execute(
        'UPDATE usuario SET password_hash = ? WHERE usuario_id = ?',
        [hash, solicitud.usuario_id]
      );
      await conexion.execute(
        'UPDATE recuperacion_contrasena SET usado_en = NOW() WHERE recuperacion_id = ?',
        [solicitud.recuperacion_id]
      );
      await conexion.commit();
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }

    return res.json({ mensaje: 'Tu contraseña fue actualizada. Ya puedes iniciar sesión.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { pedirCodigo, restablecer };
