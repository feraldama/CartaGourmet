const Local = require("../models/local.model");

exports.getAllLocales = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "LocalId";
    const sortOrder = req.query.sortOrder || "ASC";

    const { locales, total } = await Local.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: locales,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchLocales = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "LocalId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const { locales, total } = await Local.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: locales,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error en searchLocales:", error);
    res.status(500).json({ error: "Error al buscar locales" });
  }
};

exports.getLocalById = async (req, res) => {
  try {
    const local = await Local.getById(req.params.id);
    if (!local) {
      return res.status(404).json({ message: "Local no encontrado" });
    }
    res.json(local);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createLocal = async (req, res) => {
  try {
    if (!req.body.LocalNombre) {
      return res.status(400).json({
        success: false,
        message: "El campo LocalNombre es requerido",
      });
    }
    const nuevoLocal = await Local.create({
      LocalNombre: req.body.LocalNombre,
      LocalTelefono: req.body.LocalTelefono || "",
      LocalCelular: req.body.LocalCelular || "",
      LocalDireccion: req.body.LocalDireccion || "",
    });
    res.status(201).json({
      success: true,
      data: nuevoLocal,
      message: "Local creado exitosamente",
    });
  } catch (error) {
    console.error("Error al crear local:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear local",
      error: error.message,
    });
  }
};

exports.updateLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const localData = req.body;
    if (!localData.LocalNombre) {
      return res.status(400).json({
        success: false,
        message: "LocalNombre es un campo requerido",
      });
    }
    const updatedLocal = await Local.update(id, localData);
    if (!updatedLocal) {
      return res.status(404).json({
        success: false,
        message: "Local no encontrado",
      });
    }
    res.json({
      success: true,
      data: updatedLocal,
      message: "Local actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar local:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar local",
      error: error.message,
    });
  }
};

exports.deleteLocal = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Local.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Local no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Local eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar local",
      error: error.message,
    });
  }
};
