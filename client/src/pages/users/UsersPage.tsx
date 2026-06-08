import { useEffect, useState, useCallback } from "react";
import {
  getUsuarios,
  deleteUsuario,
  searchUsuarios,
  createUsuario,
  updateUsuario,
} from "../../services/usuarios.service";
import UsersList from "../../components/users/UsersList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";
import {
  createUsuarioPerfil,
  getPerfilesByUsuario,
  deleteUsuarioPerfil,
} from "../../services/usuarioperfil.service";

// Tipos auxiliares
interface Usuario {
  id: string | number;
  UsuarioId: string;
  UsuarioNombre: string;
  UsuarioApellido: string;
  UsuarioCorreo: string;
  UsuarioIsAdmin: "S" | "N";
  UsuarioEstado: "A" | "I";
  LocalId: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

type UsuarioConPerfiles = Usuario & { perfilesSeleccionados?: number[] };

export default function UsuariosPage() {
  const [usuariosData, setUsuariosData] = useState<{
    usuarios: Usuario[];
    pagination: Pagination;
  }>({ usuarios: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [editingPassword, setEditingPassword] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const puedeCrear = usePermiso("USUARIOS", "crear");
  const puedeEditar = usePermiso("USUARIOS", "editar");
  const puedeEliminar = usePermiso("USUARIOS", "eliminar");
  const puedeLeer = usePermiso("USUARIOS", "leer");

  const fetchUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchUsuarios(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getUsuarios(currentPage, itemsPerPage, sortKey, sortOrder);
      }
      setUsuariosData({
        usuarios: data.data,
        pagination: data.pagination,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, appliedSearchTerm, itemsPerPage, sortKey, sortOrder]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const applySearch = () => {
    setAppliedSearchTerm(searchTerm);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applySearch();
    }
  };

  const handleDelete = async (id: string) => {
    // Validar que el ID no esté vacío
    if (!id || id.trim() === "") {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "ID de usuario inválido",
      });
      return;
    }

    Swal.fire({
      title: "¿Estás seguro?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar!",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteUsuario(id);
          Swal.fire({
            icon: "success",
            title: "Usuario eliminado exitosamente",
          });
          setUsuariosData((prev) => ({
            ...prev,
            usuarios: prev.usuarios.filter(
              (usuario) => usuario.UsuarioId !== id
            ),
          }));
        } catch (error: unknown) {
          const err = error as {
            message?: string;
            tablas?: Array<{
              tabla: string;
              descripcion: string;
              cantidad: number;
            }>;
          };
          const msg = err?.message || "No se pudo eliminar el usuario";

          // Si hay información de tablas asociadas, mostrarla
          if (err?.tablas && err.tablas.length > 0) {
            const detallesTablas = err.tablas
              .map(
                (t) =>
                  `• ${t.descripcion}: ${t.cantidad} registro${
                    t.cantidad > 1 ? "s" : ""
                  }`
              )
              .join("\n");

            Swal.fire({
              icon: "warning",
              title: "No se puede eliminar",
              html: `<div style="text-align: left;">
                <p><strong>${msg}</strong></p>
                <p style="margin-top: 10px;">Tablas con registros asociados:</p>
                <pre style="text-align: left; margin-top: 5px; font-size: 12px;">${detallesTablas}</pre>
              </div>`,
              width: "600px",
            });
          } else {
            Swal.fire({
              icon: "warning",
              title: "No permitido",
              text: msg,
            });
          }
        }
      }
    });
  };

  const handleCreate = () => {
    setCurrentUser(null); // Indica que es un nuevo usuario
    setIsModalOpen(true);
  };

  const handleEdit = (user: Usuario) => {
    setCurrentUser(user);
    setEditingPassword(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (userData: UsuarioConPerfiles) => {
    let mensaje = "";
    try {
      let usuarioId = userData.UsuarioId;
      if (currentUser) {
        await updateUsuario(currentUser.UsuarioId, userData);
        mensaje = "Usuario actualizado exitosamente";
      } else {
        if (!userData.UsuarioContrasena) {
          throw new Error("La contraseña es requerida para nuevos usuarios");
        }
        const response = await createUsuario(userData);
        usuarioId = response.data?.UsuarioId || userData.UsuarioId;
        mensaje = response.message || "Usuario creado exitosamente";
      }
      // Asignar perfiles
      if (userData.perfilesSeleccionados) {
        // 1. Obtener los perfiles actuales del usuario
        const actuales = await getPerfilesByUsuario(usuarioId);
        if (Array.isArray(actuales)) {
          // 2. Eliminar todos los perfiles actuales
          for (const rel of actuales) {
            await deleteUsuarioPerfil(usuarioId, rel.PerfilId);
          }
        }
        // 3. Insertar los nuevos perfiles seleccionados
        const payload = userData.perfilesSeleccionados.map((pid) => ({
          UsuarioId: usuarioId,
          PerfilId: pid,
        }));
        for (const rel of payload) {
          await createUsuarioPerfil(rel);
        }
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      setEditingPassword(false);
      fetchUsuarios();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Error desconocido");
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Resetear a la primera página cuando cambia el número de items por página
  };

  if (!puedeLeer) return <div>No tienes permiso para ver los usuarios</div>;

  if (loading) return <div>Cargando usuarios...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Usuarios</h1>
      <UsersList
        usuarios={usuariosData.usuarios.map((u) => ({ ...u, id: u.UsuarioId }))}
        onDelete={
          puedeEliminar
            ? (user) => {
                // Asegurarse de obtener el UsuarioId correctamente
                // El objeto user viene de DataTable y debería tener UsuarioId
                if (!user || typeof user !== "object") {
                  console.error("Usuario inválido recibido:", user);
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Datos de usuario inválidos",
                  });
                  return;
                }

                const userId = user.UsuarioId;
                if (!userId) {
                  console.error(
                    "Usuario sin UsuarioId. Objeto completo:",
                    user
                  );
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudo obtener el ID del usuario",
                  });
                  return;
                }
                handleDelete(String(userId));
              }
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={usuariosData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentUser={
          currentUser ? { ...currentUser, id: currentUser.UsuarioId } : null
        }
        onSubmit={handleSubmit}
        editingPassword={editingPassword}
        setEditingPassword={setEditingPassword}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortKey(key);
          setSortOrder(order);
          setCurrentPage(1);
        }}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={usuariosData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
