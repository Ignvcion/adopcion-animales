const { Router } = require('express');
const {
  crearSolicitud,
  listarMisSolicitudes,
} = require('../controllers/solicitudes.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

const router = Router();

// Solicitudes de adopción por adoptantes (CU23–CU24)
router.post('/', verificarToken, permitirRoles('adoptante'), crearSolicitud);            // CU23
router.get('/mias', verificarToken, permitirRoles('adoptante'), listarMisSolicitudes);   // CU24

module.exports = router;
