import { useEffect, useState, useCallback } from "react";
import {
  getPerfiles,
  createPerfil,
  updatePerfil,
  deletePerfil,
} from "../../services/perfiles.service";
import {
  createPerfilMenu,
  getPermisosByPerfil,
  deletePerfilMenu,
} from "../../services/perfilmenu.service";
import PerfilesList from "../../components/perfiles/PerfilesList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Perfil {
  PerfilId: number;
  PerfilDescripcion: string;
  id: number;
  [key: string]: unknown;
}

interface PaginationType {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function PerfilesPage() {
  const [perfilesData, setPerfilesData] = useState<{
    perfiles: Perfil[];
    pagination: PaginationType;
  }>({ perfiles: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPerfil, setCurrentPerfil] = useState<Perfil | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const puedeCrear = usePermiso("PERFILES", "crear");
  const puedeEditar = usePermiso("PERFILES", "editar");
  const puedeEliminar = usePermiso("PERFILES", "eliminar");
  const puedeLeer = usePermiso("PERFILES", "leer");

  const fetchPerfiles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPerfiles(currentPage, itemsPerPage);
      const data = response.data;
      setPerfilesData({
        perfiles: data,
        pagination: response.pagination || {
          totalItems: data.length,
          totalPages: 1,
        },
      });
    } catch {
      setError("Error al obtener perfiles");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchPerfiles();
  }, [fetchPerfiles]);

  const handleCreate = () => {
    setCurrentPerfil(null);
    setIsModalOpen(true);
  };

  const handleEdit = (perfil: Perfil) => {
    setCurrentPerfil({ ...perfil, id: perfil.PerfilId });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
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
          await deletePerfil(id);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Perfil eliminado",
            showConfirmButton: false,
            timer: 2000,
          });
          fetchPerfiles();
        } catch {
          Swal.fire({ icon: "error", title: "No se pudo eliminar" });
        }
      }
    });
  };

  const handleSubmit = async (
    perfilData: Perfil & { menusSeleccionados?: number[] }
  ) => {
    try {
      let perfilId = perfilData.PerfilId;
      if (currentPerfil) {
        await updatePerfil(currentPerfil.PerfilId, { ...perfilData });
        perfilId = currentPerfil.PerfilId;
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Perfil actualizado",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        const res = await createPerfil({ ...perfilData });
        perfilId = res.PerfilId;
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Perfil creado",
          showConfirmButton: false,
          timer: 2000,
        });
      }
      // Asignar menús
      if (perfilData.menusSeleccionados) {
        const actuales = await getPermisosByPerfil(perfilId);
        const arr = Array.isArray(actuales) ? actuales : actuales.data;
        if (Array.isArray(arr)) {
          for (const rel of arr) {
            await deletePerfilMenu(perfilId, rel.MenuId);
          }
        }
        for (const menuId of perfilData.menusSeleccionados) {
          await createPerfilMenu({ PerfilId: perfilId, MenuId: menuId });
        }
      }
      setIsModalOpen(false);
      fetchPerfiles();
    } catch {
      setError("Error al guardar perfil");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => setSearchInput(value);

  const handleSearchSubmit = () => setSearchTerm(searchInput);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearchSubmit();
  };

  const filteredPerfiles = perfilesData.perfiles.filter((perfil) =>
    perfil.PerfilDescripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!puedeLeer) return <div>No tienes permiso para ver los perfiles</div>;
  if (loading) return <div>Cargando perfiles...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Perfiles</h1>
      <PerfilesList
        perfiles={filteredPerfiles.map((p) => ({ ...p, id: p.PerfilId }))}
        onEdit={puedeEditar ? handleEdit : undefined}
        onDelete={puedeEliminar ? handleDelete : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentPerfil={currentPerfil}
        onSubmit={handleSubmit}
        searchTerm={searchInput}
        onSearch={handleSearch}
        onKeyPress={handleKeyPress}
        onSearchSubmit={handleSearchSubmit}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={perfilesData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
