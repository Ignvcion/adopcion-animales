const { Router } = require('express');
const {
  crearSolicitud,
  listarMisSolicitudes,
} = require('../controllers/solicitudes.controller');
const { verificarToken } = require('../middleware/auth');

const router = Router();

// Solicitudes de adopción del usuario autenticado (CU23–CU24)
router.post('/', verificarToken, crearSolicitud);            // CU23
router.get('/mias', verificarToken, listarMisSolicitudes);   // CU24

module.exports = router;
