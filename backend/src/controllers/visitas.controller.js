// Controlador del módulo de visitas (CU27).
// CU27 — Agendar y gestionar visitas previas o de seguimiento entre adoptante y fundación.
const { pool } = require('../config/db');

const TIPOS_VALIDOS = ['pre_adopcion', 'seguimiento'];
const MODALIDADES_VALIDAS = ['presencial', 'videollamada'];
const ESTADOS_VISITA_VALIDOS = ['programada', 'confirmada', 'realizada', 'cancelada', 'reprogramada'];
const TRANSICIONES_PERMITIDAS = ['confirmada', 'cancelada', 'realizada', 'reprogramada'];

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

function normalizarFechaMysql(valor) {
  const crudo = texto(valor);
  if (!crudo) return { error: 'La fecha y hora de la visita son obligatorias' };

  const fecha = new Date(crudo);
  if (Number.isNaN(fecha.getTime())) {
    return { error: 'La fecha y hora de la visita no son válidas' };
  }

  // Margen de 1 minuto por latencia de red / reloj local
  if (fecha.getTime() < Date.now() - 60 * 1000) {
    return { error: 'La fecha y hora de la visita deben ser futuras' };
  }

  const pad = (n) => String(n).padStart(2, '0');
  const mysqlDatetime =
    `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())} ` +
    `${pad(fecha.getHours())}:${pad(fecha.getMinutes())}:${pad(fecha.getSeconds())}`;

  return { fechaMysql: mysqlDatetime, fechaObj: fecha };
}

