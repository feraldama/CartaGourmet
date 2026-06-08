const express = require("express");
const router = express.Router();
const perfilMenuController = require("../controllers/perfilmenu.controller");
const authMiddleware = require("../middlewares/auth");

router.get(
  "/perfil/:perfilId",
  authMiddleware,
  perfilMenuController.getByPerfil
);
router.get(
  "/usuario/:usuarioId",
  authMiddleware,
  perfilMenuController.getPermisosByUsuarioId
);
router.post("/", authMiddleware, perfilMenuController.create);
router.put("/:perfilId/:menuId", authMiddleware, perfilMenuController.update);
router.delete(
  "/:perfilId/:menuId",
  authMiddleware,
  perfilMenuController.delete
);

module.exports = router;
