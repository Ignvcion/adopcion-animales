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
