-- =====================================================================
--  Adopción de Animales — Datos de prueba (Seed)
--  Módulo Adopción y Seguimiento (CU21–CU30)
--
--  Contenido:
--  - 3 cuentas de usuario con rol 'fundacion'
--  - 3 fundaciones con estado 'aprobada'
--  - Tabla 'animal' (si no existe aún en schema.sql)
--  - 15 animales variados (perros y gatos de distintas comunas y tamaños)
--
--  Uso:
--  mysql -u root -p < database/seed_pruebas.sql
-- =====================================================================

USE adopcion_animales;

-- ---------------------------------------------------------------------
--  1. Tabla 'animal'
--  Se crea condicionalmente para permitir la inserción segura de los
--  datos de prueba sin alterar database/schema.sql.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS animal (
  animal_id      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  fundacion_id   INT UNSIGNED  NOT NULL,
  nombre         VARCHAR(100)  NOT NULL,
  especie        VARCHAR(50)   NOT NULL,
  tamano         VARCHAR(50)   NOT NULL,
  edad           VARCHAR(50)   NOT NULL,
  sexo           VARCHAR(20)   NULL,
  descripcion    TEXT          NULL,
  comuna         VARCHAR(80)   NOT NULL,
  estado         VARCHAR(50)   NOT NULL DEFAULT 'disponible',
  foto_url       VARCHAR(255)  NULL,
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (animal_id),
  CONSTRAINT fk_animal_fundacion
    FOREIGN KEY (fundacion_id) REFERENCES fundacion (fundacion_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
--  2. Usuarios de fundaciones
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
--  3. Fundaciones aprobadas
-- ---------------------------------------------------------------------
INSERT INTO fundacion (fundacion_id, usuario_id, nombre, rut, descripcion, comuna, telefono, sitio_web, estado, motivo_rechazo)
VALUES
  (1, 2, 'Refugio Esperanza Animal', '65.123.456-7', 'Rescate, rehabilitación y adopción responsable en la zona sur de Santiago.', 'Pedro Aguirre Cerda', '+56911223344', 'https://esperanzaanimal.cl', 'aprobada', NULL),
  (2, 3, 'Fundación Garras y Huellas', '65.987.654-3', 'Organización dedicada al rescate canino y felino con foco en esterilización y tenencia responsable.', 'Santiago', '+56922334455', 'https://garrasyhuellas.org', 'aprobada', NULL),
  (3, 4, 'Corporación Protección Callejeros', '65.456.789-0', 'Comunidad de rescate y adopción de animales vulnerables en la Región Metropolitana.', 'Ñuñoa', '+56933445566', 'https://callejeroschile.cl', 'aprobada', NULL)
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  rut = VALUES(rut),
  descripcion = VALUES(descripcion),
  comuna = VALUES(comuna),
  telefono = VALUES(telefono),
  sitio_web = VALUES(sitio_web),
  estado = VALUES(estado);

-- ---------------------------------------------------------------------
--  4. 15 Animales variados para pruebas
-- ---------------------------------------------------------------------
INSERT INTO animal (animal_id, fundacion_id, nombre, especie, tamano, edad, sexo, descripcion, comuna, estado, foto_url)
VALUES
  -- Refugio Esperanza Animal (Pedro Aguirre Cerda)
  (1, 1, 'Bizcochito', 'Perro', 'Mediano', '9 meses', 'Macho', 'Cachorro sociable, juguetón y con sus vacunas al día. Se lleva excelente con otros perros.', 'Pedro Aguirre Cerda', 'disponible', '/animales/bizcochito.jpeg'),
  (2, 1, 'Tom', 'Gato', 'Mediano', '5 años 7 meses', 'Macho', 'Gato tranquilo y cariñoso, ideal para departamento con mallas de seguridad. Esterilizado.', 'Pedro Aguirre Cerda', 'disponible', '/animales/tom.jpeg'),
  (3, 1, 'Haru', 'Gato', 'Pequeño', '5 años 1 mes', 'Macho', 'Muy regalón y curioso. Le encanta dormir al sol y ronronear.', 'Pedro Aguirre Cerda', 'disponible', '/animales/haru.jpeg'),
  (4, 1, 'Kiara', 'Perro', 'Grande', '1 año 8 meses', 'Hembra', 'Pastora mestiza enérgica, ideal para familias activas o casas con patio amplio.', 'Pedro Aguirre Cerda', 'disponible', NULL),
  (5, 1, 'Oliver', 'Gato', 'Pequeño', '3 meses', 'Macho', 'Cachorrito rescatado de una caja. Muy sociable, desparasitado y comiendo alimento sólido.', 'Pedro Aguirre Cerda', 'disponible', NULL),

  -- Fundación Garras y Huellas (Santiago / Providencia)
  (6, 2, 'Luna', 'Perro', 'Pequeño', '2 años', 'Hembra', 'Perrita mestiza faldera, muy dulce y de tamaño pequeño. Se adapta perfecto a departamentos.', 'Santiago', 'disponible', NULL),
  (7, 2, 'Rocky', 'Perro', 'Grande', '3 años', 'Macho', 'Perro noble y obediente, le gusta salir a caminar y correr en parques. Sabe pasear con correa.', 'Santiago', 'disponible', NULL),
  (8, 2, 'Misi', 'Gato', 'Pequeño', '8 meses', 'Hembra', 'Gatita tricolor juguetona, adora los juguetes con plumas y los rascadores.', 'Santiago', 'disponible', NULL),
  (9, 2, 'Canela', 'Perro', 'Mediano', '1 año 4 meses', 'Hembra', 'Perrita rescued de la calle, muy agradecida y regalona. Muy buena con niños.', 'Providencia', 'disponible', NULL),
  (10, 2, 'Simón', 'Gato', 'Grande', '4 años', 'Macho', 'Gato atigrado corpulento pero muy dócil. Duerme la mayor parte de la tarde y pide cariño suavemente.', 'Providencia', 'disponible', NULL),

  -- Corporación Protección Callejeros (Ñuñoa / La Florida / Las Condes)
  (11, 3, 'Thor', 'Perro', 'Grande', '5 años', 'Macho', 'Mestizo de labrador fuerte y leal. Protector de su hogar y excelente compañero de vida.', 'Ñuñoa', 'disponible', NULL),
  (12, 3, 'Mia', 'Gato', 'Pequeño', '6 meses', 'Hembra', 'Gatita carey rescatada de colonia urbana. Desparasitada y lista para encontrar un hogar definitivo.', 'Ñuñoa', 'disponible', NULL),
  (13, 3, 'Pelusa', 'Gato', 'Mediano', '2 años 3 meses', 'Hembra', 'Gata blanca de pelaje suave y ojos verdes. Muy silenciosa y respetuosa con los muebles.', 'Ñuñoa', 'disponible', NULL),
  (14, 3, 'Bruno', 'Perro', 'Mediano', '7 años', 'Macho', 'Perro senior muy tranquilo y sabio. Solo busca una cama cómoda y compañía cariñosa.', 'La Florida', 'disponible', NULL),
  (15, 3, 'Daisy', 'Perro', 'Pequeño', '4 años', 'Hembra', 'Perrita de contextura chica, sociable con gatos y niños. Vacunada al día.', 'Las Condes', 'disponible', NULL)
ON DUPLICATE KEY UPDATE
  fundacion_id = VALUES(fundacion_id),
  nombre = VALUES(nombre),
  especie = VALUES(especie),
  tamano = VALUES(tamano),
  edad = VALUES(edad),
  sexo = VALUES(sexo),
  descripcion = VALUES(descripcion),
  comuna = VALUES(comuna),
  estado = VALUES(estado),
  foto_url = VALUES(foto_url);
