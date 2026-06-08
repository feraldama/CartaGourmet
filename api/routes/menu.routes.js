const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menu.controller");
const authMiddleware = require("../middlewares/auth");

router.get("/", authMiddleware, menuController.getAll);
router.get("/:id", authMiddleware, menuController.getById);
router.post("/", authMiddleware, menuController.create);
router.put("/:id", authMiddleware, menuController.update);
router.delete("/:id", authMiddleware, menuController.delete);

module.exports = router;
