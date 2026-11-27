// Prepara la base de datos al iniciar en la nube (Railway).
// 1. Si la base está vacía, crea las tablas con database/schema.sql.
// 2. Si SEMBRAR_DATOS=1, carga también database/seed_pruebas.sql (solo esa primera vez).
// 3. Si hay ADMIN_EMAIL y ADMIN_PASSWORD, crea o actualiza el administrador.
// Es seguro ejecutarlo en cada inicio: si las tablas ya existen, no las toca.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const carpetaSql = path.join(__dirname, '..', '..', 'database');

// Quita CREATE DATABASE y USE: en Railway la base ya viene creada con otro nombre.
function leerSql(archivo) {
  return fs
    .readFileSync(path.join(carpetaSql, archivo), 'utf8')
    .replace(/CREATE DATABASE[\s\S]*?;/gi, '')
    .replace(/^\s*USE\s+\w+\s*;/gim, '');
}

async function main() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  const conexion = url
    ? await mysql.createConnection({ uri: url, multipleStatements: true })
    : await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'adopcion_animales',
        multipleStatements: true,
      });

  try {
    const [tablas] = await conexion.query("SHOW TABLES LIKE 'usuario'");
    if (tablas.length === 0) {
      console.log('Base vacía: creando tablas…');
      await conexion.query(leerSql('schema.sql'));
      if (process.env.SEMBRAR_DATOS === '1') {
        console.log('Cargando datos de prueba…');
        await conexion.query(leerSql('seed_pruebas.sql'));
      }
    }

    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (email && password.length >= 8) {
      const hash = await bcrypt.hash(password, 10);
      await conexion.execute(
        `INSERT INTO usuario (nombre, email, password_hash, rol, estado)
         VALUES (?, ?, ?, 'admin', 'activo')
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), rol = 'admin', estado = 'activo'`,
        [process.env.ADMIN_NOMBRE || 'Administrador', email, hash],
      );
      console.log(`Administrador listo: ${email}`);
    }
  } finally {
    await conexion.end();
  }
}

main().catch((error) => {
  // No se detiene el servidor: se registra el problema para revisarlo en los logs
  console.error('No se pudo preparar la base de datos:', error.message);
});
