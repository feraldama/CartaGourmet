const express = require("express");
const router = express.Router();
const localController = require("../controllers/local.controller");
const authMiddleware = require("../middlewares/auth");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, localController.getAllLocales);
router.get("/search", authMiddleware, localController.searchLocales);
router.get("/:id", authMiddleware, localController.getLocalById);
router.post("/", authMiddleware, localController.createLocal);
router.put("/:id", authMiddleware, localController.updateLocal);
router.delete("/:id", authMiddleware, localController.deleteLocal);

module.exports = router;
