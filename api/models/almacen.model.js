const db = require("../config/db");

const Almacen = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM Almacen", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM Almacen WHERE AlmacenId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (almacenData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO Almacen (AlmacenNombre) VALUES (?)`;
      db.query(query, [almacenData.AlmacenNombre], (err, result) => {
        if (err) return reject(err);
        Almacen.getById(result.insertId)
          .then((almacen) => resolve(almacen))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, almacenData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE Almacen SET AlmacenNombre = ? WHERE AlmacenId = ?`;
      db.query(query, [almacenData.AlmacenNombre, id], (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Almacen.getById(id)
          .then((almacen) => resolve(almacen))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM Almacen WHERE AlmacenId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "AlmacenId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = ["AlmacenId", "AlmacenNombre"];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "AlmacenId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM Almacen ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM Almacen",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                almacenes: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchAlmacenes: (
    term,
    limit,
    offset,
    sortBy = "AlmacenId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = ["AlmacenId", "AlmacenNombre"];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "AlmacenId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM Almacen
        WHERE AlmacenNombre LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(searchQuery, [searchValue, limit, offset], (err, results) => {
        if (err) return reject(err);

        const countQuery = `
            SELECT COUNT(*) as total FROM Almacen
            WHERE AlmacenNombre LIKE ?
          `;
        db.query(countQuery, [searchValue], (err, countResult) => {
          if (err) return reject(err);
          resolve({
            almacenes: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },
};

module.exports = Almacen;
