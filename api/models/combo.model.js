const db = require("../config/db");

const Combo = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM combo", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM combo WHERE ComboId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  create: (comboData) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO combo (ComboDescripcion, ProductoId, ComboCantidad, ComboPrecio) VALUES (?, ?, ?, ?)`;
      const values = [
        comboData.ComboDescripcion || "",
        comboData.ProductoId,
        comboData.ComboCantidad,
        comboData.ComboPrecio,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        Combo.getById(result.insertId)
          .then((combo) => resolve(combo))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, comboData) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE combo SET ComboDescripcion = ?, ProductoId = ?, ComboCantidad = ?, ComboPrecio = ? WHERE ComboId = ?`;
      const values = [
        comboData.ComboDescripcion || "",
        comboData.ProductoId,
        comboData.ComboCantidad,
        comboData.ComboPrecio,
        id,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        Combo.getById(id)
          .then((combo) => resolve(combo))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM combo WHERE ComboId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },

  getAllPaginated: (limit, offset, sortBy = "ComboId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ComboId",
        "ComboDescripcion",
        "ProductoId",
        "ComboCantidad",
        "ComboPrecio",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "ComboId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM combo ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM combo",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                combos: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "ComboId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ComboId",
        "ComboDescripcion",
        "ProductoId",
        "ComboCantidad",
        "ComboPrecio",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "ComboId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT c.ComboId, c.ComboDescripcion, c.ProductoId, c.ComboCantidad, c.ComboPrecio, p.ProductoNombre
        FROM combo c
        LEFT JOIN producto p ON c.ProductoId = p.ProductoId
        WHERE c.ComboDescripcion LIKE ? OR p.ProductoNombre LIKE ?
        ORDER BY c.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total
            FROM combo c
            LEFT JOIN producto p ON c.ProductoId = p.ProductoId
            WHERE c.ComboDescripcion LIKE ? OR p.ProductoNombre LIKE ?
          `;
          db.query(
            countQuery,
            [searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                combos: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },
};

module.exports = Combo;
