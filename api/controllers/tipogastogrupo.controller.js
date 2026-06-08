const TipoGastoGrupo = require("../models/tipogastogrupo.model");
const TipoGasto = require("../models/tipogasto.model");

exports.getAll = async (req, res) => {
  try {
    const grupos = await TipoGastoGrupo.getAll();
    res.json(grupos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const grupo = await TipoGastoGrupo.getById(req.params.id);
    if (!grupo) return res.status(404).json({ message: "No encontrado" });
    res.json(grupo);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getByTipoGastoId = async (req, res) => {
  try {
    const grupos = await TipoGastoGrupo.getByTipoGastoId(
      req.params.tipoGastoId
    );
    res.json(grupos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const grupo = await TipoGastoGrupo.create(req.body);
    const tipoGasto = await TipoGasto.getById(req.body.TipoGastoId);
    res
      .status(201)
      .json({ grupo, TipoGastoCantGastos: tipoGasto.TipoGastoCantGastos });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const grupo = await TipoGastoGrupo.update(req.params.grupoId, {
      ...req.body,
      TipoGastoId: req.params.tipoGastoId,
    });
    if (!grupo) return res.status(404).json({ message: "No encontrado" });
    res.json(grupo);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const tipoGastoId = await TipoGastoGrupo.delete(
      req.params.tipoGastoId,
      req.params.grupoId
    );
    let TipoGastoCantGastos = undefined;
    if (tipoGastoId) {
      const tipoGasto = await TipoGasto.getById(tipoGastoId);
      TipoGastoCantGastos = tipoGasto?.TipoGastoCantGastos;
    }
    if (!tipoGastoId) return res.status(404).json({ message: "No encontrado" });
    res.json({ message: "Eliminado correctamente", TipoGastoCantGastos });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        message:
          "No se puede eliminar el grupo porque tiene movimientos asociados.",
      });
    }
    if (error && error.message) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: "Error interno del servidor" });
    }
  }
};
