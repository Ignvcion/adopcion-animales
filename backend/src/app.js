// Configuración de Express: middlewares, rutas y manejo de errores.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
}));
app.use(express.json({ limit: '1mb' }));

// Para comprobar que la API está viva
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok' });
});

// Rutas de cada módulo
// (se agregan aquí a medida que cada integrante sube su parte)
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/perfil', require('./routes/perfil.routes'));
app.use('/api/animales', require('./routes/animales.routes'));
app.use('/api/favoritos', require('./routes/favoritos.routes'));
app.use('/api/solicitudes', require('./routes/solicitudes.routes'));

// Ruta inexistente
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Errores no controlados: se registran y se responde un mensaje genérico
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
