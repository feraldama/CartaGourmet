const db = require("../config/db");

const TipoGasto = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM tipogasto", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM TipoGasto WHERE TipoGastoId = ?",
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
      const query = `INSERT INTO TipoGasto (TipoGastoDescripcion, TipoGastoCantGastos) VALUES (?, ?)`;
      const values = [data.TipoGastoDescripcion, data.TipoGastoCantGastos];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        TipoGasto.getById(result.insertId)
          .then((tipoGasto) => resolve(tipoGasto))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE TipoGasto SET TipoGastoDescripcion = ?, TipoGastoCantGastos = ? WHERE TipoGastoId = ?`;
      const values = [data.TipoGastoDescripcion, data.TipoGastoCantGastos, id];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        TipoGasto.getById(id)
          .then((tipoGasto) => resolve(tipoGasto))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM TipoGasto WHERE TipoGastoId = ?",
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
    sortBy = "TipoGastoId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "TipoGastoId",
        "TipoGastoDescripcion",
        "TipoGastoCantGastos",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TipoGastoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM TipoGasto ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM TipoGasto",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                tipoGastos: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchTipoGastos: (
    term,
    limit,
    offset,
    sortBy = "TipoGastoId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "TipoGastoId",
        "TipoGastoDescripcion",
        "TipoGastoCantGastos",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "TipoGastoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM TipoGasto
        WHERE TipoGastoDescripcion LIKE ?
        OR CAST(TipoGastoCantGastos AS CHAR) LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM TipoGasto
            WHERE TipoGastoDescripcion LIKE ?
            OR CAST(TipoGastoCantGastos AS CHAR) LIKE ?
          `;
          db.query(
            countQuery,
            [searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);
              resolve({
                tipoGastos: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },
};

module.exports = TipoGasto;
