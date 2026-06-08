const express = require("express");
const router = express.Router();
const productoController = require("../controllers/producto.controller");
const authMiddleware = require("../middlewares/auth");

// Rutas públicas (si necesitas alguna, por ejemplo para obtener productos sin login)
// router.get("/public", productoController.getAllProductos);

// Rutas protegidas (requieren autenticación)
router.get("/", authMiddleware, productoController.getAllProductos);
router.get(
  "/all",
  authMiddleware,
  productoController.getAllProductosSinPaginacion
);
router.get(
  "/reporte-stock",
  authMiddleware,
  productoController.getReporteStock
);
router.get("/search", authMiddleware, productoController.searchProductos);
router.get("/:id", authMiddleware, productoController.getProductoById);
router.post("/", authMiddleware, productoController.createProducto);
router.put("/:id", authMiddleware, productoController.updateProducto);
router.delete("/:id", authMiddleware, productoController.deleteProducto);

// Ruta pública para traer todos los productos sin paginación

module.exports = router;
