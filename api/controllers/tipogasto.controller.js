const TipoGasto = require("../models/tipogasto.model");

exports.getAll = async (req, res) => {
  try {
    const tipos = await TipoGasto.getAll();
    res.json(tipos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllPaginated = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "TipoGastoId";
    const sortOrder = req.query.sortOrder || "ASC";
    const result = await TipoGasto.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: result.tipoGastos,
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
    const tipoGasto = await TipoGasto.getById(req.params.id);
    if (!tipoGasto) {
      return res.status(404).json({ message: "Tipo de gasto no encontrado" });
    }
    res.json(tipoGasto);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const tipoGasto = await TipoGasto.create(req.body);
    res
      .status(201)
      .json({ message: "Tipo de gasto creado exitosamente", data: tipoGasto });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const tipoGasto = await TipoGasto.update(req.params.id, req.body);
    if (!tipoGasto) {
      return res.status(404).json({ message: "Tipo de gasto no encontrado" });
    }
    res.json({
      message: "Tipo de gasto actualizado exitosamente",
      data: tipoGasto,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const success = await TipoGasto.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Tipo de gasto no encontrado" });
    }
    res.json({ message: "Tipo de gasto eliminado exitosamente" });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        message:
          "No se puede eliminar el tipo de gasto porque tiene movimientos asociados.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.searchTipoGastos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "TipoGastoId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await TipoGasto.searchTipoGastos(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.tipoGastos,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar tipos de gasto" });
  }
};
