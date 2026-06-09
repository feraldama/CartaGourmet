const db = require("../config/db");

/**
 * Construye la cláusula WHERE para filtros de compras.
 * - Tipo (CO/CR)
 * - Proveedor (ProveedorId)
 * - Almacén: usa EXISTS contra compraproducto porque AlmacenId de la compra
 *   se deriva del primer producto; una compra puede tener productos en
 *   distintos almacenes, así que filtramos por "tiene al menos un producto
 *   en este almacén".
 * - Rango de fechas sobre CompraFecha.
 */
function buildCompraFiltersWhere(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.tipo) {
    conditions.push("c.CompraTipo = ?");
    params.push(filters.tipo);
  }
  if (filters.proveedorId) {
    conditions.push("c.ProveedorId = ?");
    params.push(Number(filters.proveedorId));
  }
  if (filters.almacenId) {
    conditions.push(
      "EXISTS (SELECT 1 FROM compraproducto cpf WHERE cpf.CompraId = c.CompraId AND cpf.AlmacenOrigenId = ?)"
    );
    params.push(Number(filters.almacenId));
  }
  if (filters.fechaDesde) {
    conditions.push("DATE(c.CompraFecha) >= ?");
    params.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    conditions.push("DATE(c.CompraFecha) <= ?");
    params.push(filters.fechaHasta);
  }

  return { conditions, params };
}

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
         GROUP BY c.CompraId, p.ProveedorId, p.ProveedorId
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
         GROUP BY c.CompraId, p.ProveedorId, p.ProveedorId`,
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
    sortBy = "CompraId",
    sortOrder = "DESC",
    filters = {}
  ) => {
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
      const { conditions, params: filterParams } =
        buildCompraFiltersWhere(filters);
      const whereSql = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      db.query(
        `SELECT c.*, p.ProveedorNombre, p.ProveedorRUC,
         COALESCE(SUM(cp.CompraProductoPrecio * cp.CompraProductoCantidad), 0) as Total,
         (SELECT AlmacenOrigenId FROM compraproducto WHERE CompraId = c.CompraId LIMIT 1) as AlmacenId
         FROM compra c
         LEFT JOIN proveedor p ON c.ProveedorId = p.ProveedorId
         LEFT JOIN compraproducto cp ON c.CompraId = cp.CompraId
         ${whereSql}
         GROUP BY c.CompraId, p.ProveedorId, p.ProveedorId
         ORDER BY ${orderByField} ${order} LIMIT ? OFFSET ?`,
        [...filterParams, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(DISTINCT c.CompraId) as total
            FROM compra c
            LEFT JOIN proveedor p ON c.ProveedorId = p.ProveedorId
            ${whereSql}`;

          db.query(countQuery, filterParams, (err, countResult) => {
            if (err) return reject(err);

            resolve({
              compras: results,
              total: countResult[0].total,
            });
          });
        }
      );
    });
  },

  search: (
    term,
    limit,
    offset,
    sortBy = "CompraId",
    sortOrder = "DESC",
    filters = {}
  ) => {
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
      const { conditions: filterConditions, params: filterParams } =
        buildCompraFiltersWhere(filters);
      const filtersAndClause = filterConditions.length
        ? ` AND ${filterConditions.join(" AND ")}`
        : "";

      const searchQuery = `
        SELECT c.*, p.ProveedorNombre, p.ProveedorRUC,
        COALESCE(SUM(cp.CompraProductoPrecio * cp.CompraProductoCantidad), 0) as Total,
        (SELECT AlmacenOrigenId FROM compraproducto WHERE CompraId = c.CompraId LIMIT 1) as AlmacenId
        FROM compra c
        LEFT JOIN proveedor p ON c.ProveedorId = p.ProveedorId
        LEFT JOIN compraproducto cp ON c.CompraId = cp.CompraId
        WHERE (c.CompraFactura LIKE ?
          OR c.CompraTipo LIKE ?
          OR p.ProveedorNombre LIKE ?)${filtersAndClause}
        GROUP BY c.CompraId, p.ProveedorId
        ORDER BY ${orderByField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;
      const searchParams = [searchValue, searchValue, searchValue];

      db.query(
        searchQuery,
        [...searchParams, ...filterParams, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(DISTINCT c.CompraId) as total FROM compra c
            LEFT JOIN proveedor p ON c.ProveedorId = p.ProveedorId
            WHERE (c.CompraFactura LIKE ?
              OR c.CompraTipo LIKE ?
              OR p.ProveedorNombre LIKE ?)${filtersAndClause}
          `;

          db.query(
            countQuery,
            [...searchParams, ...filterParams],
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
