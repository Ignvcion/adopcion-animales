const { Router } = require('express');
const {
  listarCatalogoAnimales,
  listarMisPublicaciones,
  listarFotosAnimal,
  obtenerDetalleAnimal,
  publicarAnimal,
  editarAnimal,
  cambiarEstadoAnimal,
  agregarFotoAnimal,
  ordenarFotosAnimal,
  eliminarFotoAnimal,
} = require('../controllers/animales.controller');
const { verificarToken, permitirRoles } = require('../middleware/auth');

const router = Router();

// Catálogo público con filtros, galería y ficha del animal (CU14–CU17)
router.get('/', listarCatalogoAnimales); // CU15–CU16
router.get('/mis-publicaciones', verificarToken, permitirRoles('fundacion'), listarMisPublicaciones); // CU19
router.get('/:id/fotos', listarFotosAnimal); // CU14
router.get('/:id', obtenerDetalleAnimal); // CU17

// Gestión de animales y fotos por fundaciones (CU11–CU14, CU18)
router.post('/', verificarToken, permitirRoles('fundacion'), publicarAnimal); // CU11
router.put('/:id', verificarToken, permitirRoles('fundacion'), editarAnimal); // CU12
router.patch('/:id/estado', verificarToken, permitirRoles('fundacion'), cambiarEstadoAnimal); // CU13, CU18
router.post('/:id/fotos', verificarToken, permitirRoles('fundacion'), agregarFotoAnimal); // CU14
router.put('/:id/fotos/orden', verificarToken, permitirRoles('fundacion'), ordenarFotosAnimal); // CU14
router.delete('/:id/fotos/:fotoId', verificarToken, permitirRoles('fundacion'), eliminarFotoAnimal); // CU14

module.exports = router;