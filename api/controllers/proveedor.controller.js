const Proveedor = require("../models/proveedor.model");

// getAllProveedores
exports.getAllProveedores = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ProveedorId";
    const sortOrder = req.query.sortOrder || "ASC";

    const { proveedores, total } = await Proveedor.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: proveedores,
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

// searchProveedores
exports.searchProveedores = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ProveedorId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const { proveedores, total } = await Proveedor.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: proveedores,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error en searchProveedores:", error);
    res.status(500).json({ error: "Error al buscar proveedores" });
  }
};

exports.getProveedorById = async (req, res) => {
  try {
    const proveedor = await Proveedor.getById(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }
    res.json(proveedor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createProveedor = async (req, res) => {
  try {
    // Validación de campos requeridos
    if (!req.body.ProveedorNombre) {
      return res.status(400).json({
        success: false,
        message: `El campo ProveedorNombre es requerido`,
      });
    }

    // Crear el nuevo proveedor
    const nuevoProveedor = await Proveedor.create({
      ProveedorRUC: req.body.ProveedorRUC || null,
      ProveedorNombre: req.body.ProveedorNombre,
      ProveedorDireccion: req.body.ProveedorDireccion || null,
      ProveedorTelefono: req.body.ProveedorTelefono || null,
    });

    res.status(201).json({
      success: true,
      data: nuevoProveedor,
      message: "Proveedor creado exitosamente",
    });
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear proveedor",
      error: error.message,
    });
  }
};

exports.updateProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const proveedorData = req.body;

    if (!proveedorData.ProveedorNombre) {
      return res.status(400).json({
        success: false,
        message: "ProveedorNombre es un campo requerido",
      });
    }

    const updatedProveedor = await Proveedor.update(id, proveedorData);
    if (!updatedProveedor) {
      return res.status(404).json({
        success: false,
        message: "Proveedor no encontrado",
      });
    }

    res.json({
      success: true,
      data: updatedProveedor,
      message: "Proveedor actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar proveedor",
      error: error.message,
    });
  }
};

exports.deleteProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Proveedor.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Proveedor no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Proveedor eliminado exitosamente",
    });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No se puede eliminar el proveedor porque tiene compras asociadas.",
      });
    }
    console.error("Error al eliminar proveedor:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar proveedor",
      error: error.message,
    });
  }
};

// Obtener todos los proveedores sin paginación
exports.getAllProveedoresSinPaginacion = async (req, res) => {
  try {
    const proveedores = await Proveedor.getAll();
    res.json({ data: proveedores });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
