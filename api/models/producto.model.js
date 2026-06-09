const db = require("../config/db");

/**
 * Columnas "livianas" de producto para listados/búsqueda: omite el BLOB
 * `ProductoImagen` (que se sirve via endpoint binario dedicado) y agrega
 * `HasImagen` como booleano para que el cliente sepa si pedir la URL o
 * mostrar el logo por defecto.
 */
const PRODUCTO_LIST_COLS = `
  p.ProductoId, p.ProductoCodigo, p.ProductoNombre,
  p.ProductoPrecioVenta, p.ProductoPrecioVentaMayorista,
  p.ProductoPrecioUnitario, p.ProductoPrecioPromedio,
  p.ProductoStock, p.ProductoStockUnitario,
  p.ProductoCantidadCaja, p.ProductoIVA,
  p.ProductoStockMinimo, p.ProductoImagen_GXI,
  p.LocalId,
  (LENGTH(p.ProductoImagen) > 0) AS HasImagen
`;

/**
 * Construye la cláusula WHERE para filtros de productos.
 * - localId (Local FK)
 * - stockMin / stockMax: rango sobre ProductoStock
 * - precioMin / precioMax: rango sobre ProductoPrecioVenta
 */
function buildProductoFiltersWhere(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.localId != null && filters.localId !== "") {
    conditions.push("p.LocalId = ?");
    params.push(Number(filters.localId));
  }
  if (filters.localIdOrZero != null && filters.localIdOrZero !== "") {
    conditions.push("(p.LocalId = ? OR p.LocalId = 0)");
    params.push(Number(filters.localIdOrZero));
  }
  if (filters.stockMin != null && filters.stockMin !== "") {
    conditions.push("COALESCE(p.ProductoStock, 0) >= ?");
    params.push(Number(filters.stockMin));
  }
  if (filters.stockMax != null && filters.stockMax !== "") {
    conditions.push("COALESCE(p.ProductoStock, 0) <= ?");
    params.push(Number(filters.stockMax));
  }
  if (filters.precioMin != null && filters.precioMin !== "") {
    conditions.push("COALESCE(p.ProductoPrecioVenta, 0) >= ?");
    params.push(Number(filters.precioMin));
  }
  if (filters.precioMax != null && filters.precioMax !== "") {
    conditions.push("COALESCE(p.ProductoPrecioVenta, 0) <= ?");
    params.push(Number(filters.precioMax));
  }

  return { conditions, params };
}

