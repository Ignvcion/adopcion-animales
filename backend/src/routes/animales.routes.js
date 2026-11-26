const { Router } = require('express');
const {
  publicarAnimal,
  editarAnimal,
  cambiarEstadoAnimal,
  agregarFotoAnimal,
  ordenarFotosAnimal,
  eliminarFotoAnimal,
} = require('../controllers/animales.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

const router = Router();

// Gestión de animales y fotos por fundaciones (CU11–CU14)
router.post('/', verificarToken, permitirRoles('fundacion'), publicarAnimal);                   // CU11
router.put('/:id', verificarToken, permitirRoles('fundacion'), editarAnimal);                 // CU12
router.patch('/:id/estado', verificarToken, permitirRoles('fundacion'), cambiarEstadoAnimal); // CU13
router.post('/:id/fotos', verificarToken, permitirRoles('fundacion'), agregarFotoAnimal);     // CU14
router.put('/:id/fotos/orden', verificarToken, permitirRoles('fundacion'), ordenarFotosAnimal); // CU14
router.delete('/:id/fotos/:fotoId', verificarToken, permitirRoles('fundacion'), eliminarFotoAnimal); // CU14

module.exports = router;