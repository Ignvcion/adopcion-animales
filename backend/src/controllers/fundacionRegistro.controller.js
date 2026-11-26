// Controlador del registro de fundaciones.
// CU06 — Solicitar cuenta de fundación.
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { normalizarRut } = require('../utils/rut');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_VALIDO = /^\+?[0-9 ]{8,15}$/;
const URL_VALIDA = /^https?:\/\/[^\s]+\.[^\s]+$/i;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/**
 * POST /api/auth/registro-fundacion
 * Body: {
 *   nombre, email, password, telefono?,                 ← persona responsable
 *   fundacion: { nombre, rut, comuna, descripcion?, telefono?, sitio_web? }
 * }
 *
 * Flujo normal: valida los datos, crea en una sola transacción la cuenta
 * (rol 'fundacion') y la fundación con estado 'pendiente'. No inicia sesión:
 * la fundación podrá entrar cuando el administrador la apruebe (CU07).
 *
 * Excepciones:
 *  E1 — campos obligatorios vacíos o con formato inválido    → 400
 *  E2 — RUT con formato o dígito verificador incorrecto        → 400
 *  E3 — el correo o el RUT ya están registrados                → 409
 */
async function registrarFundacion(req, res, next) {
  try {
    const nombre = texto(req.body?.nombre);
    const email = texto(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const telefono = texto(req.body?.telefono) || null;

    const f = req.body?.fundacion || {};
    const fNombre = texto(f.nombre);
    const fRutIngresado = texto(f.rut);
    const fComuna = texto(f.comuna);
    const fDescripcion = texto(f.descripcion) || null;
    const fTelefono = texto(f.telefono) || null;
    const fSitioWeb = texto(f.sitio_web) || null;

    // E1: datos de la persona responsable
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña del responsable son obligatorios' });
    }
    if (nombre.length < 2 || nombre.length > 100) {
      return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
    }
    if (!EMAIL_VALIDO.test(email) || email.length > 150) {
      return res.status(400).json({ error: 'El correo no tiene un formato válido' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }
    if (telefono && !TELEFONO_VALIDO.test(telefono)) {
      return res.status(400).json({ error: 'El teléfono del responsable no tiene un formato válido' });
    }

    // E1: datos de la fundación
    if (!fNombre || !fRutIngresado || !fComuna) {
      return res.status(400).json({ error: 'Nombre, RUT y comuna de la fundación son obligatorios' });
    }
    if (fNombre.length > 150) {
      return res.status(400).json({ error: 'El nombre de la fundación no puede superar los 150 caracteres' });
    }
    if (fComuna.length > 80) {
      return res.status(400).json({ error: 'La comuna no puede superar los 80 caracteres' });
    }
    if (fTelefono && !TELEFONO_VALIDO.test(fTelefono)) {
      return res.status(400).json({ error: 'El teléfono de la fundación no tiene un formato válido' });
    }
    if (fSitioWeb && (!URL_VALIDA.test(fSitioWeb) || fSitioWeb.length > 255)) {
      return res.status(400).json({ error: 'El sitio web debe empezar con http:// o https://' });
    }

    // E2
    const fRut = normalizarRut(fRutIngresado);
    if (!fRut) {
      return res.status(400).json({ error: 'El RUT de la fundación no es válido. Revisa el dígito verificador.' });
    }

    // E3: se revisa antes para dar un mensaje claro de qué está repetido
    const [correos] = await pool.execute('SELECT 1 FROM usuario WHERE email = ? LIMIT 1', [email]);
    if (correos.length > 0) {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }
    const [ruts] = await pool.execute('SELECT 1 FROM fundacion WHERE rut = ? LIMIT 1', [fRut]);
    if (ruts.length > 0) {
      return res.status(409).json({ error: 'Ya existe una fundación registrada con ese RUT' });
    }

    const hash = await bcrypt.hash(password, 10);

    // Cuenta y fundación se crean juntas: si una falla, no queda ninguna a medias
    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();

      const [usuario] = await conexion.execute(
        `INSERT INTO usuario (nombre, email, password_hash, rol, estado, telefono, comuna)
         VALUES (?, ?, ?, 'fundacion', 'activo', ?, ?)`,
        [nombre, email, hash, telefono, fComuna]
      );

      await conexion.execute(
        `INSERT INTO fundacion (usuario_id, nombre, rut, descripcion, comuna, telefono, sitio_web, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
        [usuario.insertId, fNombre, fRut, fDescripcion, fComuna, fTelefono, fSitioWeb]
      );

      await conexion.commit();
    } catch (error) {
      await conexion.rollback();
      // E3 si otra persona registró el mismo correo o RUT en el mismo instante
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'El correo o el RUT ya están registrados' });
      }
      throw error;
    } finally {
      conexion.release();
    }

    return res.status(201).json({
      mensaje: 'Solicitud enviada. Podrás iniciar sesión cuando el administrador apruebe tu fundación.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { registrarFundacion };
