const express = require("express");
const router = express.Router();
const facturaController = require("../controllers/factura.controller");
const authMiddleware = require("../middlewares/auth");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, facturaController.getAllFacturas);
router.get(
  "/all",
  authMiddleware,
  facturaController.getAllFacturasSinPaginacion
);
router.get("/search", authMiddleware, facturaController.searchFacturas);
router.get("/:id", authMiddleware, facturaController.getFacturaById);
router.post("/", authMiddleware, facturaController.createFactura);
router.put("/:id", authMiddleware, facturaController.updateFactura);
router.delete("/:id", authMiddleware, facturaController.deleteFactura);

// Rutas adicionales para funcionalidades específicas
router.get(
  "/next-number",
  authMiddleware,
  facturaController.getNextAvailableNumber
);
router.get(
  "/current/:numeroFactura",
  authMiddleware,
  facturaController.getCurrentFactura
);

module.exports = router;
