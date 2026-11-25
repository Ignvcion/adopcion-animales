const { Router } = require('express');
const {
  publicarAnimal,
  editarAnimal,
  cambiarEstadoAnimal,
} = require('../controllers/animales.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

const router = Router();

// Gestión de animales por fundaciones (CU11–CU13)
router.post('/', verificarToken, permitirRoles('fundacion'), publicarAnimal);              // CU11
router.put('/:id', verificarToken, permitirRoles('fundacion'), editarAnimal);            // CU12
router.patch('/:id/estado', verificarToken, permitirRoles('fundacion'), cambiarEstadoAnimal); // CU13

module.exports = router;