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

CREATE TABLE IF NOT EXISTS animal (
  animal_id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fundacion_id         INT UNSIGNED NOT NULL,
  nombre               VARCHAR(100) NOT NULL,
  especie              ENUM('perro', 'gato', 'otro') NOT NULL,
  raza                 VARCHAR(100) NULL,
  edad_aprox           VARCHAR(50)  NOT NULL,
  rango_edad           ENUM('cachorro', 'joven', 'adulto', 'senior') NOT NULL,
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
  KEY idx_animal_rango_edad (rango_edad),
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

-- =====================================================================
--  Módulo Adopción, Favoritos y Seguimiento (CU21–CU30)
-- =====================================================================

-- ---------------------------------------------------------------------
--  favorito: animales guardados por un usuario adoptante (CU21–CU22)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorito (
  favorito_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  animal_id   INT UNSIGNED NOT NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (favorito_id),
  UNIQUE KEY uq_favorito_usuario_animal (usuario_id, animal_id),
  KEY idx_favorito_animal (animal_id),
  CONSTRAINT fk_favorito_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (usuario_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_favorito_animal
    FOREIGN KEY (animal_id) REFERENCES animal (animal_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
--  solicitud: postulaciones de adopción enviadas por usuarios (CU23–CU26)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS solicitud (
  solicitud_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id           INT UNSIGNED NOT NULL,
  animal_id            INT UNSIGNED NOT NULL,
  codigo               VARCHAR(20)  NULL,
  telefono             VARCHAR(20)  NOT NULL,
  tipo_vivienda        VARCHAR(80)  NOT NULL,
  experiencia          TEXT         NOT NULL,
  motivo               TEXT         NOT NULL,
  otros_animales       TINYINT(1)   NOT NULL DEFAULT 0,
  compromiso           TINYINT(1)   NOT NULL DEFAULT 1,
  estado               ENUM('pendiente', 'en_revision', 'aprobada', 'rechazada', 'cancelada', 'completada')
                                    NOT NULL DEFAULT 'pendiente',
  comentario_fundacion TEXT         NULL,
  creado_en            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (solicitud_id),
  UNIQUE KEY uq_solicitud_codigo (codigo),
  KEY idx_solicitud_usuario (usuario_id),
  KEY idx_solicitud_animal (animal_id),
  KEY idx_solicitud_estado (estado),
  CONSTRAINT fk_solicitud_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (usuario_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_solicitud_animal
    FOREIGN KEY (animal_id) REFERENCES animal (animal_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
--  visita: visitas previas o de seguimiento asociadas a una adopción (CU27)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visita (
  visita_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  solicitud_id       INT UNSIGNED NULL,
  usuario_id         INT UNSIGNED NOT NULL,
  animal_id          INT UNSIGNED NOT NULL,
  tipo               ENUM('pre_adopcion', 'seguimiento') NOT NULL DEFAULT 'pre_adopcion',
  modalidad          ENUM('presencial', 'videollamada')  NOT NULL DEFAULT 'presencial',
  fecha_programada   DATETIME     NOT NULL,
  direccion_o_enlace VARCHAR(255) NULL,
  estado             ENUM('programada', 'confirmada', 'realizada', 'cancelada', 'reprogramada')
                                  NOT NULL DEFAULT 'programada',
  notas              TEXT         NULL,
  creado_en          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (visita_id),
  KEY idx_visita_solicitud (solicitud_id),
  KEY idx_visita_usuario (usuario_id),
  KEY idx_visita_animal (animal_id),
  KEY idx_visita_estado (estado),
  CONSTRAINT fk_visita_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitud (solicitud_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_visita_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (usuario_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_visita_animal
    FOREIGN KEY (animal_id) REFERENCES animal (animal_id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
--  notificacion: avisos internos para usuarios y fundaciones (CU28)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacion (
  notificacion_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED NOT NULL,
  animal_id       INT UNSIGNED NULL,
  solicitud_id    INT UNSIGNED NULL,
  tipo            ENUM('solicitud', 'visita', 'adopcion', 'reporte', 'sistema') NOT NULL DEFAULT 'sistema',
  titulo          VARCHAR(150) NOT NULL,
  mensaje         TEXT         NOT NULL,
  leida           TINYINT(1)   NOT NULL DEFAULT 0,
  leida_en        DATETIME     NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notificacion_id),
  KEY idx_notificacion_usuario_leida (usuario_id, leida),
  KEY idx_notificacion_animal (animal_id),
  KEY idx_notificacion_solicitud (solicitud_id),
  CONSTRAINT fk_notificacion_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (usuario_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_notificacion_animal
    FOREIGN KEY (animal_id) REFERENCES animal (animal_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_notificacion_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitud (solicitud_id)
    ON DELETE SET NULL
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
--  reporte: denuncias sobre publicaciones o comportamiento (CU29)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reporte (
  reporte_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id     INT UNSIGNED NOT NULL,
  animal_id      INT UNSIGNED NULL,
  revisado_por   INT UNSIGNED NULL,
  motivo         ENUM('informacion_falsa', 'maltrato', 'cobro_indebido', 'contenido_inapropiado', 'otro')
                              NOT NULL DEFAULT 'otro',
  descripcion    TEXT         NOT NULL,
  estado         ENUM('pendiente', 'en_revision', 'resuelto', 'descartado') NOT NULL DEFAULT 'pendiente',
  resolucion     TEXT         NULL,
  creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (reporte_id),
  KEY idx_reporte_usuario (usuario_id),
  KEY idx_reporte_animal (animal_id),
  KEY idx_reporte_revisor (revisado_por),
  KEY idx_reporte_estado (estado),
  CONSTRAINT fk_reporte_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario (usuario_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reporte_animal
    FOREIGN KEY (animal_id) REFERENCES animal (animal_id)
    ON DELETE SET NULL,
  CONSTRAINT fk_reporte_revisor
    FOREIGN KEY (revisado_por) REFERENCES usuario (usuario_id)
    ON DELETE SET NULL
) ENGINE = InnoDB;
