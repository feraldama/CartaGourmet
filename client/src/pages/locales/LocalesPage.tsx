import { useEffect, useState, useCallback } from "react";
import {
  getLocales,
  deleteLocal,
  searchLocales,
  createLocal,
  updateLocal,
} from "../../services/locales.service";
import LocalesList from "../../components/locales/LocalesList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Local {
  id: string | number;
  LocalId: string | number;
  LocalNombre: string;
  LocalTelefono?: string;
  LocalCelular?: string;
  LocalDireccion?: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function LocalesPage() {
  const [localesData, setLocalesData] = useState<{
    locales: Local[];
    pagination: Pagination;
  }>({ locales: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentLocal, setCurrentLocal] = useState<Local | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const puedeCrear = usePermiso("LOCALES", "crear");
  const puedeEditar = usePermiso("LOCALES", "editar");
  const puedeEliminar = usePermiso("LOCALES", "eliminar");
  const puedeLeer = usePermiso("LOCALES", "leer");

  const fetchLocales = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchLocales(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getLocales(currentPage, itemsPerPage, sortKey, sortOrder);
      }
      setLocalesData({
        locales: data.data,
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
    fetchLocales();
  }, [fetchLocales]);

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
          await deleteLocal(id);
          Swal.fire({
            icon: "success",
            title: "Local eliminado exitosamente",
          });
          setLocalesData((prev) => ({
            ...prev,
            locales: prev.locales.filter((local) => local.LocalId !== id),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar el local";
          Swal.fire({
            icon: "warning",
            title: "No permitido",
            text: msg,
          });
        }
      }
    });
  };

  const handleCreate = () => {
    setCurrentLocal(null);
    setIsModalOpen(true);
  };

  const handleEdit = (local: Local) => {
    setCurrentLocal(local);
    setIsModalOpen(true);
  };

  const handleSubmit = async (localData: Local) => {
    let mensaje = "";
    try {
      if (currentLocal) {
        await updateLocal(currentLocal.LocalId, localData);
        mensaje = "Local actualizado exitosamente";
      } else {
        const response = await createLocal(localData);
        mensaje = response.message || "Local creado exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchLocales();
    } catch (error) {
      const msg =
        (error as { message?: string })?.message ||
        "Error desconocido al guardar local";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  if (!puedeLeer) return <div>No tienes permiso para ver los locales.</div>;
  if (loading) return <div>Cargando locales...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Locales</h1>
      <LocalesList
        locales={localesData.locales.map((l) => ({ ...l, id: l.LocalId }))}
        onDelete={
          puedeEliminar
            ? (local) => handleDelete(local.LocalId as string)
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={localesData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentLocal={
          currentLocal ? { ...currentLocal, id: currentLocal.LocalId } : null
        }
        onSubmit={handleSubmit}
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
        totalPages={localesData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
