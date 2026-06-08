const PerfilMenu = require("../models/perfilmenu.model");

exports.getByPerfil = async (req, res) => {
  try {
    const permisos = await PerfilMenu.getByPerfil(req.params.perfilId);
    res.json(permisos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPermisosByUsuarioId = async (req, res) => {
  try {
    const permisos = await PerfilMenu.getPermisosByUsuarioId(
      req.params.usuarioId
    );
    res.json(permisos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const permiso = await PerfilMenu.create(req.body);
    res.status(201).json(permiso);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    await PerfilMenu.update(req.params.perfilId, req.params.menuId, req.body);
    res.json({ message: "Permiso actualizado" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await PerfilMenu.delete(req.params.perfilId, req.params.menuId);
    res.json({ message: "Permiso eliminado" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
