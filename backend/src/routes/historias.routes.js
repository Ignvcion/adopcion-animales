const { Router } = require('express');
const { listarHistoriasExito } = require('../controllers/historias.controller');

const router = Router();

// CU30 — Historias públicas de adopciones exitosas
router.get('/', listarHistoriasExito);

module.exports = router;
