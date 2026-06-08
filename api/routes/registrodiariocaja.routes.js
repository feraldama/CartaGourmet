const express = require("express");
const router = express.Router();
const registroDiarioCajaController = require("../controllers/registrodiariocaja.controller");
const authMiddleware = require("../middlewares/auth");

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

// Rutas para registros diarios de caja
router.get("/", authMiddleware, registroDiarioCajaController.getAll);
router.get("/search", authMiddleware, registroDiarioCajaController.search);
router.get(
  "/estado-apertura",
  registroDiarioCajaController.estadoAperturaPorUsuario
);
router.get("/rango", authMiddleware, registroDiarioCajaController.getByDateRange);
router.get("/:id", authMiddleware, registroDiarioCajaController.getById);
router.post("/", authMiddleware, registroDiarioCajaController.create);
router.post(
  "/apertura-cierre",
  authMiddleware,
  registroDiarioCajaController.aperturaCierreCaja
);
router.put("/:id", authMiddleware, registroDiarioCajaController.update);
router.delete("/:id", authMiddleware, registroDiarioCajaController.delete);

module.exports = router;