function formatearFechaLegible(fechaObj) {
  return fechaObj.toLocaleString('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * POST /api/visitas (CU27)
 * Body: { solicitud_id, fecha_programada | fecha_hora, direccion_o_enlace | lugar,
 *         tipo?, modalidad?, notas? }
 */
async function crearVisita(req, res, next) {
  const solicitudId = Number.parseInt(req.body?.solicitud_id ?? req.body?.solicitudId, 10);
  if (!Number.isInteger(solicitudId) || solicitudId <= 0) {
    return res.status(400).json({ error: 'ID de solicitud inválido' });
  }

  const { error: errorFecha, fechaMysql, fechaObj } = normalizarFechaMysql(
    req.body?.fecha_programada ?? req.body?.fecha_hora
  );
  if (errorFecha) {
    return res.status(400).json({ error: errorFecha });
  }

  const direccionOEnlace = texto(req.body?.direccion_o_enlace ?? req.body?.lugar);
  if (!direccionOEnlace) {
    return res.status(400).json({ error: 'Debes indicar el lugar o enlace de la visita' });
  }
  if (direccionOEnlace.length > 255) {
    return res.status(400).json({ error: 'El lugar o enlace no puede superar los 255 caracteres' });
  }

  const tipo = req.body?.tipo ? texto(req.body.tipo).toLowerCase() : 'pre_adopcion';
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ error: 'El tipo de visita debe ser pre_adopcion o seguimiento' });
  }

  const modalidad = req.body?.modalidad ? texto(req.body.modalidad).toLowerCase() : 'presencial';
  if (!MODALIDADES_VALIDAS.includes(modalidad)) {
    return res.status(400).json({ error: 'La modalidad debe ser presencial o videollamada' });
  }

  const notas = texto(req.body?.notas) || null;
  if (notas && notas.length > 2000) {
    return res.status(400).json({ error: 'Las notas no pueden superar los 2000 caracteres' });
  }

  let conexion;
  try {
    conexion = await pool.getConnection();

    const [solicitudes] = await conexion.execute(
      `SELECT s.solicitud_id,
              s.usuario_id AS adoptante_id,
              s.animal_id,
              s.estado AS solicitud_estado,
              a.nombre AS animal_nombre,
              a.estado AS animal_estado,
              f.fundacion_id,
              f.usuario_id AS fundacion_usuario_id,
              f.nombre AS fundacion_nombre,
              f.estado AS fundacion_estado,
              u.nombre AS adoptante_nombre
         FROM solicitud s
         INNER JOIN animal a ON a.animal_id = s.animal_id
         INNER JOIN fundacion f ON f.fundacion_id = a.fundacion_id
         INNER JOIN usuario u ON u.usuario_id = s.usuario_id
        WHERE s.solicitud_id = ?
        LIMIT 1`,
      [solicitudId]
    );

    const solicitud = solicitudes[0];
    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (req.usuario.rol === 'adoptante' && solicitud.adoptante_id !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para agendar visitas en esta solicitud' });
    }

    if (req.usuario.rol === 'fundacion') {
      if (solicitud.fundacion_estado !== 'aprobada' || solicitud.fundacion_usuario_id !== req.usuario.id) {
        return res.status(403).json({ error: 'No tienes permiso para agendar visitas en esta solicitud' });
      }
    }

    if (!['aprobada', 'en_revision'].includes(solicitud.solicitud_estado)) {
      return res.status(400).json({
        error: 'Solo se pueden agendar visitas para solicitudes en revisión o aprobadas',
      });
    }

    if (solicitud.animal_estado === 'archivado') {
      return res.status(400).json({ error: 'La publicación del animal está archivada' });
    }

    await conexion.beginTransaction();

    const [resultado] = await conexion.execute(
      `INSERT INTO visita (
         solicitud_id, usuario_id, animal_id, tipo, modalidad,
         fecha_programada, direccion_o_enlace, estado, notas
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'programada', ?)`,
      [
        solicitudId,
        solicitud.adoptante_id,
        solicitud.animal_id,
        tipo,
        modalidad,
        fechaMysql,
        direccionOEnlace,
        notas,
      ]
    );

    const destinatarioId = req.usuario.rol === 'fundacion'
      ? solicitud.adoptante_id
      : solicitud.fundacion_usuario_id;

    const quienPropone = req.usuario.rol === 'fundacion'
      ? solicitud.fundacion_nombre
      : solicitud.adoptante_nombre;

    await conexion.execute(
      `INSERT INTO notificacion (usuario_id, animal_id, solicitud_id, tipo, titulo, mensaje)
       VALUES (?, ?, ?, 'visita', ?, ?)`,
      [
        destinatarioId,
        solicitud.animal_id,
        solicitudId,
        `Nueva visita propuesta para ${solicitud.animal_nombre}`,
        `${quienPropone} propuso una visita (${modalidad}) para conocer a ${solicitud.animal_nombre} el ${formatearFechaLegible(fechaObj)} en ${direccionOEnlace}.`,
      ]
    );

    await conexion.commit();

    return res.status(201).json({
      mensaje: 'Visita agendada correctamente',
      visita: {
        visita_id: resultado.insertId,
        solicitud_id: solicitudId,
        usuario_id: solicitud.adoptante_id,
        animal_id: solicitud.animal_id,
        tipo,
        modalidad,
        fecha_programada: fechaMysql,
        direccion_o_enlace: direccionOEnlace,
        estado: 'programada',
        notas,
        animal_nombre: solicitud.animal_nombre,
        fundacion_nombre: solicitud.fundacion_nombre,
      },
    });
  } catch (error) {
    if (conexion) await conexion.rollback();
    return next(error);
  } finally {
    if (conexion) conexion.release();
  }
}

/**
 * GET /api/visitas/mias (CU27)
 * Lista las visitas del usuario autenticado (como adoptante o como fundación).
 */
