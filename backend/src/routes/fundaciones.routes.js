const { Router } = require('express');
const { obtenerPerfilPublicoFundacion } = require('../controllers/fundaciones.controller');

const router = Router();

// Perfil público de fundación y sus animales disponibles (CU20)
router.get('/:id', obtenerPerfilPublicoFundacion);

module.exports = router;