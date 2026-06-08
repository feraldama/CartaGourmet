const express = require("express");
const router = express.Router();
const usuarioPerfilController = require("../controllers/usuarioperfil.controller");
const authMiddleware = require("../middlewares/auth");

router.get(
  "/usuario/:usuarioId",
  authMiddleware,
  usuarioPerfilController.getByUsuario
);
router.post("/", authMiddleware, usuarioPerfilController.create);
router.delete(
  "/:usuarioId/:perfilId",
  authMiddleware,
  usuarioPerfilController.delete
);

module.exports = router;
