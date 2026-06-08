const Compra = require("../models/compra.model");
const CompraProducto = require("../models/compraproducto.model");

// getAllCompras
exports.getAllCompras = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "CompraId";
    const sortOrder = req.query.sortOrder || "DESC";

    const { compras, total } = await Compra.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: compras,
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

// searchCompras
exports.searchCompras = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "CompraId";
    const sortOrder = req.query.sortOrder || "DESC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const { compras, total } = await Compra.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: compras,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error en searchCompras:", error);
    res.status(500).json({ error: "Error al buscar compras" });
  }
};

exports.getCompraById = async (req, res) => {
  try {
    const compra = await Compra.getById(req.params.id);
    if (!compra) {
      return res.status(404).json({ message: "Compra no encontrada" });
    }

    // Obtener productos de la compra
    const productos = await CompraProducto.getByCompraId(req.params.id);
    compra.productos = productos;

    res.json(compra);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCompra = async (req, res) => {
  try {
    // Validación de campos requeridos
    const camposRequeridos = [
      "ProveedorId",
      "UsuarioId",
      "CompraFactura",
      "CompraTipo",
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

    // Crear la compra
    const nuevaCompra = await Compra.create({
      CompraFecha: new Date(),
      ProveedorId: req.body.ProveedorId,
      UsuarioId: req.body.UsuarioId,
      CompraFactura: req.body.CompraFactura,
      CompraTipo: req.body.CompraTipo,
      CompraPagoCompleto: req.body.CompraPagoCompleto || false,
      CompraEntrega: req.body.CompraEntrega || 0,
    });

    // Crear los productos de la compra si se proporcionan
    if (req.body.productos && req.body.productos.length > 0) {
      const compraProductos = req.body.productos.map((producto, index) => {
        // Asegurar que CompraProductoId siempre tenga un valor válido empezando en 1
        const compraProductoId =
          producto.CompraProductoId && producto.CompraProductoId > 0
            ? producto.CompraProductoId
            : index + 1;

        return {
          CompraId: nuevaCompra.CompraId,
          CompraProductoId: compraProductoId,
          ProductoId: producto.ProductoId,
          CompraProductoCantidad: producto.CompraProductoCantidad,
          CompraProductoCantidadUnidad:
            producto.CompraProductoCantidadUnidad || "U",
          CompraProductoBonificacion: producto.CompraProductoBonificacion || 0,
          CompraProductoPrecio: producto.CompraProductoPrecio,
          AlmacenOrigenId: producto.AlmacenOrigenId,
        };
      });

      await CompraProducto.createMultiple(compraProductos);
    }

    res.status(201).json({
      success: true,
      data: nuevaCompra,
      message: "Compra creada exitosamente",
    });
  } catch (error) {
    console.error("Error al crear compra:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear compra",
      error: error.message,
    });
  }
};

exports.updateCompra = async (req, res) => {
  try {
    const { id } = req.params;
    const compraData = req.body;

    const updatedCompra = await Compra.update(id, compraData);
    if (!updatedCompra) {
      return res.status(404).json({
        success: false,
        message: "Compra no encontrada",
      });
    }

    // Si se proporcionan productos, actualizar la lista
    if (compraData.productos) {
      // Eliminar productos existentes
      await CompraProducto.deleteByCompraId(id);

      // Crear nuevos productos
      if (compraData.productos.length > 0) {
        const compraProductos = compraData.productos.map((producto, index) => {
          // Asegurar que CompraProductoId siempre tenga un valor válido empezando en 1
          const compraProductoId =
            producto.CompraProductoId && producto.CompraProductoId > 0
              ? producto.CompraProductoId
              : index + 1;

          return {
            CompraId: parseInt(id),
            CompraProductoId: compraProductoId,
            ProductoId: producto.ProductoId,
            CompraProductoCantidad: producto.CompraProductoCantidad,
            CompraProductoCantidadUnidad:
              producto.CompraProductoCantidadUnidad || "U",
            CompraProductoBonificacion:
              producto.CompraProductoBonificacion || 0,
            CompraProductoPrecio: producto.CompraProductoPrecio,
            AlmacenOrigenId: producto.AlmacenOrigenId,
          };
        });

        await CompraProducto.createMultiple(compraProductos);
      }
    }

    res.json({
      success: true,
      data: updatedCompra,
      message: "Compra actualizada exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar compra:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar compra",
      error: error.message,
    });
  }
};

exports.deleteCompra = async (req, res) => {
  try {
    const { id } = req.params;

    // Eliminar productos de la compra primero
    await CompraProducto.deleteByCompraId(id);

    // Eliminar la compra
    const deleted = await Compra.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Compra no encontrada",
      });
    }

    res.json({
      success: true,
      message: "Compra eliminada exitosamente",
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
          "No se puede eliminar la compra porque tiene movimientos asociados.",
      });
    }
    console.error("Error al eliminar compra:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar compra",
      error: error.message,
    });
  }
};

// Obtener todas las compras sin paginación
exports.getAllComprasSinPaginacion = async (req, res) => {
  try {
    const compras = await Compra.getAll();
    res.json({ data: compras });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtener productos de una compra
exports.getProductosByCompraId = async (req, res) => {
  try {
    const { id } = req.params;
    const productos = await CompraProducto.getByCompraId(id);
    res.json({ data: productos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
