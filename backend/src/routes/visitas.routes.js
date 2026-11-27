const { Router } = require('express');
const {
  crearVisita,
  listarMisVisitas,
  actualizarEstadoVisita,
} = require('../controllers/visitas.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

const router = Router();

// CU27 — Gestión de visitas (adoptantes y fundaciones)
router.use(verificarToken, permitirRoles('adoptante', 'fundacion'));

router.post('/', crearVisita);
router.get('/mias', listarMisVisitas);
router.patch('/:id/estado', actualizarEstadoVisita);

module.exports = router;