const Producto = {
  getAll: (filters = {}) => {
    return new Promise((resolve, reject) => {
      const { conditions, params: filterParams } =
        buildProductoFiltersWhere(filters);
      const whereSql = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";
      db.query(
        `SELECT ${PRODUCTO_LIST_COLS} FROM producto p ${whereSql}`,
        filterParams,
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
    filters = {}
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

      const { conditions, params: filterParams } =
        buildProductoFiltersWhere(filters);
      const whereSql = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const queryPaginated = `
        SELECT ${PRODUCTO_LIST_COLS}, l.LocalNombre
        FROM producto p
        LEFT JOIN local l ON p.LocalId = l.LocalId
        ${whereSql}
        ORDER BY ${orderByField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(
        queryPaginated,
        [...filterParams, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM producto p
            LEFT JOIN local l ON p.LocalId = l.LocalId
            ${whereSql}`;

          db.query(countQuery, filterParams, (err, countResult) => {
            if (err) return reject(err);

            resolve({
              productos: results,
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
    sortBy = "ProductoId",
    sortOrder = "ASC",
    filters = {}
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

      const { conditions: filterConditions, params: filterParams } =
        buildProductoFiltersWhere(filters);
      const filtersAndClause = filterConditions.length
        ? ` AND ${filterConditions.join(" AND ")}`
        : "";

      const searchQuery = `
        SELECT ${PRODUCTO_LIST_COLS}, l.LocalNombre
        FROM producto p
        LEFT JOIN local l ON p.LocalId = l.LocalId
        WHERE (p.ProductoNombre LIKE ?
          OR p.ProductoCodigo LIKE ?
          OR l.LocalNombre LIKE ?)${filtersAndClause}
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
            SELECT COUNT(*) as total FROM producto p
            LEFT JOIN local l ON p.LocalId = l.LocalId
            WHERE (p.ProductoNombre LIKE ?
              OR p.ProductoCodigo LIKE ?
              OR l.LocalNombre LIKE ?)${filtersAndClause}
          `;

          db.query(
            countQuery,
            [...searchParams, ...filterParams],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                productos: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
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
        if (productoData[campo] === undefined) return;
        if (campo === "ProductoImagen") {
          // Cadena vacía = "sin cambios de imagen". La columna es NOT NULL,
          // así que la omitimos del UPDATE para preservar la actual.
          if (!productoData.ProductoImagen) return;
          updateFields.push(`${campo} = ?`);
          values.push(Buffer.from(productoData.ProductoImagen, "base64"));
        } else {
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
          ON CONFLICT (ProductoId, AlmacenId) DO UPDATE SET
            ProductoAlmacenStock = EXCLUDED.ProductoAlmacenStock,
            ProductoAlmacenStockUnitario = EXCLUDED.ProductoAlmacenStockUnitario
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

  /**
   * Reporte de movimientos (ventas y compras) por producto en un rango de
   * fechas. Devuelve solo productos con movimiento en el período.
   *
   * Convención del schema (confirmada empíricamente con datos reales):
   *  - ventaproducto.VentaProductoCantidad  = cantidad vendida (escalar)
   *  - ventaproducto.VentaProductoUnitario  = flag 'C' (cajas) o 'U' (unidades)
   *  - ventaproducto.VentaProductoPrecioPromedio = costo EN LA UNIDAD DEL
   *    RENGLÓN. Si la venta fue por caja (C), es el costo por caja; si fue por
   *    unidad (U), es el costo por unidad (el servicio que inserta ventaproducto
   *    ya hace la división por ProductoCantidadCaja antes de guardarlo).
   *  - compraproducto.CompraProductoCantidadUnidad = 'C' o 'U'
   *
   * Implicancia: el costo línea = cantidad × precioPromedio, sin importar la
   * unidad — no hay que dividir otra vez por cantidadCaja (lo haríamos doble).
   *
   * Ganancia y margen se calculan en el frontend (Ganancia = Monto - Costo).
   */
  getReporteMovimientosPorRango: (fechaDesde, fechaHasta) => {
    return new Promise((resolve, reject) => {
      // Aliases del subquery en minúsculas para que el adaptador db.js no los
      // entrecomille, evitando el error de referencia case-sensitive en PG.
      const query = `
        SELECT
          p.ProductoId,
          p.ProductoCodigo,
          p.ProductoNombre,
          COALESCE(v.cantidadvendidacajas,     0) AS CantidadVendidaCajas,
          COALESCE(v.cantidadvendidaunidades,  0) AS CantidadVendidaUnidades,
          COALESCE(v.montovendido,             0) AS MontoVendido,
          COALESCE(v.costovendido,             0) AS CostoVendido,
          COALESCE(c.cantidadcompradacajas,    0) AS CantidadCompradaCajas,
          COALESCE(c.cantidadcompradaunidades, 0) AS CantidadCompradaUnidades,
          COALESCE(c.montocomprado,            0) AS MontoComprado
        FROM producto p
        LEFT JOIN (
          SELECT
            vp.ProductoId,
            SUM(CASE WHEN vp.VentaProductoUnitario = 'U'
                     THEN 0 ELSE vp.VentaProductoCantidad END)
              AS cantidadvendidacajas,
            SUM(CASE WHEN vp.VentaProductoUnitario = 'U'
                     THEN vp.VentaProductoCantidad ELSE 0 END)
              AS cantidadvendidaunidades,
            SUM(vp.VentaProductoPrecioTotal) AS montovendido,
            SUM(COALESCE(vp.VentaProductoCantidad, 0)
                * COALESCE(vp.VentaProductoPrecioPromedio, 0))
              AS costovendido
          FROM ventaproducto vp
          INNER JOIN venta vv ON vv.VentaId = vp.VentaId
          WHERE DATE(vv.VentaFecha) BETWEEN ? AND ?
          GROUP BY vp.ProductoId
        ) v ON v.ProductoId = p.ProductoId
        LEFT JOIN (
          SELECT
            cp.ProductoId,
            SUM(CASE WHEN cp.CompraProductoCantidadUnidad = 'U'
                     THEN 0 ELSE cp.CompraProductoCantidad END)
              AS cantidadcompradacajas,
            SUM(CASE WHEN cp.CompraProductoCantidadUnidad = 'U'
                     THEN cp.CompraProductoCantidad ELSE 0 END)
              AS cantidadcompradaunidades,
            SUM(cp.CompraProductoCantidad * cp.CompraProductoPrecio) AS montocomprado
          FROM compraproducto cp
          INNER JOIN compra cc ON cc.CompraId = cp.CompraId
          WHERE DATE(cc.CompraFecha) BETWEEN ? AND ?
          GROUP BY cp.ProductoId
        ) c ON c.ProductoId = p.ProductoId
        WHERE COALESCE(v.cantidadvendidacajas,     0) <> 0
           OR COALESCE(v.cantidadvendidaunidades,  0) <> 0
           OR COALESCE(c.cantidadcompradacajas,    0) <> 0
           OR COALESCE(c.cantidadcompradaunidades, 0) <> 0
        ORDER BY p.ProductoNombre ASC
      `;
      db.query(
        query,
        [fechaDesde, fechaHasta, fechaDesde, fechaHasta],
        (err, rows) => {
          if (err) return reject(err);
          const productos = rows.map((r) => ({
            ProductoId: r.ProductoId,
            ProductoCodigo: r.ProductoCodigo,
            ProductoNombre: r.ProductoNombre,
            CantidadVendidaCajas: Number(r.CantidadVendidaCajas) || 0,
            CantidadVendidaUnidades: Number(r.CantidadVendidaUnidades) || 0,
            MontoVendido: Number(r.MontoVendido) || 0,
            CostoVendido: Number(r.CostoVendido) || 0,
            CantidadCompradaCajas: Number(r.CantidadCompradaCajas) || 0,
            CantidadCompradaUnidades: Number(r.CantidadCompradaUnidades) || 0,
            MontoComprado: Number(r.MontoComprado) || 0,
          }));
          resolve({ productos });
        }
      );
    });
  },

  /**
   * Reporte de productos más vendidos en un rango de fechas.
   *
   * Normaliza la cantidad vendida a unidades totales:
   *   - Renglón con VentaProductoUnitario = 'U' → cantidad tal cual (unidades)
   *   - Renglón con VentaProductoUnitario = 'C' → cantidad * ProductoCantidadCaja
   *
   * Devuelve además precio de venta, precio unitario, costo promedio, stock
   * actual (cajas + unidades), monto y costo vendidos del período. El frontend
   * se encarga de:
   *   - Convertir CantidadVendidaTotalUnidades a "cajas + unidades" según
   *     ProductoCantidadCaja (ej. 15 unid con cantCaja=12 → 1 caja y 3 unid).
   *   - Calcular ganancia = MontoVendido - CostoVendido.
   *
   * Ordena DESC por total de unidades vendidas.
   */
  getReporteMasVendidos: (fechaDesde, fechaHasta) => {
    return new Promise((resolve, reject) => {
      // La agregación va en subquery por ProductoId y recién después se
      // cruza con producto. Si se hacía GROUP BY sobre producto directo,
      // la columna BLOB ProductoImagen colgaba el query en MySQL.
      // Aliases del subquery en minúsculas para que el adaptador db.js no los
      // entrecomille, evitando el error de referencia case-sensitive en PG.
      const query = `
        SELECT
          p.ProductoId,
          p.ProductoCodigo,
          p.ProductoNombre,
          COALESCE(p.ProductoCantidadCaja, 0)   AS ProductoCantidadCaja,
          COALESCE(p.ProductoPrecioVenta, 0)    AS ProductoPrecioVenta,
          COALESCE(p.ProductoPrecioUnitario, 0) AS ProductoPrecioUnitario,
          COALESCE(p.ProductoPrecioPromedio, 0) AS ProductoPrecioPromedio,
          COALESCE(p.ProductoStock, 0)          AS ProductoStock,
          COALESCE(p.ProductoStockUnitario, 0)  AS ProductoStockUnitario,
          v.cantidadvendidacajas                AS CantidadVendidaCajas,
          v.cantidadvendidaunidades             AS CantidadVendidaUnidades,
          v.montovendido                        AS MontoVendido,
          v.costovendido                        AS CostoVendido
        FROM (
          SELECT
            vp.ProductoId,
            SUM(CASE WHEN vp.VentaProductoUnitario = 'U'
                     THEN 0 ELSE vp.VentaProductoCantidad END)
              AS cantidadvendidacajas,
            SUM(CASE WHEN vp.VentaProductoUnitario = 'U'
                     THEN vp.VentaProductoCantidad ELSE 0 END)
              AS cantidadvendidaunidades,
            SUM(COALESCE(vp.VentaProductoPrecioTotal, 0)) AS montovendido,
            SUM(COALESCE(vp.VentaProductoCantidad, 0)
                * COALESCE(vp.VentaProductoPrecioPromedio, 0)) AS costovendido
          FROM ventaproducto vp
          INNER JOIN venta vv ON vv.VentaId = vp.VentaId
          WHERE DATE(vv.VentaFecha) BETWEEN ? AND ?
          GROUP BY vp.ProductoId
        ) v
        INNER JOIN producto p ON p.ProductoId = v.ProductoId
        WHERE v.cantidadvendidacajas <> 0 OR v.cantidadvendidaunidades <> 0
      `;
      db.query(query, [fechaDesde, fechaHasta], (err, rows) => {
        if (err) return reject(err);
        const productos = rows
          .map((r) => {
            const cajas = Number(r.CantidadVendidaCajas) || 0;
            const unidades = Number(r.CantidadVendidaUnidades) || 0;
            const cantidadCaja = Number(r.ProductoCantidadCaja) || 0;
            // Normalizar a unidades totales. Si el producto no tiene
            // cantidadCaja definida, asumimos 1 (las cajas equivalen a 1 unidad).
            const multiplicadorCaja = cantidadCaja > 0 ? cantidadCaja : 1;
            const totalUnidades = cajas * multiplicadorCaja + unidades;
            return {
              ProductoId: r.ProductoId,
              ProductoCodigo: r.ProductoCodigo,
              ProductoNombre: r.ProductoNombre,
              ProductoCantidadCaja: cantidadCaja,
              ProductoPrecioVenta: Number(r.ProductoPrecioVenta) || 0,
              ProductoPrecioUnitario: Number(r.ProductoPrecioUnitario) || 0,
              ProductoPrecioPromedio: Number(r.ProductoPrecioPromedio) || 0,
              ProductoStock: Number(r.ProductoStock) || 0,
              ProductoStockUnitario: Number(r.ProductoStockUnitario) || 0,
              CantidadVendidaTotalUnidades: totalUnidades,
              MontoVendido: Number(r.MontoVendido) || 0,
              CostoVendido: Number(r.CostoVendido) || 0,
            };
          })
          .filter((p) => p.CantidadVendidaTotalUnidades > 0)
          .sort((a, b) => {
            if (b.CantidadVendidaTotalUnidades !== a.CantidadVendidaTotalUnidades)
              return b.CantidadVendidaTotalUnidades - a.CantidadVendidaTotalUnidades;
            return String(a.ProductoNombre || "").localeCompare(
              String(b.ProductoNombre || "")
            );
          });
        resolve({ productos });
      });
    });
  },

  getReporteStock: () => {
    return new Promise((resolve, reject) => {
      // Incluye precio de costo por caja (ProductoPrecioPromedio) y la
      // cantidad por caja para que el frontend calcule el valor del stock
      // (capital inmovilizado) por producto y sume el total.
      const query = `
        SELECT
          p.ProductoId,
          p.ProductoCodigo,
          p.ProductoNombre,
          COALESCE(p.ProductoCantidadCaja, 0)   AS ProductoCantidadCaja,
          COALESCE(p.ProductoPrecioPromedio, 0) AS ProductoPrecioPromedio,
          COALESCE(p.ProductoPrecioVenta, 0)    AS ProductoPrecioVenta,
          COALESCE(p.ProductoStock, 0)          AS ProductoStock,
          COALESCE(p.ProductoStockUnitario, 0)  AS ProductoStockUnitario,
          pa.AlmacenId,
          a.AlmacenNombre,
          COALESCE(pa.ProductoAlmacenStock, 0)          AS ProductoAlmacenStock,
          COALESCE(pa.ProductoAlmacenStockUnitario, 0)  AS ProductoAlmacenStockUnitario
        FROM producto p
        LEFT JOIN productoalmacen pa ON p.ProductoId = pa.ProductoId
        LEFT JOIN Almacen a ON pa.AlmacenId = a.AlmacenId
        ORDER BY p.ProductoNombre, a.AlmacenNombre
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
              ProductoCantidadCaja: Number(row.ProductoCantidadCaja) || 0,
              ProductoPrecioPromedio: Number(row.ProductoPrecioPromedio) || 0,
              ProductoPrecioVenta: Number(row.ProductoPrecioVenta) || 0,
              ProductoStock: Number(row.ProductoStock) || 0,
              ProductoStockUnitario: Number(row.ProductoStockUnitario) || 0,
              productoAlmacen: [],
            };
          }
          if (row.AlmacenId != null) {
            byProduct[id].productoAlmacen.push({
              AlmacenNombre: row.AlmacenNombre || "",
              ProductoAlmacenStock: Number(row.ProductoAlmacenStock) || 0,
              ProductoAlmacenStockUnitario:
                Number(row.ProductoAlmacenStockUnitario) || 0,
            });
          }
        });
        const productos = Object.values(byProduct);
        resolve({ productos });
      });
    });
  },

  /**
   * Devuelve el binario de la imagen (LONGBLOB) del producto, o null si no
   * tiene. Usado por el endpoint público GET /productos/:id/imagen.
   */
  getImagen: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT ProductoImagen FROM producto WHERE ProductoId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results[0]?.ProductoImagen || null);
        }
      );
    });
  },
};

module.exports = Producto;
