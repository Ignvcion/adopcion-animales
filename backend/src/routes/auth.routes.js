const { Router } = require('express');
const { registro, login, usuarioActual } = require('../controllers/auth.controller');
const { pedirCodigo, restablecer } = require('../controllers/recuperacion.controller');
const { verificarToken } = require('../middleware/auth');

const router = Router();

router.post('/registro', registro);                 // CU01
router.post('/login', login);                       // CU02
router.get('/yo', verificarToken, usuarioActual);   // sesión actual
router.post('/recuperar', pedirCodigo);             // CU04 paso 1
router.post('/restablecer', restablecer);           // CU04 paso 2

module.exports = router;
