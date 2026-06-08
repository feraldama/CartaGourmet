const Factura = require("../models/factura.model");

// getAllFacturas
exports.getAllFacturas = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "FacturaId";
    const sortOrder = req.query.sortOrder || "DESC";
    const { facturas, total } = await Factura.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: facturas,
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

// getAllFacturasSinPaginacion
exports.getAllFacturasSinPaginacion = async (req, res) => {
  try {
    const facturas = await Factura.getAll();
    res.json(facturas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// searchFacturas
exports.searchFacturas = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "FacturaId";
    const sortOrder = req.query.sortOrder || "DESC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }
    const { facturas, total } = await Factura.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: facturas,
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

// getFacturaById
exports.getFacturaById = async (req, res) => {
  try {
    let factura = await Factura.getById(req.params.id);
    if (!factura) {
      return res.status(404).json({ message: "Factura no encontrada" });
    }
    res.json(factura);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// createFactura
exports.createFactura = async (req, res) => {
  try {
    // Validación básica de campos requeridos
    const camposRequeridos = [
      "FacturaTimbrado",
      "FacturaDesde",
      "FacturaHasta",
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

    // Validar que los campos sean numéricos
    const { FacturaTimbrado, FacturaDesde, FacturaHasta } = req.body;

    if (!/^\d{1,8}$/.test(FacturaTimbrado.toString())) {
      return res.status(400).json({
        success: false,
        message: "FacturaTimbrado debe tener máximo 8 dígitos numéricos",
      });
    }

    if (!/^\d{1,7}$/.test(FacturaDesde.toString())) {
      return res.status(400).json({
        success: false,
        message: "FacturaDesde debe tener máximo 7 dígitos numéricos",
      });
    }

    if (!/^\d{1,7}$/.test(FacturaHasta.toString())) {
      return res.status(400).json({
        success: false,
        message: "FacturaHasta debe tener máximo 7 dígitos numéricos",
      });
    }

    if (parseInt(FacturaDesde) >= parseInt(FacturaHasta)) {
      return res.status(400).json({
        success: false,
        message: "FacturaDesde debe ser menor que FacturaHasta",
      });
    }

    const facturaId = await Factura.create(req.body);
    const nuevaFactura = await Factura.getById(facturaId);

    res.status(201).json({
      success: true,
      message: "Factura creada exitosamente",
      data: nuevaFactura,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// updateFactura
exports.updateFactura = async (req, res) => {
  try {
    const { id } = req.params;

    // Validación básica de campos requeridos
    const camposRequeridos = [
      "FacturaTimbrado",
      "FacturaDesde",
      "FacturaHasta",
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

    // Validar que los campos sean numéricos
    const { FacturaTimbrado, FacturaDesde, FacturaHasta } = req.body;

    if (!/^\d{1,8}$/.test(FacturaTimbrado.toString())) {
      return res.status(400).json({
        success: false,
        message: "FacturaTimbrado debe tener máximo 8 dígitos numéricos",
      });
    }

    if (!/^\d{1,7}$/.test(FacturaDesde.toString())) {
      return res.status(400).json({
        success: false,
        message: "FacturaDesde debe tener máximo 7 dígitos numéricos",
      });
    }

    if (!/^\d{1,7}$/.test(FacturaHasta.toString())) {
      return res.status(400).json({
        success: false,
        message: "FacturaHasta debe tener máximo 7 dígitos numéricos",
      });
    }

    if (parseInt(FacturaDesde) >= parseInt(FacturaHasta)) {
      return res.status(400).json({
        success: false,
        message: "FacturaDesde debe ser menor que FacturaHasta",
      });
    }

    await Factura.update(id, req.body);
    const facturaActualizada = await Factura.getById(id);

    res.json({
      success: true,
      message: "Factura actualizada exitosamente",
      data: facturaActualizada,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// deleteFactura
exports.deleteFactura = async (req, res) => {
  try {
    const { id } = req.params;
    await Factura.delete(id);
    res.json({
      success: true,
      message: "Factura eliminada exitosamente",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// getNextAvailableNumber
exports.getNextAvailableNumber = async (req, res) => {
  try {
    const nextNumber = await Factura.getNextAvailableNumber();
    res.json({
      success: true,
      data: { nextNumber },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// getCurrentFactura
exports.getCurrentFactura = async (req, res) => {
  try {
    const { numeroFactura } = req.params;
    const factura = await Factura.getCurrentFactura(numeroFactura);
    if (!factura) {
      return res.status(404).json({
        success: false,
        message: "No se encontró una factura válida para este número",
      });
    }
    res.json({
      success: true,
      data: factura,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
