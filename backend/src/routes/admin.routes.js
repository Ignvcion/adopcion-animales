const { Router } = require('express');
const { listarFundaciones, revisarFundacion } = require('../controllers/adminFundaciones.controller');
const { listarUsuarios, cambiarEstadoUsuario } = require('../controllers/adminUsuarios.controller');
const { obtenerEstadisticas } = require('../controllers/adminEstadisticas.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

const router = Router();

// Todas las rutas de este archivo son solo para el administrador
router.use(verificarToken, permitirRoles('admin'));

router.get('/fundaciones', listarFundaciones);            // CU07
router.patch('/fundaciones/:id', revisarFundacion);       // CU07
router.get('/usuarios', listarUsuarios);                  // CU08
router.patch('/usuarios/:id/estado', cambiarEstadoUsuario); // CU08
router.get('/estadisticas', obtenerEstadisticas);         // CU09

module.exports = router;
