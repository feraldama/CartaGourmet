const express = require("express");
const router = express.Router();
const comboController = require("../controllers/combo.controller");
const authMiddleware = require("../middlewares/auth");

router.use(authMiddleware);

router.get("/", authMiddleware, comboController.getAll);
router.get("/search", authMiddleware, comboController.searchCombos);
router.get("/paginated", authMiddleware, comboController.getAllPaginated);
router.get("/:id", authMiddleware, comboController.getById);
router.post("/", authMiddleware, comboController.create);
router.put("/:id", authMiddleware, comboController.update);
router.delete("/:id", authMiddleware, comboController.delete);

module.exports = router;
