const { Router } = require('express');
const {
  listarFavoritos,
  agregarFavorito,
  quitarFavorito,
} = require('../controllers/favoritos.controller');
const { verificarToken } = require('../middleware/auth');

const router = Router();

// Gestión de favoritos del usuario autenticado (CU21–CU22)
router.get('/', verificarToken, listarFavoritos);              // CU22
router.post('/', verificarToken, agregarFavorito);             // CU21
router.delete('/:animalId', verificarToken, quitarFavorito);   // CU21

module.exports = router;
