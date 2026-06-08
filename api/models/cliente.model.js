const db = require("../config/db");

const Cliente = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM clientes", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM clientes WHERE ClienteId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getAllPaginated: (limit, offset, sortBy = "ClienteId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ClienteId",
        "ClienteRUC",
        "ClienteNombre",
        "ClienteApellido",
        "ClienteDireccion",
        "ClienteTelefono",
        "ClienteTipo",
        "UsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ClienteId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      db.query(
        `SELECT * FROM clientes ORDER BY ${sortField} ${order} LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
          if (err) return reject(err);

          db.query(
            "SELECT COUNT(*) as total FROM clientes",
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                clientes: results,
                total: countResult[0].total,
              });
            }
          );
        }
      );
    });
  },

  search: (term, limit, offset, sortBy = "ClienteId", sortOrder = "ASC") => {
    return new Promise((resolve, reject) => {
      const allowedSortFields = [
        "ClienteId",
        "ClienteRUC",
        "ClienteNombre",
        "ClienteApellido",
        "ClienteDireccion",
        "ClienteTelefono",
        "ClienteTipo",
        "UsuarioId",
      ];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "ClienteId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      const searchQuery = `
        SELECT * FROM clientes 
        WHERE CONCAT(ClienteNombre, ' ', ClienteApellido) LIKE ? 
        OR ClienteRUC LIKE ? 
        OR ClienteId LIKE ?
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      const searchValue = `%${term}%`;

      db.query(
        searchQuery,
        [searchValue, searchValue, searchValue, limit, offset],
        (err, results) => {
          if (err) return reject(err);

          const countQuery = `
            SELECT COUNT(*) as total FROM clientes 
            WHERE CONCAT(ClienteNombre, ' ', ClienteApellido) LIKE ? 
            OR ClienteRUC LIKE ? 
            OR ClienteId LIKE ?
          `;

          db.query(
            countQuery,
            [searchValue, searchValue, searchValue],
            (err, countResult) => {
              if (err) return reject(err);

              resolve({
                clientes: results,
                total: countResult[0]?.total || 0,
              });
            }
          );
        }
      );
    });
  },

  create: (clienteData) => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO clientes (
          ClienteRUC,
          ClienteNombre,
          ClienteApellido,
          ClienteDireccion,
          ClienteTelefono,
          ClienteTipo,
          UsuarioId
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        clienteData.ClienteRUC || "",
        clienteData.ClienteNombre,
        clienteData.ClienteApellido || "",
        clienteData.ClienteDireccion || "",
        clienteData.ClienteTelefono || "",
        clienteData.ClienteTipo || "",
        clienteData.UsuarioId ? String(clienteData.UsuarioId).trim() : "",
      ];
      db.query(query, values, (err, result) => {
        if (err) return reject(err);
        resolve({ ...clienteData, ClienteId: result.insertId });
      });
    });
  },

  update: (id, clienteData) => {
    return new Promise((resolve, reject) => {
      let updateFields = [];
      let values = [];
      const camposActualizables = [
        "ClienteRUC",
        "ClienteNombre",
        "ClienteApellido",
        "ClienteDireccion",
        "ClienteTelefono",
        "ClienteTipo",
        "UsuarioId",
      ];
      camposActualizables.forEach((campo) => {
        if (clienteData[campo] !== undefined) {
          updateFields.push(`${campo} = ?`);
          // Aplicar trim solo al UsuarioId si es string
          if (campo === "UsuarioId" && typeof clienteData[campo] === "string") {
            values.push(clienteData[campo].trim());
          } else {
            values.push(clienteData[campo]);
          }
        }
      });
      if (updateFields.length === 0) {
        return resolve(null);
      }
      values.push(id);
      const query = `
        UPDATE clientes 
        SET ${updateFields.join(", ")}
        WHERE ClienteId = ?
      `;
      db.query(query, values, async (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
          return resolve(null);
        }
        db.query(
          "SELECT * FROM clientes WHERE ClienteId = ?",
          [id],
          (err, results) => {
            if (err) return reject(err);
            resolve(results.length > 0 ? results[0] : null);
          }
        );
      });
    });
  },

  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM clientes WHERE ClienteId = ?",
        [id],
        (err, result) => {
          if (err) return reject(err);
          resolve(result.affectedRows > 0);
        }
      );
    });
  },
};

module.exports = Cliente;
