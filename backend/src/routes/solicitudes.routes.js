const { Router } = require('express');
const {
  crearSolicitud,
  listarMisSolicitudes,
  listarSolicitudesRecibidas,
  resolverSolicitud,
} = require('../controllers/solicitudes.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

const router = Router();

// Solicitudes de adopción por adoptantes (CU23–CU24)
router.post('/', verificarToken, permitirRoles('adoptante'), crearSolicitud);            // CU23
router.get('/mias', verificarToken, permitirRoles('adoptante'), listarMisSolicitudes);   // CU24

// Gestión de solicitudes por fundaciones (CU25–CU26)
router.get('/recibidas', verificarToken, permitirRoles('fundacion'), listarSolicitudesRecibidas);       // CU25
router.patch('/:id/resolver', verificarToken, permitirRoles('fundacion'), resolverSolicitud);           // CU26

module.exports = router;
