const db = require("../config/db");

const CompraProducto = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM compraproducto", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (compraId, compraProductoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM compraproducto WHERE CompraId = ? AND CompraProductoId = ?",
        [compraId, compraProductoId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByCompraId: (compraId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          cp.*,
          p.ProductoNombre,
          p.ProductoCodigo,
          p.ProductoPrecioVenta,
          p.ProductoIVA
        FROM compraproducto cp
        LEFT JOIN producto p ON cp.ProductoId = p.ProductoId
        WHERE cp.CompraId = ?
      `;

      db.query(query, [compraId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO compraproducto (
        CompraId,
        CompraProductoId,
        ProductoId,
        CompraProductoCantidad,
        CompraProductoCantidadUnidad,
        CompraProductoBonificacion,
        CompraProductoPrecio,
        AlmacenOrigenId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        data.CompraId,
        data.CompraProductoId,
        data.ProductoId,
        data.CompraProductoCantidad,
        data.CompraProductoCantidadUnidad || "U",
        data.CompraProductoBonificacion || 0,
        data.CompraProductoPrecio,
        data.AlmacenOrigenId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        CompraProducto.getById(data.CompraId, data.CompraProductoId)
          .then((compraProducto) => resolve(compraProducto))
          .catch((error) => reject(error));
      });
    });
  },

  createMultiple: (compraProductos) => {
    return new Promise(async (resolve, reject) => {
      if (!compraProductos || compraProductos.length === 0) {
        return resolve([]);
      }

      const query = `
        INSERT INTO compraproducto (
          CompraId,
          CompraProductoId,
          ProductoId,
          CompraProductoCantidad,
          CompraProductoCantidadUnidad,
          CompraProductoBonificacion,
          CompraProductoPrecio,
          AlmacenOrigenId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      try {
        // Insertar cada producto individualmente para asegurar que todos se inserten
        const resultados = [];
        for (const cp of compraProductos) {
          const values = [
            cp.CompraId,
            cp.CompraProductoId,
            cp.ProductoId,
            cp.CompraProductoCantidad,
            cp.CompraProductoCantidadUnidad || "U",
            cp.CompraProductoBonificacion || 0,
            cp.CompraProductoPrecio,
            cp.AlmacenOrigenId,
          ];

          await new Promise((resolveInsert, rejectInsert) => {
            db.query(query, values, (err, result) => {
              if (err) return rejectInsert(err);
              resolveInsert(result);
            });
          });

          resultados.push(cp);
        }
        resolve(resultados);
      } catch (error) {
        reject(error);
      }
    });
  },

  deleteByCompraId: (compraId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM compraproducto WHERE CompraId = ?",
        [compraId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  update: (compraId, compraProductoId, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE compraproducto SET 
        ProductoId = ?,
        CompraProductoCantidad = ?,
        CompraProductoCantidadUnidad = ?,
        CompraProductoBonificacion = ?,
        CompraProductoPrecio = ?,
        AlmacenOrigenId = ?
        WHERE CompraId = ? AND CompraProductoId = ?`;

      const values = [
        data.ProductoId,
        data.CompraProductoCantidad,
        data.CompraProductoCantidadUnidad || "U",
        data.CompraProductoBonificacion || 0,
        data.CompraProductoPrecio,
        data.AlmacenOrigenId,
        compraId,
        compraProductoId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        CompraProducto.getById(compraId, compraProductoId)
          .then((compraProducto) => resolve(compraProducto))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (compraId, compraProductoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM compraproducto WHERE CompraId = ? AND CompraProductoId = ?",
        [compraId, compraProductoId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "CompraId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CompraId",
        "CompraProductoId",
        "ProductoId",
        "CompraProductoCantidad",
        "CompraProductoCantidadUnidad",
        "CompraProductoBonificacion",
        "CompraProductoPrecio",
        "AlmacenOrigenId",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CompraId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM compraproducto ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM compraproducto",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                compraProductos: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchCompraProductos: (
    term,
    limit,
    offset,
    sortBy = "CompraId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "CompraId",
        "CompraProductoId",
        "ProductoId",
        "CompraProductoCantidad",
        "CompraProductoCantidadUnidad",
        "CompraProductoBonificacion",
        "CompraProductoPrecio",
        "AlmacenOrigenId",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "CompraId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM compraproducto
        WHERE CompraId LIKE ?
        OR CompraProductoId LIKE ?
        OR ProductoId LIKE ?
        OR CAST(CompraProductoCantidad AS CHAR) LIKE ?
        OR CompraProductoCantidadUnidad LIKE ?
        OR CAST(CompraProductoBonificacion AS CHAR) LIKE ?
        OR CAST(CompraProductoPrecio AS CHAR) LIKE ?
        OR CAST(AlmacenOrigenId AS CHAR) LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      const searchValue = `%${term}%`;
      const values = Array(8).fill(searchValue).concat([limit, offset]);

      db.query(searchQuery, values, (err, results) => {
        if (err) return reject(err);

        const countQuery = `
          SELECT COUNT(*) as total FROM compraproducto
          WHERE CompraId LIKE ?
          OR CompraProductoId LIKE ?
          OR ProductoId LIKE ?
          OR CAST(CompraProductoCantidad AS CHAR) LIKE ?
          OR CompraProductoCantidadUnidad LIKE ?
          OR CAST(CompraProductoBonificacion AS CHAR) LIKE ?
          OR CAST(CompraProductoPrecio AS CHAR) LIKE ?
          OR CAST(AlmacenOrigenId AS CHAR) LIKE ?
        `;

        db.query(countQuery, Array(8).fill(searchValue), (err, countResult) => {
          if (err) return reject(err);
          resolve({
            compraProductos: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },
};

module.exports = CompraProducto;
