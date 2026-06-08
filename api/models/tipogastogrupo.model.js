const db = require("../config/db");

const TipoGastoGrupo = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM tipogastogrupo", (err, results) => {
        if (err) reject(err);
        resolve(results);
      });
    });
  },

  getById: (tipoGastoId, grupoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM tipogastogrupo WHERE TipoGastoId = ? AND TipoGastoGrupoId = ?",
        [tipoGastoId, grupoId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results.length > 0 ? results[0] : null);
        }
      );
    });
  },

  getByTipoGastoId: (tipoGastoId) => {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM tipogastogrupo WHERE TipoGastoId = ?",
        [tipoGastoId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
  },

  create: (data) => {
    return new Promise((resolve, reject) => {
      // 1. Obtener el contador actual
      db.query(
        "SELECT TipoGastoCantGastos FROM TipoGasto WHERE TipoGastoId = ?",
        [data.TipoGastoId],
        (err, results) => {
          if (err) return reject(err);
          const nextGrupoId = (results[0]?.TipoGastoCantGastos || 0) + 1;
          // 2. Insertar con el nuevo ID
          db.query(
            "INSERT INTO tipogastogrupo (TipoGastoId, TipoGastoGrupoId, TipoGastoGrupoDescripcion) VALUES (?, ?, ?)",
            [data.TipoGastoId, nextGrupoId, data.TipoGastoGrupoDescripcion],
            (err, result) => {
              if (err) return reject(err);
              // 3. Actualizar el contador en TipoGasto
              db.query(
                "UPDATE TipoGasto SET TipoGastoCantGastos = ? WHERE TipoGastoId = ?",
                [nextGrupoId, data.TipoGastoId],
                (err2) => {
                  if (err2) return reject(err2);
                  TipoGastoGrupo.getById(data.TipoGastoId, nextGrupoId)
                    .then((grupo) => resolve(grupo))
                    .catch((error) => reject(error));
                }
              );
            }
          );
        }
      );
    });
  },

  update: (id, data) => {
    return new Promise((resolve, reject) => {
      // Primero verificar si hay registros dependientes
      db.query(
        "SELECT COUNT(*) as count FROM cajagasto WHERE TipoGastoId = ? AND TipoGastoGrupoId = ?",
        [data.TipoGastoId, id],
        (err, results) => {
          if (err) return reject(err);

          if (results[0].count > 0) {
            return reject({
              message:
                "No se puede actualizar este grupo porque tiene gastos asociados en caja",
            });
          }

          // Si no hay dependencias, proceder con la actualización
          db.query(
            "UPDATE tipogastogrupo SET TipoGastoGrupoDescripcion = ? WHERE TipoGastoGrupoId = ? AND TipoGastoId = ?",
            [data.TipoGastoGrupoDescripcion, id, data.TipoGastoId],
            (err) => {
              if (err) return reject(err);
              TipoGastoGrupo.getById(data.TipoGastoId, id)
                .then((grupo) => resolve(grupo))
                .catch((error) => reject(error));
            }
          );
        }
      );
    });
  },

  delete: (tipoGastoId, grupoId) => {
    return new Promise((resolve, reject) => {
      // Obtener el grupo antes de eliminarlo para saber el TipoGastoId
      db.query(
        "SELECT TipoGastoId FROM tipogastogrupo WHERE TipoGastoId = ? AND TipoGastoGrupoId = ?",
        [tipoGastoId, grupoId],
        (err, results) => {
          if (err) return reject(err);
          const tipoGastoIdFound = results[0]?.TipoGastoId;
          // Verificar si hay registros dependientes
          db.query(
            "SELECT COUNT(*) as count FROM cajagasto WHERE TipoGastoId = ? AND TipoGastoGrupoId = ?",
            [tipoGastoId, grupoId],
            (err, results) => {
              if (err) return reject(err);
              if (results[0].count > 0) {
                return reject({
                  message:
                    "No se puede eliminar este grupo porque tiene gastos asociados en caja",
                });
              }
              // Si no hay dependencias, proceder con la eliminación
              db.query(
                "DELETE FROM tipogastogrupo WHERE TipoGastoId = ? AND TipoGastoGrupoId = ?",
                [tipoGastoId, grupoId],
                (err, result) => {
                  if (err) return reject(err);
                  if (tipoGastoIdFound) {
                    db.query(
                      "UPDATE TipoGasto SET TipoGastoCantGastos = TipoGastoCantGastos - 1 WHERE TipoGastoId = ? AND TipoGastoCantGastos > 0",
                      [tipoGastoIdFound],
                      (err2) => {
                        if (err2) return reject(err2);
                        resolve(
                          result.affectedRows > 0 ? tipoGastoIdFound : false
                        );
                      }
                    );
                  } else {
                    resolve(result.affectedRows > 0);
                  }
                }
              );
            }
          );
        }
      );
    });
  },
};

module.exports = TipoGastoGrupo;
