const db = require("../config/db");

const Compra = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT c.*, p.ProveedorNombre, p.ProveedorRUC,
         COALESCE(SUM(cp.CompraProductoPrecio * cp.CompraProductoCantidad), 0) as Total,
         (SELECT AlmacenOrigenId FROM compraproducto WHERE CompraId = c.CompraId LIMIT 1) as AlmacenId
         FROM compra c 
         LEFT JOIN proveedor p ON c.ProveedorId = p.ProveedorId 
         LEFT JOIN compraproducto cp ON c.CompraId = cp.CompraId
         GROUP BY c.CompraId
         ORDER BY c.CompraFecha DESC`,
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
        `SELECT c.*, p.ProveedorNombre, p.ProveedorRUC,
         COALESCE(SUM(cp.CompraProductoPrecio * cp.CompraProductoCantidad), 0) as Total,
         (SELECT AlmacenOrigenId FROM compraproducto WHERE CompraId = c.CompraId LIMIT 1) as AlmacenId
         FROM compra c 
         LEFT JOIN proveedor p ON c.ProveedorId = p.ProveedorId 
         LEFT JOIN compraproducto cp ON c.CompraId = cp.CompraId
         WHERE c.CompraId = ?
         GROUP BY c.CompraId`,
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "CompraId", sortOrder = "DESC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CompraId",
        "CompraFecha",
        "ProveedorId",
        "UsuarioId",
        "CompraFactura",
        "CompraTipo",
        "CompraPagoCompleto",
        "CompraEntrega",
        "ProveedorNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CompraId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const orderByField = sortField === "Total" ? "Total" : `c.${sortField}`;
      db.query(
        `SELECT c.*, p.ProveedorNombre, p.ProveedorRUC, 
         COALESCE(SUM(cp.CompraProductoPrecio * cp.CompraProductoCantidad), 0) as Total,
         (SELECT AlmacenOrigenId FROM compraproducto WHERE CompraId = c.CompraId LIMIT 1) as AlmacenId
         FROM compra c 
         LEFT JOIN proveedor p ON c.ProveedorId = p.ProveedorId 
         LEFT JOIN compraproducto cp ON c.CompraId = cp.CompraId
         GROUP BY c.CompraId
         ORDER BY ${orderByField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM compra",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                compras: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "CompraId", sortOrder = "DESC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CompraId",
        "CompraFecha",
        "ProveedorId",
        "UsuarioId",
        "CompraFactura",
        "CompraTipo",
        "CompraPagoCompleto",
        "CompraEntrega",
        "ProveedorNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CompraId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const orderByField = sortField === "Total" ? "Total" : `c.${sortField}`;
      const searchQuery = `
        SELECT c.*, p.ProveedorNombre, p.ProveedorRUC,
        COALESCE(SUM(cp.CompraProductoPrecio * cp.CompraProductoCantidad), 0) as Total,
        (SELECT AlmacenOrigenId FROM compraproducto WHERE CompraId = c.CompraId LIMIT 1) as AlmacenId
        FROM compra c
        LEFT JOIN proveedor p ON c.ProveedorId = p.ProveedorId
        LEFT JOIN compraproducto cp ON c.CompraId = cp.CompraId
        WHERE c.CompraFactura LIKE ? 
        OR c.CompraTipo LIKE ? 
        OR p.ProveedorNombre LIKE ?
        GROUP BY c.CompraId
        ORDER BY ${orderByField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM compra c
            LEFT JOIN proveedor p ON c.ProveedorId = p.ProveedorId
            WHERE c.CompraFactura LIKE ? 
            OR c.CompraTipo LIKE ? 
            OR p.ProveedorNombre LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                compras: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  create: (compraData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO compra (
          CompraFecha,
          ProveedorId,
          UsuarioId,
          CompraFactura,
          CompraTipo,
          CompraPagoCompleto,
          CompraEntrega
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        compraData.CompraFecha || new Date(),
        compraData.ProveedorId,
        compraData.UsuarioId,
        compraData.CompraFactura,
        compraData.CompraTipo,
        compraData.CompraPagoCompleto || false,
        compraData.CompraEntrega,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({
          CompraId: result.insertId,
          ...compraData,
        });
      });
    });
  },

  update: (id, compraData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "ProveedorId",
        "CompraFactura",
        "CompraTipo",
        "CompraPagoCompleto",
        "CompraEntrega",
      ];

      camposActualizables.forEach((campo) => {
        if (compraData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(compraData[campo]);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null);
      }

      values.push(id);
      const query = `
        UPDATE compra 
        SET ${updateFields.join(", ")}
        WHERE CompraId = ?
      `;

      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        // Obtener la compra actualizada
        Compra.getById(id).then(resolve).catch(reject);
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM compra WHERE CompraId = ?", [id], (err, result) => {
        if (err) return reject(err);
        resolve(result.affectedRows > 0);
      });
    });
  },
};

module.exports = Compra;
