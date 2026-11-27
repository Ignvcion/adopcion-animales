const { Router } = require('express');
const {
  listarNotificaciones,
  marcarTodasLeidas,
  marcarNotificacionLeida,
} = require('../controllers/notificaciones.controller');
const { verificarToken } = require('../middleware/auth');

const router = Router();

// CU28 — Bandeja de notificaciones para cualquier usuario autenticado
router.use(verificarToken);

router.get('/', listarNotificaciones);
router.patch('/leer-todas', marcarTodasLeidas);
router.patch('/:id/leer', marcarNotificacionLeida);

module.exports = router;
