// src/controllers/user.controller.js
const pool = require("../config/db");

async function getUserByEmail(req, res) {
  try {
    const email = String(req.query.email || "")
      .trim()
      .toLowerCase();
    if (!email) return res.status(400).json({ message: "email es requerido" });

    const [rows] = await pool.query(
      `SELECT id, email, nombre, cedula, carrera, role, sede, phone, oficio, estado_civil, domicilio, lugar_trabajo
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    if (!rows.length)
      return res.status(404).json({ message: "Usuario no encontrado" });

    return res.json(rows[0]);
  } catch (err) {
    console.error("Error getUserByEmail:", err);
    return res
      .status(500)
      .json({ message: "Error en el servidor", error: err.message });
  }
}

module.exports = { getUserByEmail };
