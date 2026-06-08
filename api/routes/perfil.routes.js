const express = require("express");
const router = express.Router();
const perfilController = require("../controllers/perfil.controller");
const authMiddleware = require("../middlewares/auth");

router.get("/", authMiddleware, perfilController.getAll);
router.get("/:id", authMiddleware, perfilController.getById);
router.post("/", authMiddleware, perfilController.create);
router.put("/:id", authMiddleware, perfilController.update);
router.delete("/:id", authMiddleware, perfilController.delete);

module.exports = router;
