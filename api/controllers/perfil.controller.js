const Perfil = require("../models/perfil.model");
const db = require("../config/db");
const PerfilMenu = require("../models/perfilmenu.model");

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
    const result = await Perfil.getAllPaginated(page, itemsPerPage);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const perfil = await Perfil.getById(req.params.id);
    if (!perfil)
      return res.status(404).json({ message: "Perfil no encontrado" });
    res.json(perfil);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const perfil = await Perfil.create(req.body);
    const perfilId = perfil.PerfilId;
    const { menusAsignados } = req.body;
    if (Array.isArray(menusAsignados)) {
      // Elimina todos los permisos actuales de ese perfil (por si acaso)
      await new Promise((resolve, reject) => {
        db.query(
          "DELETE FROM perfilmenu WHERE PerfilId = ?",
          [perfilId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      // Inserta los nuevos permisos
      for (const menu of menusAsignados) {
        await PerfilMenu.create({
          PerfilId: perfilId,
          MenuId: menu.MenuId,
          puedeCrear: menu.puedeCrear ? 1 : 0,
          puedeEditar: menu.puedeEditar ? 1 : 0,
          puedeEliminar: menu.puedeEliminar ? 1 : 0,
          puedeLeer: menu.puedeLeer ? 1 : 0,
        });
      }
    }
    res.status(201).json(perfil);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const perfil = await Perfil.update(req.params.id, req.body);
    const perfilId = req.params.id;
    const { menusAsignados } = req.body;
    if (Array.isArray(menusAsignados)) {
      // Elimina todos los permisos actuales de ese perfil
      await new Promise((resolve, reject) => {
        db.query(
          "DELETE FROM perfilmenu WHERE PerfilId = ?",
          [perfilId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      // Inserta los nuevos permisos
      for (const menu of menusAsignados) {
        await PerfilMenu.create({
          PerfilId: perfilId,
          MenuId: menu.MenuId,
          puedeCrear: menu.puedeCrear ? 1 : 0,
          puedeEditar: menu.puedeEditar ? 1 : 0,
          puedeEliminar: menu.puedeEliminar ? 1 : 0,
          puedeLeer: menu.puedeLeer ? 1 : 0,
        });
      }
    }
    res.json(perfil);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Perfil.delete(req.params.id);
    res.json({ message: "Perfil eliminado" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
