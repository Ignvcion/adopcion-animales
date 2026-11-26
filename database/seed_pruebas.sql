-- =====================================================================
--  Adopción de Animales — Datos de prueba (Seed)
--  Módulo Adopción y Seguimiento (CU21–CU30)
--
--  NOTA: Este script se ejecuta solo con la base recién creada
--  porque usa IDs fijos.
--
--  Contenido:
--  - 3 cuentas de usuario con rol 'fundacion'
--  - 3 fundaciones con estado 'aprobada'
--  - 15 animales variados (perros y gatos de distintas comunas y tamaños)
--
--  Uso:
--  mysql -u root -p < database/seed_pruebas.sql
-- =====================================================================

USE adopcion_animales;

-- ---------------------------------------------------------------------
--  1. Usuarios de fundaciones
--  Contraseña para todas las fundaciones de prueba: Fundacion123!
--  Hash bcrypt: $2b$10$2qyujZSdJTWZaLPAr4D2wOj/K/PU9C8ctg6tmEsVIZoehctNBZm6G
-- ---------------------------------------------------------------------
INSERT INTO usuario (usuario_id, nombre, email, password_hash, rol, estado, telefono, comuna)
VALUES
  (2, 'Refugio Esperanza Animal', 'contacto@esperanzaanimal.cl', '$2b$10$2qyujZSdJTWZaLPAr4D2wOj/K/PU9C8ctg6tmEsVIZoehctNBZm6G', 'fundacion', 'activo', '+56911223344', 'Pedro Aguirre Cerda'),
  (3, 'Fundación Garras y Huellas', 'adopciones@garrasyhuellas.org', '$2b$10$2qyujZSdJTWZaLPAr4D2wOj/K/PU9C8ctg6tmEsVIZoehctNBZm6G', 'fundacion', 'activo', '+56922334455', 'Santiago'),
  (4, 'Corporación Protección Callejeros', 'contacto@callejeroschile.cl', '$2b$10$2qyujZSdJTWZaLPAr4D2wOj/K/PU9C8ctg6tmEsVIZoehctNBZm6G', 'fundacion', 'activo', '+56933445566', 'Ñuñoa')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  password_hash = VALUES(password_hash),
  rol = VALUES(rol),
  estado = VALUES(estado),
  telefono = VALUES(telefono),
  comuna = VALUES(comuna);

-- ---------------------------------------------------------------------
--  2. Fundaciones aprobadas
-- ---------------------------------------------------------------------
INSERT INTO fundacion (fundacion_id, usuario_id, nombre, rut, descripcion, comuna, telefono, sitio_web, estado, motivo_rechazo)
VALUES
  (1, 2, 'Refugio Esperanza Animal', '65.123.456-5', 'Rescate, rehabilitación y adopción responsable en la zona sur de Santiago.', 'Pedro Aguirre Cerda', '+56911223344', 'https://esperanzaanimal.cl', 'aprobada', NULL),
  (2, 3, 'Fundación Garras y Huellas', '65.987.654-K', 'Organización dedicada al rescate canino y felino con foco en esterilización y tenencia responsable.', 'Santiago', '+56922334455', 'https://garrasyhuellas.org', 'aprobada', NULL),
  (3, 4, 'Corporación Protección Callejeros', '65.456.789-1', 'Comunidad de rescate y adopción de animales vulnerables en la Región Metropolitana.', 'Ñuñoa', '+56933445566', 'https://callejeroschile.cl', 'aprobada', NULL)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  rut = VALUES(rut),
  descripcion = VALUES(descripcion),
  comuna = VALUES(comuna),
  telefono = VALUES(telefono),
  sitio_web = VALUES(sitio_web),
  estado = VALUES(estado);

