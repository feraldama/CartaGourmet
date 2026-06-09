import { useEffect, useState, useCallback } from "react";
import {
  getClientes,
  deleteCliente,
  searchClientes,
  createCliente,
  updateCliente,
  type ClienteFilters,
} from "../../services/clientes.service";
import CustomersList from "../../components/customers/CustomersList";
import type { Cliente } from "../../components/common/ClienteFormModal";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";
import {
  LoadingState,
  ErrorState,
  PermissionDenied,
} from "../../components/common/ui";

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function CustomersPage() {
  const [clientesData, setClientesData] = useState<{
    clientes: Cliente[];
    pagination: Pagination;
  }>({ clientes: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCliente, setCurrentCliente] = useState<Cliente | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<ClienteFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  const puedeCrear = usePermiso("CLIENTES", "crear");
  const puedeEditar = usePermiso("CLIENTES", "editar");
  const puedeEliminar = usePermiso("CLIENTES", "eliminar");
  const puedeLeer = usePermiso("CLIENTES", "leer");

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchClientes(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder,
          filters
        );
      } else {
        data = await getClientes(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder,
          filters
        );
      }
      setClientesData({
        clientes: data.data,
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

  const handleFiltersChange = (newFilters: ClienteFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

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

  const handleDelete = async (cliente: Cliente) => {
    if (cliente.ClienteId == null) return;
    const id = String(cliente.ClienteId);
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
          await deleteCliente(id);
          Swal.fire({
            icon: "success",
            title: "Cliente eliminado exitosamente",
          });
          setClientesData((prev) => ({
            ...prev,
            clientes: prev.clientes.filter(
              (c) => String(c.ClienteId) !== id
            ),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar el cliente";
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
    setCurrentCliente(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cliente: Cliente) => {
    setCurrentCliente(cliente);
    setIsModalOpen(true);
  };

  const handleSubmit = async (clienteData: Cliente) => {
    let mensaje = "";
    try {
      // Aplicar trim al UsuarioId antes de enviar
      const clienteDataTrimmed = {
        ...clienteData,
        UsuarioId: clienteData.UsuarioId
          ? String(clienteData.UsuarioId).trim()
          : "",
      };
      if (currentCliente && currentCliente.ClienteId != null) {
        await updateCliente(
          String(currentCliente.ClienteId),
          clienteDataTrimmed
        );
        mensaje = "Cliente actualizado exitosamente";
      } else {
        const response = await createCliente(clienteDataTrimmed);
        mensaje = response.message || "Cliente creado exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchClientes();
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

  if (!puedeLeer) return <PermissionDenied resource="los clientes" />;
  if (loading) return <LoadingState message="Cargando clientes..." />;
  if (error)
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError(null);
          fetchClientes();
        }}
      />
    );

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Clientes</h1>
      <CustomersList
        clientes={clientesData.clientes.map((c) => ({ ...c, id: c.ClienteId }))}
        onDelete={puedeEliminar ? handleDelete : undefined}
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={clientesData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentCliente={
          currentCliente
            ? { ...currentCliente, id: currentCliente.ClienteId }
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
        filters={filters}
        onFiltersChange={handleFiltersChange}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={clientesData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
