const VentaCredito = require("../models/ventacredito.model");

exports.getAll = async (req, res) => {
  try {
    const ventaCreditos = await VentaCredito.getAll();
    res.json(ventaCreditos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllPaginated = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "VentaCreditoId";
    const sortOrder = req.query.sortOrder || "ASC";

    const result = await VentaCredito.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.ventaCreditos,
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
    const ventaCredito = await VentaCredito.getById(req.params.id);
    if (!ventaCredito) {
      return res
        .status(404)
        .json({ message: "Crédito de venta no encontrado" });
    }
    res.json(ventaCredito);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getByVentaId = async (req, res) => {
  try {
    const ventaCredito = await VentaCredito.getByVentaId(req.params.ventaId);
    if (!ventaCredito) {
      return res
        .status(404)
        .json({ message: "Crédito de venta no encontrado" });
    }
    res.json(ventaCredito);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const ventaCredito = await VentaCredito.create(req.body);
    res.status(201).json({
      message: "Crédito de venta creado exitosamente",
      data: ventaCredito,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const ventaCredito = await VentaCredito.update(req.params.id, req.body);
    if (!ventaCredito) {
      return res
        .status(404)
        .json({ message: "Crédito de venta no encontrado" });
    }
    res.json({
      message: "Crédito de venta actualizado exitosamente",
      data: ventaCredito,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const success = await VentaCredito.delete(req.params.id);
    if (!success) {
      return res
        .status(404)
        .json({ message: "Crédito de venta no encontrado" });
    }
    res.json({ message: "Crédito de venta eliminado exitosamente" });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        message:
          "No se puede eliminar el crédito porque tiene pagos asociados.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.searchVentaCreditos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "VentaCreditoId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res.status(400).json({
        error: "El término de búsqueda no puede estar vacío",
      });
    }

    const result = await VentaCredito.searchVentaCreditos(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.ventaCreditos,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar créditos de venta" });
  }
};
