const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function signToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    nombre: user.nombre,
  };

  return jwt.sign(payload, process.env.JWT_SECRET || "changeme", {
    expiresIn: "8h",
  });
}

const otpStore = new Map();

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateMockOid(email) {
  return `mock-oid:${email}:${Date.now()}`;
}

async function requestMockOtp(req, res) {
  try {
    console.log("BODY requestMockOtp:", req.body);

    const email = normalizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ message: "email es requerido" });
    }

    const code = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email, { code, expiresAt, attempts: 0 });

    console.log(`[MOCK-OTP] Código para ${email}: ${code} (expira 5 min)`);

    return res.json({
      message: "Código generado para pruebas",
      expiresInSeconds: 300,
      code,
    });
  } catch (err) {
    console.error("Error requestMockOtp:", err);
    return res.status(500).json({
      message: "Error en el servidor",
      error: err.message,
    });
  }
}

async function verifyMockOtp(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || "").trim();
    const nombreInput = String(req.body?.nombre || "").trim();

    if (!email || !code) {
      return res.status(400).json({ message: "email y code son requeridos" });
    }

    const record = otpStore.get(email);
    if (!record) {
      return res
        .status(401)
        .json({ message: "Código inválido o no solicitado" });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(401).json({ message: "Código expirado" });
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      otpStore.delete(email);
      return res
        .status(429)
        .json({ message: "Demasiados intentos. Solicita otro código." });
    }

    if (code !== record.code) {
      otpStore.set(email, record);
      return res.status(401).json({ message: "Código incorrecto" });
    }

    otpStore.delete(email);

    const [rows] = await pool.query(
      "SELECT id, nombre, email, role, cedula, carrera FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    let user = rows[0];

    if (!user) {
      const nombre = nombreInput || email.split("@")[0];
      const cedulaMock = "0-0000-0000";
      const oidMock = generateMockOid(email);

      await pool.query(
        `INSERT INTO users (email, nombre, cedula, microsoft_oid, role, is_active)
         VALUES (?,?,?,?,?,?)`,
        [email, nombre, cedulaMock, oidMock, "STUDENT", 1],
      );

      const [created] = await pool.query(
        "SELECT id, nombre, email, role, cedula, carrera FROM users WHERE email = ? LIMIT 1",
        [email],
      );
      user = created[0];
    } else {
      if (
        nombreInput &&
        (!user.nombre || String(user.nombre).trim().length === 0)
      ) {
        await pool.query("UPDATE users SET nombre = ? WHERE email = ?", [
          nombreInput,
          email,
        ]);
        user.nombre = nombreInput;
      }
    }

    const token = signToken(user);

    return res.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
        cedula: user.cedula || "",
        carrera: user.carrera || "",
      },
      token,
    });
  } catch (err) {
    console.error("Error verifyMockOtp:", err);
    return res.status(500).json({
      message: "Error en el servidor",
      error: err.message,
    });
  }
}

async function me(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, role, cedula, carrera, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id],
    );

    const user = rows[0];
    if (!user)
      return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ user });
  } catch (err) {
    console.error("Error me:", err);
    res.status(500).json({ message: "Error en el servidor" });
  }
}

async function register(req, res) {
  return res.status(501).json({ message: "register no implementado" });
}

async function login(req, res) {
  return res.status(501).json({ message: "login no implementado" });
}

module.exports = {
  register,
  login,
  me,
  requestMockOtp,
  verifyMockOtp,
};
