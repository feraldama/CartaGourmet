const path = require("path");
const Venta = require("../models/venta.model");
const { sendError } = require("../utils/errors");
const db = require("../config/db");
const { restarUnidades, sumarUnidades } = require("../utils/stockOps");
const RG90 = require("../config/rg90");

// Acepta "YYYY-MM-DD" o "YYYY-MM-DDTHH:MM:SS" (ISO con o sin hora) o
// "DD/MM/YY" / "DD/MM/YYYY" (formato GeneXus). Preserva la hora si viene.
function parseFecha(s) {
  if (!s) return null;
  // ISO con o sin componente horario; PG acepta ambos en columnas TIMESTAMP.
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

exports.getAll = async (req, res) => {
  try {
    const ventas = await Venta.getAll();
    res.json(ventas);
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

function extractVentaFilters(query) {
  const allowedTipos = ["CO", "CR", "PO", "TR"];
  const allowedEstados = ["P", "C"];
  const allowedDocumentos = ["FA", "NC"];
  const filters = {};
  if (query.tipo && allowedTipos.includes(query.tipo)) filters.tipo = query.tipo;
  if (query.almacenId) filters.almacenId = query.almacenId;
  if (query.usuarioId) filters.usuarioId = query.usuarioId;
  if (query.fechaDesde) filters.fechaDesde = query.fechaDesde;
  if (query.fechaHasta) filters.fechaHasta = query.fechaHasta;
  if (query.fechaDesdeHora) filters.fechaDesdeHora = query.fechaDesdeHora;
  if (query.fechaHastaHora) filters.fechaHastaHora = query.fechaHastaHora;
  if (query.estado && allowedEstados.includes(query.estado))
    filters.estado = query.estado;
  if (query.documentoTipo && allowedDocumentos.includes(query.documentoTipo))
    filters.documentoTipo = query.documentoTipo;
  return filters;
}

exports.getAllPaginated = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "VentaId";
    const sortOrder = req.query.sortOrder || "ASC";
    const filters = extractVentaFilters(req.query);

    const result = await Venta.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder,
      filters
    );

    res.json({
      data: result.ventas,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

exports.getById = async (req, res) => {
  try {
    const venta = await Venta.getById(req.params.id);
    if (!venta) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }
    res.json(venta);
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
  }
};

exports.create = async (req, res) => {
  try {
    const venta = await Venta.create(req.body);
    res.status(201).json({
      message: "Venta creada exitosamente",
      data: venta,
    });
  } catch (error) {
    console.error(error);
    sendError(res, error, 400);
  }
};

exports.update = async (req, res) => {
  try {
    const venta = await Venta.update(req.params.id, req.body);
    if (!venta) {
      return res.status(404).json({ message: "Venta no encontrada" });
    }
    res.json({
      message: "Venta actualizada exitosamente",
      data: venta,
    });
  } catch (error) {
    console.error(error);
    sendError(res, error, 400);
  }
};

// DELETE de venta: replica PBorrarRegistoDiarioWS con &regla=1. Revierte los
// movimientos de caja asociados (los 7 detalles posibles que el GX inserta),
// devuelve el efectivo a la caja, restituye stock de cada ventaproducto, y
// borra ventacreditopago/ventacredito/ventaproducto/venta — todo en una
// transacción para que no quede a medias.
exports.delete = async (req, res) => {
  const ventaId = parseInt(req.params.id, 10);
  if (!ventaId) {
    return res.status(400).json({ message: "VentaId inválido" });
  }

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // Verificar existencia y traer almacen.
    const [ventaRows] = await conn.query(
      `SELECT VentaId, AlmacenId FROM venta WHERE VentaId = ?`,
      [ventaId]
    );
    if (!ventaRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: "Venta no encontrada" });
    }
    const almacenId = ventaRows[0].AlmacenId;

    // 1. Reversión de caja. Los 7 detalles posibles que apventaconfirmarws
    // y apcreditows insertan. De esos, solo "Venta N°" y "Cobro Crédito
    // Efectivo N°" mueven efectivo físico — el resto (POS, TR, Voucher) NO
    // afecta CajaMonto, por eso solo descontamos el efectivo al revertir.
    const detalleVenta = `Venta N°: ${ventaId}`;
    const detallePOS = `Venta POS N°: ${ventaId}`;
    const detalleCred = `Venta Crédito N°: ${ventaId}`;
    const detalleTrans = `Venta Transferencia N°: ${ventaId}`;
    const detalleVoucher = `Venta Voucher N°: ${ventaId}`;
    const detalleCredEfe = `Cobro Crédito Efectivo N°: ${ventaId}`;
    const detalleCredPOS = `Cobro Crédito POS N°: ${ventaId}`;
    const detalleCredTrans = `Cobro Crédito Transfer N°: ${ventaId}`;

    const [rdcRows] = await conn.query(
      `SELECT RegistroDiarioCajaId, CajaId, RegistroDiarioCajaMonto,
              RegistroDiarioCajaDetalle
       FROM registrodiariocaja
       WHERE RegistroDiarioCajaDetalle IN (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        detalleVenta,
        detallePOS,
        detalleCred,
        detalleTrans,
        detalleVoucher,
        detalleCredEfe,
        detalleCredPOS,
        detalleCredTrans,
      ]
    );

    let cajaAfectada = null;
    let montoEfectivo = 0;
    for (const r of rdcRows) {
      cajaAfectada = r.CajaId;
      if (
        r.RegistroDiarioCajaDetalle === detalleVenta ||
        r.RegistroDiarioCajaDetalle === detalleCredEfe
      ) {
        montoEfectivo += Number(r.RegistroDiarioCajaMonto);
      }
    }

    if (rdcRows.length) {
      await conn.query(
        `DELETE FROM registrodiariocaja
         WHERE RegistroDiarioCajaDetalle IN (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detalleVenta,
          detallePOS,
          detalleCred,
          detalleTrans,
          detalleVoucher,
          detalleCredEfe,
          detalleCredPOS,
          detalleCredTrans,
        ]
      );
    }
    if (cajaAfectada !== null && montoEfectivo !== 0) {
      await conn.query(
        `UPDATE caja SET CajaMonto = CajaMonto - ? WHERE CajaId = ?`,
        [montoEfectivo, cajaAfectada]
      );
    }

    // 2. Restitución de stock: SumaStock por cada ventaproducto.
    const [vpRows] = await conn.query(
      `SELECT ProductoId, VentaProductoCantidad, VentaProductoUnitario
       FROM ventaproducto WHERE VentaId = ?`,
      [ventaId]
    );
    for (const vp of vpRows) {
      const productoId = vp.ProductoId;
      const cantidad = Number(vp.VentaProductoCantidad);
      const unidad = vp.VentaProductoUnitario === "U" ? "U" : "C";

      const [prodRows] = await conn.query(
        `SELECT ProductoCantidadCaja, ProductoStock, ProductoStockUnitario
         FROM producto WHERE ProductoId = ?`,
        [productoId]
      );
      if (!prodRows.length) continue;
      const prod = prodRows[0];
      const cantidadCaja = Number(prod.ProductoCantidadCaja);

      if (unidad === "U") {
        const nProd = sumarUnidades(
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
      } else {
        await conn.query(
          `UPDATE producto SET ProductoStock = ProductoStock + ? WHERE ProductoId = ?`,
          [cantidad, productoId]
        );
        await conn.query(
          `UPDATE productoalmacen
           SET ProductoAlmacenStock = ProductoAlmacenStock + ?
           WHERE ProductoId = ? AND AlmacenId = ?`,
          [cantidad, productoId, almacenId]
        );
      }
    }

    // 3. Borrado de hijos (FKs sin cascade) y de la venta.
    await conn.query(
      `DELETE FROM ventacreditopago
       WHERE VentaCreditoId IN (SELECT VentaCreditoId FROM ventacredito WHERE VentaId = ?)`,
      [ventaId]
    );
    await conn.query(`DELETE FROM ventacredito WHERE VentaId = ?`, [ventaId]);
    await conn.query(`DELETE FROM ventaproducto WHERE VentaId = ?`, [ventaId]);
    await conn.query(`DELETE FROM venta WHERE VentaId = ?`, [ventaId]);

    await conn.commit();
    return res.json({ success: true, message: "Venta eliminada exitosamente" });
  } catch (error) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error("Rollback falló:", rbErr);
    }
    console.error("Error al eliminar venta:", error);
    sendError(res, error, 500);
  } finally {
    conn.release();
  }
};

