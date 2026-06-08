const PerfilMenu = require("../models/perfilmenu.model");

const verificarPermiso = (menu, accion) => {
  return async (req, res, next) => {
    const usuarioId = req.usuario.UsuarioId;
    const permisos = await PerfilMenu.getPermisosByUsuarioId(usuarioId);
    if (permisos[menu] && permisos[menu][accion]) {
      return next();
    }
    return res
      .status(403)
      .json({ message: "No tienes permiso para esta acción" });
  };
};

module.exports = verificarPermiso;
