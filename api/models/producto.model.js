const db = require("../config/db");

const Producto = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM producto", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT p.*, l.LocalNombre FROM producto p LEFT JOIN local l ON p.LocalId = l.LocalId WHERE p.ProductoId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          const producto = results.length > 0 ? results[0] : null;
          if (!producto) return resolve(null);
          db.query(
            `SELECT pa.ProductoId, pa.AlmacenId, pa.ProductoAlmacenStock, pa.ProductoAlmacenStockUnitario, a.AlmacenNombre
             FROM productoalmacen pa
             LEFT JOIN Almacen a ON pa.AlmacenId = a.AlmacenId
             WHERE pa.ProductoId = ?`,
            [id],
            (errAlmacen, rowsAlmacen) => {
              if (errAlmacen) return reject(errAlmacen);
              producto.productoAlmacen = rowsAlmacen || [];
              resolve(producto);
            }
          );
        }
      );
    });
  },

  getAllPaginated: (
    limit,
    offset,
    sortBy = "ProductoId",
    sortOrder = "ASC",
    localId = null
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ProductoId",
        "ProductoCodigo",
        "ProductoNombre",
        "ProductoPrecioVenta",
        "ProductoPrecioVentaMayorista",
        "ProductoPrecioUnitario",
        "ProductoPrecioPromedio",
        "ProductoStock",
        "ProductoStockUnitario",
        "ProductoCantidadCaja",
        "ProductoIVA",
        "ProductoStockMinimo",
        "ProductoImagen",
        "ProductoImagen_GXI",
        "LocalId",
        "LocalNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ProductoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const orderByField =
        sortField === "ProductoStock" || sortField === "ProductoStockUnitario"
          ? sortField
          : `p.${sortField}`;

      // Ahora el stock total viene directamente de la tabla producto
      const queryPaginated = `
        SELECT p.*, l.LocalNombre
        FROM producto p
        LEFT JOIN local l ON p.LocalId = l.LocalId
        ORDER BY ${orderByField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(queryPaginated, [limit, offset], (err, results) => {
        if (err) return reject(err);

        db.query(
          "SELECT COUNT(*) as total FROM producto",
          (err, countResult) => {
            if (err) return reject(err);

            resolve({
              productos: results,
              total: countResult[0].total,
            });
          }
        );
      });
    });
  },

  search: (
    term,
    limit,
    offset,
    sortBy = "ProductoId",
    sortOrder = "ASC",
    localId = null
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ProductoId",
        "ProductoCodigo",
        "ProductoNombre",
        "ProductoPrecioVenta",
        "ProductoPrecioVentaMayorista",
        "ProductoPrecioUnitario",
        "ProductoPrecioPromedio",
        "ProductoStock",
        "ProductoStockUnitario",
        "ProductoCantidadCaja",
        "ProductoIVA",
        "ProductoStockMinimo",
        "ProductoImagen",
        "ProductoImagen_GXI",
        "LocalId",
        "LocalNombre",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ProductoId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const orderByField =
        sortField === "ProductoStock" || sortField === "ProductoStockUnitario"
          ? sortField
          : `p.${sortField}`;

      // En búsqueda también usamos el stock directo de producto
      const searchQuery = `
        SELECT p.*, l.LocalNombre
        FROM producto p
        LEFT JOIN local l ON p.LocalId = l.LocalId
        WHERE p.ProductoNombre LIKE ? 
        OR p.ProductoCodigo LIKE ? 
        OR l.LocalNombre LIKE ?
        ORDER BY ${orderByField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;
      const searchParams = [
        searchValue,
        searchValue,
        searchValue,
        limit,
        offset,
      ];

      db.query(searchQuery, searchParams, (err, results) => {
        if (err) return reject(err);

        const countQuery = `
            SELECT COUNT(*) as total FROM producto p
            LEFT JOIN local l ON p.LocalId = l.LocalId
            WHERE p.ProductoNombre LIKE ? 
            OR p.ProductoCodigo LIKE ? 
            OR l.LocalNombre LIKE ?
          `;

        db.query(
          countQuery,
          [searchValue, searchValue, searchValue],
          (err, countResult) => {
            if (err) return reject(err);

            resolve({
              productos: results,
              total: countResult[0]?.total || 0,
            });
          }
        );
      });
    });
  },

  create: (productoData) => {
    return new Promise((resolve, reject) => {
      const imagenBuffer = productoData.ProductoImagen
        ? Buffer.from(productoData.ProductoImagen, "base64")
        : Buffer.from([]);
      const query = `
        INSERT INTO producto (
          ProductoCodigo,
          ProductoNombre,
          ProductoPrecioVenta,
          ProductoPrecioVentaMayorista,
          ProductoPrecioUnitario,
          ProductoPrecioPromedio,
          ProductoStock,
          ProductoStockUnitario,
          ProductoCantidadCaja,
          ProductoIVA,
          ProductoStockMinimo,
          ProductoImagen,
          ProductoImagen_GXI,
          LocalId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        productoData.ProductoCodigo,
        productoData.ProductoNombre,
        productoData.ProductoPrecioVenta,
        productoData.ProductoPrecioVentaMayorista,
        productoData.ProductoPrecioUnitario,
        productoData.ProductoPrecioPromedio,
        productoData.ProductoStock,
        productoData.ProductoStockUnitario,
        productoData.ProductoCantidadCaja,
        productoData.ProductoIVA,
        productoData.ProductoStockMinimo,
        imagenBuffer,
        productoData.ProductoImagen_GXI || null,
        productoData.LocalId,
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        const productoId = result.insertId;
        const productoAlmacen =
          productoData.productoAlmacen &&
          Array.isArray(productoData.productoAlmacen)
            ? productoData.productoAlmacen
            : [];
        if (productoAlmacen.length > 0) {
          const placeholders = productoAlmacen
            .map(() => "(?, ?, ?, ?)")
            .join(", ");
          const insertValues = productoAlmacen.flatMap((pa) => [
            productoId,
            pa.AlmacenId,
            pa.ProductoAlmacenStock ?? 0,
            pa.ProductoAlmacenStockUnitario ?? 0,
          ]);
          db.query(
            `INSERT INTO productoalmacen (ProductoId, AlmacenId, ProductoAlmacenStock, ProductoAlmacenStockUnitario) VALUES ${placeholders}`,
            insertValues,
            (errPa) => {
              if (errPa) return reject(errPa);
              resolve({
                ProductoId: productoId,
                ...productoData,
              });
            }
          );
        } else {
          resolve({
            ProductoId: productoId,
            ...productoData,
          });
        }
      });
    });
  },

  update: (id, productoData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "ProductoCodigo",
        "ProductoNombre",
        "ProductoPrecioVenta",
        "ProductoPrecioVentaMayorista",
        "ProductoPrecioUnitario",
        "ProductoPrecioPromedio",
        "ProductoStock",
        "ProductoStockUnitario",
        "ProductoCantidadCaja",
        "ProductoIVA",
        "ProductoStockMinimo",
        "ProductoImagen",
        "ProductoImagen_GXI",
        "LocalId",
      ];
      camposActualizables.forEach((campo) => {
        if (campo === "ProductoImagen_GXI") {
          updateFields.push(`${campo} = ?`);
          values.push(productoData.ProductoImagen_GXI || null);
        } else if (campo === "ProductoImagen") {
          const imagenBuffer = productoData.ProductoImagen
            ? Buffer.from(productoData.ProductoImagen, "base64")
            : null;
          updateFields.push(`${campo} = ?`);
          values.push(imagenBuffer);
        } else if (productoData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          values.push(productoData[campo]);
        }
      });
      const productoAlmacen =
        productoData.productoAlmacen &&
        Array.isArray(productoData.productoAlmacen)
          ? productoData.productoAlmacen
          : undefined;

      const syncProductoAlmacen = (callback) => {
        // Si no se envía productoAlmacen desde el front, no tocamos el detalle.
        if (productoAlmacen === undefined) return callback();

        // Si se envía un array vacío, tampoco borramos filas para no violar FKs.
        if (productoAlmacen.length === 0) return callback();

        const placeholders = productoAlmacen
          .map(() => "(?, ?, ?, ?)")
          .join(", ");

        const insertValues = productoAlmacen.flatMap((pa) => [
          id,
          pa.AlmacenId,
          pa.ProductoAlmacenStock ?? 0,
          pa.ProductoAlmacenStockUnitario ?? 0,
        ]);

        // Usamos UPSERT para solo actualizar stock, sin borrar ni cambiar claves.
        const upsertQuery = `
          INSERT INTO productoalmacen (
            ProductoId,
            AlmacenId,
            ProductoAlmacenStock,
            ProductoAlmacenStockUnitario
          ) VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            ProductoAlmacenStock = VALUES(ProductoAlmacenStock),
            ProductoAlmacenStockUnitario = VALUES(ProductoAlmacenStockUnitario)
        `;

        db.query(upsertQuery, insertValues, (errPa) => {
          if (errPa) return reject(errPa);
          callback();
        });
      };

      if (updateFields.length === 0) {
        if (productoAlmacen === undefined) return resolve(null);
        syncProductoAlmacen(() =>
          Producto.getById(id).then(resolve).catch(reject)
        );
        return;
      }
      values.push(id);
      const query = `
        UPDATE producto 
        SET ${updateFields.join(", ")}
        WHERE ProductoId = ?
      `;
      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        syncProductoAlmacen(() =>
          Producto.getById(id).then(resolve).catch(reject)
        );
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM producto WHERE ProductoId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  getReporteStock: () => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          p.ProductoId,
          p.ProductoCodigo,
          p.ProductoNombre,
          COALESCE(p.ProductoStock, 0) AS ProductoStock,
          COALESCE(p.ProductoStockUnitario, 0) AS ProductoStockUnitario,
          pa.AlmacenId,
          a.AlmacenNombre,
          COALESCE(pa.ProductoAlmacenStock, 0) AS ProductoAlmacenStock,
          COALESCE(pa.ProductoAlmacenStockUnitario, 0) AS ProductoAlmacenStockUnitario
        FROM producto p
        LEFT JOIN productoalmacen pa ON p.ProductoId = pa.ProductoId
        LEFT JOIN Almacen a ON pa.AlmacenId = a.AlmacenId
        ORDER BY p.ProductoCodigo, a.AlmacenNombre
      `;
      db.query(query, [], (err, rows) => {
        if (err) return reject(err);
        const byProduct = {};
        rows.forEach((row) => {
          const id = row.ProductoId;
          if (!byProduct[id]) {
            byProduct[id] = {
              ProductoId: row.ProductoId,
              ProductoCodigo: row.ProductoCodigo,
              ProductoNombre: row.ProductoNombre,
              // Usar directamente los valores de la tabla producto
              ProductoStock: Number(row.ProductoStock) || 0,
              ProductoStockUnitario: Number(row.ProductoStockUnitario) || 0,
              productoAlmacen: [],
            };
          }
          const totalStock = Number(row.ProductoAlmacenStock) || 0;
          const totalUnit = Number(row.ProductoAlmacenStockUnitario) || 0;
          if (row.AlmacenId != null) {
            byProduct[id].productoAlmacen.push({
              AlmacenNombre: row.AlmacenNombre || "",
              ProductoAlmacenStock: totalStock,
              ProductoAlmacenStockUnitario: totalUnit,
            });
          }
        });
        const productos = Object.values(byProduct);
        resolve({ productos });
      });
    });
  },
};

module.exports = Producto;
