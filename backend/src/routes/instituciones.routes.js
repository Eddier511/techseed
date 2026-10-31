const express = require("express");
const router = express.Router();
const {
  getAllInstituciones,
  createInstitucion,
  createInstitucionPublic,
  updateInstitucion,
  updateInstitucionStatus,
} = require("../controllers/instituciones.controller");

const { authRequired, coordOnly } = require("../middleware/auth.middleware");

// GET público
router.get("/", authRequired, getAllInstituciones);

// Estudiante solicita
router.post("/solicitar", authRequired, createInstitucionPublic);

// Solo COORD
router.post("/", authRequired, coordOnly, createInstitucion);
router.put("/:id", authRequired, coordOnly, updateInstitucion);
router.patch("/:id/status", authRequired, coordOnly, updateInstitucionStatus);

module.exports = router;
