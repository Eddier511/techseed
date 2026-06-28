const pool = require("../config/db");

const ENABLED_STATUS = "Habilitada";
const DISABLED_STATUS = "Deshabilitada";
const VALID_INSTITUTION_STATUSES = [ENABLED_STATUS, DISABLED_STATUS];
let statusColumnReady = false;

function normalizeInstitutionStatus(status) {
  if (status === ENABLED_STATUS || status === "Aprobada") return ENABLED_STATUS;
  return DISABLED_STATUS;
}

async function ensureInstitutionStatusColumn() {
  if (statusColumnReady) return;

  await pool.query(
    `ALTER TABLE instituciones
     MODIFY estado VARCHAR(20) NOT NULL DEFAULT 'Deshabilitada'`,
  );

  statusColumnReady = true;
}

async function normalizeLegacyInstitutionStatuses() {
  await ensureInstitutionStatusColumn();

  await pool.query(
    `UPDATE instituciones
     SET estado = CASE
       WHEN estado = 'Aprobada' THEN ?
       WHEN estado IN ('Pendiente', 'Rechazada', '') OR estado IS NULL THEN ?
       ELSE estado
     END
     WHERE estado IN ('Aprobada', 'Pendiente', 'Rechazada', '') OR estado IS NULL`,
    [ENABLED_STATUS, DISABLED_STATUS],
  );
}

/**
 * GET /instituciones
 * - Si viene ?estado=Habilitada -> filtra
 * - Si no -> devuelve todas
 */
async function getAllInstituciones(req, res) {
  try {
    const { estado } = req.query;

    await normalizeLegacyInstitutionStatuses();

    let query = `SELECT * FROM instituciones`;
    let params = [];

    if (estado) {
      query += ` WHERE estado = ?`;
      params.push(normalizeInstitutionStatus(estado));
    }

    query += ` ORDER BY nombre ASC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error getAllInstituciones:", err);
    res.status(500).json({ message: "Error en el servidor" });
  }
}

/**
 * POST /instituciones/solicitar
 * Estudiante registra institución para aprobación
 */
async function createInstitucionPublic(req, res) {
  const {
    nombre,
    cedula_juridica,
    supervisor_nombre,
    supervisor_cargo,
    supervisor_email,
    tipo_servicio,
    created_by_user_id,
  } = req.body;

  if (!nombre || !cedula_juridica || !supervisor_nombre || !supervisor_email) {
    return res.status(400).json({
      message:
        "nombre, cedula_juridica, supervisor_nombre, supervisor_email y contacto_email son requeridos",
    });
  }

  try {
    await normalizeLegacyInstitutionStatuses();

    const [result] = await pool.query(
      `INSERT INTO instituciones (
        nombre,
        cedula_juridica,
        supervisor_nombre,
        supervisor_cargo,
        supervisor_email,
        tipo_servicio,
        estado,
        created_by_user_id
      )
      VALUES (?,?,?,?,?,?,?,?)`,
      [
        nombre,
        cedula_juridica,
        supervisor_nombre,
        supervisor_cargo || null,
        supervisor_email,
        tipo_servicio || null,
        DISABLED_STATUS,
        created_by_user_id || null,
      ],
    );

    const [rows] = await pool.query(
      "SELECT * FROM instituciones WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error createInstitucionPublic:", err);
    res.status(500).json({ message: "Error creando institución" });
  }
}

/**
 * POST /instituciones (ADMIN)
 */
async function createInstitucion(req, res) {
  const {
    nombre,
    cedula_juridica,
    supervisor_nombre,
    supervisor_cargo,
    supervisor_email,
    tipo_servicio,
    estado,
  } = req.body;

  const normalizedStatus = normalizeInstitutionStatus(estado || ENABLED_STATUS);

  try {
    await normalizeLegacyInstitutionStatuses();

    const [result] = await pool.query(
      `INSERT INTO instituciones (
        nombre,
        cedula_juridica,
        supervisor_nombre,
        supervisor_cargo,
        supervisor_email,
        tipo_servicio,
        estado
      )
      VALUES (?,?,?,?,?,?,?)`,
      [
        nombre,
        cedula_juridica,
        supervisor_nombre,
        supervisor_cargo,
        supervisor_email,
        tipo_servicio,
        normalizedStatus,
      ],
    );

    const [rows] = await pool.query(
      "SELECT * FROM instituciones WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error createInstitucion:", err);
    res.status(500).json({ message: "Error en el servidor" });
  }
}

/**
 * PUT /instituciones/:id (ADMIN)
 */
async function updateInstitucion(req, res) {
  const { id } = req.params;
  const {
    nombre,
    cedula_juridica,
    supervisor_nombre,
    supervisor_cargo,
    supervisor_email,
    tipo_servicio,
    estado,
  } = req.body;
  const normalizedStatus = normalizeInstitutionStatus(estado || ENABLED_STATUS);

  try {
    await normalizeLegacyInstitutionStatuses();

    await pool.query(
      `UPDATE instituciones
       SET nombre = ?,
           cedula_juridica = ?,
           supervisor_nombre = ?,
           supervisor_cargo = ?,
           supervisor_email = ?,
           tipo_servicio = ?,
           estado = ?
       WHERE id = ?`,
      [
        nombre,
        cedula_juridica,
        supervisor_nombre,
        supervisor_cargo,
        supervisor_email,
        tipo_servicio,
        normalizedStatus,
        id,
      ],
    );

    const [rows] = await pool.query(
      "SELECT * FROM instituciones WHERE id = ?",
      [id],
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updateInstitucion:", err);
    res.status(500).json({ message: "Error en el servidor" });
  }
}

/**
 * PATCH /instituciones/:id/status (ADMIN)
 */
async function updateInstitucionStatus(req, res) {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado) {
    return res.status(400).json({ message: "estado es requerido" });
  }

  const normalizedStatus = normalizeInstitutionStatus(estado);

  if (!VALID_INSTITUTION_STATUSES.includes(normalizedStatus)) {
    return res.status(400).json({
      message: "estado invalido. Usa Habilitada o Deshabilitada",
    });
  }

  try {
    await normalizeLegacyInstitutionStatuses();

    await pool.query(
      `UPDATE instituciones
       SET estado = ?
       WHERE id = ?`,
      [normalizedStatus, id],
    );

    const [rows] = await pool.query(
      "SELECT * FROM instituciones WHERE id = ?",
      [id],
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error updateInstitucionStatus:", err);
    res.status(500).json({ message: "Error en el servidor" });
  }
}

module.exports = {
  getAllInstituciones,
  createInstitucion,
  createInstitucionPublic,
  updateInstitucion,
  updateInstitucionStatus,
};