exports.searchVentas = async (req, res) => {
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

    const filters = extractVentaFilters(req.query);

    const result = await Venta.searchVentas(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder,
      filters
    );

    res.json({
      data: result.ventas,
      pagination: {
        totalItems: result.total,
        totalPages: Math.ceil(result.total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al buscar ventas" });
  }
};

// Obtener ventas pendientes por cliente
exports.getVentasPendientesPorCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { localId } = req.query;

    if (!clienteId) {
      return res.status(400).json({
        success: false,
        message: "El ID del cliente es requerido",
      });
    }

    const ventas = await Venta.getVentasPendientesPorCliente(
      clienteId,
      localId
    );
    res.json({
      success: true,
      data: ventas,
    });
  } catch (error) {
    console.error("Error al obtener ventas pendientes:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener ventas pendientes",
    });
  }
};

// Obtener deudas pendientes agrupadas por cliente
exports.getDeudasPendientesPorCliente = async (req, res) => {
  try {
    const deudas = await Venta.getDeudasPendientesPorCliente();
    res.json({ success: true, data: deudas });
  } catch (error) {
    console.error("Error al obtener deudas pendientes por cliente:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener deudas pendientes por cliente",
    });
  }
};

// Confirma una venta de forma atómica: cabecera + items + descuento de stock
// (general y por almacén) + movimientos de caja + actualización del monto de
// caja + ventacredito/ventacreditopago si hubo cobro a cuenta corriente.
// Replica PVentaConfirmarWS de GeneXus.
exports.confirmar = async (req, res) => {
  const {
    VentaFecha: fechaIn,
    AlmacenOrigenId,
    ClienteId,
    CajaId,
    UsuarioId,
    VentaNroPOS = "0",
    VentaPagoTipo,
    Pagos = {},
    Productos = [],
  } = req.body || {};

  // Tipo de comprobante: FA (factura, por defecto) o NC (nota de crédito).
  // El correlativo y el timbrado se asignan dentro de la transacción tomándolos
  // del rango activo del tipo correspondiente (no se reciben del cliente).
  const documentoTipo = req.body && req.body.VentaDocumentoTipo === "NC" ? "NC" : "FA";

  // NC: referencia a la factura que la nota de crédito afecta (exigida por el
  // registro de comprobantes de la RG 90). Puede venir como VentaIdAsociada
  // (selección exacta desde el buscador del punto de venta) o, como respaldo,
  // por número de comprobante (VentaNroFacturaAsociada); ambas se validan
  // dentro de la transacción.
  const ventaIdAsociadaIn =
    documentoTipo === "NC" && req.body.VentaIdAsociada
      ? Number(req.body.VentaIdAsociada)
      : null;
  const nroFacturaAsociada =
    documentoTipo === "NC" && !ventaIdAsociadaIn && req.body.VentaNroFacturaAsociada
      ? Number(req.body.VentaNroFacturaAsociada)
      : null;

  // Todos los montos de pago caen en columnas BIGINT (Total, VentaEntrega,
  // RegistroDiarioCajaMonto, CajaMonto, VentaCreditoPagoMonto). PG no trunca
  // decimales en BIGINT — redondeo en el borde.
  const efectivo = Math.round(Number(Pagos.Efectivo) || 0);
  const banco = Math.round(Number(Pagos.Banco) || 0);
  const cuentaCliente = Math.round(Number(Pagos.CuentaCliente) || 0);
  const voucher = Math.round(Number(Pagos.Voucher) || 0);
  const transferencia = Math.round(Number(Pagos.Transferencia) || 0);

  if (!Array.isArray(Productos) || Productos.length === 0) {
    return res.status(400).json({ message: "Se requiere al menos un producto" });
  }
  if (!AlmacenOrigenId || !ClienteId || !CajaId || !UsuarioId) {
    return res
      .status(400)
      .json({ message: "Faltan AlmacenOrigenId, ClienteId, CajaId o UsuarioId" });
  }

  let ventaFecha;
  try {
    ventaFecha = parseFecha(fechaIn);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
  if (!ventaFecha) ventaFecha = new Date().toISOString().slice(0, 10);

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    // 0. Serializa la numeración entre ventas concurrentes: tanto VentaId como
    // el correlativo legal se asignan con MAX+1, y en READ COMMITTED dos
    // transacciones simultáneas leerían el mismo máximo. El lock se libera
    // automáticamente al commit/rollback.
    await conn.query(
      "SELECT pg_advisory_xact_lock(hashtext('venta-confirmar'))"
    );

    // 1. Próximo VentaId (la tabla no es SERIAL; replica MAX+1 del GX).
    const [maxRows] = await conn.query(
      "SELECT COALESCE(MAX(VentaId), 0) AS m FROM venta"
    );
    const ultorden = Number(maxRows[0].m) + 1;

    // 1b. Numeración legal del comprobante según el tipo (FA/NC). Se toma el
    // rango de timbrado activo del tipo (el de mayor FacturaHasta) y se asigna
    // el próximo correlativo (MAX usado + 1, o FacturaDesde si es el primero).
    // El papel es preimpreso: el número no se dibuja, sólo se registra para que
    // la venta coincida con el formulario físico. Todo dentro de la transacción
    // para que dos ventas concurrentes no tomen el mismo número.
    const [rangoRows] = await conn.query(
      `SELECT FacturaTimbrado, FacturaDesde, FacturaHasta
       FROM factura
       WHERE FacturaDocumentoTipo = ?
       ORDER BY FacturaHasta DESC
       LIMIT 1`,
      [documentoTipo]
    );
    if (!rangoRows.length) {
      throw new Error(
        documentoTipo === "NC"
          ? "No hay timbrado configurado para Nota de Crédito"
          : "No hay timbrado configurado para Factura"
      );
    }
    const rango = rangoRows[0];
    const facturaTimbrado = Number(rango.FacturaTimbrado);
    const facturaDesde = Number(rango.FacturaDesde);
    const facturaHasta = Number(rango.FacturaHasta);

    const [usadoRows] = await conn.query(
      `SELECT COALESCE(MAX(VentaNroFactura), 0) AS m
       FROM venta
       WHERE VentaTimbrado = ? AND VentaDocumentoTipo = ?`,
      [facturaTimbrado, documentoTipo]
    );
    const ultimoNro = Number(usadoRows[0].m);
    const ventaNroFactura = ultimoNro > 0 ? ultimoNro + 1 : facturaDesde;
    if (ventaNroFactura > facturaHasta) {
      throw new Error(
        documentoTipo === "NC"
          ? "Rango de timbrado de Nota de Crédito agotado, cargar nuevo timbrado"
          : "Rango de timbrado de Factura agotado, cargar nuevo timbrado"
      );
    }

    // 1c. NC: resolver/validar la factura asociada. Por VentaId (selección
    // exacta del buscador) o por número de comprobante (la más reciente con
    // ese correlativo, por si el número se repitió en timbrados anteriores).
    let ventaIdAsociada = null;
    if (ventaIdAsociadaIn) {
      const [asocRows] = await conn.query(
        `SELECT VentaId FROM venta
         WHERE VentaId = ? AND VentaDocumentoTipo = 'FA'`,
        [ventaIdAsociadaIn]
      );
      if (!asocRows.length) {
        throw new Error(
          "La factura seleccionada para asociar a la Nota de Crédito no existe"
        );
      }
      ventaIdAsociada = asocRows[0].VentaId;
    } else if (nroFacturaAsociada) {
      const [asocRows] = await conn.query(
        `SELECT VentaId FROM venta
         WHERE VentaNroFactura = ? AND VentaDocumentoTipo = 'FA'
         ORDER BY VentaId DESC
         LIMIT 1`,
        [nroFacturaAsociada]
      );
      if (!asocRows.length) {
        throw new Error(
          `No se encontró la factura N° ${nroFacturaAsociada} para asociar a la Nota de Crédito`
        );
      }
      ventaIdAsociada = asocRows[0].VentaId;
    }

    // 2. VentaTipo según composición del pago.
    let ventaTipo;
    if (cuentaCliente > 0) ventaTipo = "CR";
    else if (transferencia > 0) ventaTipo = "TR";
    else if (banco > 0) ventaTipo = "PO";
    else ventaTipo = "CO";

    const ventaEntrega = efectivo + banco + voucher + transferencia;
    const total = efectivo + banco + cuentaCliente + voucher + transferencia;

    // 3. Cabecera de venta.
    await conn.query(
      `INSERT INTO venta (
         VentaId, VentaFecha, ClienteId, AlmacenId, VentaTipo, VentaPagoTipo,
         VentaCantidadProductos, VentaUsuario, VentaNroFactura, VentaTimbrado,
         Total, VentaEntrega, VentaNroPOS, VentaDocumentoTipo, VentaIdAsociada
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ultorden,
        ventaFecha,
        ClienteId,
        AlmacenOrigenId,
        ventaTipo,
        VentaPagoTipo || "",
        Productos.length,
        UsuarioId,
        ventaNroFactura,
        facturaTimbrado,
        total,
        ventaEntrega,
        VentaNroPOS,
        documentoTipo,
        ventaIdAsociada,
      ]
    );

    // 4. Items + descuento de stock.
    let i = 1;
    for (const p of Productos) {
      const productoId = p.ProductoId;
      const cantidad = Number(p.VentaProductoCantidad);
      const unidad = p.ProductoUnidad === "U" ? "U" : "C";

      // Snapshot del producto para precio promedio + cantidad por caja.
      const [prodRows] = await conn.query(
        `SELECT ProductoPrecioPromedio, ProductoCantidadCaja, ProductoStock, ProductoStockUnitario
         FROM producto WHERE ProductoId = ?`,
        [productoId]
      );
      if (!prodRows.length) {
        throw new Error(`Producto ${productoId} no encontrado`);
      }
      const prod = prodRows[0];
      const cantidadCaja = Number(prod.ProductoCantidadCaja);
      const precioPromedioBase = Number(prod.ProductoPrecioPromedio);
      // VentaProductoPrecioPromedio es BIGINT, GeneXus trunca implícitamente al asignar.
      const precioPromedioLinea = Math.round(
        unidad === "U" ? precioPromedioBase / cantidadCaja : precioPromedioBase
      );

      // Totales del item (combo o normal).
      const esCombo = p.Combo === true || p.Combo === "S";
      const precioTotal = esCombo
        ? Number(p.ComboPrecio)
        : Number(p.VentaProductoPrecioTotal);
      // VentaProductoPrecio también es BIGINT.
      const precioUnit = Math.round(precioTotal / cantidad);

      await conn.query(
        `INSERT INTO ventaproducto (
           VentaId, VentaProductoId, ProductoId, VentaProductoCantidad,
           VentaProductoPrecioPromedio, VentaProductoUnitario,
           VentaProductoPrecio, VentaProductoPrecioTotal
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ultorden,
          i,
          productoId,
          cantidad,
          precioPromedioLinea,
          unidad,
          precioUnit,
          precioTotal,
        ]
      );

      // Descuento de stock.
      if (unidad === "U") {
        const nProd = restarUnidades(
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
          [productoId, AlmacenOrigenId]
        );
        let paStock = 0;
        let paStockUnit = 0;
        if (paRows.length) {
          paStock = paRows[0].ProductoAlmacenStock;
          paStockUnit = paRows[0].ProductoAlmacenStockUnitario;
        } else {
          await conn.query(
            `INSERT INTO productoalmacen
               (ProductoId, AlmacenId, ProductoAlmacenStock, ProductoAlmacenStockUnitario)
             VALUES (?, ?, 0, 0)`,
            [productoId, AlmacenOrigenId]
          );
        }
        const nPa = restarUnidades(paStock, paStockUnit, cantidad, cantidadCaja);
        await conn.query(
          `UPDATE productoalmacen
           SET ProductoAlmacenStock = ?, ProductoAlmacenStockUnitario = ?
           WHERE ProductoId = ? AND AlmacenId = ?`,
          [nPa.stock, nPa.stockUnitario, productoId, AlmacenOrigenId]
        );
      } else {
        await conn.query(
          `UPDATE producto SET ProductoStock = ProductoStock - ? WHERE ProductoId = ?`,
          [cantidad, productoId]
        );
        const [paExists] = await conn.query(
          `SELECT 1 FROM productoalmacen WHERE ProductoId = ? AND AlmacenId = ?`,
          [productoId, AlmacenOrigenId]
        );
        if (!paExists.length) {
          await conn.query(
            `INSERT INTO productoalmacen
               (ProductoId, AlmacenId, ProductoAlmacenStock, ProductoAlmacenStockUnitario)
             VALUES (?, ?, 0, 0)`,
            [productoId, AlmacenOrigenId]
          );
        }
        await conn.query(
          `UPDATE productoalmacen
           SET ProductoAlmacenStock = ProductoAlmacenStock - ?
           WHERE ProductoId = ? AND AlmacenId = ?`,
          [cantidad, productoId, AlmacenOrigenId]
        );
      }

      i += 1;
    }

    // 5. Cuenta corriente del cliente (crédito).
    if (cuentaCliente > 0) {
      const entregaCredito = efectivo + banco + voucher + transferencia;
      const [vcInsert] = await conn.query(
        `INSERT INTO ventacredito (VentaId, VentaCreditoPagoCant) VALUES (?, ?)`,
        [ultorden, entregaCredito > 0 ? 1 : 0]
      );
      if (entregaCredito > 0) {
        const ventaCreditoId = vcInsert.insertId;
        await conn.query(
          `INSERT INTO ventacreditopago (
             VentaCreditoId, VentaCreditoPagoId, VentaCreditoPagoFecha, VentaCreditoPagoMonto
           ) VALUES (?, ?, ?, ?)`,
          [ventaCreditoId, 1, ventaFecha, entregaCredito]
        );
      }
    }

    // 6. RegistroDiarioCaja por método de pago.
    // Efectivo: TipoGastoGrupoId=3 (cobro crédito) si la venta es a cuenta,
    //           TipoGastoGrupoId=1 (venta contado) si no.
    if (efectivo > 0) {
      const isCredito = cuentaCliente > 0;
      await conn.query(
        `INSERT INTO registrodiariocaja (
           CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId,
           RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId
         ) VALUES (?, ?, 2, ?, ?, ?, ?)`,
        [
          CajaId,
          ventaFecha,
          isCredito ? 3 : 1,
          isCredito ? `Venta Crédito N°: ${ultorden}` : `Venta N°: ${ultorden}`,
          efectivo,
          UsuarioId,
        ]
      );
    }
    if (banco > 0) {
      await conn.query(
        `INSERT INTO registrodiariocaja (
           CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId,
           RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId
         ) VALUES (?, ?, 2, 4, ?, ?, ?)`,
        [CajaId, ventaFecha, `Venta POS N°: ${ultorden}`, banco, UsuarioId]
      );
    }
    if (voucher > 0) {
      await conn.query(
        `INSERT INTO registrodiariocaja (
           CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId,
           RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId
         ) VALUES (?, ?, 2, 5, ?, ?, ?)`,
        [CajaId, ventaFecha, `Venta Voucher N°: ${ultorden}`, voucher, UsuarioId]
      );
    }
    if (transferencia > 0) {
      await conn.query(
        `INSERT INTO registrodiariocaja (
           CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId,
           RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId
         ) VALUES (?, ?, 2, 6, ?, ?, ?)`,
        [
          CajaId,
          ventaFecha,
          `Venta Transferencia N°: ${ultorden}`,
          transferencia,
          UsuarioId,
        ]
      );
    }

    // 7. Solo el efectivo se acumula en la caja física.
    if (efectivo > 0) {
      await conn.query(
        `UPDATE caja SET CajaMonto = CajaMonto + ? WHERE CajaId = ?`,
        [efectivo, CajaId]
      );
    }

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: "Venta confirmada exitosamente",
      data: {
        VentaId: ultorden,
        VentaTipo: ventaTipo,
        VentaDocumentoTipo: documentoTipo,
        VentaNroFactura: ventaNroFactura,
        VentaTimbrado: facturaTimbrado,
        Total: total,
        VentaEntrega: ventaEntrega,
      },
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error("Rollback falló:", rbErr);
    }
    console.error("Error confirmando venta:", err);
    return res.status(400).json({
      success: false,
      message: err && err.message ? err.message : "Error confirmando venta",
    });
  } finally {
    conn.release();
  }
};

