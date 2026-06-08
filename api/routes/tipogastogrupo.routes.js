const express = require("express");
const router = express.Router();
const tipogastoGrupoController = require("../controllers/tipogastogrupo.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.get("/", authMiddleware, tipogastoGrupoController.getAll);
router.get(
  "/by-tipo/:tipoGastoId",
  authMiddleware,
  tipogastoGrupoController.getByTipoGastoId
);
router.get("/:id", authMiddleware, tipogastoGrupoController.getById);
router.post("/", authMiddleware, tipogastoGrupoController.create);
router.put(
  "/:tipoGastoId/:grupoId",
  authMiddleware,
  tipogastoGrupoController.update
);
router.delete(
  "/:tipoGastoId/:grupoId",
  authMiddleware,
  tipogastoGrupoController.delete
);

module.exports = router;
