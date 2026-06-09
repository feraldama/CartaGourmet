const VentaCreditoPago = require("../models/ventacreditopago.model");
const { sendError } = require("../utils/errors");
const db = require("../config/db");

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

// Recibe un pago de cuenta corriente (cliente o proveedor). Replica PCreditoWS:
// itera FIFO (más viejo primero) sobre las ventas/compras del actor con saldo
// pendiente, aplicando el monto recibido hasta agotarlo, generando un
// registrodiariocaja + facturacreditopago/ventacreditopago por cada
// documento tocado. Atómico — si algo falla, rollback.
//
// El PRC tiene un quirk: cuando hace un pago parcial, igualmente resta el
// saldo COMPLETO del monto pendiente (`&Monto-=&Saldo`), lo que hace que el
// while corte. El usuario pidió replicar literal.
exports.recibir = async (req, res) => {
  const {
    Tipo,
    ClienteId,
    MontoRecibido,
    CajaId,
    UsuarioId,
    Fecha: fechaIn,
    VentaPagoTipo,
  } = req.body || {};

  if (Tipo !== "V" && Tipo !== "C") {
    return res.status(400).json({ message: "Tipo debe ser 'V' o 'C'" });
  }
  if (!ClienteId || !MontoRecibido || !CajaId || !UsuarioId) {
    return res
      .status(400)
      .json({ message: "Faltan ClienteId, MontoRecibido, CajaId o UsuarioId" });
  }
  if (Tipo === "V" && !VentaPagoTipo) {
    return res
      .status(400)
      .json({ message: "Para Tipo='V' se requiere VentaPagoTipo" });
  }
  let fecha;
  try {
    fecha = parseFecha(fechaIn);
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
  if (!fecha) fecha = new Date().toISOString().slice(0, 19).replace("T", " ");

  let monto = Math.round(Number(MontoRecibido));
  if (!(monto > 0)) {
    return res.status(400).json({ message: "MontoRecibido debe ser > 0" });
  }

  const conn = await db.promise().getConnection();
  try {
    await conn.beginTransaction();

    const aplicados = [];

    if (Tipo === "C") {
      // Compras del proveedor con saldo (FIFO).
      const [rows] = await conn.query(
        `SELECT c.CompraId, c.CompraEntrega,
                COALESCE((SELECT SUM(CompraProductoPrecio * CompraProductoCantidad)
                          FROM compraproducto WHERE CompraId = c.CompraId), 0) AS CompraTotal
         FROM compra c
         WHERE c.ProveedorId = ?
         ORDER BY c.CompraId ASC`,
        [ClienteId]
      );

      for (const r of rows) {
        if (monto <= 0) break;
        const saldo = Math.round(Number(r.CompraTotal) - Number(r.CompraEntrega));
        if (saldo <= 0) continue;

        const cubreCompleto = monto >= saldo;
        const montoCobrado = cubreCompleto ? saldo : monto;

        if (cubreCompleto) {
          await conn.query(
            `UPDATE compra SET CompraEntrega = CompraEntrega + ?,
                               CompraPagoCompleto = 'S'
             WHERE CompraId = ?`,
            [saldo, r.CompraId]
          );
        } else {
          await conn.query(
            `UPDATE compra SET CompraEntrega = CompraEntrega + ?
             WHERE CompraId = ?`,
            [monto, r.CompraId]
          );
        }

        // RDC: egreso por la cuota pagada.
        await conn.query(
          `INSERT INTO registrodiariocaja (
             CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId,
             RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId
           ) VALUES (?, ?, 1, 3, ?, ?, ?)`,
          [
            CajaId,
            fecha,
            `Compra Crédito N°: ${r.CompraId}`,
            montoCobrado,
            UsuarioId,
          ]
        );
        await conn.query(
          `UPDATE caja SET CajaMonto = CajaMonto - ? WHERE CajaId = ?`,
          [montoCobrado, CajaId]
        );

        // FacturaCredito → próximo PagoId. Si no existe la fila padre (compras
        // CO que se vuelven crédito por adelantar saldo), la creo.
        let [fcRows] = await conn.query(
          `SELECT FacturaCreditoId, FacturaCreditoPagoCant
           FROM facturacredito WHERE CompraId = ?`,
          [r.CompraId]
        );
        let fcId;
        let nextPagoId;
        if (fcRows.length) {
          fcId = fcRows[0].FacturaCreditoId;
          const [maxRows] = await conn.query(
            `SELECT COALESCE(MAX(FacturaCreditoPagoId), 0) AS m
             FROM facturacreditopago WHERE FacturaCreditoId = ?`,
            [fcId]
          );
          nextPagoId = Number(maxRows[0].m) + 1;
          await conn.query(
            `UPDATE facturacredito SET FacturaCreditoPagoCant = ? WHERE FacturaCreditoId = ?`,
            [nextPagoId, fcId]
          );
        } else {
          const [ins] = await conn.query(
            `INSERT INTO facturacredito (CompraId, FacturaCreditoPagoCant) VALUES (?, 1)`,
            [r.CompraId]
          );
          fcId = ins.insertId;
          nextPagoId = 1;
        }

        await conn.query(
          `INSERT INTO facturacreditopago (
             FacturaCreditoId, FacturaCreditoPagoId, FacturaCreditoPagoFecha,
             FacturaCreditoPagoMonto
           ) VALUES (?, ?, ?, ?)`,
          [fcId, nextPagoId, fecha.slice(0, 10), montoCobrado]
        );

        aplicados.push({ CompraId: r.CompraId, monto: montoCobrado });
        // Quirk literal del GX: resta el saldo completo del monto restante;
        // tras un pago parcial el while corta porque monto < 0.
        monto -= saldo;
      }
    } else {
      // Tipo === 'V': ventas del cliente con saldo (FIFO).
      const tipoPago = String(VentaPagoTipo);
      let grupoId;
      let detallePrefix;
      if (tipoPago === "CO") {
        grupoId = 3;
        detallePrefix = "Cobro Crédito Efectivo N°: ";
      } else if (tipoPago === "PO") {
        grupoId = 4;
        detallePrefix = "Cobro Crédito POS N°: ";
      } else {
        grupoId = 6;
        detallePrefix = "Cobro Crédito Transfer N°: ";
      }

      const [rows] = await conn.query(
        `SELECT VentaId, Total, VentaEntrega
         FROM venta
         WHERE ClienteId = ?
         ORDER BY VentaId ASC`,
        [ClienteId]
      );

      for (const r of rows) {
        if (monto <= 0) break;
        const saldo = Math.round(Number(r.Total) - Number(r.VentaEntrega));
        if (saldo <= 0) continue;

        const cubreCompleto = monto >= saldo;
        const montoCobrado = cubreCompleto ? saldo : monto;

        await conn.query(
          `UPDATE venta SET VentaEntrega = VentaEntrega + ? WHERE VentaId = ?`,
          [cubreCompleto ? saldo : monto, r.VentaId]
        );

        await conn.query(
          `INSERT INTO registrodiariocaja (
             CajaId, RegistroDiarioCajaFecha, TipoGastoId, TipoGastoGrupoId,
             RegistroDiarioCajaDetalle, RegistroDiarioCajaMonto, UsuarioId
           ) VALUES (?, ?, 2, ?, ?, ?, ?)`,
          [
            CajaId,
            fecha,
            grupoId,
            `${detallePrefix}${r.VentaId}`,
            montoCobrado,
            UsuarioId,
          ]
        );

        // Solo el efectivo afecta la caja física.
        if (tipoPago === "CO") {
          await conn.query(
            `UPDATE caja SET CajaMonto = CajaMonto + ? WHERE CajaId = ?`,
            [montoCobrado, CajaId]
          );
        }

        // VentaCredito → próximo VentaCreditoPagoId.
        let [vcRows] = await conn.query(
          `SELECT VentaCreditoId, VentaCreditoPagoCant
           FROM ventacredito WHERE VentaId = ?`,
          [r.VentaId]
        );
        let vcId;
        let nextPagoId;
        if (vcRows.length) {
          vcId = vcRows[0].VentaCreditoId;
          const [maxRows] = await conn.query(
            `SELECT COALESCE(MAX(VentaCreditoPagoId), 0) AS m
             FROM ventacreditopago WHERE VentaCreditoId = ?`,
            [vcId]
          );
          nextPagoId = Number(maxRows[0].m) + 1;
          await conn.query(
            `UPDATE ventacredito SET VentaCreditoPagoCant = ? WHERE VentaCreditoId = ?`,
            [nextPagoId, vcId]
          );
        } else {
          const [ins] = await conn.query(
            `INSERT INTO ventacredito (VentaId, VentaCreditoPagoCant) VALUES (?, 1)`,
            [r.VentaId]
          );
          vcId = ins.insertId;
          nextPagoId = 1;
        }

        await conn.query(
          `INSERT INTO ventacreditopago (
             VentaCreditoId, VentaCreditoPagoId, VentaCreditoPagoFecha,
             VentaCreditoPagoMonto
           ) VALUES (?, ?, ?, ?)`,
          [vcId, nextPagoId, fecha.slice(0, 10), montoCobrado]
        );

        aplicados.push({ VentaId: r.VentaId, monto: montoCobrado });
        monto -= saldo;
      }
    }

    await conn.commit();
    return res.status(201).json({
      success: true,
      message: aplicados.length
        ? `Pago aplicado a ${aplicados.length} documento(s)`
        : "No había saldos pendientes para aplicar",
      data: { aplicados, restante: Math.max(monto, 0) },
    });
  } catch (err) {
    try {
      await conn.rollback();
    } catch (rbErr) {
      console.error("Rollback falló:", rbErr);
    }
    console.error("Error recibiendo pago de crédito:", err);
    return res.status(400).json({
      success: false,
      message: err && err.message ? err.message : "Error recibiendo pago",
    });
  } finally {
    conn.release();
  }
};

exports.getAll = async (req, res) => {
  try {
    const pagos = await VentaCreditoPago.getAll();
    res.json(pagos);
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
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
    console.error(error);
    sendError(res, error, 500);
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
    console.error(error);
    sendError(res, error, 500);
  }
};

exports.getByVentaCreditoId = async (req, res) => {
  try {
    const pagos = await VentaCreditoPago.getByVentaCreditoId(
      req.params.ventaCreditoId
    );
    res.json(pagos);
  } catch (error) {
    console.error(error);
    sendError(res, error, 500);
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
    console.error(error);
    sendError(res, error, 400);
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
    console.error(error);
    sendError(res, error, 400);
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
    console.error(error);
    sendError(res, error, 500);
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
    console.error(error);
    res.status(500).json({ error: "Error al buscar pagos" });
  }
};