// Devolución de productos: restituye stock al almacén y descuenta el total
// devuelto de la caja. Replica PDevolucionWS. No crea un registro de venta
// nuevo ni anula la original — es una entrada de mercadería + egreso de caja.
exports.devolucion = async (req, res) => {
  const {
    VentaFecha: fechaIn,
    AlmacenOrigenId,
    CajaId,
    UsuarioId,
    Total2,
    Productos = [],
  } = req.body || {};

  if (!Array.isArray(Productos) || Productos.length === 0) {
    return res.status(400).json({ message: "Se requiere al menos un producto" });
  }
  if (!AlmacenOrigenId || !CajaId || !UsuarioId) {
    return res
      .status(400)
      .json({ message: "Faltan AlmacenOrigenId, CajaId o UsuarioId" });
  }
  const total = Number(Total2) || 0;
  if (total <= 0) {
    return res.status(400).json({ message: "Total2 debe ser mayor a cero" });
  }

  let ventaFecha;
  try {
    ventaFecha = parseFecha(fechaIn);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
  if (!ventaFecha) ventaFecha = new Date().toISOString().slice(0, 10);

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    for (const p of Productos) {
      const productoId = p.ProductoId;
      const cantidad = Number(p.VentaProductoCantidad);
      const unidad = p.ProductoUnidad === "U" ? "U" : "C";

      const [prodRows] = await conn.query(
        `SELECT ProductoCantidadCaja, ProductoStock, ProductoStockUnitario
         FROM producto WHERE ProductoId = ?`,
        [productoId]
      );
      if (!prodRows.length) {
        throw new Error(`Producto ${productoId} no encontrado`);
      }
      const prod = prodRows[0];
      const cantidadCaja = Number(prod.ProductoCantidadCaja);

      if (unidad === "U") {
        const nProd = sumarUnidades(
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
          [productoId, AlmacenOrigenId]
        );
        if (!paRows.length) {
          throw new Error(
            `Producto ${productoId} no tiene registro en almacén ${AlmacenOrigenId}`
          );
        }
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
          [nPa.stock, nPa.stockUnitario, productoId, AlmacenOrigenId]
        );
      } else {
        await conn.query(
          `UPDATE producto SET ProductoStock = ProductoStock + ? WHERE ProductoId = ?`,
          [cantidad, productoId]
        );
        await conn.query(
          `UPDATE productoalmacen
           SET ProductoAlmacenStock = ProductoAlmacenStock + ?
           WHERE ProductoId = ? AND AlmacenId = ?`,
          [cantidad, productoId, AlmacenOrigenId]
        );
      }
    }

    // Egreso de caja: TipoGastoId=1, TipoGastoGrupoId=9 (devolución), detalle
    // fijo 'Devolución de producto' (sin número de venta, igual que GeneXus).
    await conn.query(
      `INSERT INTO registrodiariocaja (
         CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId,
         RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId
       ) VALUES (?, ?, 1, 9, 'Devolución de producto', ?, ?)`,
      [CajaId, ventaFecha, total, UsuarioId]
    );

    await conn.query(
      `UPDATE caja SET CajaMonto = CajaMonto - ? WHERE CajaId = ?`,
      [total, CajaId]
    );

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: "Devolución realizada exitosamente",
      data: { Total: total },
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error("Rollback falló:", rbErr);
    }
    console.error("Error en devolución:", err);
    return res.status(400).json({
      success: false,
      message: err && err.message ? err.message : "Error en devolución",
    });
  } finally {
    conn.release();
  }
};

