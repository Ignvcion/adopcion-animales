// Conexión a MySQL mediante un pool de conexiones.
// Acepta DATABASE_URL (Railway) o las variables DB_* por separado.
const mysql = require('mysql2/promise');

function opcionesConexion() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) {
    return { uri: url };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'adopcion_animales',
  };
}

const pool = mysql.createPool({
  ...opcionesConexion(),
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  timezone: 'Z',
});

/** Comprueba que la base de datos responde; se usa al iniciar el servidor. */
async function probarConexion() {
  const [filas] = await pool.query('SELECT 1 AS ok');
  return filas[0].ok === 1;
}

module.exports = { pool, probarConexion };
