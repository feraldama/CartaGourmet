const db = require("../config/db");

const VentaCredito = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM ventacredito", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM ventacredito WHERE VentaCreditoId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByVentaId: (ventaId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM ventacredito WHERE VentaId = ?",
        [ventaId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO ventacredito (
        VentaId,
        VentaCreditoPagoCant
      ) VALUES (?, ?)`;

      const values = [data.VentaId, data.VentaCreditoPagoCant];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        VentaCredito.getById(result.insertId)
          .then((ventaCredito) => resolve(ventaCredito))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE ventacredito SET 
        VentaId = ?,
        VentaCreditoPagoCant = ?
        WHERE VentaCreditoId = ?`;

      const values = [data.VentaId, data.VentaCreditoPagoCant, id];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        VentaCredito.getById(id)
          .then((ventaCredito) => resolve(ventaCredito))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM ventacredito WHERE VentaCreditoId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "VentaCreditoId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaCreditoId",
        "VentaId",
        "VentaCreditoPagoCant",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "VentaCreditoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM ventacredito ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM ventacredito",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                ventaCreditos: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchVentaCreditos: (
    term,
    limit,
    offset,
    sortBy = "VentaCreditoId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaCreditoId",
        "VentaId",
        "VentaCreditoPagoCant",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "VentaCreditoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM ventacredito
        WHERE VentaCreditoId LIKE ?
        OR VentaId LIKE ?
        OR CAST(VentaCreditoPagoCant AS CHAR) LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      const searchValue = `%${term}%`;
      const values = Array(3).fill(searchValue).concat([limit, offset]);

      db.query(searchQuery, values, (err, results) => {
        if (err) return reject(err);

        const countQuery = `
          SELECT COUNT(*) as total FROM ventacredito
          WHERE VentaCreditoId LIKE ?
          OR VentaId LIKE ?
          OR CAST(VentaCreditoPagoCant AS CHAR) LIKE ?
        `;

        db.query(countQuery, Array(3).fill(searchValue), (err, countResult) => {
          if (err) return reject(err);
          resolve({
            ventaCreditos: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },
};

module.exports = VentaCredito;
