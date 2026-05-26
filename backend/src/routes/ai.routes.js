const express = require("express");
const router = express.Router();

const { redactarAyuda } = require("../controllers/ai.controller");
const { authRequired } = require("../middleware/auth.middleware");

router.post("/redaccion", authRequired, redactarAyuda);

module.exports = router;
