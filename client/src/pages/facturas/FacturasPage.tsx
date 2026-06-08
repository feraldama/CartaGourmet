import { useEffect, useState, useCallback } from "react";
import {
  getFacturas,
  deleteFactura,
  searchFacturas,
  createFactura,
  updateFactura,
} from "../../services/factura.service";
import FacturasList from "../../components/facturas/FacturasList";
import Pagination from "../../components/common/Pagination";
import Swal from "sweetalert2";
import { usePermiso } from "../../hooks/usePermiso";

interface Factura {
  id: string | number;
  FacturaId: string | number;
  FacturaTimbrado: string;
  FacturaDesde: string;
  FacturaHasta: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function FacturasPage() {
  const [facturasData, setFacturasData] = useState<{
    facturas: Factura[];
    pagination: Pagination;
  }>({ facturas: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentFactura, setCurrentFactura] = useState<Factura | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string | undefined>("FacturaId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const puedeCrear = usePermiso("FACTURAS", "crear");
  const puedeEditar = usePermiso("FACTURAS", "editar");
  const puedeEliminar = usePermiso("FACTURAS", "eliminar");
  const puedeLeer = usePermiso("FACTURAS", "leer");

  const fetchFacturas = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchFacturas(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getFacturas(currentPage, itemsPerPage, sortKey, sortOrder);
      }
      setFacturasData({
        facturas: data.data,
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
    fetchFacturas();
  }, [fetchFacturas]);

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
          await deleteFactura(id);
          Swal.fire({
            icon: "success",
            title: "Factura eliminada exitosamente",
          });
          setFacturasData((prev) => ({
            ...prev,
            facturas: prev.facturas.filter(
              (factura) => factura.FacturaId !== id
            ),
          }));
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar la factura";
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
    setCurrentFactura(null);
    setIsModalOpen(true);
  };

  const handleEdit = (factura: Factura) => {
    setCurrentFactura(factura);
    setIsModalOpen(true);
  };

  const handleSubmit = async (facturaData: Factura) => {
    let mensaje = "";
    try {
      if (currentFactura) {
        await updateFactura(currentFactura.FacturaId, facturaData);
        mensaje = "Factura actualizada exitosamente";
      } else {
        const response = await createFactura(facturaData);
        mensaje = response.message || "Factura creada exitosamente";
      }
      setIsModalOpen(false);
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: mensaje,
        showConfirmButton: false,
        timer: 2000,
      });
      fetchFacturas();
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

  if (loading) return <div>Cargando facturas...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!puedeLeer) return <div>No tienes permiso para ver las facturas</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Gestión de Facturas</h1>
      <FacturasList
        facturas={facturasData.facturas.map((f) => ({
          ...f,
          id: f.FacturaId,
        }))}
        onDelete={
          puedeEliminar
            ? (factura) => handleDelete(factura.FacturaId as string)
            : undefined
        }
        onEdit={puedeEditar ? handleEdit : undefined}
        onCreate={puedeCrear ? handleCreate : undefined}
        pagination={facturasData.pagination}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        isModalOpen={isModalOpen}
        onCloseModal={() => setIsModalOpen(false)}
        currentFactura={
          currentFactura
            ? { ...currentFactura, id: currentFactura.FacturaId }
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
        totalPages={facturasData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
