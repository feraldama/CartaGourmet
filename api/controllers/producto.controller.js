const Producto = require("../models/producto.model");

// getAllProductos (localId opcional: si viene, el stock devuelto es solo de almacenes con ese LocalId)
exports.getAllProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ProductoId";
    const sortOrder = req.query.sortOrder || "ASC";
    const localId =
      req.query.localId !== undefined && req.query.localId !== ""
        ? parseInt(req.query.localId, 10)
        : null;
    const { productos, total } = await Producto.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder,
      isNaN(localId) ? null : localId
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
    res.status(500).json({ error: error.message });
  }
};

// searchProductos (localId opcional: si viene, el stock devuelto es solo de almacenes con ese LocalId)
exports.searchProductos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ProductoId";
    const sortOrder = req.query.sortOrder || "ASC";
    const localId =
      req.query.localId !== undefined && req.query.localId !== ""
        ? parseInt(req.query.localId, 10)
        : null;
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
      isNaN(localId) ? null : localId
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({
      success: false,
      message: "Error al crear producto",
      error: error.message,
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
    res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
      error: error.message,
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
    res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
      error: error.message,
    });
  }
};

// Reporte de stock total y por almacén de todos los productos
exports.getReporteStock = async (req, res) => {
  try {
    const { productos } = await Producto.getReporteStock();
    res.json({ data: { productos } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener todos los productos sin paginación
exports.getAllProductosSinPaginacion = async (req, res) => {
  try {
    const productos = await Producto.getAll();
    convertirImagenes(productos);
    res.json({ data: productos });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
