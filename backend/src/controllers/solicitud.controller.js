const pool = require("../config/db");

function generateCodigo() {
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `#${num}`;
}

function toDateOnly(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toISOString().slice(0, 10);
  } catch (e) {
    console.error("Error normalizando fecha:", e);
    return null;
  }
}

function normalizeStatusLabel(status) {
  const s = String(status || "").trim();

  if (s === "Closed") return "Aprobado";
  if (s === "Open") return "Enviado";
  if (s === "En revisión") return "En Revisión";

  return s || "Enviado";
}

function buildReportFilters(query = {}) {
  const conditions = [];
  const params = [];

  if (query.from) {
    conditions.push("DATE(s.created_at) >= ?");
    params.push(query.from);
  }

  if (query.to) {
    conditions.push("DATE(s.created_at) <= ?");
    params.push(query.to);
  }

  if (query.status && query.status !== "all") {
    conditions.push("s.estado = ?");
    params.push(query.status);
  }

  if (query.search && String(query.search).trim()) {
    const q = `%${String(query.search).trim()}%`;
    conditions.push(`
      (
        s.codigo_publico LIKE ?
        OR s.estudiante_nombre LIKE ?
        OR s.titulo_proyecto LIKE ?
        OR s.institucion_nombre LIKE ?
        OR s.owner_email LIKE ?
      )
    `);
    params.push(q, q, q, q, q);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  return { whereClause, params };
}

async function getRevisionFlagsBySolicitudId(solicitudId, db = pool) {
  const [rows] = await db.query(
    `SELECT
      institucion_editable,
      proyecto_editable,
      objetivos_editable,
      cronograma_editable,
      comentario_revisor,
      updated_by,
      created_at,
      updated_at
     FROM solicitud_revision_flags
     WHERE solicitud_id = ?
     LIMIT 1`,
    [solicitudId],
  );

  return rows[0] || null;
}

/**
 * Estudiante: obtener MIS solicitudes
 */
async function getMySolicitudes(req, res) {
  try {
    const ownerEmail = String(req.user?.email || "").trim();

    if (!ownerEmail) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      `SELECT *
       FROM solicitudes
       WHERE owner_email = ?
       ORDER BY created_at DESC`,
      [ownerEmail],
    );

    return res.json(rows);
  } catch (err) {
    console.error("Error getMySolicitudes:", err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}

/**
 * Admin: obtener TODAS las solicitudes
 */
async function getAllSolicitudes(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM solicitudes
       ORDER BY created_at DESC`,
    );

    return res.json(rows);
  } catch (err) {
    console.error("Error getAllSolicitudes:", err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}

/**
 * Crear solicitud (Estudiante)
 */
async function createSolicitud(req, res) {
  const {
    estudiante_nombre,
    estudiante_cedula,
    carrera,
    sede,
    estudiante_email,
    estudiante_phone,
    oficio,
    estado_civil,
    domicilio,
    lugar_trabajo,

    institucion_id,
    institucion_nombre,

    titulo_proyecto,
    descripcion_problema,
    justificacion,

    objetivo_general,
    objetivos_especificos,
    beneficiario,
    estrategia_solucion,

    prioridad,
    vencimiento,

    owner_email: ownerEmailBody,
    owner_user_id: ownerUserIdBody,

    objetivos_especificos_items,
    cronograma_items,
  } = req.body;

  const descProblema = String(
    descripcion_problema || justificacion || "",
  ).trim();

  if (
    !institucion_nombre ||
    !descProblema ||
    !objetivo_general ||
    !vencimiento
  ) {
    return res.status(400).json({
      message:
        "Faltan campos requeridos: institucion_nombre, descripcion_problema (o justificacion), objetivo_general y vencimiento",
      debug: {
        institucion_nombre: !!institucion_nombre,
        descProblema: !!descProblema,
        objetivo_general: !!objetivo_general,
        vencimiento: !!vencimiento,
      },
    });
  }

  const ownerUserId = ownerUserIdBody || req.user?.id || null;
  const ownerEmail = String(ownerEmailBody || req.user?.email || "").trim();

  if (!ownerEmail) {
    return res.status(400).json({
      message: "owner_email es requerido",
    });
  }

  const codigo_publico = generateCodigo();
  const vencimientoDate = toDateOnly(vencimiento);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO solicitudes (
        codigo_publico,
        estudiante_nombre,
        estudiante_cedula,
        carrera,
        sede,
        estudiante_email,
        estudiante_phone,
        oficio,
        estado_civil,
        domicilio,
        lugar_trabajo,
        institucion_id,
        institucion_nombre,
        titulo_proyecto,
        descripcion_problema,
        objetivo_general,
        objetivos_especificos,
        beneficiario,
        estrategia_solucion,
        prioridad,
        estado,
        vencimiento,
        owner_user_id,
        owner_email,
        assigned_to,
        assign_date
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        codigo_publico,
        estudiante_nombre || "",
        estudiante_cedula || "",
        carrera || null,
        sede || null,
        estudiante_email || null,
        estudiante_phone || null,
        oficio || null,
        estado_civil || null,
        domicilio || null,
        lugar_trabajo || null,
        institucion_id || null,
        institucion_nombre,
        titulo_proyecto || null,
        descProblema,
        objetivo_general,
        objetivos_especificos || null,
        beneficiario || null,
        estrategia_solucion || null,
        prioridad || "Medium",
        "Enviado",
        vencimientoDate,
        ownerUserId,
        ownerEmail,
        null,
        null,
      ],
    );

    const solicitudId = result.insertId;

    const objetivosArr = Array.isArray(objetivos_especificos_items)
      ? objetivos_especificos_items
      : [];

    const objetivosClean = objetivosArr
      .map((x) => String(x || "").trim())
      .filter(Boolean);

    if (objetivosClean.length) {
      const values = objetivosClean.map((desc, i) => [
        solicitudId,
        i + 1,
        desc,
      ]);

      await conn.query(
        `INSERT INTO solicitud_objetivos_especificos (solicitud_id, orden, descripcion)
         VALUES ?`,
        [values],
      );
    }

    const cronoArr = Array.isArray(cronograma_items) ? cronograma_items : [];
    const cronoClean = cronoArr
      .map((r) => ({
        actividad: String(r?.actividad || "").trim(),
        tarea: String(r?.tarea || "").trim(),
        horas: parseInt(String(r?.horas ?? "").trim(), 10),
      }))
      .filter((r) => r.actividad && r.tarea && Number.isFinite(r.horas));

    if (cronoClean.length) {
      const values = cronoClean.map((r, i) => [
        solicitudId,
        i + 1,
        r.actividad,
        r.tarea,
        r.horas,
      ]);

      await conn.query(
        `INSERT INTO solicitud_cronograma (solicitud_id, orden, actividad, tarea, horas)
         VALUES ?`,
        [values],
      );
    }

    await conn.query(
      `INSERT INTO solicitud_history (solicitud_id, accion, usuario, mensaje)
       VALUES (?,?,?,?)`,
      [
        solicitudId,
        "Solicitud creada y enviada",
        ownerEmail,
        `Objetivos: ${objetivosClean.length}, Cronograma: ${cronoClean.length}`,
      ],
    );

    await conn.commit();

    const [rows] = await pool.query("SELECT * FROM solicitudes WHERE id = ?", [
      solicitudId,
    ]);

    return res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error("Error createSolicitud:", err);
    return res.status(500).json({
      message: "Error en el servidor al crear solicitud",
      error: err.message,
    });
  } finally {
    conn.release();
  }
}

/**
 * GET /solicitudes/:id/detalle
 */
async function getSolicitudDetalle(req, res) {
  try {
    const { id } = req.params;

    const [solRows] = await pool.query(
      `SELECT * FROM solicitudes WHERE id = ? LIMIT 1`,
      [id],
    );

    if (!solRows.length) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    const [objetivos] = await pool.query(
      `SELECT id, orden, descripcion
       FROM solicitud_objetivos_especificos
       WHERE solicitud_id = ?
       ORDER BY orden ASC, id ASC`,
      [id],
    );

    const [cronograma] = await pool.query(
      `SELECT id, orden, actividad, tarea, horas
       FROM solicitud_cronograma
       WHERE solicitud_id = ?
       ORDER BY orden ASC, id ASC`,
      [id],
    );

    const [history] = await pool.query(
      `SELECT id, accion, usuario, mensaje, created_at
       FROM solicitud_history
       WHERE solicitud_id = ?
       ORDER BY created_at DESC`,
      [id],
    );

    const revisionFlags = await getRevisionFlagsBySolicitudId(id);

    return res.json({
      solicitud: solRows[0],
      objetivos,
      cronograma,
      history,
      revision_flags: revisionFlags,
    });
  } catch (err) {
    console.error("Error getSolicitudDetalle:", err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status, observation } = req.body;

  try {
    await pool.query(
      `UPDATE solicitudes
       SET estado = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, id],
    );

    const actorEmail = req.user?.email || "sistema@ufide.ac.cr";

    await pool.query(
      `INSERT INTO solicitud_history (solicitud_id, accion, usuario, mensaje)
       VALUES (?,?,?,?)`,
      [id, `Estado cambiado a: ${status}`, actorEmail, observation || ""],
    );

    const [rows] = await pool.query("SELECT * FROM solicitudes WHERE id = ?", [
      id,
    ]);

    return res.json(rows[0]);
  } catch (err) {
    console.error("Error updateStatus:", err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}

async function assignReviewer(req, res) {
  const { id } = req.params;
  const { reviewerEmail } = req.body;

  if (!reviewerEmail) {
    return res.status(400).json({ message: "reviewerEmail es requerido" });
  }

  try {
    await pool.query(
      `UPDATE solicitudes
       SET assigned_to = ?,
           assign_date = NOW(),
           estado = CASE
             WHEN estado IN ('Enviado', 'Observado') THEN 'En Revisión'
             ELSE estado
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reviewerEmail, id],
    );

    const actorEmail = req.user?.email || "sistema@ufide.ac.cr";

    await pool.query(
      `INSERT INTO solicitud_history (solicitud_id, accion, usuario, mensaje)
       VALUES (?,?,?,?)`,
      [
        id,
        "Solicitud asignada a revisor",
        actorEmail,
        `Asignada a: ${reviewerEmail}`,
      ],
    );

    const [rows] = await pool.query("SELECT * FROM solicitudes WHERE id = ?", [
      id,
    ]);

    return res.json(rows[0]);
  } catch (err) {
    console.error("Error assignReviewer:", err);
    return res.status(500).json({ message: "Error en el servidor" });
  }
}

async function returnSolicitudWithFlags(req, res) {
  const { id } = req.params;
  const { observation, editableFlags } = req.body;

  const actorEmail = req.user?.email || "sistema@ufide.ac.cr";

  if (!observation || !String(observation).trim()) {
    return res.status(400).json({
      message: "La observación es requerida para devolver la solicitud.",
    });
  }

  const flags = {
    institucion_editable: editableFlags?.institucion ? 1 : 0,
    proyecto_editable: editableFlags?.proyecto ? 1 : 0,
    objetivos_editable: editableFlags?.objetivos ? 1 : 0,
    cronograma_editable: editableFlags?.cronograma ? 1 : 0,
  };

  if (
    !flags.institucion_editable &&
    !flags.proyecto_editable &&
    !flags.objetivos_editable &&
    !flags.cronograma_editable
  ) {
    return res.status(400).json({
      message: "Debes habilitar al menos una sección para corrección.",
    });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE solicitudes
       SET estado = 'Observado',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id],
    );

    await conn.query(
      `INSERT INTO solicitud_revision_flags (
        solicitud_id,
        institucion_editable,
        proyecto_editable,
        objetivos_editable,
        cronograma_editable,
        comentario_revisor,
        updated_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        institucion_editable = VALUES(institucion_editable),
        proyecto_editable = VALUES(proyecto_editable),
        objetivos_editable = VALUES(objetivos_editable),
        cronograma_editable = VALUES(cronograma_editable),
        comentario_revisor = VALUES(comentario_revisor),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP`,
      [
        id,
        flags.institucion_editable,
        flags.proyecto_editable,
        flags.objetivos_editable,
        flags.cronograma_editable,
        String(observation).trim(),
        actorEmail,
      ],
    );

    await conn.query(
      `INSERT INTO solicitud_history (solicitud_id, accion, usuario, mensaje)
       VALUES (?, ?, ?, ?)`,
      [
        id,
        "Solicitud devuelta con observaciones",
        actorEmail,
        `Secciones habilitadas: ${
          [
            flags.institucion_editable ? "Institución" : null,
            flags.proyecto_editable ? "Proyecto" : null,
            flags.objetivos_editable ? "Objetivos" : null,
            flags.cronograma_editable ? "Cronograma" : null,
          ]
            .filter(Boolean)
            .join(", ") || "Ninguna"
        }. Observación: ${String(observation).trim()}`,
      ],
    );

    await conn.commit();

    const [rows] = await pool.query(`SELECT * FROM solicitudes WHERE id = ?`, [
      id,
    ]);

    return res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error("Error returnSolicitudWithFlags:", err);
    return res.status(500).json({
      message: "Error en el servidor",
      error: err.message,
    });
  } finally {
    conn.release();
  }
}

async function resubmitSolicitud(req, res) {
  const { id } = req.params;
  const actorEmail = req.user?.email || "sistema@ufide.ac.cr";

  const {
    institucion_id,
    institucion_nombre,
    titulo_proyecto,
    descripcion_problema,
    justificacion,
    objetivo_general,
    beneficiario,
    estrategia_solucion,
    objetivos_especificos_items,
    cronograma_items,
  } = req.body;

  const descProblema = String(
    descripcion_problema || justificacion || "",
  ).trim();

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const revisionFlags = await getRevisionFlagsBySolicitudId(id, conn);

    if (!revisionFlags) {
      await conn.rollback();
      return res.status(400).json({
        message:
          "La solicitud no tiene observaciones configuradas para reenviar.",
      });
    }

    const updateFields = [];
    const updateValues = [];

    if (revisionFlags.institucion_editable) {
      updateFields.push("institucion_id = ?", "institucion_nombre = ?");
      updateValues.push(institucion_id || null, institucion_nombre || "");
    }

    if (revisionFlags.proyecto_editable) {
      updateFields.push(
        "titulo_proyecto = ?",
        "descripcion_problema = ?",
        "objetivo_general = ?",
        "beneficiario = ?",
        "estrategia_solucion = ?",
      );
      updateValues.push(
        titulo_proyecto || null,
        descProblema || "",
        objetivo_general || "",
        beneficiario || null,
        estrategia_solucion || null,
      );
    }

    if (updateFields.length) {
      updateFields.push("estado = 'En Revisión'");
      updateFields.push("updated_at = CURRENT_TIMESTAMP");

      await conn.query(
        `UPDATE solicitudes
         SET ${updateFields.join(", ")}
         WHERE id = ?`,
        [...updateValues, id],
      );
    } else {
      await conn.query(
        `UPDATE solicitudes
         SET estado = 'En Revisión',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id],
      );
    }

    if (revisionFlags.objetivos_editable) {
      await conn.query(
        `DELETE FROM solicitud_objetivos_especificos WHERE solicitud_id = ?`,
        [id],
      );

      const objetivosClean = (
        Array.isArray(objetivos_especificos_items)
          ? objetivos_especificos_items
          : []
      )
        .map((x) => String(x || "").trim())
        .filter(Boolean);

      await conn.query(
        `UPDATE solicitudes
         SET objetivos_especificos = ?
         WHERE id = ?`,
        [objetivosClean.join("\n"), id],
      );

      if (objetivosClean.length) {
        const values = objetivosClean.map((desc, i) => [id, i + 1, desc]);

        await conn.query(
          `INSERT INTO solicitud_objetivos_especificos (solicitud_id, orden, descripcion)
           VALUES ?`,
          [values],
        );
      }
    }

    if (revisionFlags.cronograma_editable) {
      await conn.query(
        `DELETE FROM solicitud_cronograma WHERE solicitud_id = ?`,
        [id],
      );

      const cronoClean = (
        Array.isArray(cronograma_items) ? cronograma_items : []
      )
        .map((r) => ({
          actividad: String(r?.actividad || "").trim(),
          tarea: String(r?.tarea || "").trim(),
          horas: parseInt(String(r?.horas ?? "").trim(), 10),
        }))
        .filter((r) => r.actividad && r.tarea && Number.isFinite(r.horas));

      if (cronoClean.length) {
        const values = cronoClean.map((r, i) => [
          id,
          i + 1,
          r.actividad,
          r.tarea,
          r.horas,
        ]);

        await conn.query(
          `INSERT INTO solicitud_cronograma (solicitud_id, orden, actividad, tarea, horas)
           VALUES ?`,
          [values],
        );
      }
    }

    await conn.query(
      `INSERT INTO solicitud_history (solicitud_id, accion, usuario, mensaje)
       VALUES (?, ?, ?, ?)`,
      [
        id,
        "Solicitud corregida y reenviada",
        actorEmail,
        "El estudiante actualizó las secciones observadas y reenvió el anteproyecto.",
      ],
    );

    await conn.commit();

    const [rows] = await pool.query(`SELECT * FROM solicitudes WHERE id = ?`, [
      id,
    ]);

    return res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error("Error resubmitSolicitud:", err);
    return res.status(500).json({
      message: "Error en el servidor",
      error: err.message,
    });
  } finally {
    conn.release();
  }
}

