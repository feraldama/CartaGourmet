const db = require("../config/db");

/**
 * Normaliza RegistroDiarioCajaFecha para que siempre incluya fecha y hora.
 * - Si no se proporciona valor: usa fecha/hora actual
 * - Si es solo fecha (YYYY-MM-DD): usa esa fecha con la hora actual del momento del registro
 * - Si es datetime completo: lo usa tal cual
 */
/**
 * Construye la cláusula WHERE para filtros de registros diarios de caja.
 * - cajaId (FK Caja)
 * - tipoGastoId (FK TipoGasto)
 * - rango de fechas sobre RegistroDiarioCajaFecha
 * - rango de monto sobre RegistroDiarioCajaMonto
 */
function buildRegistroFiltersWhere(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.cajaId != null && filters.cajaId !== "") {
    conditions.push("r.CajaId = ?");
    params.push(Number(filters.cajaId));
  }
  if (filters.tipoGastoId != null && filters.tipoGastoId !== "") {
    conditions.push("r.TipoGastoId = ?");
    params.push(Number(filters.tipoGastoId));
  }
  if (filters.fechaDesde) {
    conditions.push("DATE(r.RegistroDiarioCajaFecha) >= ?");
    params.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    conditions.push("DATE(r.RegistroDiarioCajaFecha) <= ?");
    params.push(filters.fechaHasta);
  }
  if (filters.montoMin != null && filters.montoMin !== "") {
    conditions.push("r.RegistroDiarioCajaMonto >= ?");
    params.push(Number(filters.montoMin));
  }
  if (filters.montoMax != null && filters.montoMax !== "") {
    conditions.push("r.RegistroDiarioCajaMonto <= ?");
    params.push(Number(filters.montoMax));
  }

  return { conditions, params };
}

function normalizeRegistroFecha(value) {
  if (!value) return new Date();
  const str = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const now = new Date();
    const [y, m, d] = str.split("-").map(Number);
    return new Date(
      y,
      m - 1,
      d,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );
  }
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

