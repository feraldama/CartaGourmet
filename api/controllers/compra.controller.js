const Compra = require("../models/compra.model");
const { sendError } = require("../utils/errors");
const CompraProducto = require("../models/compraproducto.model");
const db = require("../config/db");
const {
  sumarUnidades,
  restarUnidadesReverseCompra,
} = require("../utils/stockOps");

// Acepta "YYYY-MM-DD" o "YYYY-MM-DDTHH:MM:SS" (ISO con o sin hora) o
// "DD/MM/YY" / "DD/MM/YYYY". Preserva la hora si viene — compra.CompraFecha
// es ahora TIMESTAMP para registrar el momento de confirmación.
function parseFecha(s) {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?/.test(s)) {
    return s.replace("T", " ").slice(0, 19);
  }
  const m = /^(\d{2})\/(\d{2})\/(\d{2,4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) {
    let [, d, mo, y, hh = "00", mm = "00", ss = "00"] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo}-${d} ${hh}:${mm}:${ss}`;
  }
  throw new Error(`Fecha inválida: ${s}`);
}

// Confirma una compra de forma atómica: cabecera + items + suma de stock
// (general y por almacén) + recálculo de precio promedio ponderado + caja +
// facturacredito/pago si CompraTipo='CR'. Replica PCompraConfirmarWS literal,
// incluyendo los quirks del GX (CajaId=1 hardcodeado, CompraProductoId=2,4,6).
exports.confirmar = async (req, res) => {
  const {
    CompraFecha: fechaIn,
    CompraFactura,
    CompraTipo,
    Entregado,
    Total,
    UsuarioId,
    CajaId,
    Productos = [],
  } = req.body || {};

  if (!Array.isArray(Productos) || Productos.length === 0) {
    return res.status(400).json({ message: "Se requiere al menos un producto" });
  }
  if (!CompraFactura || !CompraTipo || !UsuarioId || !CajaId) {
    return res
      .status(400)
      .json({ message: "Faltan CompraFactura, CompraTipo, UsuarioId o CajaId" });
  }
  const tipo = ["CO", "CR"].includes(CompraTipo) ? CompraTipo : "CO";
  const entregado = Number(Entregado) || 0;
  const total = Number(Total) || 0;
  // CompraEntrega es DECIMAL pero registrodiariocaja.Monto, caja.CajaMonto y
  // facturacreditopago.Monto son BIGINT — PG no trunca decimales automáticamente.
  const entregadoInt = Math.round(entregado);

  let compraFecha;
  try {
    compraFecha = parseFecha(fechaIn);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
  if (!compraFecha) compraFecha = new Date().toISOString().slice(0, 10);

  // ProveedorId viene a nivel item en el SDT del GX; lo tomo del primero.
  const proveedorId = Number(Productos[0].ProveedorId);
  if (!proveedorId) {
    return res
      .status(400)
      .json({ message: "Falta ProveedorId en el primer item" });
  }

  const compraPagoCompleto = entregado === total ? "S" : "N";

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 1. Próximo CompraId (la tabla SÍ es SERIAL acá; uso RETURNING vía
    // adapter para tomar el id recién insertado).
    const [headerInsert] = await conn.query(
      `INSERT INTO compra (
         CompraFecha, ProveedorId, UsuarioId, CompraFactura, CompraTipo,
         CompraPagoCompleto, CompraEntrega, CompraCantidadProductos
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        compraFecha,
        proveedorId,
        UsuarioId,
        Number(CompraFactura),
        tipo,
        compraPagoCompleto,
        entregado,
        Productos.length,
      ]
    );
    const ultorden = headerInsert.insertId;

    // 2. Por cada item: stock en almacén + insert compraproducto + recálculo
    // de precio promedio sobre la fila de producto general.
    // &i del GX arranca en 1 pero se incrementa una vez ANTES del INSERT y
    // otra DESPUÉS, así que el primer CompraProductoId queda en 2 y avanza
    // de a 2 (2, 4, 6...). Replico literal.
    let i = 1;
    for (const p of Productos) {
      const productoId = Number(p.ProductoId);
      const cantidad = Number(p.CompraProductoCantidad);
      const precioCompra = Number(p.CompraProductoPrecio);
      const bonificacion = Number(p.Bonificacion) || 0;
      const almacenId = Number(p.AlmacenId);
      const unidad = p.CompraProductoCantidadUnidad === "U" ? "U" : "C";

      const [prodRows] = await conn.query(
        `SELECT ProductoCantidadCaja, ProductoStock, ProductoStockUnitario,
                ProductoPrecioPromedio
         FROM producto WHERE ProductoId = ?`,
        [productoId]
      );
      if (!prodRows.length) {
        throw new Error(`Producto ${productoId} no encontrado`);
      }
      const prod = prodRows[0];
      const cantidadCaja = Number(prod.ProductoCantidadCaja);

      // 2.a Stock en almacén destino.
      const [paRows] = await conn.query(
        `SELECT ProductoAlmacenStock, ProductoAlmacenStockUnitario
         FROM productoalmacen WHERE ProductoId = ? AND AlmacenId = ?`,
        [productoId, almacenId]
      );
      if (paRows.length === 0) {
        // when none → crea la fila.
        if (unidad === "C") {
          await conn.query(
            `INSERT INTO productoalmacen
               (ProductoId, AlmacenId, ProductoAlmacenStock, ProductoAlmacenStockUnitario)
             VALUES (?, ?, ?, 0)`,
            [productoId, almacenId, cantidad + bonificacion]
          );
        } else {
          await conn.query(
            `INSERT INTO productoalmacen
               (ProductoId, AlmacenId, ProductoAlmacenStock, ProductoAlmacenStockUnitario)
             VALUES (?, ?, 0, ?)`,
            [productoId, almacenId, cantidad]
          );
        }
      } else {
        if (unidad === "C") {
          await conn.query(
            `UPDATE productoalmacen
             SET ProductoAlmacenStock = ProductoAlmacenStock + ?
             WHERE ProductoId = ? AND AlmacenId = ?`,
            [cantidad + bonificacion, productoId, almacenId]
          );
        } else {
          const nPa = sumarUnidades(
            paRows[0].ProductoAlmacenStock,
            paRows[0].ProductoAlmacenStockUnitario,
            cantidad,
            cantidadCaja
          );
          await conn.query(
            `UPDATE productoalmacen
             SET ProductoAlmacenStock = ?, ProductoAlmacenStockUnitario = ?
             WHERE ProductoId = ? AND AlmacenId = ?`,
            [nPa.stock, nPa.stockUnitario, productoId, almacenId]
          );
        }
      }

      // 2.b CompraProductoId con el quirk del &i (2,4,6...).
      i += 1;
      await conn.query(
        `INSERT INTO compraproducto (
           CompraId, CompraProductoId, ProductoId,
           CompraProductoCantidad, CompraProductoCantidadUnidad,
           CompraProductoBonificacion, CompraProductoPrecio, AlmacenOrigenId
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ultorden,
          i,
          productoId,
          cantidad,
          unidad,
          bonificacion,
          precioCompra,
          almacenId,
        ]
      );
      i += 1;

      // 2.c Recálculo de precio promedio ponderado en producto general.
      const stockActual = Number(prod.ProductoStock);
      const stockUnitActual = Number(prod.ProductoStockUnitario);
      const promedioActualBase = Number(prod.ProductoPrecioPromedio);

      let stockEfectivo;
      let promedioAnterior;
      if (stockActual <= 0) {
        stockEfectivo = stockActual * -1;
        promedioAnterior = promedioActualBase * stockEfectivo;
        if (stockActual === 0 && stockUnitActual !== 0) {
          stockEfectivo = 1;
          promedioAnterior = promedioActualBase * stockEfectivo;
        }
      } else {
        promedioAnterior = stockActual * promedioActualBase;
        stockEfectivo = stockActual;
      }

      let nuevoPromedio;
      let nuevoStock = stockActual;
      let nuevoStockUnit = stockUnitActual;
      if (unidad === "C") {
        const promedioActual = cantidad * precioCompra;
        nuevoPromedio =
          (promedioAnterior + promedioActual) / (cantidad + stockEfectivo);
        nuevoStock = stockActual + cantidad + bonificacion;
      } else {
        const promedioActual = cantidadCaja * precioCompra;
        nuevoPromedio = (promedioAnterior + promedioActual) / (1 + stockEfectivo);
        const nProd = sumarUnidades(
          stockActual,
          stockUnitActual,
          cantidad,
          cantidadCaja
        );
        nuevoStock = nProd.stock;
        nuevoStockUnit = nProd.stockUnitario;
      }

      await conn.query(
        `UPDATE producto
         SET ProductoStock = ?, ProductoStockUnitario = ?,
             ProductoPrecioPromedio = ?
         WHERE ProductoId = ?`,
        [nuevoStock, nuevoStockUnit, nuevoPromedio, productoId]
      );
    }

    // 3. Crédito de proveedor.
    if (tipo === "CR") {
      const [fcInsert] = await conn.query(
        `INSERT INTO facturacredito (CompraId, FacturaCreditoPagoCant)
         VALUES (?, ?)`,
        [ultorden, entregado > 0 ? 1 : 0]
      );
      if (entregado > 0) {
        const facturaCreditoId = fcInsert.insertId;
        await conn.query(
          `INSERT INTO facturacreditopago (
             FacturaCreditoId, FacturaCreditoPagoId, FacturaCreditoPagoFecha,
             FacturaCreditoPagoMonto
           ) VALUES (?, ?, ?, ?)`,
          [facturaCreditoId, 1, compraFecha, entregadoInt]
        );
      }
    }

    // 4. Movimiento de caja por la parte entregada. Uso la caja del usuario
    // (el GX hardcodeaba CajaId=1 — corregido a pedido).
    if (entregado > 0) {
      await conn.query(
        `INSERT INTO registrodiariocaja (
           CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId,
           RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId
         ) VALUES (?, ?, 1, 1, ?, ?, ?)`,
        [CajaId, compraFecha, `Compra N°: ${ultorden}`, entregadoInt, UsuarioId]
      );
      await conn.query(
        `UPDATE caja SET CajaMonto = CajaMonto - ? WHERE CajaId = ?`,
        [entregadoInt, CajaId]
      );
    }

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: "Compra confirmada exitosamente",
      data: { CompraId: ultorden, CompraTipo: tipo, Total: total, Entregado: entregado },
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error("Rollback falló:", rbErr);
    }
    console.error("Error confirmando compra:", err);
    return res.status(400).json({
      success: false,
      message: err && err.message ? err.message : "Error confirmando compra",
    });
  } finally {
    conn.release();
  }
};

function extractCompraFilters(query) {
  const allowedTipos = ["CO", "CR"];
  const filters = {};
  if (query.tipo && allowedTipos.includes(query.tipo)) filters.tipo = query.tipo;
  if (query.proveedorId) filters.proveedorId = query.proveedorId;
  if (query.almacenId) filters.almacenId = query.almacenId;
  if (query.fechaDesde) filters.fechaDesde = query.fechaDesde;
  if (query.fechaHasta) filters.fechaHasta = query.fechaHasta;
  return filters;
}

// getAllCompras
exports.getAllCompras = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "CompraId";
    const sortOrder = req.query.sortOrder || "DESC";
    const filters = extractCompraFilters(req.query);

    const { compras, total } = await Compra.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder,
      filters
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
    console.error(error);
    sendError(res, error, 500);
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

    const filters = extractCompraFilters(req.query);

    const { compras, total } = await Compra.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder,
      filters
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
    console.error(error);
    sendError(res, error, 500);
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
    });
  }
};

// DELETE compra: replica PBorrarRegistoDiarioWS con &regla=2. Borra el
// movimiento de caja "Compra N°: X", devuelve el monto a la caja, resta
// stock por cada compraproducto (cantidad + bonificación), y borra
// facturacreditopago/facturacredito/compraproducto/compra. Atómico.
exports.deleteCompra = async (req, res) => {
  const compraId = parseInt(req.params.id, 10);
  if (!compraId) {
    return res.status(400).json({ success: false, message: "CompraId inválido" });
  }

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const [compraRows] = await conn.query(
      `SELECT CompraId FROM compra WHERE CompraId = ?`,
      [compraId]
    );
    if (!compraRows.length) {
      await conn.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Compra no encontrada" });
    }

    // 1. Reversión de caja por el movimiento "Compra N°: X".
    const detalle = `Compra N°: ${compraId}`;
    const [rdcRows] = await conn.query(
      `SELECT CajaId, RegistroDiarioCajaMonto FROM registrodiariocaja
       WHERE RegistroDiarioCajaDetalle = ?`,
      [detalle]
    );
    for (const r of rdcRows) {
      await conn.query(
        `UPDATE caja SET CajaMonto = CajaMonto + ? WHERE CajaId = ?`,
        [Number(r.RegistroDiarioCajaMonto), r.CajaId]
      );
    }
    if (rdcRows.length) {
      await conn.query(
        `DELETE FROM registrodiariocaja WHERE RegistroDiarioCajaDetalle = ?`,
        [detalle]
      );
    }

    // 2. Resta de stock por cada compraproducto (cantidad + bonificación).
    const [cpRows] = await conn.query(
      `SELECT ProductoId, CompraProductoCantidad, CompraProductoBonificacion,
              CompraProductoCantidadUnidad, AlmacenOrigenId
       FROM compraproducto WHERE CompraId = ?`,
      [compraId]
    );
    for (const cp of cpRows) {
      const productoId = cp.ProductoId;
      const cantidad =
        Number(cp.CompraProductoCantidad) +
        Number(cp.CompraProductoBonificacion || 0);
      const unidad = cp.CompraProductoCantidadUnidad === "U" ? "U" : "C";
      const almacenId = cp.AlmacenOrigenId;

      const [prodRows] = await conn.query(
        `SELECT ProductoCantidadCaja, ProductoStock, ProductoStockUnitario
         FROM producto WHERE ProductoId = ?`,
        [productoId]
      );
      if (!prodRows.length) continue;
      const prod = prodRows[0];
      const cantidadCaja = Number(prod.ProductoCantidadCaja);

      if (unidad === "U") {
        // El PRC usa la variante reverse-compra (su=CantidadCaja cuando llega
        // a 0) — replico literal aunque suma 1 unidad fantasma.
        const nProd = restarUnidadesReverseCompra(
          prod.ProductoStock,
          prod.ProductoStockUnitario,
          cantidad,
          cantidadCaja
        );
        await conn.query(
          `UPDATE producto SET ProductoStock = ?, ProductoStockUnitario = ?
           WHERE ProductoId = ?`,
          [nProd.stock, nProd.stockUnitario, productoId]
        );

        const [paRows] = await conn.query(
          `SELECT ProductoAlmacenStock, ProductoAlmacenStockUnitario
           FROM productoalmacen WHERE ProductoId = ? AND AlmacenId = ?`,
          [productoId, almacenId]
        );
        if (paRows.length) {
          const nPa = restarUnidadesReverseCompra(
            paRows[0].ProductoAlmacenStock,
            paRows[0].ProductoAlmacenStockUnitario,
            cantidad,
            cantidadCaja
          );
          await conn.query(
            `UPDATE productoalmacen
             SET ProductoAlmacenStock = ?, ProductoAlmacenStockUnitario = ?
             WHERE ProductoId = ? AND AlmacenId = ?`,
            [nPa.stock, nPa.stockUnitario, productoId, almacenId]
          );
        }
      } else {
        await conn.query(
          `UPDATE producto SET ProductoStock = ProductoStock - ? WHERE ProductoId = ?`,
          [cantidad, productoId]
        );
        await conn.query(
          `UPDATE productoalmacen
           SET ProductoAlmacenStock = ProductoAlmacenStock - ?
           WHERE ProductoId = ? AND AlmacenId = ?`,
          [cantidad, productoId, almacenId]
        );
      }
    }

    // 3. Borrado de hijos y de la compra.
    await conn.query(
      `DELETE FROM facturacreditopago
       WHERE FacturaCreditoId IN (SELECT FacturaCreditoId FROM facturacredito WHERE CompraId = ?)`,
      [compraId]
    );
    await conn.query(`DELETE FROM facturacredito WHERE CompraId = ?`, [compraId]);
    await conn.query(`DELETE FROM compraproducto WHERE CompraId = ?`, [compraId]);
    await conn.query(`DELETE FROM compra WHERE CompraId = ?`, [compraId]);

    await conn.commit();
    return res.json({
      success: true,
      message: "Compra eliminada exitosamente",
    });
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error("Rollback falló:", rbErr);
    }
    console.error("Error al eliminar compra:", error);
    return res.status(500).json({
      success: false,
      message: error && error.message ? error.message : "Error al eliminar compra",
    });
  } finally {
    conn.release();
  }
};

// Obtener todas las compras sin paginación
exports.getAllComprasSinPaginacion = async (req, res) => {
  try {
    const compras = await Compra.getAll();
    res.json({ data: compras });
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

// Obtener productos de una compra
exports.getProductosByCompraId = async (req, res) => {
  try {
    const { id } = req.params;
    const productos = await CompraProducto.getByCompraId(id);
    res.json({ data: productos });
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};