// Obtener reporte de ventas por cliente y rango de fechas
// clienteId puede ser un ID numérico o "TODOS" para todas las ventas
exports.getReporteVentasPorCliente = async (req, res) => {
  try {
    const { clienteId, fechaDesde, fechaHasta } = req.query;

    const esTodos = String(clienteId).toUpperCase() === "TODOS";
    const esClienteValido = !isNaN(Number(clienteId)) && Number(clienteId) > 0;
    if (!clienteId || (!esTodos && !esClienteValido)) {
      return res.status(400).json({
        success: false,
        message: "Seleccione un cliente o TODOS",
      });
    }

    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({
        success: false,
        message: "Las fechas desde y hasta son requeridas",
      });
    }

    const reporte = await Venta.getReporteVentasPorCliente(
      clienteId,
      fechaDesde,
      fechaHasta
    );

    res.json({
      success: true,
      data: reporte,
    });
  } catch (error) {
    console.error("Error al obtener reporte de ventas:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener reporte de ventas",
    });
  }
};

// ============================ Libro de ventas RG 90 ========================
// Formatos según la especificación técnica de Marangatu: fecha dd/mm/aaaa,
// comprobante ###-###-#######, montos enteros y Total = 10% + 5% + exento.

// Valida el rango de fechas del reporte; si es inválido responde 400 y
// devuelve false.
function validarRangoRG90(req, res) {
  const { fechaDesde, fechaHasta } = req.query;
  if (!fechaDesde || !fechaHasta) {
    res.status(400).json({
      success: false,
      message: "Las fechas desde y hasta son requeridas",
    });
    return false;
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaDesde) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta)
  ) {
    res.status(400).json({
      success: false,
      message: "Formato de fecha inválido (se espera YYYY-MM-DD)",
    });
    return false;
  }
  if (fechaDesde > fechaHasta) {
    res.status(400).json({
      success: false,
      message: "La fecha desde no puede ser mayor a la fecha hasta",
    });
    return false;
  }
  return true;
}

