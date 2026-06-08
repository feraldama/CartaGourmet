const db = require("../config/db");

const VentaProducto = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM ventaproducto", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (ventaId, productoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM ventaproducto WHERE VentaId = ? AND VentaProductoId = ?",
        [ventaId, productoId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByVentaId: (ventaId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          vp.*,
          p.ProductoNombre,
          p.ProductoCodigo,
          p.ProductoPrecioVenta,
          p.ProductoIVA
        FROM ventaproducto vp
        LEFT JOIN producto p ON vp.ProductoId = p.ProductoId
        WHERE vp.VentaId = ?
      `;

      db.query(query, [ventaId], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      const query = `INSERT INTO ventaproducto (
        VentaId,
        VentaProductoId,
        ProductoId,
        VentaProductoPrecioPromedio,
        VentaProductoCantidad,
        VentaProductoPrecio,
        VentaProductoPrecioTotal,
        VentaProductoUnitario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        data.VentaId,
        data.VentaProductoId,
        data.ProductoId,
        data.VentaProductoPrecioPromedio,
        data.VentaProductoCantidad,
        data.VentaProductoPrecio,
        data.VentaProductoPrecioTotal,
        data.VentaProductoUnitario,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        VentaProducto.getById(data.VentaId, data.VentaProductoId)
          .then((ventaProducto) => resolve(ventaProducto))
          .catch((error) => reject(error));
      });
    });
  },

  update: (ventaId, productoId, data) => {
    return new Promise((resolve, reject) => {
      const query = `UPDATE ventaproducto SET 
        ProductoId = ?,
        VentaProductoPrecioPromedio = ?,
        VentaProductoCantidad = ?,
        VentaProductoPrecio = ?,
        VentaProductoPrecioTotal = ?,
        VentaProductoUnitario = ?
        WHERE VentaId = ? AND VentaProductoId = ?`;

      const values = [
        data.ProductoId,
        data.VentaProductoPrecioPromedio,
        data.VentaProductoCantidad,
        data.VentaProductoPrecio,
        data.VentaProductoPrecioTotal,
        data.VentaProductoUnitario,
        ventaId,
        productoId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) return resolve(null);
        VentaProducto.getById(ventaId, productoId)
          .then((ventaProducto) => resolve(ventaProducto))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (ventaId, productoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM ventaproducto WHERE VentaId = ? AND VentaProductoId = ?",
        [ventaId, productoId],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "VentaId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaId",
        "VentaProductoId",
        "ProductoId",
        "VentaProductoPrecioPromedio",
        "VentaProductoCantidad",
        "VentaProductoPrecio",
        "VentaProductoPrecioTotal",
        "VentaProductoUnitario",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "VentaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM ventaproducto ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM ventaproducto",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                ventaProductos: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  searchVentaProductos: (
    term,
    limit,
    offset,
    sortBy = "VentaId",
    sortOrder = "ASC"
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "VentaId",
        "VentaProductoId",
        "ProductoId",
        "VentaProductoPrecioPromedio",
        "VentaProductoCantidad",
        "VentaProductoPrecio",
        "VentaProductoPrecioTotal",
        "VentaProductoUnitario",
      ];

      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "VentaId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM ventaproducto
        WHERE VentaId LIKE ?
        OR VentaProductoId LIKE ?
        OR ProductoId LIKE ?
        OR CAST(VentaProductoPrecioPromedio AS CHAR) LIKE ?
        OR CAST(VentaProductoCantidad AS CHAR) LIKE ?
        OR CAST(VentaProductoPrecio AS CHAR) LIKE ?
        OR CAST(VentaProductoPrecioTotal AS CHAR) LIKE ?
        OR CAST(VentaProductoUnitario AS CHAR) LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      const searchValue = `%${term}%`;
      const values = Array(8).fill(searchValue).concat([limit, offset]);

      db.query(searchQuery, values, (err, results) => {
        if (err) return reject(err);

        const countQuery = `
          SELECT COUNT(*) as total FROM ventaproducto
          WHERE VentaId LIKE ?
          OR VentaProductoId LIKE ?
          OR ProductoId LIKE ?
          OR CAST(VentaProductoPrecioPromedio AS CHAR) LIKE ?
          OR CAST(VentaProductoCantidad AS CHAR) LIKE ?
          OR CAST(VentaProductoPrecio AS CHAR) LIKE ?
          OR CAST(VentaProductoPrecioTotal AS CHAR) LIKE ?
          OR CAST(VentaProductoUnitario AS CHAR) LIKE ?
        `;

        db.query(countQuery, Array(8).fill(searchValue), (err, countResult) => {
          if (err) return reject(err);
          resolve({
            ventaProductos: results,
            total: countResult[0]?.total || 0,
          });
        });
      });
    });
  },
};

module.exports = VentaProducto;