async function listarMisVisitas(req, res, next) {
  const estado = texto(req.query?.estado).toLowerCase();
  if (estado && !ESTADOS_VISITA_VALIDOS.includes(estado)) {
    return res.status(400).json({ error: 'Filtro de estado de visita inválido' });
  }

  let conexion;
  try {
    conexion = await pool.getConnection();

    const condiciones = [];
    const params = [];

    if (req.usuario.rol === 'adoptante') {
      condiciones.push('v.usuario_id = ?');
      params.push(req.usuario.id);
    } else {
      condiciones.push('f.usuario_id = ?');
      params.push(req.usuario.id);
    }

    if (estado) {
      condiciones.push('v.estado = ?');
      params.push(estado);
    }

    const [visitas] = await conexion.execute(
      `SELECT v.visita_id,
              v.solicitud_id,
              v.usuario_id,
              v.animal_id,
              v.tipo,
              v.modalidad,
              v.fecha_programada,
              v.direccion_o_enlace,
              v.estado,
              v.notas,
              v.creado_en,
              v.actualizado_en,
              a.nombre AS animal_nombre,
              a.especie AS animal_especie,
              a.estado AS animal_estado,
              (
                SELECT fa.url
                  FROM foto_animal fa
                 WHERE fa.animal_id = a.animal_id
                 ORDER BY fa.es_principal DESC, fa.orden ASC, fa.foto_animal_id ASC
                 LIMIT 1
              ) AS animal_foto_url,
              f.fundacion_id,
              f.nombre AS fundacion_nombre,
              u.nombre AS adoptante_nombre,
              u.email AS adoptante_email,
              s.codigo AS solicitud_codigo,
              s.estado AS solicitud_estado
         FROM visita v
         INNER JOIN animal a ON a.animal_id = v.animal_id
         INNER JOIN fundacion f ON f.fundacion_id = a.fundacion_id
         INNER JOIN usuario u ON u.usuario_id = v.usuario_id
         LEFT JOIN solicitud s ON s.solicitud_id = v.solicitud_id
        WHERE ${condiciones.join(' AND ')}
        ORDER BY v.fecha_programada DESC, v.visita_id DESC`,
      params
    );

    return res.json({ visitas });
  } catch (error) {
    return next(error);
  } finally {
    if (conexion) conexion.release();
  }
}

/**
 * PATCH /api/visitas/:id/estado (CU27)
 * Permite confirmar, reprogramar, cancelar o marcar como realizada una visita.
 */
