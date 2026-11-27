// Controlador de estadísticas para el administrador.
// CU09 — Ver panel de estadísticas.
const { pool } = require('../config/db');

/** Convierte las filas { clave, total } de un GROUP BY en un objeto con todas las claves. */
function agrupar(filas, claves) {
  const resultado = Object.fromEntries(claves.map((clave) => [clave, 0]));
  for (const fila of filas) {
    if (fila.clave in resultado) resultado[fila.clave] = Number(fila.total);
  }
  return resultado;
}

const sumar = (objeto) => Object.values(objeto).reduce((total, valor) => total + valor, 0);

/**
 * GET /api/admin/estadisticas
 *
 * Devuelve los totales de la plataforma agrupados por estado. Si todavía no hay
 * datos, responde con ceros en vez de un error (excepción E1 del CU09).
 * Las consultas son independientes, así que se ejecutan en paralelo.
 */
async function obtenerEstadisticas(req, res, next) {
  try {
    const [
      [usuariosPorRol],
      [usuariosBloqueados],
      [fundacionesPorEstado],
      [animalesPorEstado],
      [animalesPorEspecie],
      [solicitudesPorEstado],
      [ultimasSolicitudes],
    ] = await Promise.all([
      pool.query('SELECT rol AS clave, COUNT(*) AS total FROM usuario GROUP BY rol'),
      pool.query("SELECT COUNT(*) AS total FROM usuario WHERE estado = 'bloqueado'"),
      pool.query('SELECT estado AS clave, COUNT(*) AS total FROM fundacion GROUP BY estado'),
      pool.query('SELECT estado AS clave, COUNT(*) AS total FROM animal GROUP BY estado'),
      pool.query('SELECT especie AS clave, COUNT(*) AS total FROM animal GROUP BY especie'),
      pool.query('SELECT estado AS clave, COUNT(*) AS total FROM solicitud GROUP BY estado'),
      pool.query(
        'SELECT COUNT(*) AS total FROM solicitud WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
      ),
    ]);

    const usuarios = agrupar(usuariosPorRol, ['adoptante', 'fundacion', 'admin']);
    const fundaciones = agrupar(fundacionesPorEstado, ['pendiente', 'aprobada', 'rechazada']);
    const animales = agrupar(animalesPorEstado, ['disponible', 'en_proceso', 'adoptado', 'archivado']);
    const solicitudes = agrupar(
      solicitudesPorEstado,
      ['pendiente', 'en_revision', 'aprobada', 'rechazada', 'cancelada', 'completada']
    );

    return res.json({
      usuarios: {
        total: sumar(usuarios),
        por_rol: usuarios,
        bloqueados: Number(usuariosBloqueados[0]?.total || 0),
      },
      fundaciones: {
        total: sumar(fundaciones),
        por_estado: fundaciones,
      },
      animales: {
        total: sumar(animales),
        por_estado: animales,
        por_especie: agrupar(animalesPorEspecie, ['perro', 'gato', 'otro']),
      },
      solicitudes: {
        total: sumar(solicitudes),
        por_estado: solicitudes,
        ultimos_7_dias: Number(ultimasSolicitudes[0]?.total || 0),
      },
      // Adopciones = animales que ya encontraron hogar
      adopciones: animales.adoptado,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { obtenerEstadisticas };
