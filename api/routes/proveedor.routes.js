const express = require("express");
const router = express.Router();
const proveedorController = require("../controllers/proveedor.controller");
const authMiddleware = require("../middlewares/auth");

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, proveedorController.getAllProveedores);
router.get(
  "/all",
  authMiddleware,
  proveedorController.getAllProveedoresSinPaginacion
);
router.get("/search", authMiddleware, proveedorController.searchProveedores);
router.get("/:id", authMiddleware, proveedorController.getProveedorById);
router.post("/", authMiddleware, proveedorController.createProveedor);
router.put("/:id", authMiddleware, proveedorController.updateProveedor);
router.delete("/:id", authMiddleware, proveedorController.deleteProveedor);

module.exports = router;
