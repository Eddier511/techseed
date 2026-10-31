require("dotenv").config({path: require("path").join(__dirname, "../.env")});
require("./config/security");
require("express-async-errors");
const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const solicitudRoutes = require("./routes/solicitud.routes");
const institucionRoutes = require("./routes/instituciones.routes");
const userRoutes = require("./routes/user.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:5173").split(","),
  }),
);

app.disable('x-powered-by');
app.use(require('helmet')());
app.use(express.json({limit: '64kb'}));
const { rateLimit } = require('express-rate-limit');
app.use('/api', (req, res, next) => {
  function valid(value, depth = 0) {
    if (depth > 8) return false;
    if (typeof value === 'string') return value.length <= 5000;
    if (Array.isArray(value)) return value.length <= 500 && value.every(x => valid(x, depth + 1));
    if (value && typeof value === 'object') return Object.keys(value).length <= 100 && Object.entries(value).every(([key, child]) => !['__proto__','constructor','prototype'].includes(key) && valid(child, depth + 1));
    return value == null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value));
  }
  if (Object.values(req.query).some(x => typeof x !== 'string')) return res.status(400).json({message: 'Consulta inválida'});
  if (req.body && typeof req.body === 'object') {
    for (const [key,value] of Object.entries(req.body)) {
      if (!['formData','editableFlags','objetivos_especificos_items','cronograma_items'].includes(key) && value != null && !['string','number','boolean'].includes(typeof value)) return res.status(400).json({message: 'Campo inválido'});
    }
  }
  if (!valid(req.body)) return res.status(400).json({message: 'Datos inválidos o demasiado extensos'});
  next();
});
app.use('/api', rateLimit({windowMs: 60000, limit: 120}));
app.use('/api/ai', rateLimit({windowMs: 3600000, limit: 30}));
app.use('/api/auth/mock', (req, res, next) => {
  if (process.env.MOCK_AUTH_ENABLED !== 'true') return res.status(404).json({message: 'Acceso de prueba deshabilitado'});
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/solicitudes", solicitudRoutes);
app.use("/api/instituciones", institucionRoutes);
app.use("/api/user", userRoutes);
app.use("/api/ai", aiRoutes);

const frontendPath = path.join(__dirname, "../../dist");
console.log("Frontend path:", frontendPath);

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Ruta API no encontrada" });
  }
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('Error de petición:', error.message);
  res.status(error.status >= 400 && error.status < 500 ? error.status : 500).json({message: 'No se pudo procesar la petición'});
});

async function startServer() {
  try {
    const conn = await pool.getConnection();
    await conn.query("SELECT id FROM auth_sessions LIMIT 1");
    console.log("✅ Base de datos y sesiones disponibles");
    conn.release();

    app.listen(PORT, () => {
      console.log(`🚀 TechSeed corriendo en puerto ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Error conectando a MySQL:", error);
    process.exit(1);
  }
}

startServer();
