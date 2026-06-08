const db = require("../config/db");

const Local = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM local", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM local WHERE LocalId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "LocalId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "LocalId",
        "LocalNombre",
        "LocalTelefono",
        "LocalCelular",
        "LocalDireccion",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "LocalId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM local ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM local",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                locales: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "LocalId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "LocalId",
        "LocalNombre",
        "LocalTelefono",
        "LocalCelular",
        "LocalDireccion",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "LocalId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
      SELECT * FROM local 
      WHERE LocalNombre LIKE ? 
      OR LocalTelefono LIKE ? 
      OR LocalCelular LIKE ? 
      OR LocalDireccion LIKE ?
      OR LocalId LIKE ?
      ORDER BY ${sortField} ${order}
      LIMIT ? OFFSET ?
    `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          searchValue,
          limit,
          offset,
        ],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
          SELECT COUNT(*) as total FROM local 
          WHERE LocalNombre LIKE ? 
          OR LocalTelefono LIKE ? 
          OR LocalCelular LIKE ? 
          OR LocalDireccion LIKE ?
          OR LocalId LIKE ?
        `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                locales: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  create: (localData) => {
    return new Promise((resolve, reject) => {
      const query = `
      INSERT INTO local (
        LocalNombre,
        LocalTelefono,
        LocalCelular,
        LocalDireccion
      ) VALUES (?, ?, ?, ?)
    `;
      const values = [
        localData.LocalNombre,
        localData.LocalTelefono,
        localData.LocalCelular,
        localData.LocalDireccion,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          LocalId: result.insertId,
          ...localData,
        });
      });
    });
  },

  update: (id, localData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "LocalNombre",
        "LocalTelefono",
        "LocalCelular",
        "LocalDireccion",
      ];
      camposActualizables.forEach((campo) => {
        if (localData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(localData[campo]);
        }
      });
      if (updateFields.length === 0) {
        return resolve(null);
      }
      values.push(id);
      const query = `
        UPDATE local 
        SET ${updateFields.join(", ")}
        WHERE LocalId = ?
      `;
      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        const updatedLocal = await Local.getById(id);
        resolve(updatedLocal);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM local WHERE LocalId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },
};

module.exports = Local;