// Convierte las ventas del rango (Venta.getVentasRG90) a filas de 19 columnas
// del registro de VENTAS de la RG 90. Compartido por la planilla Excel y el
// CSV de importación a Marangatu.
function construirFilasRG90(ventas) {
  const formatFecha = (fecha) => {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  return ventas.map((venta) => {
    const total = Math.round(Number(venta.Total) || 0);
    let gravado10 = Math.round(Number(venta.Gravado10) || 0);
    let gravado5 = Math.round(Number(venta.Gravado5) || 0);
    let exento = Math.round(Number(venta.Exento) || 0);

    // Ventas sin desglose de IVA en sus líneas (productos sin ProductoIVA
    // cargado): se asume la tasa por defecto (10%, la general del rubro).
    if (gravado10 === 0 && gravado5 === 0) {
      if (RG90.IVA_POR_DEFECTO === 10) {
        gravado10 = total;
        exento = 0;
      } else if (RG90.IVA_POR_DEFECTO === 5) {
        gravado5 = total;
        exento = 0;
      } else {
        exento = total;
      }
    }

    // La SET exige Total = 10% + 5% + exento. Diferencias de redondeo o de
    // precios de combo se ajustan contra el bucket más grande.
    const diff = total - (gravado10 + gravado5 + exento);
    if (diff !== 0) {
      if (gravado10 >= gravado5 && gravado10 >= exento) gravado10 += diff;
      else if (gravado5 >= exento) gravado5 += diff;
      else exento += diff;
      if (gravado10 < 0 || gravado5 < 0 || exento < 0) {
        // Ajuste imposible sin negativos: todo el comprobante a la tasa
        // por defecto.
        gravado10 = RG90.IVA_POR_DEFECTO === 10 ? total : 0;
        gravado5 = RG90.IVA_POR_DEFECTO === 5 ? total : 0;
        exento = gravado10 === 0 && gravado5 === 0 ? total : 0;
      }
    }

    // Comprador: se toma como documento sólo si tiene formato válido (dígitos
    // con DV opcional); placeholders tipo "SIN RUC" van como SIN NOMBRE (15).
    // El tipo (RUC=11 / CI=12) sale de clientes.ClienteDocumentoTipo.
    const docCrudo = (venta.ClienteRUC || "").trim();
    const documento = /^\d{1,8}(-?\d)?$/.test(docCrudo) ? docCrudo : "";
    const nombreCliente = `${venta.ClienteNombre || ""} ${
      venta.ClienteApellido || ""
    }`.trim();
    const esNC = venta.VentaDocumentoTipo === "NC";

    let tipoIdentificacion = RG90.IDENTIFICACION_SIN_NOMBRE;
    if (documento) {
      tipoIdentificacion =
        venta.ClienteDocumentoTipo === "CI"
          ? RG90.IDENTIFICACION_CEDULA
          : RG90.IDENTIFICACION_RUC;
    }

    return [
      RG90.TIPO_REGISTRO_VENTAS, // 1  código tipo de registro
      tipoIdentificacion, // 2  tipo identificación comprador
      documento || RG90.SIN_NOMBRE_NUMERO, // 3  número identificación
      documento ? nombreCliente : RG90.SIN_NOMBRE_RAZON_SOCIAL, // 4  nombre
      RG90.COMPROBANTE_POR_DOCUMENTO_TIPO[venta.VentaDocumentoTipo] ||
        RG90.COMPROBANTE_POR_DOCUMENTO_TIPO.FA, // 5  tipo comprobante
      formatFecha(venta.VentaFecha), // 6  fecha emisión
      Number(venta.VentaTimbrado) || 0, // 7  timbrado
      RG90.formatNroComprobante(venta.VentaNroFactura), // 8  nro comprobante
      gravado10, // 9  gravado 10%
      gravado5, // 10 gravado 5%
      exento, // 11 no gravado/exento
      total, // 12 total
      venta.VentaTipo === "CR"
        ? RG90.CONDICION_CREDITO
        : RG90.CONDICION_CONTADO, // 13 condición de venta
      "N", // 14 moneda extranjera
      RG90.IMPUTA_IVA, // 15 imputa IVA
      RG90.IMPUTA_IRE, // 16 imputa IRE
      RG90.IMPUTA_IRP, // 17 imputa IRP-RSP
      esNC && venta.NroFacturaAsociada
        ? RG90.formatNroComprobante(venta.NroFacturaAsociada)
        : "", // 18 comprobante asociado (NC)
      esNC && venta.NroFacturaAsociada
        ? Number(venta.TimbradoAsociado) || 0
        : "", // 19 timbrado asociado (NC)
    ];
  });
}

// Planilla Excel oficial (hoja VENTAS) sobre assets/rg90-template.xlsx.
exports.getReporteVentasRG90 = async (req, res) => {
  if (!validarRangoRG90(req, res)) return;
  const { fechaDesde, fechaHasta } = req.query;

  try {
    const ventas = await Venta.getVentasRG90(fechaDesde, fechaHasta);
    const filas = construirFilasRG90(ventas);

    // Carga diferida: exceljs es pesado y sólo se usa en este reporte.
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(
      path.join(__dirname, "../assets/rg90-template.xlsx")
    );
    const sheet = workbook.getWorksheet("VENTAS");
    if (!sheet) {
      throw new Error("La plantilla RG 90 no tiene la hoja VENTAS");
    }

    const FILA_INICIO = 11; // encabezados en fila 10, datos desde la 11
    const FILAS_PREFORMATEADAS = 34; // la plantilla trae estilos en 11..44

    // Si el rango trae más ventas que filas pre-formateadas, se duplican filas
    // (con estilo incluido) a partir de la última de la plantilla.
    if (filas.length > FILAS_PREFORMATEADAS) {
      sheet.duplicateRow(
        FILA_INICIO + FILAS_PREFORMATEADAS - 1,
        filas.length - FILAS_PREFORMATEADAS,
        true
      );
    }

    filas.forEach((valores, i) => {
      const row = sheet.getRow(FILA_INICIO + i);
      valores.forEach((valor, col) => {
        if (valor !== "") row.getCell(col + 1).value = valor;
      });
      row.commit();
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `libro-ventas-rg90_${fechaDesde}_${fechaHasta}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error al generar libro de ventas RG 90:", error);
    res.status(500).json({
      success: false,
      message: "Error al generar el libro de ventas RG 90",
    });
  }
};

// CSV de importación a Marangatu: mismas 19 columnas, en un ZIP con el nombre
// que exige la SET (<RUC>_REG_MMAAAA_V0001.zip, período = mes de fechaDesde).
// Sin fila de encabezados: Marangatu valida cada línea como datos.
exports.getReporteVentasRG90Csv = async (req, res) => {
  if (!validarRangoRG90(req, res)) return;
  const { fechaDesde, fechaHasta } = req.query;

  if (!/^\d{1,8}$/.test(RG90.RUC_INFORMANTE)) {
    return res.status(400).json({
      success: false,
      message:
        "Configurá RG90_RUC en el .env del backend (RUC de la empresa sin dígito verificador) para generar el CSV de Marangatu",
    });
  }

  try {
    const ventas = await Venta.getVentasRG90(fechaDesde, fechaHasta);
    const filas = construirFilasRG90(ventas);

    // Campos de texto sin comas ni saltos de línea: el CSV de Marangatu es
    // delimitado por comas simples, sin soporte confiable de comillas.
    const csv = filas
      .map((valores) =>
        valores
          .map((v) =>
            typeof v === "string" ? v.replace(/[,\r\n]+/g, " ").trim() : v
          )
          .join(",")
      )
      .join("\r\n");

    // Nombre según spec: <RUC>_REG_MMAAAA_XXXXX (obligación 955, mensual).
    // El período se toma del mes de fechaDesde.
    const [anho, mes] = fechaDesde.split("-");
    const base = `${RG90.RUC_INFORMANTE}_REG_${mes}${anho}_V0001`;

    const JSZip = require("jszip");
    const zip = new JSZip();
    zip.file(`${base}.csv`, csv, { binary: false });
    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${base}.zip"`
    );
    res.send(buffer);
  } catch (error) {
    console.error("Error al generar CSV RG 90:", error);
    res.status(500).json({
      success: false,
      message: "Error al generar el CSV de Marangatu",
    });
  }
};

// Facturas emitidas (FA) para asociar a una Nota de Crédito desde el punto de
// venta: busca por número de comprobante o cliente, las más recientes primero.
exports.buscarFacturasParaNC = async (req, res) => {
  const term = String(req.query.term || "").trim();
  if (!term) {
    return res.json({ success: true, data: [] });
  }
  try {
    const facturas = await Venta.buscarFacturasEmitidas(term, 10);
    res.json({
      success: true,
      data: facturas.map((f) => ({
        VentaId: f.VentaId,
        VentaNroFactura: f.VentaNroFactura,
        VentaTimbrado: f.VentaTimbrado,
        NroComprobante: RG90.formatNroComprobante(f.VentaNroFactura),
        VentaFecha: f.VentaFecha,
        Total: Number(f.Total) || 0,
        Cliente: `${f.ClienteNombre || ""} ${f.ClienteApellido || ""}`.trim(),
      })),
    });
  } catch (error) {
    console.error("Error al buscar facturas para NC:", error);
    res.status(500).json({
      success: false,
      message: "Error al buscar facturas",
    });
  }
};