/**
 * Reportes para coordinación
 * GET /solicitud/reportes?from=YYYY-MM-DD&to=YYYY-MM-DD&status=Aprobado&search=texto
 */
async function getSolicitudesReportes(req, res) {
  try {
    const { whereClause, params } = buildReportFilters(req.query);

    const [rows] = await pool.query(
      `
      SELECT
        s.id,
        s.codigo_publico,
        s.estudiante_nombre,
        s.estudiante_cedula,
        s.institucion_id,
        s.institucion_nombre,
        s.titulo_proyecto,
        s.estado,
        s.prioridad,
        s.vencimiento,
        s.owner_email,
        s.assigned_to,
        s.assign_date,
        s.created_at,
        s.updated_at
      FROM solicitudes s
      ${whereClause}
      ORDER BY s.created_at DESC
      `,
      params,
    );

    const normalizedRows = rows.map((r) => ({
      ...r,
      estado_normalizado: normalizeStatusLabel(r.estado),
    }));

    const resumen = {
      total: normalizedRows.length,
      aprobados: normalizedRows.filter(
        (r) => r.estado_normalizado === "Aprobado",
      ).length,
      rechazados: normalizedRows.filter(
        (r) => r.estado_normalizado === "Rechazado",
      ).length,
      observados: normalizedRows.filter(
        (r) => r.estado_normalizado === "Observado",
      ).length,
      pendientes: normalizedRows.filter((r) =>
        ["Enviado", "En Revisión"].includes(r.estado_normalizado),
      ).length,
    };

    const porInstitucionMap = new Map();
    const porEstadoMap = new Map();
    const porCoordinadorMap = new Map();
    const pendientesMap = new Map();

    for (const row of normalizedRows) {
      const institucion = row.institucion_nombre || "Sin institución";
      porInstitucionMap.set(
        institucion,
        (porInstitucionMap.get(institucion) || 0) + 1,
      );

      const estado = row.estado_normalizado || "Sin estado";
      porEstadoMap.set(estado, (porEstadoMap.get(estado) || 0) + 1);

      if (["Enviado", "En Revisión"].includes(estado)) {
        pendientesMap.set(estado, (pendientesMap.get(estado) || 0) + 1);
      }

      const coordKey = row.assigned_to || "Sin asignar";

      if (!porCoordinadorMap.has(coordKey)) {
        porCoordinadorMap.set(coordKey, {
          coordinador_email: row.assigned_to || null,
          revisadas: 0,
          aprobadas: 0,
          rechazadas: 0,
          observadas: 0,
          pendientes: 0,
        });
      }

      const coord = porCoordinadorMap.get(coordKey);

      if (row.assigned_to) {
        coord.revisadas += 1;
      }

      if (estado === "Aprobado") coord.aprobadas += 1;
      else if (estado === "Rechazado") coord.rechazadas += 1;
      else if (estado === "Observado") coord.observadas += 1;
      else coord.pendientes += 1;
    }

    const porInstitucion = [...porInstitucionMap.entries()]
      .map(([institucion, cantidad]) => ({ institucion, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const porEstado = [...porEstadoMap.entries()]
      .map(([estado, cantidad]) => ({ estado, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const pendientesPorEstado = [...pendientesMap.entries()]
      .map(([estado, cantidad]) => ({ estado, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    let coordinadores = [];
    try {
      const [coords] = await pool.query(
        `
        SELECT id, nombre, email, role, sede
        FROM users
        WHERE role = 'COORD'
        `,
      );
      coordinadores = coords;
    } catch (err) {
      console.error("No se pudieron cargar coordinadores:", err.message);
    }

    const porCoordinador = [...porCoordinadorMap.values()]
      .map((item) => {
        const found = coordinadores.find(
          (c) =>
            String(c.email).toLowerCase() ===
            String(item.coordinador_email || "").toLowerCase(),
        );

        return {
          coordinador_email: item.coordinador_email,
          coordinador_nombre:
            found?.nombre || item.coordinador_email || "Sin asignar",
          revisadas: item.revisadas,
          aprobadas: item.aprobadas,
          rechazadas: item.rechazadas,
          observadas: item.observadas,
          pendientes: item.pendientes,
        };
      })
      .sort((a, b) => b.revisadas - a.revisadas);

    return res.json({
      filtros: {
        from: req.query.from || "",
        to: req.query.to || "",
        status: req.query.status || "all",
        search: req.query.search || "",
      },
      resumen,
      porInstitucion,
      porEstado,
      porCoordinador,
      pendientesPorEstado,
      solicitudes: normalizedRows,
    });
  } catch (err) {
    console.error("Error getSolicitudesReportes:", err);
    return res.status(500).json({
      message: "Error obteniendo reportes",
      error: err.message,
    });
  }
}

module.exports = {
  getMySolicitudes,
  getAllSolicitudes,
  createSolicitud,
  getSolicitudDetalle,
  updateStatus,
  assignReviewer,
  returnSolicitudWithFlags,
  resubmitSolicitud,
  getSolicitudesReportes,
};
