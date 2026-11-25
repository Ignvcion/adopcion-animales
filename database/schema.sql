-- =====================================================================
--  Adopción de Animales — esquema de la base de datos
--  Tablas base: usuario y fundacion (módulo de cuentas, CU01–CU10).
--  Cada módulo agrega sus propias tablas al final de este archivo.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS adopcion_animales
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE adopcion_animales;

-- ---------------------------------------------------------------------
--  usuario: cuentas de adoptantes, fundaciones y administradores
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
  usuario_id     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(100)  NOT NULL,
  email          VARCHAR(150)  NOT NULL,
  password_hash  VARCHAR(255)  NOT NULL,
  rol            ENUM('adoptante', 'fundacion', 'admin') NOT NULL DEFAULT 'adoptante',
  estado         ENUM('activo', 'bloqueado')             NOT NULL DEFAULT 'activo',
  telefono       VARCHAR(20)   NULL,
  comuna         VARCHAR(80)   NULL,
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id),
  UNIQUE KEY uq_usuario_email (email)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
--  fundacion: datos de la organización y su aprobación por el admin
--  (una cuenta de rol 'fundacion' tiene exactamente una fila aquí)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fundacion (
  fundacion_id   INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  usuario_id     INT UNSIGNED  NOT NULL,
  nombre         VARCHAR(150)  NOT NULL,
  rut            VARCHAR(12)   NOT NULL,
  descripcion    TEXT          NULL,
  comuna         VARCHAR(80)   NOT NULL,
  telefono       VARCHAR(20)   NULL,
  sitio_web      VARCHAR(255)  NULL,
  estado         ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
  motivo_rechazo VARCHAR(255)  NULL,
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fundacion_id),
  UNIQUE KEY uq_fundacion_usuario (usuario_id),
  UNIQUE KEY uq_fundacion_rut (rut),
  CONSTRAINT fk_fundacion_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (usuario_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
--  recuperacion_contrasena: códigos temporales para restablecer la
--  contraseña (CU04). Se guarda el hash del código, nunca el código.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recuperacion_contrasena (
  recuperacion_id INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED     NOT NULL,
  codigo_hash     CHAR(64)         NOT NULL,
  intentos        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expira_en       DATETIME         NOT NULL,
  usado_en        DATETIME         NULL,
  creado_en       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (recuperacion_id),
  KEY idx_recuperacion_usuario (usuario_id),
  CONSTRAINT fk_recuperacion_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (usuario_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
--  animal: mascotas publicadas por fundaciones aprobadas (CU11–CU20)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS animal (
  animal_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fundacion_id         INT UNSIGNED NOT NULL,
  nombre               VARCHAR(100) NOT NULL,
  especie              ENUM('perro', 'gato', 'otro') NOT NULL,
  raza                 VARCHAR(100) NULL,
  edad_aprox           VARCHAR(50)  NOT NULL,
  sexo                 ENUM('macho', 'hembra') NOT NULL,
  tamano               ENUM('pequeno', 'mediano', 'grande') NOT NULL,
  comuna               VARCHAR(80)  NOT NULL,
  descripcion          TEXT         NOT NULL,
  estado_salud         VARCHAR(255) NULL,
  requisitos_adopcion  TEXT         NULL,
  estado               ENUM('disponible', 'en_proceso', 'adoptado', 'archivado') NOT NULL DEFAULT 'disponible',
  creado_en            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (animal_id),
  KEY idx_animal_fundacion (fundacion_id),
  KEY idx_animal_estado (estado),
  CONSTRAINT fk_animal_fundacion
    FOREIGN KEY (fundacion_id) REFERENCES fundacion (fundacion_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
--  foto_animal: galería de imágenes asociadas a cada animal
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS foto_animal (
  foto_animal_id INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  animal_id      INT UNSIGNED     NOT NULL,
  url            VARCHAR(500)     NOT NULL,
  es_principal   TINYINT(1)       NOT NULL DEFAULT 0,
  orden          TINYINT UNSIGNED NOT NULL DEFAULT 1,
  creado_en      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (foto_animal_id),
  KEY idx_foto_animal (animal_id),
  CONSTRAINT fk_foto_animal
    FOREIGN KEY (animal_id) REFERENCES animal (animal_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;