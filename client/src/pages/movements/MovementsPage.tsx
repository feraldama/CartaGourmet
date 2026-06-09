import { useEffect, useState, useCallback } from "react";
import {
  getRegistrosDiariosCaja,
  deleteRegistroDiarioCaja,
  searchRegistrosDiariosCaja,
  createRegistroDiarioCaja,
  updateRegistroDiarioCaja,
  type RegistroFilters,
} from "../../services/registros.service";
import { getCajas } from "../../services/cajas.service";
import { getTiposGasto } from "../../services/tipogasto.service";
import MovementsList from "../../components/movements/MovementsList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";
import {
  LoadingState,
  ErrorState,
  PermissionDenied,
} from "../../components/common/ui";

// Tipos auxiliares
interface Movimiento {
  id: string | number;
  RegistroDiarioCajaId: string | number;
  RegistroDiarioCajaFecha: string;
  RegistroDiarioCajaDetalle: string;
  RegistroDiarioCajaMonto: number;
  UsuarioId: string | number;
  CajaId: string | number;
  TipoGastoId: string | number;
  CajaDescripcion: string;
  TipoGastoDescripcion: string;
  TipoGastoGrupoDescripcion: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function MovementsPage() {
  const [movimientosData, setMovimientosData] = useState<{
    movimientos: Movimiento[];
    pagination: Pagination;
  }>({ movimientos: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [currentMovement, setCurrentMovement] = useState<Movimiento | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string>("RegistroDiarioCajaId");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [filters, setFilters] = useState<RegistroFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [cajas, setCajas] = useState<
    { CajaId: number; CajaDescripcion: string }[]
  >([]);
  const [tiposGasto, setTiposGasto] = useState<
    { TipoGastoId: number; TipoGastoDescripcion: string }[]
  >([]);
  const puedeCrear = usePermiso("REGISTRODIARIOCAJA", "crear");
  const puedeEditar = usePermiso("REGISTRODIARIOCAJA", "editar");
  const puedeEliminar = usePermiso("REGISTRODIARIOCAJA", "eliminar");
  const puedeLeer = usePermiso("REGISTRODIARIOCAJA", "leer");

  const fetchMovimientos = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchRegistrosDiariosCaja(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder,
          filters
        );
      } else {
        data = await getRegistrosDiariosCaja(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder,
          filters
        );
      }
      setMovimientosData({
        movimientos: data.data,
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
  }, [
    currentPage,
    appliedSearchTerm,
    itemsPerPage,
    sortKey,
    sortOrder,
    filters,
  ]);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  useEffect(() => {
    // Cargar opciones para los dropdowns de filtros.
    const loadFilterOptions = async () => {
      try {
        const [cajasRes, tiposRes] = await Promise.all([
          getCajas(1, 200),
          getTiposGasto(),
        ]);
        setCajas(cajasRes?.data || []);
        setTiposGasto(Array.isArray(tiposRes) ? tiposRes : tiposRes?.data || []);
      } catch (err) {
        console.error("Error al cargar opciones de filtros:", err);
      }
    };
    loadFilterOptions();
  }, []);

  const handleFiltersChange = (newFilters: RegistroFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

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

  const handleDelete = async (movimiento: Movimiento) => {
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
          await deleteRegistroDiarioCaja(movimiento.RegistroDiarioCajaId);
          Swal.fire({
            icon: "success",
            title: "Registro eliminado exitosamente",
          });
          fetchMovimientos();
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar el registro";
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
    setCurrentMovement(null);
    setIsModalOpen(true);
  };

  const handleEdit = (movimiento: Movimiento) => {
    setCurrentMovement(movimiento);
    setIsModalOpen(true);
  };

  const handleSubmit = async (movementData: Movimiento) => {
    let mensaje = "";
    try {
      if (currentMovement) {
        await updateRegistroDiarioCaja(
          currentMovement.RegistroDiarioCajaId,
          movementData
        );
        mensaje = "Registro actualizado exitosamente";
      } else {
        const response = await createRegistroDiarioCaja(movementData);
        mensaje = response.message || "Registro creado exitosamente";
      }

      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchMovimientos();
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
    return <PermissionDenied resource="los registros diarios de caja" />;
  if (loading) return <LoadingState message="Cargando registros..." />;
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError(null);
          fetchMovimientos();
        }}
      />
    );

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Registro Diario de Caja</h1>
      <MovementsList
        movimientos={movimientosData.movimientos}
        onDelete={puedeEliminar ? handleDelete : undefined}
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={movimientosData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentMovement={currentMovement}
        onSubmit={handleSubmit}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortKey(key);
          setSortOrder(order);
          setCurrentPage(1);
        }}
        disableEdit={true}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        cajas={cajas}
        tiposGasto={tiposGasto}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={movimientosData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