async function actualizarEstadoVisita(req, res, next) {
  const visitaId = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(visitaId) || visitaId <= 0) {
    return res.status(400).json({ error: 'ID de visita inválido' });
  }

  const nuevoEstado = texto(req.body?.estado).toLowerCase();
  if (!TRANSICIONES_PERMITIDAS.includes(nuevoEstado)) {
    return res.status(400).json({
      error: 'El estado debe ser confirmada, cancelada, realizada o reprogramada',
    });
  }

  if (nuevoEstado === 'realizada' && req.usuario.rol !== 'fundacion') {
    return res.status(403).json({
      error: 'Solo la fundación puede marcar una visita como realizada',
    });
  }

  let nuevaFechaMysql = null;
  let nuevaFechaObj = null;
  if (nuevoEstado === 'reprogramada') {
    const { error: errorFecha, fechaMysql, fechaObj } = normalizarFechaMysql(
      req.body?.fecha_programada ?? req.body?.fecha_hora
    );
    if (errorFecha) {
      return res.status(400).json({ error: errorFecha });
    }
    nuevaFechaMysql = fechaMysql;
    nuevaFechaObj = fechaObj;
  }

  const direccionOEnlace = texto(req.body?.direccion_o_enlace ?? req.body?.lugar);
  if (direccionOEnlace && direccionOEnlace.length > 255) {
    return res.status(400).json({ error: 'El lugar o enlace no puede superar los 255 caracteres' });
  }

  const notas = req.body?.notas !== undefined ? texto(req.body.notas) : undefined;
  if (notas && notas.length > 2000) {
    return res.status(400).json({ error: 'Las notas no pueden superar los 2000 caracteres' });
  }

  let conexion;
  try {
    conexion = await pool.getConnection();

    const [visitas] = await conexion.execute(
      `SELECT v.visita_id,
              v.solicitud_id,
              v.usuario_id AS adoptante_id,
              v.animal_id,
              v.fecha_programada,
              v.direccion_o_enlace,
              v.estado,
              v.notas,
              a.nombre AS animal_nombre,
              f.usuario_id AS fundacion_usuario_id,
              f.nombre AS fundacion_nombre,
              u.nombre AS adoptante_nombre
         FROM visita v
         INNER JOIN animal a ON a.animal_id = v.animal_id
         INNER JOIN fundacion f ON f.fundacion_id = a.fundacion_id
         INNER JOIN usuario u ON u.usuario_id = v.usuario_id
        WHERE v.visita_id = ?
        LIMIT 1`,
      [visitaId]
    );

    const visita = visitas[0];
    if (!visita) {
      return res.status(404).json({ error: 'Visita no encontrada' });
    }

    const esAdoptanteDueno = req.usuario.rol === 'adoptante' && visita.adoptante_id === req.usuario.id;
    const esFundacionDuena = req.usuario.rol === 'fundacion' && visita.fundacion_usuario_id === req.usuario.id;
    if (!esAdoptanteDueno && !esFundacionDuena) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta visita' });
    }

    if (['cancelada', 'realizada'].includes(visita.estado)) {
      return res.status(409).json({
        error: `La visita ya se encuentra en estado '${visita.estado}' y no puede modificarse`,
      });
    }

    const fechaFinal = nuevaFechaMysql || visita.fecha_programada;
    const direccionFinal = direccionOEnlace || visita.direccion_o_enlace;
    const notasFinal = notas !== undefined ? (notas || null) : visita.notas;

    await conexion.beginTransaction();

    await conexion.execute(
      `UPDATE visita
          SET estado = ?,
              fecha_programada = ?,
              direccion_o_enlace = ?,
              notas = ?
        WHERE visita_id = ?`,
      [nuevoEstado, fechaFinal, direccionFinal, notasFinal, visitaId]
    );

    const destinatarioId = req.usuario.rol === 'fundacion'
      ? visita.adoptante_id
      : visita.fundacion_usuario_id;
    const actorNombre = req.usuario.rol === 'fundacion'
      ? visita.fundacion_nombre
      : visita.adoptante_nombre;

    let tituloNotif = `Actualización de visita para ${visita.animal_nombre}`;
    let mensajeNotif = `${actorNombre} cambió el estado de la visita para ${visita.animal_nombre} a ${nuevoEstado}.`;

    if (nuevoEstado === 'confirmada') {
      tituloNotif = `Visita confirmada para ${visita.animal_nombre}`;
      mensajeNotif = `${actorNombre} confirmó la visita para conocer a ${visita.animal_nombre}.`;
    } else if (nuevoEstado === 'cancelada') {
      tituloNotif = `Visita cancelada para ${visita.animal_nombre}`;
      mensajeNotif = `${actorNombre} canceló la visita programada para ${visita.animal_nombre}.${notas ? ` Motivo: ${notas}` : ''}`;
    } else if (nuevoEstado === 'reprogramada') {
      tituloNotif = `Visita reprogramada para ${visita.animal_nombre}`;
      mensajeNotif = `${actorNombre} reprogramó la visita para ${visita.animal_nombre} para el ${formatearFechaLegible(nuevaFechaObj)} en ${direccionFinal}.`;
    } else if (nuevoEstado === 'realizada') {
      tituloNotif = `Visita realizada para ${visita.animal_nombre}`;
      mensajeNotif = `${visita.fundacion_nombre} registró la visita de ${visita.animal_nombre} como realizada.`;
    }

    await conexion.execute(
      `INSERT INTO notificacion (usuario_id, animal_id, solicitud_id, tipo, titulo, mensaje)
       VALUES (?, ?, ?, 'visita', ?, ?)`,
      [destinatarioId, visita.animal_id, visita.solicitud_id, tituloNotif, mensajeNotif]
    );

    await conexion.commit();

    return res.json({
      mensaje: 'Estado de visita actualizado',
      visita_id: visitaId,
      estado: nuevoEstado,
      fecha_programada: fechaFinal,
      direccion_o_enlace: direccionFinal,
    });
  } catch (error) {
    if (conexion) await conexion.rollback();
    return next(error);
  } finally {
    if (conexion) conexion.release();
  }
}

module.exports = {
  crearVisita,
  listarMisVisitas,
  actualizarEstadoVisita,
};