const RegistroDiarioCaja = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM registrodiariocaja", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM registrodiariocaja WHERE RegistroDiarioCajaId = ?",
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
    sortBy = "RegistroDiarioCajaId",
    sortOrder = "DESC",
    filters = {}
  ) => {
    return new Promise((resolve, reject) => {
      // Sanitiza sortOrder y sortBy para evitar SQL Injection
      const allowedSortFields = [
        "RegistroDiarioCajaId",
        "RegistroDiarioCajaFecha",
        "RegistroDiarioCajaMonto",
        "RegistroDiarioCajaDetalle",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "UsuarioId",
        "CajaId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "RegistroDiarioCajaFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const { conditions, params: filterParams } =
        buildRegistroFiltersWhere(filters);
      const whereSql = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const query = `
        SELECT r.*,
          c.CajaDescripcion,
          t.TipoGastoDescripcion,
          tg.TipoGastoGrupoDescripcion
        FROM registrodiariocaja r
        LEFT JOIN Caja c ON r.CajaId = c.CajaId
        LEFT JOIN TipoGasto t ON r.TipoGastoId = t.TipoGastoId
        LEFT JOIN tipogastogrupo tg ON r.TipoGastoId = tg.TipoGastoId AND r.TipoGastoGrupoId = tg.TipoGastoGrupoId
        ${whereSql}
        ORDER BY r.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;

      db.query(query, [...filterParams, limit, offset], (err, results) => {
        if (err) return reject(err);

        const countQuery = `
          SELECT COUNT(*) as total FROM registrodiariocaja r
          ${whereSql}`;

        db.query(countQuery, filterParams, (err, countResult) => {
          if (err) return reject(err);

          resolve({
            data: results,
            pagination: {
              totalItems: countResult[0].total,
              totalPages: Math.ceil(countResult[0].total / limit),
              currentPage: Math.floor(offset / limit) + 1,
              itemsPerPage: limit,
            },
          });
        });
      });
    });
  },

  search: async (
    term,
    limit,
    offset,
    sortBy = "RegistroDiarioCajaFecha",
    sortOrder = "DESC",
    filters = {}
  ) => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "RegistroDiarioCajaId",
        "RegistroDiarioCajaFecha",
        "RegistroDiarioCajaMonto",
        "RegistroDiarioCajaDetalle",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "UsuarioId",
        "CajaId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "RegistroDiarioCajaFecha";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "DESC";

      const { conditions: filterConditions, params: filterParams } =
        buildRegistroFiltersWhere(filters);
      const filtersAndClause = filterConditions.length
        ? ` AND ${filterConditions.join(" AND ")}`
        : "";

      const searchQuery = `
        SELECT r.*,
          c.CajaDescripcion,
          t.TipoGastoDescripcion,
          tg.TipoGastoGrupoDescripcion
        FROM registrodiariocaja r
        LEFT JOIN Caja c ON r.CajaId = c.CajaId
        LEFT JOIN TipoGasto t ON r.TipoGastoId = t.TipoGastoId
        LEFT JOIN tipogastogrupo tg ON r.TipoGastoId = tg.TipoGastoId AND r.TipoGastoGrupoId = tg.TipoGastoGrupoId
        WHERE (r.RegistroDiarioCajaDetalle LIKE ?
          OR CAST(r.UsuarioId AS CHAR) LIKE ?
          OR CAST(r.CajaId AS CHAR) LIKE ?
          OR CAST(r.TipoGastoId AS CHAR) LIKE ?
          OR CAST(r.TipoGastoGrupoId AS CHAR) LIKE ?
          OR CAST(r.RegistroDiarioCajaMonto AS CHAR) LIKE ?
          OR TO_CHAR(r.RegistroDiarioCajaFecha, 'DD/MM/YYYY HH24:MI:SS') LIKE ?)${filtersAndClause}
        ORDER BY r.${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;
      const searchParams = [
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
        searchValue,
      ];

      db.query(
        searchQuery,
        [...searchParams, ...filterParams, limit, offset],
        (err, results) => {
          if (err) {
            console.error("Error en la consulta de búsqueda:", err);
            return reject(err);
          }

          const countQuery = `
            SELECT COUNT(*) as total FROM registrodiariocaja r
            WHERE (r.RegistroDiarioCajaDetalle LIKE ?
              OR CAST(r.UsuarioId AS CHAR) LIKE ?
              OR CAST(r.CajaId AS CHAR) LIKE ?
              OR CAST(r.TipoGastoId AS CHAR) LIKE ?
              OR CAST(r.TipoGastoGrupoId AS CHAR) LIKE ?
              OR CAST(r.RegistroDiarioCajaMonto AS CHAR) LIKE ?
              OR TO_CHAR(r.RegistroDiarioCajaFecha, 'DD/MM/YYYY HH24:MI:SS') LIKE ?)${filtersAndClause}
          `;

          db.query(
            countQuery,
            [...searchParams, ...filterParams],
            (err, countResult) => {
              if (err) {
                console.error("Error en la consulta de conteo:", err);
                return reject(err);
              }

              const total = countResult[0]?.total || 0;

              resolve({
                data: results,
                pagination: {
                  totalItems: total,
                  totalPages: Math.ceil(total / limit),
                  currentPage: Math.floor(offset / limit) + 1,
                  itemsPerPage: limit,
                },
              });
            }
          );
        }
      );
    });
  },

  create: (registroData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO registrodiariocaja (
          CajaId,
          RegistroDiarioCajaFecha,
          TipoGastoId,
          TipoGastoGrupoId,
          RegistroDiarioCajaDetalle,
          RegistroDiarioCajaMonto,
          UsuarioId
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        registroData.CajaId,
        normalizeRegistroFecha(registroData.RegistroDiarioCajaFecha),
        registroData.TipoGastoId,
        registroData.TipoGastoGrupoId,
        registroData.RegistroDiarioCajaDetalle,
        registroData.RegistroDiarioCajaMonto,
        registroData.UsuarioId,
      ];

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        // Obtener el registro recién creado
        RegistroDiarioCaja.getById(result.insertId)
          .then((registro) => resolve(registro))
          .catch((error) => reject(error));
      });
    });
  },

  update: (id, registroData) => {
    return new Promise((resolve, reject) => {
      // Construir la consulta dinámicamente
      let updateFields = [];
      let values = [];

      const camposActualizables = [
        "CajaId",
        "RegistroDiarioCajaFecha",
        "TipoGastoId",
        "TipoGastoGrupoId",
        "RegistroDiarioCajaDetalle",
        "RegistroDiarioCajaMonto",
        "UsuarioId",
      ];

      camposActualizables.forEach((campo) => {
        if (registroData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          const valor =
            campo === "RegistroDiarioCajaFecha"
              ? normalizeRegistroFecha(registroData[campo])
              : registroData[campo];
          values.push(valor);
        }
      });

      if (updateFields.length === 0) {
        return resolve(null); // No hay campos para actualizar
      }

      values.push(id);

      const query = `
        UPDATE registrodiariocaja 
        SET ${updateFields.join(", ")}
        WHERE RegistroDiarioCajaId = ?
      `;

      db.query(query, values, (err, result) => {
        if (err) return reject(err);

        if (result.affectedRows === 0) {
          return resolve(null); // No se encontró el registro
        }

        // Obtener el registro actualizado
        RegistroDiarioCaja.getById(id)
          .then((registro) => resolve(registro))
          .catch((error) => reject(error));
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM registrodiariocaja WHERE RegistroDiarioCajaId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },

  getUltimaApertura: (cajaId) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT * FROM registrodiariocaja WHERE CajaId = ? AND TipoGastoId = 2 AND TipoGastoGrupoId = 2 ORDER BY RegistroDiarioCajaId DESC LIMIT 1`,
        [cajaId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getUltimoCierre: (cajaId) => {
    return new Promise((resolve, reject) => {
      db.query(
        `SELECT * FROM registrodiariocaja WHERE CajaId = ? AND TipoGastoId = 1 AND TipoGastoGrupoId = 2 ORDER BY RegistroDiarioCajaId DESC LIMIT 1`,
        [cajaId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByDateRange: (fechaDesdeStr, fechaHastaStr, limit = 10000) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT r.*,
          c.CajaDescripcion,
          t.TipoGastoDescripcion,
          tg.TipoGastoGrupoDescripcion
        FROM registrodiariocaja r
        LEFT JOIN Caja c ON r.CajaId = c.CajaId
        LEFT JOIN TipoGasto t ON r.TipoGastoId = t.TipoGastoId
        LEFT JOIN tipogastogrupo tg ON r.TipoGastoId = tg.TipoGastoId AND r.TipoGastoGrupoId = tg.TipoGastoGrupoId
        WHERE DATE(r.RegistroDiarioCajaFecha) >= DATE(?) AND DATE(r.RegistroDiarioCajaFecha) <= DATE(?)
        ORDER BY r.RegistroDiarioCajaId ASC
        LIMIT ?
      `;
      db.query(query, [fechaDesdeStr, fechaHastaStr, limit], (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },

  getEstadoAperturaPorUsuario: (usuarioId) => {
    return new Promise((resolve, reject) => {
      // Buscar la última apertura del usuario
      db.query(
        `SELECT RegistroDiarioCajaId, CajaId FROM registrodiariocaja WHERE UsuarioId = ? AND TipoGastoId = 2 AND TipoGastoGrupoId = 2 ORDER BY RegistroDiarioCajaId DESC LIMIT 1`,
        [usuarioId],
        (err, aperturas) => {
          if (err) return reject(err);
          const apertura = aperturas[0] || {
            RegistroDiarioCajaId: 0,
            CajaId: null,
          };
          // Buscar la última cierre del usuario
          db.query(
            `SELECT RegistroDiarioCajaId FROM registrodiariocaja WHERE UsuarioId = ? AND TipoGastoId = 1 AND TipoGastoGrupoId = 2 ORDER BY RegistroDiarioCajaId DESC LIMIT 1`,
            [usuarioId],
            (err, cierres) => {
              if (err) return reject(err);
              const cierre = cierres[0] || { RegistroDiarioCajaId: 0 };
              resolve({
                aperturaId: apertura.RegistroDiarioCajaId || 0,
                cierreId: cierre.RegistroDiarioCajaId || 0,
                cajaId: apertura.CajaId || null,
              });
            }
          );
        }
      );
    });
  },
};

module.exports = RegistroDiarioCaja;
