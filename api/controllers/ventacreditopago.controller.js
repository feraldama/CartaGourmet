const VentaCreditoPago = require("../models/ventacreditopago.model");

exports.getAll = async (req, res) => {
  try {
    const pagos = await VentaCreditoPago.getAll();
    res.json(pagos);
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

    const result = await VentaCreditoPago.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.pagos,
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
    const pago = await VentaCreditoPago.getById(
      req.params.ventaCreditoId,
      req.params.pagoId
    );
    if (!pago) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    res.json(pago);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getByVentaCreditoId = async (req, res) => {
  try {
    const pagos = await VentaCreditoPago.getByVentaCreditoId(
      req.params.ventaCreditoId
    );
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const pago = await VentaCreditoPago.create(req.body);
    res.status(201).json({
      message: "Pago creado exitosamente",
      data: pago,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const pago = await VentaCreditoPago.update(
      req.params.ventaCreditoId,
      req.params.pagoId,
      req.body
    );
    if (!pago) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    res.json({
      message: "Pago actualizado exitosamente",
      data: pago,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const success = await VentaCreditoPago.delete(
      req.params.ventaCreditoId,
      req.params.pagoId
    );
    if (!success) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }
    res.json({ message: "Pago eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchPagos = async (req, res) => {
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

    const result = await VentaCreditoPago.searchPagos(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.pagos,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar pagos" });
  }
};
