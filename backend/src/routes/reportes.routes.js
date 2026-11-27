const { Router } = require('express');
const { crearReporte, listarReportes } = require('../controllers/reportes.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

const router = Router();

// CU29 — Reportar publicación sospechosa y listar reportes
router.post('/', verificarToken, permitirRoles('adoptante'), crearReporte);
router.get('/', verificarToken, permitirRoles('admin'), listarReportes);

module.exports = router;
