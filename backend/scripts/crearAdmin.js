// Crea (o actualiza) la cuenta del administrador inicial.
// Uso: npm run crear-admin
// Toma los datos de ADMIN_NOMBRE, ADMIN_EMAIL y ADMIN_PASSWORD del archivo .env.
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

async function main() {
  const nombre = process.env.ADMIN_NOMBRE || 'Administrador';
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || password.length < 8) {
    console.error('Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) en el archivo .env');
    process.exitCode = 1;
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  // Si el correo ya existe, se actualizan su contraseña y su rol
  await pool.execute(
    `INSERT INTO usuario (nombre, email, password_hash, rol, estado)
     VALUES (?, ?, ?, 'admin', 'activo')
     ON DUPLICATE KEY UPDATE
       nombre = VALUES(nombre),
       password_hash = VALUES(password_hash),
       rol = 'admin',
       estado = 'activo'`,
    [nombre, email, hash]
  );

  console.log(`Administrador listo: ${email}`);
}

main()
  .catch((error) => {
    console.error('No se pudo crear el administrador:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
