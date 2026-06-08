import { useEffect, useState, useCallback } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import {
  getMenus,
  createMenu,
  updateMenu,
  deleteMenu,
} from "../../services/menus.service";
import MenusList from "../../components/menus/MenusList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";

interface Menu {
  id: string;
  MenuId: string;
  MenuNombre: string;
  [key: string]: unknown;
}

interface PaginationType {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function MenusPage() {
  const [menusData, setMenusData] = useState<{
    menus: Menu[];
    pagination: PaginationType;
  }>({ menus: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<Menu | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const puedeCrear = usePermiso("MENUS", "crear");
  const puedeEditar = usePermiso("MENUS", "editar");
  const puedeEliminar = usePermiso("MENUS", "eliminar");
  const puedeLeer = usePermiso("MENUS", "leer");

  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMenus(currentPage, itemsPerPage, searchTerm);
      const data = response.data;
      setMenusData({
        menus: data,
        pagination: response.pagination || {
          totalItems: data.length,
          totalPages: 1,
        },
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al obtener menús");
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const handleCreate = () => {
    setCurrentMenu(null);
    setIsModalOpen(true);
  };

  const handleEdit = (menu: Menu) => {
    setCurrentMenu({ ...menu, id: menu.MenuId });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
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
          await deleteMenu(id);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Menú eliminado",
            showConfirmButton: false,
            timer: 2000,
          });
          fetchMenus();
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar el menú";
          Swal.fire({
            icon: "warning",
            title: "No permitido",
            text: msg,
          });
        }
      }
    });
  };

  const handleSubmit = async (menuData: Menu) => {
    try {
      if (currentMenu) {
        await updateMenu(currentMenu.MenuId, { ...menuData });
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Menú actualizado",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        await createMenu({ ...menuData });
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Menú creado",
          showConfirmButton: false,
          timer: 2000,
        });
      }
      setIsModalOpen(false);
      fetchMenus();
    } catch {
      setError("Error al guardar menú");
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

  if (!puedeLeer) return <div>No tienes permiso para ver los menús.</div>;
  if (loading) return <div>Cargando menús...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Menús</h1>
      <MenusList
        menus={menusData.menus.map((m) => ({ ...m, id: m.MenuId }))}
        onEdit={puedeEditar ? handleEdit : undefined}
        onDelete={puedeEliminar ? handleDelete : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentMenu={currentMenu}
        onSubmit={handleSubmit}
        searchTerm={searchInput}
        onSearch={handleSearch}
        onKeyPress={handleKeyPress}
        onSearchSubmit={handleSearchSubmit}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={menusData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
