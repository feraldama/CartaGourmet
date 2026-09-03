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
      // Tipo de comprobante al que aplica el rango: FA (factura) o NC (nota de
      // crédito). Cada tipo lleva su propio timbrado y secuencia, por eso las
      // validaciones de unicidad/solapamiento se acotan por tipo.
      const tipo = facturaData.FacturaDocumentoTipo === "NC" ? "NC" : "FA";

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

      // Verificar si ya existe un timbrado igual para el mismo tipo
      db.query(
        "SELECT COUNT(*) as count FROM factura WHERE FacturaTimbrado = ? AND FacturaDocumentoTipo = ?",
        [FacturaTimbrado, tipo],
        (err, results) => {
          if (err) return reject(err);
          if (results[0].count > 0) {
            return reject(new Error("Ya existe un timbrado igual para este tipo de comprobante"));
          }

          // Verificar si hay superposición de rangos dentro del mismo tipo
          db.query(
            `SELECT COUNT(*) as count FROM factura
             WHERE FacturaDocumentoTipo = ?
             AND ((FacturaDesde <= ? AND FacturaHasta >= ?)
             OR (FacturaDesde <= ? AND FacturaHasta >= ?)
             OR (FacturaDesde >= ? AND FacturaHasta <= ?))`,
            [
              tipo,
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
                  new Error("Existe superposición con el rango de otro timbrado del mismo tipo")
                );
              }

              // Insertar el nuevo timbrado
              db.query(
                "INSERT INTO factura (FacturaTimbrado, FacturaDesde, FacturaHasta, FacturaDocumentoTipo) VALUES (?, ?, ?, ?)",
                [FacturaTimbrado, FacturaDesde, FacturaHasta, tipo],
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
      const tipo = facturaData.FacturaDocumentoTipo === "NC" ? "NC" : "FA";

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

      // Verificar si ya existe un timbrado igual del mismo tipo (excluyendo el actual)
      db.query(
        "SELECT COUNT(*) as count FROM factura WHERE FacturaTimbrado = ? AND FacturaDocumentoTipo = ? AND FacturaId != ?",
        [FacturaTimbrado, tipo, id],
        (err, results) => {
          if (err) return reject(err);
          if (results[0].count > 0) {
            return reject(new Error("Ya existe un timbrado igual para este tipo de comprobante"));
          }

          // Verificar si hay superposición de rangos del mismo tipo (excluyendo el actual)
          db.query(
            `SELECT COUNT(*) as count FROM factura
             WHERE FacturaId != ?
             AND FacturaDocumentoTipo = ?
             AND ((FacturaDesde <= ? AND FacturaHasta >= ?)
             OR (FacturaDesde <= ? AND FacturaHasta >= ?)
             OR (FacturaDesde >= ? AND FacturaHasta <= ?))`,
            [
              id,
              tipo,
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
                  new Error("Existe superposición con el rango de otro timbrado del mismo tipo")
                );
              }

              // Actualizar el timbrado
              db.query(
                "UPDATE factura SET FacturaTimbrado = ?, FacturaDesde = ?, FacturaHasta = ?, FacturaDocumentoTipo = ? WHERE FacturaId = ?",
                [FacturaTimbrado, FacturaDesde, FacturaHasta, tipo, id],
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
