// Configuración de Express: middlewares, rutas y manejo de errores.
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Política de seguridad: permite las fuentes de Google Fonts y fotos externas (https)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    },
  },
}));
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
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/animales', require('./routes/animales.routes'));
app.use('/api/fundaciones', require('./routes/fundaciones.routes'));
app.use('/api/favoritos', require('./routes/favoritos.routes'));
app.use('/api/solicitudes', require('./routes/solicitudes.routes'));
app.use('/api/visitas', require('./routes/visitas.routes'));
app.use('/api/notificaciones', require('./routes/notificaciones.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/historias', require('./routes/historias.routes'));

// Ruta inexistente
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// En producción el mismo servidor entrega la página ya compilada (frontend/dist).
// Cualquier ruta que no sea de la API devuelve index.html para que React Router la resuelva.
const carpetaFrontend = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(carpetaFrontend)) {
  app.use(express.static(carpetaFrontend));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(carpetaFrontend, 'index.html'));
  });
}

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
