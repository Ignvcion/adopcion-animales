const { Router } = require('express');
const { verPerfil, editarPerfil } = require('../controllers/perfil.controller');
const { verificarToken } = require('../middleware/auth');

const router = Router();

// Perfil de la cuenta con sesión iniciada (CU05), para todos los roles
router.get('/', verificarToken, verPerfil);
router.put('/', verificarToken, editarPerfil);

module.exports = router;
