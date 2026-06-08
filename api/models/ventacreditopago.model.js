const db = require("../config/db");

const VentaCreditoPago = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM ventacreditopago", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (ventaCreditoId, pagoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM ventacreditopago WHERE VentaCreditoId = ? AND VentaCreditoPagoId = ?",
        [ventaCreditoId, pagoId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByVentaCreditoId: (ventaCreditoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM ventacreditopago WHERE VentaCreditoId = ?",
        [ventaCreditoId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO ventacreditopago (
        VentaCreditoId,
        VentaCreditoPagoId,
        VentaCreditoPagoFecha,
        VentaCreditoPagoMonto
      ) VALUES (?, ?, ?, ?)`;

      const values = [
        data.VentaCreditoId,
        data.VentaCreditoPagoId,
        data.VentaCreditoPagoFecha,
        data.VentaCreditoPagoMonto,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        VentaCreditoPago.getById(data.VentaCreditoId, data.VentaCreditoPagoId)
          .then((pago) => resolve(pago))
          .catch((error) => reject(error));
      });
    });
  },

  update: (ventaCreditoId, pagoId, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE ventacreditopago SET 
        VentaCreditoPagoFecha = ?,
        VentaCreditoPagoMonto = ?
        WHERE VentaCreditoId = ? AND VentaCreditoPagoId = ?`;

      const values = [
        data.VentaCreditoPagoFecha,
        data.VentaCreditoPagoMonto,
        ventaCreditoId,
        pagoId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        VentaCreditoPago.getById(ventaCreditoId, pagoId)
          .then((pago) => resolve(pago))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (ventaCreditoId, pagoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM ventacreditopago WHERE VentaCreditoId = ? AND VentaCreditoPagoId = ?",
        [ventaCreditoId, pagoId],
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
        "VentaCreditoPagoId",
        "VentaCreditoPagoFecha",
        "VentaCreditoPagoMonto",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "VentaCreditoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM ventacreditopago ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM ventacreditopago",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                pagos: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchPagos: (
    term,
    limit,
    offset,
    sortBy = "VentaCreditoId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaCreditoId",
        "VentaCreditoPagoId",
        "VentaCreditoPagoFecha",
        "VentaCreditoPagoMonto",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "VentaCreditoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM ventacreditopago
        WHERE VentaCreditoId LIKE ?
        OR VentaCreditoPagoId LIKE ?
        OR VentaCreditoPagoFecha LIKE ?
        OR CAST(VentaCreditoPagoMonto AS CHAR) LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      const searchValue = `%${term}%`;
      const values = Array(4).fill(searchValue).concat([limit, offset]);

      db.query(searchQuery, values, (err, results) => {
        if (err) return reject(err);

        const countQuery = `
          SELECT COUNT(*) as total FROM ventacreditopago
          WHERE VentaCreditoId LIKE ?
          OR VentaCreditoPagoId LIKE ?
          OR VentaCreditoPagoFecha LIKE ?
          OR CAST(VentaCreditoPagoMonto AS CHAR) LIKE ?
        `;

        db.query(countQuery, Array(4).fill(searchValue), (err, countResult) => {
          if (err) return reject(err);
          resolve({
            pagos: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },
};

module.exports = VentaCreditoPago;
