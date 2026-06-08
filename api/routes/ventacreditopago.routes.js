const express = require("express");
const router = express.Router();
const ventaCreditoPagoController = require("../controllers/ventacreditopago.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.get("/search", authMiddleware, ventaCreditoPagoController.searchPagos);
router.get("/", authMiddleware, ventaCreditoPagoController.getAll);
router.get(
  "/paginated",
  authMiddleware,
  ventaCreditoPagoController.getAllPaginated
);
router.get(
  "/credito/:ventaCreditoId",
  authMiddleware,
  ventaCreditoPagoController.getByVentaCreditoId
);
router.get(
  "/:ventaCreditoId/:pagoId",
  authMiddleware,
  ventaCreditoPagoController.getById
);
router.post("/", authMiddleware, ventaCreditoPagoController.create);
router.put(
  "/:ventaCreditoId/:pagoId",
  authMiddleware,
  ventaCreditoPagoController.update
);
router.delete(
  "/:ventaCreditoId/:pagoId",
  authMiddleware,
  ventaCreditoPagoController.delete
);

module.exports = router;
