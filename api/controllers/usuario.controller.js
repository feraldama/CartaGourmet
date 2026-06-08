const Usuario = require("../models/usuario.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const PerfilMenu = require("../models/perfilmenu.model");

// getAllUsuarios
exports.getAllUsuarios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "UsuarioId";
    const sortOrder = req.query.sortOrder || "ASC";

    const { usuarios, total } = await Usuario.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: usuarios,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// searchUsuarios
exports.searchUsuarios = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "UsuarioId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }

    const { usuarios, total } = await Usuario.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );

    res.json({
      data: usuarios,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    console.error("Error en searchUsuarios:", error);
    res.status(500).json({ error: "Error al buscar usuarios" });
  }
};

exports.getUsuarioById = async (req, res) => {
  try {
    const usuario = await Usuario.getById(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email y contraseña son requeridos",
      });
    }

    const usuario = await Usuario.findByUsuarioId(email);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    if (usuario.UsuarioEstado === "I") {
      return res.status(403).json({
        success: false,
        message:
          "Su usuario está inactivo. Por favor, contacte al administrador.",
      });
    }

    const contraseñaValida = await bcrypt.compare(
      password,
      usuario.UsuarioContrasena
    );

    if (!contraseñaValida) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    // Crear payload seguro
    const payload = {
      id: usuario.UsuarioId,
      email: usuario.UsuarioCorreo,
      isAdmin: usuario.UsuarioIsAdmin,
      estado: usuario.UsuarioEstado,
      LocalId: usuario.LocalId,
    };

    // Generar token
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // Obtener permisos del usuario
    let permisos;
    if (usuario.UsuarioIsAdmin === "S") {
      const Menu = require("../models/menu.model");
      const menus = await Menu.getAll();
      permisos = {};
      menus.forEach((menu) => {
        permisos[menu.MenuNombre] = {
          crear: true,
          editar: true,
          eliminar: true,
          leer: true,
        };
      });
    } else {
      permisos = await PerfilMenu.getPermisosByUsuarioId(usuario.UsuarioId);
    }

    res.json({
      success: true,
      token,
      user: {
        id: usuario.UsuarioId,
        email: usuario.UsuarioCorreo,
        nombre: usuario.UsuarioNombre,
        isAdmin: usuario.UsuarioIsAdmin,
        estado: usuario.UsuarioEstado,
        LocalId: usuario.LocalId,
      },
      permisos,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      success: false,
      message: "Error en el servidor",
    });
  }
};

exports.createUsuario = async (req, res) => {
  try {
    // 1. Validación de campos requeridos
    const camposRequeridos = [
      "UsuarioId",
      "UsuarioNombre",
      "UsuarioContrasena",
      "UsuarioIsAdmin",
      "UsuarioEstado",
      "LocalId",
    ];

    for (const campo of camposRequeridos) {
      if (!req.body[campo]) {
        return res.status(400).json({
          success: false,
          message: `El campo ${campo} es requerido`,
        });
      }
    }

    // 2. Validación de formato de email (si se proporciona)
    if (req.body.UsuarioCorreo) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(req.body.UsuarioCorreo)) {
        return res.status(400).json({
          success: false,
          message: "El formato del correo electrónico es inválido",
        });
      }
    }

    // 3. Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.getById(req.body.UsuarioId);
    if (usuarioExistente) {
      return res.status(400).json({
        success: false,
        message: "El ID de usuario ya existe",
      });
    }

    // 4. Validación de valores permitidos
    if (!["S", "N"].includes(req.body.UsuarioIsAdmin)) {
      return res.status(400).json({
        success: false,
        message: "UsuarioIsAdmin debe ser 'S' o 'N'",
      });
    }

    if (!["A", "I"].includes(req.body.UsuarioEstado)) {
      return res.status(400).json({
        success: false,
        message: "UsuarioEstado debe ser 'A' (Activo) o 'I' (Inactivo)",
      });
    }

    // 5. Validación de LocalId (debe ser número)
    if (isNaN(req.body.LocalId)) {
      return res.status(400).json({
        success: false,
        message: "LocalId debe ser un número",
      });
    }

    // 6. Crear el nuevo usuario
    const nuevoUsuario = await Usuario.create({
      UsuarioId: req.body.UsuarioId,
      UsuarioNombre: req.body.UsuarioNombre,
      UsuarioApellido: req.body.UsuarioApellido || "",
      UsuarioCorreo: req.body.UsuarioCorreo || "",
      UsuarioContrasena: req.body.UsuarioContrasena,
      UsuarioIsAdmin: req.body.UsuarioIsAdmin,
      UsuarioEstado: req.body.UsuarioEstado,
      LocalId: req.body.LocalId,
    });

    // 7. Retornar respuesta exitosa (sin incluir la contraseña)
    const { UsuarioContrasena, ...usuarioSinPassword } = nuevoUsuario;

    res.status(201).json({
      success: true,
      data: usuarioSinPassword,
      message: "Usuario creado exitosamente",
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear usuario",
      error: error.message,
    });
  }
};

exports.updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioData = req.body;

    // Validación básica de los datos requeridos
    if (!usuarioData.UsuarioNombre) {
      return res.status(400).json({
        success: false,
        message: "UsuarioNombre es un campo requerido",
      });
    }

    // Actualizar el usuario
    const updatedUsuario = await Usuario.update(id, usuarioData);

    if (!updatedUsuario) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      data: updatedUsuario,
      message: "Usuario actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar usuario",
      error: error.message,
    });
  }
};

exports.deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el ID sea válido
    if (!id || id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "ID de usuario inválido",
      });
    }
    // Verificar registros asociados antes de intentar eliminar
    const registrosAsociados = await Usuario.verificarRegistrosAsociados(id);
    if (registrosAsociados.length > 0) {
      const tablasConRegistros = registrosAsociados
        .map(
          (r) =>
            `${r.descripcion} (${r.cantidad} registro${
              r.cantidad > 1 ? "s" : ""
            })`
        )
        .join(", ");

      return res.status(400).json({
        success: false,
        message: `No se puede eliminar el usuario porque tiene ${tablasConRegistros}.`,
        tablas: registrosAsociados.map((r) => ({
          tabla: r.tabla,
          descripcion: r.descripcion,
          cantidad: r.cantidad,
        })),
      });
    }

    const deleted = await Usuario.delete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Usuario eliminado exitosamente",
    });
  } catch (error) {
    if (
      error &&
      error.message &&
      error.message.includes("a foreign key constraint fails")
    ) {
      // Si aún así hay un error de foreign key, intentar obtener más información
      try {
        const registrosAsociados = await Usuario.verificarRegistrosAsociados(
          req.params.id
        );
        const tablasConRegistros = registrosAsociados
          .map(
            (r) =>
              `${r.descripcion} (${r.cantidad} registro${
                r.cantidad > 1 ? "s" : ""
              })`
          )
          .join(", ");

        return res.status(400).json({
          success: false,
          message: `No se puede eliminar el usuario porque tiene ${tablasConRegistros}.`,
          tablas: registrosAsociados.map((r) => ({
            tabla: r.tabla,
            descripcion: r.descripcion,
            cantidad: r.cantidad,
          })),
        });
      } catch (err) {
        return res.status(400).json({
          success: false,
          message:
            "No se puede eliminar el usuario porque tiene movimientos asociados.",
        });
      }
    }
    res.status(500).json({
      success: false,
      message: "Error al eliminar usuario",
      error: error.message,
    });
  }
};
