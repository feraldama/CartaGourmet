import { useEffect, useState, useCallback } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import {
  getTiposGastoPaginated,
  deleteTipoGasto,
  searchTiposGasto,
  createTipoGasto,
  updateTipoGasto,
} from "../../services/tipogasto.service";
import TiposGastoList from "../../components/tipogasto/TiposGastoList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";

interface TipoGasto {
  id: string | number;
  TipoGastoId: string | number;
  TipoGastoDescripcion: string;
  TipoGastoCantGastos: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function TiposGastoPage() {
  const [tiposGastoData, setTiposGastoData] = useState<{
    tiposGasto: TipoGasto[];
    pagination: Pagination;
  }>({ tiposGasto: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTipoGasto, setCurrentTipoGasto] = useState<TipoGasto | null>(
    null
  );
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const puedeCrear = usePermiso("TIPOSGASTO", "crear");
  const puedeEditar = usePermiso("TIPOSGASTO", "editar");
  const puedeEliminar = usePermiso("TIPOSGASTO", "eliminar");
  const puedeLeer = usePermiso("TIPOSGASTO", "leer");

  const fetchTiposGasto = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchTiposGasto(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
        setTiposGastoData({
          tiposGasto: data.data,
          pagination: data.pagination,
        });
      } else {
        data = await getTiposGastoPaginated(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
        setTiposGastoData({
          tiposGasto: data.data,
          pagination: data.pagination,
        });
      }
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
    fetchTiposGasto();
  }, [fetchTiposGasto]);

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
          await deleteTipoGasto(id);
          Swal.fire({
            icon: "success",
            title: "Tipo de gasto eliminado exitosamente",
          });
          setTiposGastoData((prev) => ({
            ...prev,
            tiposGasto: prev.tiposGasto.filter(
              (tipo) => tipo.TipoGastoId !== id
            ),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar el tipo de gasto";
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
    setCurrentTipoGasto(null);
    setIsModalOpen(true);
  };

  const handleEdit = (tipo: TipoGasto) => {
    setCurrentTipoGasto(tipo);
    setIsModalOpen(true);
  };

  const handleSubmit = async (tipoGastoData: TipoGasto) => {
    let mensaje = "";
    try {
      if (currentTipoGasto) {
        await updateTipoGasto(currentTipoGasto.TipoGastoId, tipoGastoData);
        mensaje = "Tipo de gasto actualizado exitosamente";
      } else {
        const response = await createTipoGasto(tipoGastoData);
        mensaje = response.message || "Tipo de gasto creado exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchTiposGasto();
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
    setCurrentPage(1);
  };

  if (!puedeLeer)
    return <div>No tienes permiso para ver los tipos de gasto.</div>;
  if (loading) return <div>Cargando tipos de gasto...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Tipos de Gasto</h1>
      <TiposGastoList
        tiposGasto={tiposGastoData.tiposGasto.map((t) => ({
          ...t,
          id: t.TipoGastoId,
        }))}
        onDelete={
          puedeEliminar
            ? (tipo) => handleDelete(tipo.TipoGastoId as string)
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={tiposGastoData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentTipoGasto={
          currentTipoGasto
            ? { ...currentTipoGasto, id: currentTipoGasto.TipoGastoId }
            : null
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
        totalPages={tiposGastoData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
