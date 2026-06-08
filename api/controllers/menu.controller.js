const Menu = require("../models/menu.model");

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
    const sortBy = req.query.sortBy || "MenuId";
    const sortOrder = req.query.sortOrder || "ASC";
    const search = req.query.search || "";

    const result = await Menu.getAllPaginated(
      page,
      itemsPerPage,
      sortBy,
      sortOrder,
      search
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const menu = await Menu.getById(req.params.id);
    if (!menu) return res.status(404).json({ message: "Menú no encontrado" });
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const menu = await Menu.create(req.body);
    res.status(201).json(menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const menu = await Menu.update(req.params.id, req.body);
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Menu.delete(req.params.id);
    res.json({ message: "Menú eliminado" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
