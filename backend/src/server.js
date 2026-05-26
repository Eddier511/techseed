require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const solicitudRoutes = require("./routes/solicitud.routes");
const institucionRoutes = require("./routes/instituciones.routes");
const userRoutes = require("./routes/user.routes");
const aiRoutes = require("./routes/ai.routes");

console.log("=== Iniciando backend TechSeed ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());

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

async function startServer() {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Conexión a MySQL exitosa");
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
