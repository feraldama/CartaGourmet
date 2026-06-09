import { useEffect, useState } from "react";
import DataTable from "../common/Table/DataTable";
import type {
  Compra,
  CompraProducto,
  CompraFilters,
} from "../../services/compras.service";
import { formatCurrency, formatMiles } from "../../utils/utils";
import { getAlmacenById } from "../../services/almacenes.service";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import { PlusIcon, FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
  filters?: CompraFilters;
  onFiltersChange?: (filters: CompraFilters) => void;
  almacenes?: { AlmacenId: number; AlmacenNombre: string }[];
  proveedores?: { ProveedorId: number; ProveedorNombre: string }[];
  showFilters?: boolean;
  onToggleFilters?: () => void;
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
  filters,
  onFiltersChange,
  almacenes = [],
  proveedores = [],
  showFilters = false,
  onToggleFilters,
}: ComprasListProps) => {
  const [comprasWithAlmacen, setComprasWithAlmacen] = useState<CompraWithId[]>(
    []
  );

  const activeFilters = filters || {};
  const activeFilterCount = Object.values(activeFilters).filter(
    (v) => v !== undefined && v !== "" && v !== null
  ).length;

  const updateFilter = <K extends keyof CompraFilters>(
    key: K,
    value: CompraFilters[K] | ""
  ) => {
    if (!onFiltersChange) return;
    const next: CompraFilters = { ...activeFilters };
    if (value === "" || value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onFiltersChange(next);
  };

  const clearFilters = () => {
    if (!onFiltersChange) return;
    onFiltersChange({});
  };

  const [fechaDesdeLocal, setFechaDesdeLocal] = useState(
    activeFilters.fechaDesde || ""
  );
  const [fechaHastaLocal, setFechaHastaLocal] = useState(
    activeFilters.fechaHasta || ""
  );
  useEffect(() => {
    setFechaDesdeLocal(activeFilters.fechaDesde || "");
  }, [activeFilters.fechaDesde]);
  useEffect(() => {
    setFechaHastaLocal(activeFilters.fechaHasta || "");
  }, [activeFilters.fechaHasta]);

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
        const raw = String(compra.CompraFecha ?? "");
        if (!raw) return "";
        // Si trae componente horario o sufijo Z, el backend ya lo ajustó a UTC
        // sobre el local del servidor; dejo que JS lo interprete y lo
        // muestre en local con hora.
        if (/[TZ:]/.test(raw)) {
          return new Date(raw).toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }
        // Fallback DATE puro "YYYY-MM-DD": construyo local sin hora.
        const [y, mo, d] = raw.slice(0, 10).split("-").map(Number);
        if (!y || !mo || !d) return raw;
        return new Date(y, mo - 1, d).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
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
      render: (compra: CompraWithId) => formatCurrency(Number(compra.Total)),
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
        <div className="py-4 flex gap-2">
          {onFiltersChange && onToggleFilters && (
            <button
              type="button"
              onClick={onToggleFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <FunnelIcon className="w-4 h-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
          {onCreate && (
            <ActionButton
              label="Nueva Compra"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      {onFiltersChange && showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Tipo
              </label>
              <select
                value={activeFilters.tipo || ""}
                onChange={(e) =>
                  updateFilter(
                    "tipo",
                    (e.target.value as CompraFilters["tipo"]) || ""
                  )
                }
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                <option value="">Todos</option>
                <option value="CO">Contado</option>
                <option value="CR">Crédito</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Proveedor
              </label>
              <select
                value={activeFilters.proveedorId ?? ""}
                onChange={(e) =>
                  updateFilter("proveedorId", e.target.value || "")
                }
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                <option value="">Todos</option>
                {proveedores.map((p) => (
                  <option key={p.ProveedorId} value={p.ProveedorId}>
                    {p.ProveedorNombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Almacén
              </label>
              <select
                value={activeFilters.almacenId ?? ""}
                onChange={(e) =>
                  updateFilter("almacenId", e.target.value || "")
                }
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                <option value="">Todos</option>
                {almacenes.map((a) => (
                  <option key={a.AlmacenId} value={a.AlmacenId}>
                    {a.AlmacenNombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Desde
              </label>
              <input
                type="date"
                value={fechaDesdeLocal}
                max={fechaHastaLocal || undefined}
                onChange={(e) => setFechaDesdeLocal(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && fechaHastaLocal && value > fechaHastaLocal) {
                    setFechaDesdeLocal(activeFilters.fechaDesde || "");
                    return;
                  }
                  if (value !== (activeFilters.fechaDesde || "")) {
                    updateFilter("fechaDesde", value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Hasta
              </label>
              <input
                type="date"
                value={fechaHastaLocal}
                min={fechaDesdeLocal || undefined}
                onChange={(e) => setFechaHastaLocal(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && fechaDesdeLocal && value < fechaDesdeLocal) {
                    setFechaHastaLocal(activeFilters.fechaHasta || "");
                    return;
                  }
                  if (value !== (activeFilters.fechaHasta || "")) {
                    updateFilter("fechaHasta", value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
              />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {formatMiles(comprasWithAlmacen.length)} de{" "}
          {formatMiles(pagination?.totalItems || comprasWithAlmacen.length)}{" "}
          compras
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
