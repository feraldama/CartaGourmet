const db = require("../config/db");

/**
 * Normaliza VentaFecha para que siempre incluya fecha y hora.
 * - Si no se proporciona valor: usa fecha/hora actual
 * - Si es solo fecha (YYYY-MM-DD): usa esa fecha con la hora actual del momento del registro
 * - Si es datetime completo: lo usa tal cual
 */
function normalizeVentaFecha(value) {
  if (!value) return new Date();
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const now = new Date();
    const [y, m, d] = str.split("-").map(Number);
    return new Date(
      y,
      m - 1,
      d,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );
  }
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

const Venta = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM venta", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT v.*, 
          c.ClienteNombre, c.ClienteApellido,
          a.AlmacenNombre,
          u.UsuarioNombre
        FROM venta v
        LEFT JOIN clientes c ON v.ClienteId = c.ClienteId
        LEFT JOIN almacen a ON v.AlmacenId = a.AlmacenId
        LEFT JOIN usuario u ON v.VentaUsuario = u.UsuarioId
        WHERE v.VentaId = ?`,
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO venta (
        VentaFecha,
        ClienteId,
        AlmacenId,
        VentaTipo,
        VentaPagoTipo,
        VentaCantidadProductos,
        VentaUsuario,
        Total,
        VentaEntrega
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        normalizeVentaFecha(data.VentaFecha),
        data.ClienteId,
        data.AlmacenId,
        data.VentaTipo,
        data.VentaPagoTipo,
        data.VentaCantidadProductos,
        data.VentaUsuario,
        data.Total,
        data.VentaEntrega,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        Venta.getById(result.insertId)
          .then((venta) => resolve(venta))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE venta SET 
        VentaFecha = ?,
        ClienteId = ?,
        AlmacenId = ?,
        VentaTipo = ?,
        VentaPagoTipo = ?,
        VentaCantidadProductos = ?,
        VentaUsuario = ?,
        Total = ?,
        VentaEntrega = ?
        WHERE VentaId = ?`;

      const values = [
        normalizeVentaFecha(data.VentaFecha),
        data.ClienteId,
        data.AlmacenId,
        data.VentaTipo,
        data.VentaPagoTipo,
        data.VentaCantidadProductos,
        data.VentaUsuario,
        data.Total,
        data.VentaEntrega,
        id,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Venta.getById(id)
          .then((venta) => resolve(venta))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      // Primero eliminar registros asociados en orden correcto
      const deleteQueries = [
        // 1. Eliminar pagos de crédito (ventacreditopago)
        "DELETE vcp FROM ventacreditopago vcp INNER JOIN ventacredito vc ON vcp.VentaCreditoId = vc.VentaCreditoId WHERE vc.VentaId = ?",
        // 2. Eliminar registros de crédito (ventacredito)
        "DELETE FROM ventacredito WHERE VentaId = ?",
        // 3. Eliminar productos de la venta (ventaproducto)
        "DELETE FROM ventaproducto WHERE VentaId = ?",
        // 4. Finalmente eliminar la venta
        "DELETE FROM venta WHERE VentaId = ?",
      ];

      // Ejecutar las consultas en secuencia
      const executeQueries = async () => {
        try {
          for (const query of deleteQueries) {
            await new Promise((resolveQuery, rejectQuery) => {
              db.query(query, [id], (err, result) => {
                if (err) return rejectQuery(err);
                resolveQuery(result);
              });
            });
          }
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };

      executeQueries();
    });
  },

  getAllPaginated: (limit, offset, sortBy = "VentaId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaId",
        "VentaFecha",
        "ClienteId",
        "AlmacenId",
        "VentaTipo",
        "VentaPagoTipo",
        "VentaCantidadProductos",
        "VentaUsuario",
        "Total",
        "VentaEntrega",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "VentaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const query = `
        SELECT v.*, 
          c.ClienteNombre, c.ClienteApellido,
          a.AlmacenNombre,
          u.UsuarioNombre
        FROM venta v
        LEFT JOIN clientes c ON v.ClienteId = c.ClienteId
        LEFT JOIN almacen a ON v.AlmacenId = a.AlmacenId
        LEFT JOIN usuario u ON v.VentaUsuario = u.UsuarioId
        ORDER BY v.${sortField} ${order} 
        LIMIT ? OFFSET ?`;

      db.query(query, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query("SELECT COUNT(*) as total FROM venta", (err, countResult) => {
          if (err) return reject(err);

          resolve({
            ventas: results,
            total: countResult[0].total,
          });
        });
      });
    });
  },

  searchVentas: (
    term,
    limit,
    offset,
    sortBy = "VentaId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaId",
        "VentaFecha",
        "ClienteId",
        "AlmacenId",
        "VentaTipo",
        "VentaPagoTipo",
        "VentaCantidadProductos",
        "VentaUsuario",
        "Total",
        "VentaEntrega",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "VentaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      // Mapear términos comunes a códigos de tipo de venta
      let tipoVentaSearch = term.toLowerCase();
      switch (tipoVentaSearch) {
        case "contado":
          tipoVentaSearch = "CO";
          break;
        case "credito":
        case "crédito":
          tipoVentaSearch = "CR";
          break;
        case "pos":
          tipoVentaSearch = "PO";
          break;
        case "transfer":
        case "transferencia":
          tipoVentaSearch = "TR";
          break;
        default:
          // Si no es ninguno de los tipos conocidos, mantener el término original
          break;
      }

      const searchQuery = `
        SELECT v.*, 
          c.ClienteNombre, c.ClienteApellido,
          a.AlmacenNombre,
          u.UsuarioNombre
        FROM venta v
        LEFT JOIN clientes c ON v.ClienteId = c.ClienteId
        LEFT JOIN almacen a ON v.AlmacenId = a.AlmacenId
        LEFT JOIN usuario u ON v.VentaUsuario = u.UsuarioId
        WHERE 
          CAST(v.VentaId AS CHAR) = ? 
          OR DATE_FORMAT(v.VentaFecha, '%Y-%m-%d %H:%i:%s') LIKE ?
          OR LOWER(CONCAT(COALESCE(c.ClienteNombre, ''), ' ', COALESCE(c.ClienteApellido, ''))) LIKE LOWER(?)
          OR LOWER(COALESCE(a.AlmacenNombre, '')) LIKE LOWER(?)
          OR v.VentaTipo = ?
          OR LOWER(
            CASE v.VentaTipo 
              WHEN 'CO' THEN 'contado'
              WHEN 'CR' THEN 'credito'
              WHEN 'PO' THEN 'pos'
              WHEN 'TR' THEN 'transfer'
            END
          ) LIKE LOWER(?)
          OR LOWER(v.VentaPagoTipo) LIKE LOWER(?)
          OR CAST(v.VentaCantidadProductos AS CHAR) = ?
          OR LOWER(COALESCE(u.UsuarioNombre, '')) LIKE LOWER(?)
          OR CAST(v.Total AS CHAR) = ?
          OR LOWER(COALESCE(v.VentaEntrega, '')) LIKE LOWER(?)
        ORDER BY v.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      // Para búsqueda exacta de números
      const exactValue = term;
      // Para búsqueda parcial de texto
      const likeValue = `%${term}%`;

      const values = [
        exactValue, // VentaId
        likeValue, // VentaFecha
        likeValue, // Cliente nombre completo
        likeValue, // AlmacenNombre
        tipoVentaSearch, // VentaTipo (código exacto)
        likeValue, // VentaTipo (nombre descriptivo)
        likeValue, // VentaPagoTipo
        exactValue, // VentaCantidadProductos
        likeValue, // UsuarioNombre
        exactValue, // Total
        likeValue, // VentaEntrega
        limit,
        offset,
      ];

      db.query(searchQuery, values, (err, results) => {
        if (err) {
          console.error("Error en la consulta de búsqueda:", err);
          return reject(err);
        }

        const countQuery = `
          SELECT COUNT(*) as total 
          FROM venta v
          LEFT JOIN clientes c ON v.ClienteId = c.ClienteId
          LEFT JOIN almacen a ON v.AlmacenId = a.AlmacenId
          LEFT JOIN usuario u ON v.VentaUsuario = u.UsuarioId
          WHERE 
            CAST(v.VentaId AS CHAR) = ? 
            OR DATE_FORMAT(v.VentaFecha, '%Y-%m-%d %H:%i:%s') LIKE ?
            OR LOWER(CONCAT(COALESCE(c.ClienteNombre, ''), ' ', COALESCE(c.ClienteApellido, ''))) LIKE LOWER(?)
            OR LOWER(COALESCE(a.AlmacenNombre, '')) LIKE LOWER(?)
            OR v.VentaTipo = ?
            OR LOWER(
              CASE v.VentaTipo 
                WHEN 'CO' THEN 'contado'
                WHEN 'CR' THEN 'credito'
                WHEN 'PO' THEN 'pos'
                WHEN 'TR' THEN 'transfer'
              END
            ) LIKE LOWER(?)
            OR LOWER(v.VentaPagoTipo) LIKE LOWER(?)
            OR CAST(v.VentaCantidadProductos AS CHAR) = ?
            OR LOWER(COALESCE(u.UsuarioNombre, '')) LIKE LOWER(?)
            OR CAST(v.Total AS CHAR) = ?
            OR LOWER(COALESCE(v.VentaEntrega, '')) LIKE LOWER(?)
        `;

        const countValues = [
          exactValue, // VentaId
          likeValue, // VentaFecha
          likeValue, // Cliente nombre completo
          likeValue, // AlmacenNombre
          tipoVentaSearch, // VentaTipo (código exacto)
          likeValue, // VentaTipo (nombre descriptivo)
          likeValue, // VentaPagoTipo
          exactValue, // VentaCantidadProductos
          likeValue, // UsuarioNombre
          exactValue, // Total
          likeValue, // VentaEntrega
        ];

        db.query(countQuery, countValues, (err, countResult) => {
          if (err) {
            console.error("Error en la consulta de conteo:", err);
            return reject(err);
          }
          resolve({
            ventas: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },

  // Obtener ventas pendientes por cliente
  getVentasPendientesPorCliente: (clienteId, localId) => {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT 
          v.VentaId,
          v.VentaFecha,
          CAST(v.Total AS DECIMAL(10,2)) as Total,
          CAST(COALESCE(v.VentaEntrega, 0) AS DECIMAL(10,2)) as VentaEntrega,
          CAST((v.Total - COALESCE(v.VentaEntrega, 0)) AS DECIMAL(10,2)) as Saldo
        FROM venta v
        JOIN usuario u ON v.VentaUsuario = u.UsuarioId
        WHERE v.ClienteId = ? 
        AND v.VentaTipo = 'CR'
      `;

      const params = [clienteId];

      // Si se proporciona localId, filtrar por el local del usuario que realizó la venta
      if (localId) {
        query += ` AND u.LocalId = ?`;
        params.push(localId);
      }

      query += ` HAVING Saldo > 0 ORDER BY v.VentaFecha ASC`;

      db.query(query, params, (err, results) => {
        if (err) {
          console.error("Error en getVentasPendientesPorCliente:", err);
          return reject(err);
        }
        // Convertir explícitamente los valores a número
        const processedResults = results.map((row) => ({
          ...row,
          Total: Number(row.Total),
          VentaEntrega: Number(row.VentaEntrega),
          Saldo: Number(row.Saldo),
        }));
        resolve(processedResults);
      });
    });
  },

  // Obtener deudas pendientes agrupadas por cliente
  getDeudasPendientesPorCliente: () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          c.ClienteId,
          CONCAT(TRIM(c.ClienteNombre), ' ', TRIM(c.ClienteApellido)) AS Cliente,
          SUM(v.Total) AS TotalVentas,
          SUM(COALESCE(v.VentaEntrega,0)) AS TotalEntregado,
          SUM(v.Total - COALESCE(v.VentaEntrega,0)) AS Saldo
        FROM venta v
        JOIN clientes c ON v.ClienteId = c.ClienteId
        WHERE v.VentaTipo = 'CR'
        GROUP BY c.ClienteId, c.ClienteNombre, c.ClienteApellido
        HAVING Saldo > 0
        ORDER BY Cliente
      `;
      db.query(query, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },

  // Obtener reporte de ventas por cliente y rango de fechas
  // Si clienteId es "TODOS", devuelve ventas de todos los clientes
  getReporteVentasPorCliente: (clienteId, fechaDesde, fechaHasta) => {
    return new Promise((resolve, reject) => {
      const esTodos = String(clienteId).toUpperCase() === "TODOS";

      const ejecutarVentas = (cliente) => {
        const ventasQuery = `
          SELECT 
            v.*,
            c.ClienteNombre,
            c.ClienteApellido,
            c.ClienteRUC,
            a.AlmacenNombre,
            u.UsuarioNombre,
            v.VentaUsuario AS UsuarioId
          FROM venta v
          LEFT JOIN clientes c ON v.ClienteId = c.ClienteId
          LEFT JOIN almacen a ON v.AlmacenId = a.AlmacenId
          LEFT JOIN usuario u ON v.VentaUsuario = u.UsuarioId
          WHERE DATE(v.VentaFecha) BETWEEN ? AND ?
          ${esTodos ? "" : "AND v.ClienteId = ?"}
          ORDER BY v.VentaFecha ASC, v.VentaId ASC
        `;

        const ventasParams = esTodos ? [fechaDesde, fechaHasta] : [fechaDesde, fechaHasta, clienteId];

        db.query(
          ventasQuery,
          ventasParams,
          async (err, ventasResults) => {
            if (err) return reject(err);

            // Para cada venta, si es a crédito, obtener información de crédito y pagos
            const ventasConDetalle = await Promise.all(
              ventasResults.map(async (venta) => {
                const ventaDetalle = {
                  ...venta,
                  SaldoPendiente: 0,
                  Pagos: [],
                };

                // Si es venta a crédito, obtener información de crédito
                if (venta.VentaTipo === "CR") {
                  // Calcular saldo pendiente
                  const total = Number(venta.Total) || 0;
                  const entrega = Number(venta.VentaEntrega) || 0;
                  ventaDetalle.SaldoPendiente = total - entrega;

                  // Obtener información de crédito
                  const creditoQuery =
                    "SELECT * FROM ventacredito WHERE VentaId = ?";

                  await new Promise((resolveCredito, rejectCredito) => {
                    db.query(
                      creditoQuery,
                      [venta.VentaId],
                      (err, creditoResults) => {
                        if (err) return rejectCredito(err);

                        if (creditoResults.length > 0) {
                          const ventaCreditoId =
                            creditoResults[0].VentaCreditoId;

                          // Obtener pagos del crédito
                          const pagosQuery = `
                        SELECT * FROM ventacreditopago 
                        WHERE VentaCreditoId = ?
                        ORDER BY VentaCreditoPagoFecha ASC, VentaCreditoPagoId ASC
                      `;

                          db.query(
                            pagosQuery,
                            [ventaCreditoId],
                            (err, pagosResults) => {
                              if (err) return rejectCredito(err);
                              ventaDetalle.Pagos = pagosResults || [];
                              resolveCredito();
                            }
                          );
                        } else {
                          resolveCredito();
                        }
                      }
                    );
                  });
                }

                return ventaDetalle;
              })
            );

            resolve({
              cliente: {
                ClienteId: cliente.ClienteId,
                ClienteNombre: cliente.ClienteNombre,
                ClienteApellido: cliente.ClienteApellido,
                ClienteRUC: cliente.ClienteRUC,
              },
              fechaDesde,
              fechaHasta,
              ventas: ventasConDetalle,
            });
          }
        );
      };

      if (esTodos) {
        ejecutarVentas({
          ClienteId: 0,
          ClienteNombre: "TODOS",
          ClienteApellido: "",
          ClienteRUC: "",
        });
      } else {
        const clienteQuery = "SELECT * FROM clientes WHERE ClienteId = ?";
        db.query(clienteQuery, [clienteId], (err, clienteResults) => {
          if (err) return reject(err);
          if (clienteResults.length === 0) {
            return reject(new Error("Cliente no encontrado"));
          }
          ejecutarVentas(clienteResults[0]);
        });
      }
    });
  },
};

module.exports = Venta;
