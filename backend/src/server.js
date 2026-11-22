// Punto de entrada: carga las variables de entorno y levanta la API.
require('dotenv').config();

const app = require('./app');
const { probarConexion } = require('./config/db');

const PORT = Number(process.env.PORT) || 3000;

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}

app.listen(PORT, async () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
  try {
    await probarConexion();
    console.log('Conexión a MySQL correcta');
  } catch (error) {
    console.error('No se pudo conectar a MySQL:', error.message);
  }
});
