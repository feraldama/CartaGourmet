const RegistroDiarioCaja = require("../models/registrodiariocaja.model");
const db = require("../config/db");

// Obtener todos los registros con paginación
exports.getAll = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;
  const sortBy = req.query.sortBy || "RegistroDiarioCajaFecha";
  const sortOrder = req.query.sortOrder || "DESC";
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await RegistroDiarioCaja.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json(result);
  } catch (error) {
    console.error("Error al obtener registros:", error);
    res.status(500).json({ message: error.message });
  }
};

// Buscar registros
exports.search = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "RegistroDiarioCajaFecha";
    const sortOrder = req.query.sortOrder || "DESC";

    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const result = await RegistroDiarioCaja.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json(result);
  } catch (error) {
    console.error("Error en búsqueda de registros:", error);
    res.status(500).json({ error: "Error al buscar registros" });
  }
};

// Obtener registros por rango de fechas (para reportes de cierre)
// Usa solo la parte DATE para evitar desfases por zona horaria; incluye un día antes y después del rango
exports.getByDateRange = async (req, res) => {
  try {
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;
    const limit = parseInt(req.query.limit) || 10000;
    if (!fechaDesde || !fechaHasta) {
      return res.status(400).json({
        message: "Se requieren los parámetros fechaDesde y fechaHasta (YYYY-MM-DD)",
      });
    }
    const desde = new Date(fechaDesde + "T00:00:00");
    desde.setDate(desde.getDate() - 1);
    const hasta = new Date(fechaHasta + "T00:00:00");
    hasta.setDate(hasta.getDate() + 1);
    const fechaDesdeStr =
      desde.getFullYear() +
      "-" +
      String(desde.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(desde.getDate()).padStart(2, "0");
    const fechaHastaStr =
      hasta.getFullYear() +
      "-" +
      String(hasta.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(hasta.getDate()).padStart(2, "0");
    const data = await RegistroDiarioCaja.getByDateRange(
      fechaDesdeStr,
      fechaHastaStr,
      limit
    );
    res.json({ data });
  } catch (error) {
    console.error("Error al obtener registros por rango:", error);
    res.status(500).json({ message: error.message });
  }
};

// Obtener un registro por ID
exports.getById = async (req, res) => {
  try {
    const registro = await RegistroDiarioCaja.getById(req.params.id);
    if (!registro) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }
    res.json(registro);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un nuevo registro
exports.create = async (req, res) => {
  try {
    const registro = await RegistroDiarioCaja.create({
      ...req.body,
      UsuarioId: req.user.id, // Asumiendo que tienes el usuario en req.user
    });
    res.status(201).json({
      message: "Registro creado exitosamente",
      data: registro,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Actualizar un registro
exports.update = async (req, res) => {
  try {
    const registro = await RegistroDiarioCaja.update(req.params.id, req.body);
    if (!registro) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }
    res.json({
      message: "Registro actualizado exitosamente",
      data: registro,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un registro
exports.delete = async (req, res) => {
  try {
    const success = await RegistroDiarioCaja.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Registro no encontrado" });
    }
    res.json({ message: "Registro eliminado exitosamente" });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      return res.status(400).json({
        message:
          "No se puede eliminar el registro porque tiene movimientos asociados.",
      });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.aperturaCierreCaja = async (req, res) => {
  try {
    const { apertura, CajaId, Monto } = req.body;
    const UsuarioId = req.user?.id || req.body.UsuarioId;
    if (
      !CajaId ||
      typeof apertura === "undefined" ||
      typeof Monto === "undefined" ||
      !UsuarioId
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Faltan datos requeridos" });
    }
    let Sigue = "N";
    let error = "";
    // Buscar última apertura y cierre
    const aperturaReg = await RegistroDiarioCaja.getUltimaApertura(CajaId);
    const cierreReg = await RegistroDiarioCaja.getUltimoCierre(CajaId);
    const RegistroDiarioCajaIdApertura = aperturaReg
      ? aperturaReg.RegistroDiarioCajaId
      : 0;
    const RegistroDiarioCajaIdCierre = cierreReg
      ? cierreReg.RegistroDiarioCajaId
      : 0;
    if (apertura == 0) {
      if (RegistroDiarioCajaIdApertura === 0) {
        Sigue = "S";
      } else if (RegistroDiarioCajaIdCierre > RegistroDiarioCajaIdApertura) {
        Sigue = "S";
      } else {
        Sigue = "N";
        error = "CAJA ABIERTA - DEBE REALIZAR EL CIERRE";
      }
    } else {
      if (RegistroDiarioCajaIdCierre < RegistroDiarioCajaIdApertura) {
        Sigue = "S";
      } else {
        Sigue = "N";
        error = "CAJA CERRADA - DEBE REALIZAR LA APERTURA";
      }
    }
    if (Sigue === "N") {
      return res.status(400).json({ success: false, message: error });
    }
    // Obtener descripción de caja
    const [caja] = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM Caja WHERE CajaId = ?",
        [CajaId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });
    const CajaDescripcion = caja ? caja.CajaDescripcion : "";
    // APERTURA
    if (apertura == 0) {
      // Crear registro de apertura
      await RegistroDiarioCaja.create({
        CajaId,
        RegistroDiarioCajaFecha: new Date(),
        TipoGastoId: 2,
        TipoGastoGrupoId: 2,
        RegistroDiarioCajaDetalle: "APERTURA " + CajaDescripcion,
        RegistroDiarioCajaMonto: Monto,
        UsuarioId,
      });
      // Sumar monto a la caja
      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE Caja SET CajaMonto = CajaMonto + ? WHERE CajaId = ?",
          [Monto, CajaId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      return res.json({
        success: true,
        message: "Apertura realizada correctamente",
      });
    } else {
      // CIERRE
      // Poner monto de caja en 0
      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE Caja SET CajaMonto = 0 WHERE CajaId = ?",
          [CajaId],
          (err) => {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      // Crear registro de cierre
      await RegistroDiarioCaja.create({
        CajaId,
        RegistroDiarioCajaFecha: new Date(),
        TipoGastoId: 1,
        TipoGastoGrupoId: 2,
        RegistroDiarioCajaDetalle: "CIERRE " + CajaDescripcion,
        RegistroDiarioCajaMonto: Monto,
        UsuarioId,
      });
      return res.json({
        success: true,
        message: "Cierre realizado correctamente",
      });
    }
  } catch (error) {
    console.error("Error en apertura/cierre de caja:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
      error: error.message,
    });
  }
};

// Nuevo endpoint para saber si el usuario tiene caja aperturada
exports.estadoAperturaPorUsuario = async (req, res) => {
  try {
    const usuarioId = req.query.usuarioId;
    if (!usuarioId) {
      return res.status(400).json({ message: "Falta el parámetro usuarioId" });
    }
    const estado = await RegistroDiarioCaja.getEstadoAperturaPorUsuario(
      usuarioId
    );
    res.json(estado);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
