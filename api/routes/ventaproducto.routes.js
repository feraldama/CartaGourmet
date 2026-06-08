const express = require("express");
const router = express.Router();
const ventaProductoController = require("../controllers/ventaproducto.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.get(
  "/search",
  authMiddleware,
  ventaProductoController.searchVentaProductos
);
router.get("/", authMiddleware, ventaProductoController.getAll);
router.get(
  "/paginated",
  authMiddleware,
  ventaProductoController.getAllPaginated
);
router.get(
  "/venta/:ventaId",
  authMiddleware,
  ventaProductoController.getByVentaId
);
router.get(
  "/:ventaId/:productoId",
  authMiddleware,
  ventaProductoController.getById
);
router.post("/", authMiddleware, ventaProductoController.create);
router.put(
  "/:ventaId/:productoId",
  authMiddleware,
  ventaProductoController.update
);
router.delete(
  "/:ventaId/:productoId",
  authMiddleware,
  ventaProductoController.delete
);

module.exports = router;
