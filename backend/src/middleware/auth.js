// Middlewares de seguridad que usan todos los módulos.
const jwt = require('jsonwebtoken');

/**
 * Exige un token válido en el encabezado: Authorization: Bearer <token>.
 * Si es válido, deja los datos del usuario en req.usuario = { id, rol, nombre }.
 */
function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Debes iniciar sesión' });
  }

  try {
    const datos = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: datos.id, rol: datos.rol, nombre: datos.nombre };
    return next();
  } catch (error) {
    const mensaje = error.name === 'TokenExpiredError'
      ? 'Tu sesión expiró. Inicia sesión de nuevo.'
      : 'Sesión no válida. Inicia sesión de nuevo.';
    return res.status(401).json({ error: mensaje });
  }
}

/**
 * Permite el paso solo a los roles indicados. Se usa después de verificarToken.
 * Ejemplo: router.get('/usuarios', verificarToken, permitirRoles('admin'), listar)
 */
function permitirRoles(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
    }
    return next();
  };
}

module.exports = { verificarToken, permitirRoles };
