// user.routes.js
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { authRequired, coordOnly } = require("../middleware/auth.middleware");

// Obtener usuario por email
router.get("/", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: "email requerido" });

  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, cedula, carrera, role, sede, phone, oficio, estado_civil, domicilio, lugar_trabajo
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    res.json(rows[0] || null);
  } catch (err) {
    console.error("Error getUser:", err);
    res.status(500).json({ message: "Error en servidor" });
  }
});

// Traer mi perfil desde el token
router.get("/me", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, role, cedula, carrera, sede, phone, oficio, estado_civil, domicilio, lugar_trabajo
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id],
    );

    res.json(rows[0] || null);
  } catch (err) {
    console.error("Error user/me:", err);
    res.status(500).json({ message: "Error en servidor" });
  }
});

router.patch("/me", authRequired, async (req, res) => {
  try {
    const {
      cedula,
      carrera,
      sede,
      phone,
      oficio,
      estado_civil,
      domicilio,
      lugar_trabajo,
    } = req.body;

    await pool.query(
      `UPDATE users
       SET cedula = ?,
           carrera = ?,
           sede = ?,
           phone = ?,
           oficio = ?,
           estado_civil = ?,
           domicilio = ?,
           lugar_trabajo = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        cedula || null,
        carrera || null,
        sede || null,
        phone || null,
        oficio || null,
        estado_civil || null,
        domicilio || null,
        lugar_trabajo || null,
        req.user.id,
      ],
    );

    const [rows] = await pool.query(
      `SELECT id, nombre, email, role, cedula, carrera, sede, phone, oficio, estado_civil, domicilio, lugar_trabajo
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id],
    );

    res.json(rows[0] || null);
  } catch (err) {
    console.error("Error patch user/me:", err);
    res.status(500).json({ message: "Error en servidor" });
  }
});

// Listar coordinadores
router.get("/coords/list", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, role, sede
       FROM users
       WHERE role = 'COORD' AND is_active = 1
       ORDER BY nombre ASC, email ASC`,
    );

    res.json(rows || []);
  } catch (err) {
    console.error("Error listando coordinadores:", err);
    res.status(500).json({ message: "Error en servidor" });
  }
});

// Cambiar rol (solo COORD)
router.patch("/:id/role", authRequired, coordOnly, async (req, res) => {
  const { id } = req.params;
  const role = String(req.body.role || "")
    .trim()
    .toUpperCase();

  if (!["STUDENT", "COORD"].includes(role)) {
    return res.status(400).json({ message: "role inválido (STUDENT|COORD)" });
  }

  try {
    await pool.query(
      `UPDATE users
       SET role = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [role, id],
    );

    const [rows] = await pool.query(
      `SELECT id, nombre, email, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    res.json(rows[0] || null);
  } catch (err) {
    console.error("Error update role:", err);
    res.status(500).json({ message: "Error en servidor" });
  }
});

// Listar usuarios
router.get("/list/all", authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, cedula, carrera, role, sede, is_active, created_at
       FROM users
       ORDER BY nombre ASC, email ASC`,
    );

    res.json(rows || []);
  } catch (err) {
    console.error("Error listando usuarios:", err);
    res.status(500).json({ message: "Error en servidor" });
  }
});

module.exports = router;
