const db = require("../config/db");

const Menu = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM menu", (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },
  getAllPaginated: (
    page = 1,
    itemsPerPage = 10,
    sortBy = "MenuId",
    sortOrder = "ASC",
    search = ""
  ) => {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * itemsPerPage;
      const allowedSortFields = ["MenuId", "MenuNombre"];
      const allowedSortOrders = ["ASC", "DESC"];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : "MenuId";
      const order = allowedSortOrders.includes(sortOrder.toUpperCase())
        ? sortOrder.toUpperCase()
        : "ASC";

      let where = "";
      let params = [];
      if (search) {
        where = "WHERE MenuId LIKE ? OR MenuNombre LIKE ?";
        params.push(`%${search}%`, `%${search}%`);
      }
      params.push(parseInt(itemsPerPage), parseInt(offset));

      const query = `
        SELECT SQL_CALC_FOUND_ROWS * FROM menu
        ${where}
        ORDER BY ${sortField} ${order}
        LIMIT ? OFFSET ?
      `;
      db.query(query, params, (err, results) => {
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
      });
    });
  },
  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.query("SELECT * FROM menu WHERE MenuId = ?", [id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });
  },
  create: (data) => {
    return new Promise((resolve, reject) => {
      db.query(
        "INSERT INTO menu (MenuId, MenuNombre) VALUES (?, ?)",
        [data.MenuId, data.MenuNombre],
        (err, result) => {
          if (err) return reject(err);
          resolve({ MenuId: data.MenuId, ...data });
        }
      );
    });
  },
  update: (id, data) => {
    return new Promise((resolve, reject) => {
      db.query(
        "UPDATE menu SET MenuNombre = ? WHERE MenuId = ?",
        [data.MenuNombre, id],
        (err) => {
          if (err) return reject(err);
          resolve({ MenuId: id, ...data });
        }
      );
    });
  },
  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.query("DELETE FROM menu WHERE MenuId = ?", [id], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  },
};

module.exports = Menu;
