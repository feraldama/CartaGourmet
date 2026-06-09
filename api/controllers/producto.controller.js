const Producto = require("../models/producto.model");
const { sendError } = require("../utils/errors");

function extractProductoFilters(query) {
  const filters = {};
  if (query.localId !== undefined && query.localId !== "") {
    const local = parseInt(query.localId, 10);
    if (!isNaN(local)) filters.localId = local;
  }
  if (query.localIdOrZero !== undefined && query.localIdOrZero !== "") {
    const local = parseInt(query.localIdOrZero, 10);
    if (!isNaN(local)) filters.localIdOrZero = local;
  }
  if (query.stockMin !== undefined && query.stockMin !== "")
    filters.stockMin = query.stockMin;
  if (query.stockMax !== undefined && query.stockMax !== "")
    filters.stockMax = query.stockMax;
  if (query.precioMin !== undefined && query.precioMin !== "")
    filters.precioMin = query.precioMin;
  if (query.precioMax !== undefined && query.precioMax !== "")
    filters.precioMax = query.precioMax;
  return filters;
}

// getAllProductos (filters: localId, stockMin/Max, precioMin/Max)
exports.getAllProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ProductoId";
    const sortOrder = req.query.sortOrder || "ASC";
    const filters = extractProductoFilters(req.query);
    const { productos, total } = await Producto.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder,
      filters
    );
    convertirImagenes(productos);
    res.json({
      data: productos,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

// searchProductos (filters: localId, stockMin/Max, precioMin/Max)
exports.searchProductos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ProductoId";
    const sortOrder = req.query.sortOrder || "ASC";
    const filters = extractProductoFilters(req.query);
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }
    const { productos, total } = await Producto.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder,
      filters
    );
    convertirImagenes(productos);
    res.json({
      data: productos,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

// getProductoById
exports.getProductoById = async (req, res) => {
  try {
    let producto = await Producto.getById(req.params.id);
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    convertirImagenes(producto);
    res.json(producto);
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

// createProducto
exports.createProducto = async (req, res) => {
  try {
    // Validación básica de campos requeridos
    const camposRequeridos = [
      "ProductoCodigo",
      "ProductoNombre",
      "ProductoPrecioVenta",
      "LocalId",
    ];
    for (const campo of camposRequeridos) {
      if (
        req.body[campo] === undefined ||
        req.body[campo] === null ||
        (typeof req.body[campo] === "string" && req.body[campo].trim() === "")
      ) {
        return res.status(400).json({
          success: false,
          message: `El campo ${campo} es requerido`,
        });
      }
    }
    // Crear producto
    const nuevoProducto = await Producto.create(req.body);
    res.status(201).json({
      success: true,
      data: nuevoProducto,
      message: "Producto creado exitosamente",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error al crear producto",
    });
  }
};

// updateProducto
exports.updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const productoData = req.body;
    if (!productoData.ProductoNombre) {
      return res.status(400).json({
        success: false,
        message: "ProductoNombre es un campo requerido",
      });
    }
    const updatedProducto = await Producto.update(id, productoData);
    if (!updatedProducto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }
    res.json({
      success: true,
      data: updatedProducto,
      message: "Producto actualizado exitosamente",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
    });
  }
};

// deleteProducto
exports.deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Producto.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Producto eliminado exitosamente",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
    });
  }
};

// Reporte de movimientos (ventas y compras) por producto en un rango de fechas
exports.getReporteMovimientos = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({
        message: "Debe enviar fechaDesde y fechaHasta en el query string",
      });
    }
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(fechaDesde) || !isoRegex.test(fechaHasta)) {
      return res.status(400).json({
        message: "Las fechas deben tener formato YYYY-MM-DD",
      });
    }
    if (fechaDesde > fechaHasta) {
      return res.status(400).json({
        message: "fechaDesde no puede ser mayor que fechaHasta",
      });
    }
    const { productos } = await Producto.getReporteMovimientosPorRango(
      fechaDesde,
      fechaHasta
    );
    res.json({ data: { productos, fechaDesde, fechaHasta } });
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

// Reporte de productos más vendidos en un rango de fechas
exports.getReporteMasVendidos = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;
    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({
        message: "Debe enviar fechaDesde y fechaHasta en el query string",
      });
    }
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoRegex.test(fechaDesde) || !isoRegex.test(fechaHasta)) {
      return res.status(400).json({
        message: "Las fechas deben tener formato YYYY-MM-DD",
      });
    }
    if (fechaDesde > fechaHasta) {
      return res.status(400).json({
        message: "fechaDesde no puede ser mayor que fechaHasta",
      });
    }
    const { productos } = await Producto.getReporteMasVendidos(
      fechaDesde,
      fechaHasta
    );
    res.json({ data: { productos, fechaDesde, fechaHasta } });
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

// Reporte de stock total y por almacén de todos los productos
exports.getReporteStock = async (req, res) => {
  try {
    const { productos } = await Producto.getReporteStock();
    res.json({ data: { productos } });
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

// Obtener todos los productos sin paginación
exports.getAllProductosSinPaginacion = async (req, res) => {
  try {
    const filters = extractProductoFilters(req.query);
    const productos = await Producto.getAll(filters);
    convertirImagenes(productos);
    res.json({ data: productos });
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

/**
 * GET /productos/:id/imagen
 * Sirve el BLOB como binario. Público (sin auth) para que los tags <img>
 * lo puedan cargar directamente. Con cache agresivo del navegador.
 */
exports.getImagen = async (req, res) => {
  try {
    const imagen = await Producto.getImagen(req.params.id);
    // `imagen` puede ser null, undefined, o un Buffer de 0 bytes (algunos
    // productos tienen el BLOB vacío en vez de NULL).
    if (!imagen || imagen.length === 0) return res.status(404).end();
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.send(imagen);
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

function convertirImagenes(productos) {
  if (!productos) return productos;
  if (Array.isArray(productos)) {
    productos.forEach((producto) => {
      if (producto.ProductoImagen && Buffer.isBuffer(producto.ProductoImagen)) {
        producto.ProductoImagen = producto.ProductoImagen.toString("base64");
      }
    });
  } else {
    if (productos.ProductoImagen && Buffer.isBuffer(productos.ProductoImagen)) {
      productos.ProductoImagen = productos.ProductoImagen.toString("base64");
    }
  }
  return productos;
}
