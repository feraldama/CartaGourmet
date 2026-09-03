const express = require("express");
const router = express.Router();
const ventaController = require("../controllers/venta.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.get(
  "/pendientes/:clienteId",
  authMiddleware,
  ventaController.getVentasPendientesPorCliente
);
router.get(
  "/pendientes",
  authMiddleware,
  ventaController.getDeudasPendientesPorCliente
);
router.get(
  "/reporte",
  authMiddleware,
  ventaController.getReporteVentasPorCliente
);
router.get(
  "/reporte-rg90",
  authMiddleware,
  ventaController.getReporteVentasRG90
);
router.get(
  "/reporte-rg90-csv",
  authMiddleware,
  ventaController.getReporteVentasRG90Csv
);
router.get(
  "/facturas-para-nc",
  authMiddleware,
  ventaController.buscarFacturasParaNC
);
router.get(
  "/proximo-comprobante",
  authMiddleware,
  ventaController.proximoComprobante
);
router.post("/confirmar", authMiddleware, ventaController.confirmar);
router.post("/devolucion", authMiddleware, ventaController.devolucion);
router.get("/search", authMiddleware, ventaController.searchVentas);
router.get("/", authMiddleware, ventaController.getAll);
router.get("/paginated", authMiddleware, ventaController.getAllPaginated);
router.get("/:id", authMiddleware, ventaController.getById);
router.post("/", authMiddleware, ventaController.create);
router.put("/:id", authMiddleware, ventaController.update);
router.delete("/:id", authMiddleware, ventaController.delete);

module.exports = router;
