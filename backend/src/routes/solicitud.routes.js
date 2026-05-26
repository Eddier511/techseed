const express = require("express");
const router = express.Router();

const {
  getMySolicitudes,
  getAllSolicitudes,
  createSolicitud,
  getSolicitudDetalle,
  updateStatus,
  assignReviewer,
  returnSolicitudWithFlags,
  resubmitSolicitud,
  getSolicitudesReportes,
} = require("../controllers/solicitud.controller");

// 🔐 middleware de autenticación
const { authRequired, coordOnly } = require("../middleware/auth.middleware");

/* ============================================================
   ESTUDIANTE
============================================================ */

router.get("/me", authRequired, getMySolicitudes);
router.post("/", authRequired, createSolicitud);
router.patch("/:id/resubmit", authRequired, resubmitSolicitud);

/* ============================================================
   ADMIN / COORDINADORES
============================================================ */

router.get("/reportes", authRequired, coordOnly, getSolicitudesReportes);
router.get("/", authRequired, getAllSolicitudes);
router.get("/:id/detalle", authRequired, getSolicitudDetalle);
router.patch("/:id/status", authRequired, updateStatus);
router.patch("/:id/assign", authRequired, assignReviewer);
router.patch("/:id/return", authRequired, returnSolicitudWithFlags);

module.exports = router;
