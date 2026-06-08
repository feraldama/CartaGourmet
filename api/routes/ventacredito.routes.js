const express = require("express");
const router = express.Router();
const ventaCreditoController = require("../controllers/ventacredito.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.get(
  "/search",
  authMiddleware,
  ventaCreditoController.searchVentaCreditos
);
router.get("/", authMiddleware, ventaCreditoController.getAll);
router.get(
  "/paginated",
  authMiddleware,
  ventaCreditoController.getAllPaginated
);
router.get(
  "/venta/:ventaId",
  authMiddleware,
  ventaCreditoController.getByVentaId
);
router.get("/:id", authMiddleware, ventaCreditoController.getById);
router.post("/", authMiddleware, ventaCreditoController.create);
router.put("/:id", authMiddleware, ventaCreditoController.update);
router.delete("/:id", authMiddleware, ventaCreditoController.delete);

module.exports = router;
