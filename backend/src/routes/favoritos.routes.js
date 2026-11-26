const { Router } = require('express');
const {
  listarFavoritos,
  agregarFavorito,
  quitarFavorito,
} = require('../controllers/favoritos.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

const router = Router();

// Gestión de favoritos por adoptantes (CU21–CU22)
router.get('/', verificarToken, permitirRoles('adoptante'), listarFavoritos);              // CU22
router.post('/', verificarToken, permitirRoles('adoptante'), agregarFavorito);             // CU21
router.delete('/:animalId', verificarToken, permitirRoles('adoptante'), quitarFavorito);   // CU21

module.exports = router;