-- ---------------------------------------------------------------------
--  3. 15 Animales variados para pruebas
-- ---------------------------------------------------------------------
INSERT INTO animal (animal_id, fundacion_id, nombre, especie, edad_aprox, rango_edad, sexo, tamano, comuna, descripcion, estado)
VALUES
  -- Refugio Esperanza Animal (Pedro Aguirre Cerda)
  (1, 1, 'Bizcochito', 'perro', '9 meses', 'cachorro', 'macho', 'mediano', 'Pedro Aguirre Cerda', 'Cachorro sociable, juguetón y con sus vacunas al día. Se lleva excelente con otros perros.', 'disponible'),
  (2, 1, 'Tom', 'gato', '5 años 7 meses', 'adulto', 'macho', 'mediano', 'Pedro Aguirre Cerda', 'Gato tranquilo y cariñoso, ideal para departamento con mallas de seguridad. Esterilizado.', 'disponible'),
  (3, 1, 'Haru', 'gato', '5 años 1 mes', 'adulto', 'macho', 'pequeno', 'Pedro Aguirre Cerda', 'Muy regalón y curioso. Le encanta dormir al sol y ronronear.', 'disponible'),
  (4, 1, 'Kiara', 'perro', '1 año 8 meses', 'joven', 'hembra', 'grande', 'Pedro Aguirre Cerda', 'Pastora mestiza enérgica, ideal para familias activas o casas con patio amplio.', 'disponible'),
  (5, 1, 'Oliver', 'gato', '3 meses', 'cachorro', 'macho', 'pequeno', 'Pedro Aguirre Cerda', 'Cachorrito rescatado de una caja. Muy sociable, desparasitado y comiendo alimento sólido.', 'disponible'),

  -- Fundación Garras y Huellas (Santiago / Providencia)
  (6, 2, 'Luna', 'perro', '2 años', 'joven', 'hembra', 'pequeno', 'Santiago', 'Perrita mestiza faldera, muy dulce y de tamaño pequeño. Se adapta perfecto a departamentos.', 'disponible'),
  (7, 2, 'Rocky', 'perro', '3 años', 'joven', 'macho', 'grande', 'Santiago', 'Perro noble y obediente, le gusta salir a caminar y correr en parques. Sabe pasear con correa.', 'disponible'),
  (8, 2, 'Misi', 'gato', '8 meses', 'cachorro', 'hembra', 'pequeno', 'Santiago', 'Gatita tricolor juguetona, adora los juguetes con plumas y los rascadores.', 'disponible'),
  (9, 2, 'Canela', 'perro', '1 año 4 meses', 'joven', 'hembra', 'mediano', 'Providencia', 'Perrita rescatada de la calle, muy agradecida y regalona. Muy buena con niños.', 'disponible'),
  (10, 2, 'Simón', 'gato', '4 años', 'adulto', 'macho', 'grande', 'Providencia', 'Gato atigrado corpulento pero muy dócil. Duerme la mayor parte de la tarde y pide cariño suavemente.', 'disponible'),

  -- Corporación Protección Callejeros (Ñuñoa / La Florida / Las Condes)
  (11, 3, 'Thor', 'perro', '5 años', 'adulto', 'macho', 'grande', 'Ñuñoa', 'Mestizo de labrador fuerte y leal. Protector de su hogar y excelente compañero de vida.', 'disponible'),
  (12, 3, 'Mia', 'gato', '6 meses', 'cachorro', 'hembra', 'pequeno', 'Ñuñoa', 'Gatita carey rescatada de colonia urbana. Desparasitada y lista para encontrar un hogar definitivo.', 'disponible'),
  (13, 3, 'Pelusa', 'gato', '2 años 3 meses', 'joven', 'hembra', 'mediano', 'Ñuñoa', 'Gata blanca de pelaje suave y ojos verdes. Muy silenciosa y respetuosa con los muebles.', 'disponible'),
  (14, 3, 'Bruno', 'perro', '9 años', 'senior', 'macho', 'mediano', 'La Florida', 'Perro senior muy tranquilo y sabio. Solo busca una cama cómoda y compañía cariñosa.', 'disponible'),
  (15, 3, 'Daisy', 'perro', '4 años', 'adulto', 'hembra', 'pequeno', 'Las Condes', 'Perrita de contextura chica, sociable con gatos y niños. Vacunada al día.', 'disponible')
ON DUPLICATE KEY UPDATE
  fundacion_id = VALUES(fundacion_id),
  nombre = VALUES(nombre),
  especie = VALUES(especie),
  edad_aprox = VALUES(edad_aprox),
  rango_edad = VALUES(rango_edad),
  sexo = VALUES(sexo),
  tamano = VALUES(tamano),
  comuna = VALUES(comuna),
  descripcion = VALUES(descripcion),
  estado = VALUES(estado);

-- ---------------------------------------------------------------------
--  4. Fotos principales de animales (tabla foto_animal)
-- ---------------------------------------------------------------------
INSERT INTO foto_animal (foto_animal_id, animal_id, url, es_principal, orden)
VALUES
  (1, 1, '/animales/bizcochito.jpeg', 1, 1),
  (2, 2, '/animales/tom.jpeg', 1, 1),
  (3, 3, '/animales/haru.jpeg', 1, 1)
ON DUPLICATE KEY UPDATE
  animal_id = VALUES(animal_id),
  url = VALUES(url),
  es_principal = VALUES(es_principal),
  orden = VALUES(orden);
