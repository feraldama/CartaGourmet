const Combo = require("../models/combo.model");

exports.getAll = async (req, res) => {
  try {
    const combos = await Combo.getAll();
    res.json({ data: combos });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllPaginated = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "ComboId";
  const sortOrder = req.query.sortOrder || "ASC";
  try {
    const result = await Combo.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: result.combos,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const combo = await Combo.getById(req.params.id);
    if (!combo) {
      return res.status(404).json({ message: "Combo no encontrado" });
    }
    res.json(combo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { ComboDescripcion, ProductoId, ComboCantidad, ComboPrecio } =
      req.body;
    if (!ComboDescripcion || !ProductoId || !ComboCantidad || !ComboPrecio) {
      return res
        .status(400)
        .json({ message: "Todos los campos son requeridos" });
    }
    const combo = await Combo.create(req.body);
    res.status(201).json({ message: "Combo creado exitosamente", data: combo });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const combo = await Combo.update(req.params.id, req.body);
    if (!combo) {
      return res.status(404).json({ message: "Combo no encontrado" });
    }
    res.json({ message: "Combo actualizado exitosamente", data: combo });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const success = await Combo.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Combo no encontrado" });
    }
    res.json({ message: "Combo eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchCombos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ComboId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const { combos, total } = await Combo.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: combos,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar combos" });
  }
};
