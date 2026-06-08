const db = require("../config/db");

const UsuarioPerfil = {
  getByUsuario: (usuarioId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM usuarioperfil WHERE UsuarioId = ?",
        [usuarioId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },
  create: (data) => {
    return new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO usuarioperfil (UsuarioId, PerfilId) VALUES (?, ?)",
        [data.UsuarioId, data.PerfilId],
        (err, result) => {
          if (err) return reject(err);
          resolve({ UsuarioPerfilId: result.insertId, ...data });
        }
      );
    });
  },
  delete: (usuarioId, perfilId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "DELETE FROM usuarioperfil WHERE UsuarioId=? AND PerfilId=?",
        [usuarioId, perfilId],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  },
};

module.exports = UsuarioPerfil;
