const { Router } = require('express');
const { verPerfil, editarPerfil, cambiarContrasena } = require('../controllers/perfil.controller');
const { verificarToken } = require('../middleware/auth');

const router = Router();

// Perfil de la cuenta con sesión iniciada (CU05), para todos los roles
router.get('/', verificarToken, verPerfil);
router.put('/', verificarToken, editarPerfil);
router.put('/contrasena', verificarToken, cambiarContrasena); // CU10

module.exports = router;
