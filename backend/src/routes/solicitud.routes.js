const express = require("express");
const router = express.Router();
const access = require("../middleware/solicitud-access");

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
router.patch("/:id/resubmit", authRequired, access("resubmit"), resubmitSolicitud);

/* ============================================================
   ADMIN / COORDINADORES
============================================================ */

router.get("/reportes", authRequired, coordOnly, getSolicitudesReportes);
router.get("/", authRequired, coordOnly, getAllSolicitudes);
router.get("/:id/detalle", authRequired, access("read"), getSolicitudDetalle);
router.patch("/:id/status", authRequired, coordOnly, access("manage"), updateStatus);
router.patch("/:id/assign", authRequired, coordOnly, access("assign"), assignReviewer);
router.patch("/:id/return", authRequired, coordOnly, access("manage"), returnSolicitudWithFlags);

module.exports = router;
