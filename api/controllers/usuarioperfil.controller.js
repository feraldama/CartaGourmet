const UsuarioPerfil = require("../models/usuarioperfil.model");
const { sendError } = require("../utils/errors");

exports.getByUsuario = async (req, res) => {
  try {
    const perfiles = await UsuarioPerfil.getByUsuario(req.params.usuarioId);
    res.json(perfiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const usuarioPerfil = await UsuarioPerfil.create(req.body);
    res.status(201).json(usuarioPerfil);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await UsuarioPerfil.delete(req.params.usuarioId, req.params.perfilId);
    res.json({ message: "Relación eliminada" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
