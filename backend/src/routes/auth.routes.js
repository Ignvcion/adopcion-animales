const { Router } = require('express');
const { login, usuarioActual } = require('../controllers/auth.controller');
const { verificarToken } = require('../middleware/auth');

const router = Router();

router.post('/login', login);                       // CU02
router.get('/yo', verificarToken, usuarioActual);   // sesión actual

module.exports = router;
