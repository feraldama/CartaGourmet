const VentaProducto = require("../models/ventaproducto.model");

exports.getAll = async (req, res) => {
  try {
    const ventaProductos = await VentaProducto.getAll();
    res.json(ventaProductos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllPaginated = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "VentaId";
    const sortOrder = req.query.sortOrder || "ASC";

    const result = await VentaProducto.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.ventaProductos,
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
    const ventaProducto = await VentaProducto.getById(
      req.params.ventaId,
      req.params.productoId
    );
    if (!ventaProducto) {
      return res
        .status(404)
        .json({ message: "Producto de venta no encontrado" });
    }
    res.json(ventaProducto);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getByVentaId = async (req, res) => {
  try {
    const ventaProductos = await VentaProducto.getByVentaId(req.params.ventaId);
    res.json(ventaProductos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const ventaProducto = await VentaProducto.create(req.body);
    res.status(201).json({
      message: "Producto de venta creado exitosamente",
      data: ventaProducto,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const ventaProducto = await VentaProducto.update(
      req.params.ventaId,
      req.params.productoId,
      req.body
    );
    if (!ventaProducto) {
      return res
        .status(404)
        .json({ message: "Producto de venta no encontrado" });
    }
    res.json({
      message: "Producto de venta actualizado exitosamente",
      data: ventaProducto,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const success = await VentaProducto.delete(
      req.params.ventaId,
      req.params.productoId
    );
    if (!success) {
      return res
        .status(404)
        .json({ message: "Producto de venta no encontrado" });
    }
    res.json({ message: "Producto de venta eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchVentaProductos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "VentaId";
    const sortOrder = req.query.sortOrder || "ASC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res.status(400).json({
        error: "El término de búsqueda no puede estar vacío",
      });
    }

    const result = await VentaProducto.searchVentaProductos(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: result.ventaProductos,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Error al buscar productos de venta" });
  }
};
