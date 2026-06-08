const Almacen = require("../models/almacen.model");

exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "AlmacenId";
  const sortOrder = req.query.sortOrder || "ASC";
  try {
    const result = await Almacen.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: result.almacenes,
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
    const almacen = await Almacen.getById(req.params.id);
    if (!almacen) {
      return res.status(404).json({ message: "Almacén no encontrado" });
    }
    res.json(almacen);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const almacen = await Almacen.create(req.body);
    res
      .status(201)
      .json({ message: "Almacén creado exitosamente", data: almacen });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const almacen = await Almacen.update(req.params.id, req.body);
    if (!almacen) {
      return res.status(404).json({ message: "Almacén no encontrado" });
    }
    res.json({ message: "Almacén actualizado exitosamente", data: almacen });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const success = await Almacen.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Almacén no encontrado" });
    }
    res.json({ message: "Almacén eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchAlmacenes = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "AlmacenId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await Almacen.searchAlmacenes(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.almacenes,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar almacenes" });
  }
};
