const db = require("../config/db");

const Proveedor = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM proveedor ORDER BY ProveedorNombre ASC",
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
        "SELECT * FROM proveedor WHERE ProveedorId = ?",
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
    sortBy = "ProveedorId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ProveedorId",
        "ProveedorRUC",
        "ProveedorNombre",
        "ProveedorDireccion",
        "ProveedorTelefono",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ProveedorId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM proveedor ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM proveedor",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                proveedores: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "ProveedorId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ProveedorId",
        "ProveedorRUC",
        "ProveedorNombre",
        "ProveedorDireccion",
        "ProveedorTelefono",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ProveedorId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM proveedor
        WHERE ProveedorNombre LIKE ? 
        OR ProveedorRUC LIKE ?
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
            SELECT COUNT(*) as total FROM proveedor
            WHERE ProveedorNombre LIKE ? 
            OR ProveedorRUC LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                proveedores: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  create: (proveedorData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO proveedor (
          ProveedorRUC,
          ProveedorNombre,
          ProveedorDireccion,
          ProveedorTelefono
        ) VALUES (?, ?, ?, ?)
      `;
      const values = [
        proveedorData.ProveedorRUC || null,
        proveedorData.ProveedorNombre,
        proveedorData.ProveedorDireccion || null,
        proveedorData.ProveedorTelefono || null,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          ProveedorId: result.insertId,
          ...proveedorData,
        });
      });
    });
  },

  update: (id, proveedorData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "ProveedorRUC",
        "ProveedorNombre",
        "ProveedorDireccion",
        "ProveedorTelefono",
      ];

      camposActualizables.forEach((campo) => {
        if (proveedorData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(proveedorData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null);
      }

      values.push(id);
      const query = `
        UPDATE proveedor 
        SET ${updateFields.join(", ")}
        WHERE ProveedorId = ?
      `;

      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        // Obtener el proveedor actualizado
        Proveedor.getById(id).then(resolve).catch(reject);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM proveedor WHERE ProveedorId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = Proveedor;
