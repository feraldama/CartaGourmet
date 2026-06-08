import { useEffect, useState, useCallback } from "react";
import {
  getCajas,
  deleteCaja,
  searchCajas,
  createCaja,
  updateCaja,
} from "../../services/cajas.service";
import CajasList from "../../components/cajas/CajasList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function CajasPage() {
  const [cajasData, setCajasData] = useState<{
    cajas: Caja[];
    pagination: Pagination;
  }>({ cajas: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCaja, setCurrentCaja] = useState<Caja | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const puedeCrear = usePermiso("CAJAS", "crear");
  const puedeEditar = usePermiso("CAJAS", "editar");
  const puedeEliminar = usePermiso("CAJAS", "eliminar");
  const puedeLeer = usePermiso("CAJAS", "leer");

  const fetchCajas = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchCajas(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getCajas(currentPage, itemsPerPage, sortKey, sortOrder);
      }
      setCajasData({
        cajas: data.data,
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
    fetchCajas();
  }, [fetchCajas]);

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
          await deleteCaja(id);
          Swal.fire({
            icon: "success",
            title: "Caja eliminada exitosamente",
          });
          setCajasData((prev) => ({
            ...prev,
            cajas: prev.cajas.filter((caja) => caja.CajaId !== id),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar la caja";
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
    setCurrentCaja(null);
    setIsModalOpen(true);
  };

  const handleEdit = (caja: Caja) => {
    setCurrentCaja(caja);
    setIsModalOpen(true);
  };

  const handleSubmit = async (cajaData: Caja) => {
    let mensaje = "";
    try {
      if (currentCaja) {
        await updateCaja(currentCaja.CajaId, cajaData);
        mensaje = "Caja actualizada exitosamente";
      } else {
        const response = await createCaja(cajaData);
        mensaje = response.message || "Caja creada exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchCajas();
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

  if (!puedeLeer) return <div>No tienes permiso para ver las cajas</div>;

  if (loading) return <div>Cargando cajas...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Cajas</h1>
      <CajasList
        cajas={cajasData.cajas.map((c) => ({ ...c, id: c.CajaId }))}
        onDelete={
          puedeEliminar
            ? (caja) => handleDelete(caja.CajaId as string)
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={cajasData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentCaja={
          currentCaja ? { ...currentCaja, id: currentCaja.CajaId } : null
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
        totalPages={cajasData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
