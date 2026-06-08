const db = require("../config/db");

const Perfil = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM perfil", (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },
  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM perfil WHERE PerfilId = ?",
        [id],
        (err, results) => {
          if (err) return reject(err);
          resolve(results[0]);
        }
      );
    });
  },
  create: (data) => {
    return new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO perfil (PerfilDescripcion) VALUES (?)",
        [data.PerfilDescripcion],
        (err, result) => {
          if (err) return reject(err);
          resolve({ PerfilId: result.insertId, ...data });
        }
      );
    });
  },
  update: (id, data) => {
    return new Promise((resolve, reject) => {
      db.query(
        "UPDATE perfil SET PerfilDescripcion = ? WHERE PerfilId = ?",
        [data.PerfilDescripcion, id],
        (err) => {
          if (err) return reject(err);
          resolve({ PerfilId: id, ...data });
        }
      );
    });
  },
  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM perfil WHERE PerfilId = ?", [id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  },
  getAllPaginated: (page = 1, itemsPerPage = 10) => {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * itemsPerPage;
      db.query(
        "SELECT SQL_CALC_FOUND_ROWS * FROM perfil LIMIT ? OFFSET ?",
        [parseInt(itemsPerPage), parseInt(offset)],
        (err, results) => {
          if (err) return reject(err);
          db.query("SELECT FOUND_ROWS() as total", (err2, totalResult) => {
            if (err2) return reject(err2);
            resolve({
              data: results,
              pagination: {
                totalItems: totalResult[0].total,
                totalPages: Math.ceil(totalResult[0].total / itemsPerPage),
                currentPage: page,
                itemsPerPage: itemsPerPage,
              },
            });
          });
        }
      );
    });
  },
};

module.exports = Perfil;
