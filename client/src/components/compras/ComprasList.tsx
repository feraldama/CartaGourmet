import { useEffect, useState } from "react";
import DataTable from "../common/Table/DataTable";
import type { Compra, CompraProducto } from "../../services/compras.service";
import { formatCurrency } from "../../utils/utils";
import { getAlmacenById } from "../../services/almacenes.service";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

interface ComprasListProps {
  compras: Compra[];
  onSort?: (key: string, order: "asc" | "desc") => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onViewDetails?: (compra: Compra) => void;
  onCreate?: () => void;
  onDelete?: (compra: Compra) => void;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  pagination?: Pagination;
}

interface CompraWithId extends Compra {
  id: number;
  AlmacenNombre?: string;
  [key: string]:
    | string
    | number
    | boolean
    | undefined
    | CompraProducto[]
    | { ProveedorId: number; ProveedorNombre: string; ProveedorRUC: string };
}

const ComprasList = ({
  compras,
  onSort,
  sortKey,
  sortOrder,
  onViewDetails,
  onCreate,
  onDelete,
  onSearch,
  searchTerm,
  onKeyPress,
  onSearchSubmit,
  pagination,
}: ComprasListProps) => {
  const [comprasWithAlmacen, setComprasWithAlmacen] = useState<CompraWithId[]>(
    []
  );

  useEffect(() => {
    const loadAlmacenesData = async () => {
      const comprasData = compras.map((compra) => ({
        ...compra,
        id: compra.CompraId,
      }));

      try {
        const comprasWithAlmacenData = await Promise.all(
          comprasData.map(async (compra) => {
            try {
              const almacen = await getAlmacenById(compra.AlmacenId);
              return {
                ...compra,
                AlmacenNombre: almacen.AlmacenNombre,
              };
            } catch (error) {
              console.error(
                `Error al cargar almacén ${compra.AlmacenId}:`,
                error
              );
              return compra;
            }
          })
        );
        setComprasWithAlmacen(comprasWithAlmacenData);
      } catch (error) {
        console.error("Error al cargar datos de almacenes:", error);
        setComprasWithAlmacen(comprasData);
      }
    };

    loadAlmacenesData();
  }, [compras]);

  const getTipoCompraText = (tipo: string) => {
    switch (tipo) {
      case "CO":
        return "Contado";
      case "CR":
        return "Crédito";
      default:
        return tipo;
    }
  };

  const columns = [
    {
      key: "CompraId",
      label: "ID",
    },
    {
      key: "CompraFecha",
      label: "Fecha",
      render: (compra: CompraWithId) => {
        const fecha = new Date(compra.CompraFecha);
        return fecha.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    {
      key: "Proveedor",
      label: "Proveedor",
      render: (compra: CompraWithId) =>
        compra.ProveedorNombre
          ? compra.ProveedorNombre
          : `Proveedor #${compra.ProveedorId}`,
    },
    {
      key: "AlmacenNombre",
      label: "Almacén",
      render: (compra: CompraWithId) =>
        compra.AlmacenNombre || `Almacén #${compra.AlmacenId}`,
    },
    {
      key: "CompraTipo",
      label: "Tipo",
      render: (compra: CompraWithId) => getTipoCompraText(compra.CompraTipo),
    },
    {
      key: "CompraFactura",
      label: "Factura",
    },
    {
      key: "Total",
      label: "Total",
      render: (compra: CompraWithId) => formatCurrency(compra.Total),
    },
    {
      key: "CompraEntrega",
      label: "Entrega",
      render: (compra: CompraWithId) =>
        compra.CompraEntrega
          ? formatCurrency(Number(compra.CompraEntrega))
          : "-",
    },
    {
      key: "UsuarioId",
      label: "Usuario",
    },
  ];

  const getStatusColor = (status: unknown) => {
    switch (status) {
      case "P":
        return "bg-yellow-500"; // Pendiente
      case "C":
        return "bg-green-500"; // Completado
      case "A":
        return "bg-red-500"; // Anulado
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: unknown) => {
    switch (status) {
      case "P":
        return "Pendiente";
      case "C":
        return "Completado";
      case "A":
        return "Anulado";
      default:
        return "Desconocido";
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <SearchButton
            searchTerm={searchTerm}
            onSearch={onSearch}
            onKeyPress={onKeyPress}
            onSearchSubmit={onSearchSubmit}
            placeholder="Buscar compras..."
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Compra"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {comprasWithAlmacen.length} de{" "}
          {pagination?.totalItems || comprasWithAlmacen.length} compras
        </div>
      </div>

      <DataTable<CompraWithId>
        columns={columns}
        data={comprasWithAlmacen}
        onEdit={onViewDetails}
        onDelete={onDelete}
        emptyMessage="No hay compras registradas"
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
    </>
  );
};

export default ComprasList;
