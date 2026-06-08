const db = require("../config/db");

const Factura = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM factura ORDER BY FacturaId DESC",
        (err, results) => {
          if (err) reject(err);
          resolve(results);
        }
      );
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM factura WHERE FacturaId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "FacturaId",
    sortOrder = "DESC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "FacturaId",
        "FacturaTimbrado",
        "FacturaDesde",
        "FacturaHasta",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "FacturaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      db.query(
        `SELECT * FROM factura ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM factura",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                facturas: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "FacturaId", sortOrder = "DESC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "FacturaId",
        "FacturaTimbrado",
        "FacturaDesde",
        "FacturaHasta",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "FacturaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const searchQuery = `
        SELECT * FROM factura 
        WHERE FacturaId LIKE ? 
        OR FacturaTimbrado LIKE ? 
        OR FacturaDesde LIKE ? 
        OR FacturaHasta LIKE ?
        ORDER BY ${sortField} ${order} 
        LIMIT ? OFFSET ?
      `;
      const searchTerm = `%${term}%`;

      db.query(
        searchQuery,
        [searchTerm, searchTerm, searchTerm, searchTerm, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM factura 
            WHERE FacturaId LIKE ? 
            OR FacturaTimbrado LIKE ? 
            OR FacturaDesde LIKE ? 
            OR FacturaHasta LIKE ?
          `;

          db.query(
            countQuery,
            [searchTerm, searchTerm, searchTerm, searchTerm],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                facturas: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  create: (facturaData) => {
    return new Promise((resolve, reject) => {
      const { FacturaTimbrado, FacturaDesde, FacturaHasta } = facturaData;

      // Validaciones
      if (!FacturaTimbrado || FacturaTimbrado.toString().length > 8) {
        return reject(
          new Error("FacturaTimbrado no puede tener más de 8 dígitos")
        );
      }

      if (!FacturaDesde || FacturaDesde.toString().length > 7) {
        return reject(
          new Error("FacturaDesde no puede tener más de 7 dígitos")
        );
      }

      if (!FacturaHasta || FacturaHasta.toString().length > 7) {
        return reject(
          new Error("FacturaHasta no puede tener más de 7 dígitos")
        );
      }

      if (parseInt(FacturaDesde) >= parseInt(FacturaHasta)) {
        return reject(
          new Error("FacturaDesde debe ser menor que FacturaHasta")
        );
      }

      // Verificar si ya existe una factura con el mismo timbrado
      db.query(
        "SELECT COUNT(*) as count FROM factura WHERE FacturaTimbrado = ?",
        [FacturaTimbrado],
        (err, results) => {
          if (err) return reject(err);
          if (results[0].count > 0) {
            return reject(new Error("Ya existe una factura con este timbrado"));
          }

          // Verificar si hay superposición de rangos
          db.query(
            `SELECT COUNT(*) as count FROM factura 
             WHERE (FacturaDesde <= ? AND FacturaHasta >= ?) 
             OR (FacturaDesde <= ? AND FacturaHasta >= ?) 
             OR (FacturaDesde >= ? AND FacturaHasta <= ?)`,
            [
              FacturaDesde,
              FacturaDesde,
              FacturaHasta,
              FacturaHasta,
              FacturaDesde,
              FacturaHasta,
            ],
            (err, results) => {
              if (err) return reject(err);
              if (results[0].count > 0) {
                return reject(
                  new Error("Existe superposición con el rango de facturas")
                );
              }

              // Insertar la nueva factura
              db.query(
                "INSERT INTO factura (FacturaTimbrado, FacturaDesde, FacturaHasta) VALUES (?, ?, ?)",
                [FacturaTimbrado, FacturaDesde, FacturaHasta],
                (err, result) => {
                  if (err) return reject(err);
                  resolve(result.insertId);
                }
              );
            }
          );
        }
      );
    });
  },

  update: (id, facturaData) => {
    return new Promise((resolve, reject) => {
      const { FacturaTimbrado, FacturaDesde, FacturaHasta } = facturaData;

      // Validaciones
      if (!FacturaTimbrado || FacturaTimbrado.toString().length > 8) {
        return reject(
          new Error("FacturaTimbrado no puede tener más de 8 dígitos")
        );
      }

      if (!FacturaDesde || FacturaDesde.toString().length > 7) {
        return reject(
          new Error("FacturaDesde no puede tener más de 7 dígitos")
        );
      }

      if (!FacturaHasta || FacturaHasta.toString().length > 7) {
        return reject(
          new Error("FacturaHasta no puede tener más de 7 dígitos")
        );
      }

      if (parseInt(FacturaDesde) >= parseInt(FacturaHasta)) {
        return reject(
          new Error("FacturaDesde debe ser menor que FacturaHasta")
        );
      }

      // Verificar si ya existe una factura con el mismo timbrado (excluyendo la actual)
      db.query(
        "SELECT COUNT(*) as count FROM factura WHERE FacturaTimbrado = ? AND FacturaId != ?",
        [FacturaTimbrado, id],
        (err, results) => {
          if (err) return reject(err);
          if (results[0].count > 0) {
            return reject(new Error("Ya existe una factura con este timbrado"));
          }

          // Verificar si hay superposición de rangos (excluyendo la actual)
          db.query(
            `SELECT COUNT(*) as count FROM factura 
             WHERE FacturaId != ? 
             AND ((FacturaDesde <= ? AND FacturaHasta >= ?) 
             OR (FacturaDesde <= ? AND FacturaHasta >= ?) 
             OR (FacturaDesde >= ? AND FacturaHasta <= ?))`,
            [
              id,
              FacturaDesde,
              FacturaDesde,
              FacturaHasta,
              FacturaHasta,
              FacturaDesde,
              FacturaHasta,
            ],
            (err, results) => {
              if (err) return reject(err);
              if (results[0].count > 0) {
                return reject(
                  new Error("Existe superposición con el rango de facturas")
                );
              }

              // Actualizar la factura
              db.query(
                "UPDATE factura SET FacturaTimbrado = ?, FacturaDesde = ?, FacturaHasta = ? WHERE FacturaId = ?",
                [FacturaTimbrado, FacturaDesde, FacturaHasta, id],
                (err, result) => {
                  if (err) return reject(err);
                  if (result.affectedRows === 0) {
                    return reject(new Error("Factura no encontrada"));
                  }
                  resolve(result);
                }
              );
            }
          );
        }
      );
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM factura WHERE FacturaId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          if (result.affectedRows === 0) {
            return reject(new Error("Factura no encontrada"));
          }
          resolve(result);
        }
      );
    });
  },

  getNextAvailableNumber: () => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT FacturaHasta FROM factura ORDER BY FacturaHasta DESC LIMIT 1",
        (err, results) => {
          if (err) return reject(err);
          if (results.length === 0) {
            // Si no hay facturas, empezar desde 1
            resolve(1);
          } else {
            // Tomar el último número usado y sumar 1
            const lastNumber = parseInt(results[0].FacturaHasta);
            resolve(lastNumber + 1);
          }
        }
      );
    });
  },

  getCurrentFactura: (numeroFactura) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM factura WHERE FacturaDesde <= ? AND FacturaHasta >= ?",
        [numeroFactura, numeroFactura],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },
};

module.exports = Factura;
