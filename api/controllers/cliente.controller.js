const Cliente = require("../models/cliente.model");

// getAllClientes
exports.getAllClientes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ClienteId";
    const sortOrder = req.query.sortOrder || "ASC";

    const { clientes, total } = await Cliente.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: clientes,
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

// searchClientes
exports.searchClientes = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ClienteId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const { clientes, total } = await Cliente.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: clientes,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error en searchClientes:", error);
    res.status(500).json({ error: "Error al buscar clientes" });
  }
};

exports.getClienteById = async (req, res) => {
  try {
    const cliente = await Cliente.getById(req.params.id);
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCliente = async (req, res) => {
  try {
    // Validación de campos requeridos
    if (!req.body.ClienteNombre) {
      return res.status(400).json({
        success: false,
        message: `El campo ClienteNombre es requerido`,
      });
    }
    // Crear el nuevo cliente
    const nuevoCliente = await Cliente.create({
      ClienteRUC: req.body.ClienteRUC || "",
      ClienteNombre: req.body.ClienteNombre,
      ClienteApellido: req.body.ClienteApellido || null,
      ClienteDireccion: req.body.ClienteDireccion || null,
      ClienteTelefono: req.body.ClienteTelefono || null,
      ClienteTipo: req.body.ClienteTipo,
      UsuarioId: req.body.UsuarioId ? String(req.body.UsuarioId).trim() : "",
    });
    res.status(201).json({
      success: true,
      data: nuevoCliente,
      message: "Cliente creado exitosamente",
    });
  } catch (error) {
    console.error("Error al crear cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear cliente",
      error: error.message,
    });
  }
};

exports.updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const clienteData = req.body;
    if (!clienteData.ClienteNombre) {
      return res.status(400).json({
        success: false,
        message: "ClienteNombre es un campo requerido",
      });
    }
    const updatedCliente = await Cliente.update(id, clienteData);
    if (!updatedCliente) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }
    res.json({
      success: true,
      data: updatedCliente,
      message: "Cliente actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar cliente",
      error: error.message,
    });
  }
};

exports.deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Cliente.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Cliente eliminado exitosamente",
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
          "No se puede eliminar el cliente porque tiene movimientos asociados.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error al eliminar cliente",
      error: error.message,
    });
  }
};

// Obtener todos los clientes sin paginación
exports.getAllClientesSinPaginacion = async (req, res) => {
  try {
    const clientes = await Cliente.getAll();
    res.json({ data: clientes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
