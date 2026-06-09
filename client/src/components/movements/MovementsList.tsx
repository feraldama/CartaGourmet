import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon, FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { RegistroFilters } from "../../services/registros.service";
import { formatMiles } from "../../utils/utils";

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
  // Puedes agregar más campos si tu paginación los tiene
}

interface MovementsListProps {
  movimientos: Movimiento[];
  onDelete?: (item: Movimiento) => void;
  onEdit?: (item: Movimiento) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  isModalOpen?: boolean;
  onCloseModal: () => void;
  currentMovement?: Movimiento | null;
  onSubmit: (formData: Movimiento) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
  disableEdit?: boolean;
  filters?: RegistroFilters;
  onFiltersChange?: (filters: RegistroFilters) => void;
  cajas?: { CajaId: number; CajaDescripcion: string }[];
  tiposGasto?: { TipoGastoId: number; TipoGastoDescripcion: string }[];
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export default function MovementsList({
  movimientos = [],
  onDelete,
  onEdit,
  onCreate,
  pagination,
  onSearch,
  searchTerm,
  onKeyPress,
  onSearchSubmit,
  sortKey,
  sortOrder,
  onSort,
  isModalOpen,
  onCloseModal,
  currentMovement,
  onSubmit,
  disableEdit,
  filters,
  onFiltersChange,
  cajas = [],
  tiposGasto = [],
  showFilters = false,
  onToggleFilters,
}: MovementsListProps) {
  const activeFilters = filters || {};
  const activeFilterCount = Object.values(activeFilters).filter(
    (v) => v !== undefined && v !== "" && v !== null
  ).length;

  const updateFilter = <K extends keyof RegistroFilters>(
    key: K,
    value: RegistroFilters[K] | ""
  ) => {
    if (!onFiltersChange) return;
    const next: RegistroFilters = { ...activeFilters };
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

  // Estado local para inputs libres (fechas y montos) — evita fetch por cada
  // tecla mientras el usuario escribe. Sincroniza en blur / Enter.
  const [fechaDesdeLocal, setFechaDesdeLocal] = useState(
    activeFilters.fechaDesde || ""
  );
  const [fechaHastaLocal, setFechaHastaLocal] = useState(
    activeFilters.fechaHasta || ""
  );
  const [montoMinLocal, setMontoMinLocal] = useState(
    activeFilters.montoMin?.toString() || ""
  );
  const [montoMaxLocal, setMontoMaxLocal] = useState(
    activeFilters.montoMax?.toString() || ""
  );
  useEffect(() => {
    setFechaDesdeLocal(activeFilters.fechaDesde || "");
  }, [activeFilters.fechaDesde]);
  useEffect(() => {
    setFechaHastaLocal(activeFilters.fechaHasta || "");
  }, [activeFilters.fechaHasta]);
  useEffect(() => {
    setMontoMinLocal(activeFilters.montoMin?.toString() || "");
  }, [activeFilters.montoMin]);
  useEffect(() => {
    setMontoMaxLocal(activeFilters.montoMax?.toString() || "");
  }, [activeFilters.montoMax]);
  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Formatear monto
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      currencyDisplay: "code", // Muestra "PYG"
    })
      .format(amount)
      .replace("PYG", "Gs."); // Reemplaza "PYG" con "Gs."
  };

  // Configuración de columnas para la tabla
  const columns = [
    {
      key: "RegistroDiarioCajaId",
      label: "ID",
    },
    {
      key: "CajaDescripcion",
      label: "Caja",
    },
    {
      key: "RegistroDiarioCajaFecha",
      label: "Fecha",
      render: (row: Movimiento) => formatDate(row.RegistroDiarioCajaFecha),
    },
    {
      key: "TipoGastoDescripcion",
      label: "Tipo Gasto",
    },
    {
      key: "TipoGastoGrupoDescripcion",
      label: "Grupo Gasto",
    },
    {
      key: "RegistroDiarioCajaDetalle",
      label: "Descripción",
    },
    {
      key: "RegistroDiarioCajaMonto",
      label: "Monto",
      render: (item: Movimiento) => formatAmount(item.RegistroDiarioCajaMonto),
    },
    {
      key: "UsuarioId",
      label: "Usuario",
    },
  ];

  const handleBackdropClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    if (event.target === event.currentTarget) {
      onCloseModal();
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentMovement) {
      onSubmit(currentMovement);
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
            placeholder="Buscar registros..."
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
          <ActionButton
            label="Nuevo Registro"
            onClick={onCreate}
            icon={PlusIcon}
          />
        </div>
      </div>
      {onFiltersChange && showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Caja
              </label>
              <select
                value={activeFilters.cajaId ?? ""}
                onChange={(e) => updateFilter("cajaId", e.target.value || "")}
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                <option value="">Todas</option>
                {cajas.map((c) => (
                  <option key={c.CajaId} value={c.CajaId}>
                    {c.CajaDescripcion}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Monto mín.
              </label>
              <input
                type="number"
                min={0}
                value={montoMinLocal}
                onChange={(e) => setMontoMinLocal(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (
                    value &&
                    montoMaxLocal &&
                    Number(value) > Number(montoMaxLocal)
                  ) {
                    setMontoMinLocal(activeFilters.montoMin?.toString() || "");
                    return;
                  }
                  if (value !== (activeFilters.montoMin?.toString() || "")) {
                    updateFilter("montoMin", value);
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
                Monto máx.
              </label>
              <input
                type="number"
                min={0}
                value={montoMaxLocal}
                onChange={(e) => setMontoMaxLocal(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (
                    value &&
                    montoMinLocal &&
                    Number(value) < Number(montoMinLocal)
                  ) {
                    setMontoMaxLocal(activeFilters.montoMax?.toString() || "");
                    return;
                  }
                  if (value !== (activeFilters.montoMax?.toString() || "")) {
                    updateFilter("montoMax", value);
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
                Tipo Gasto
              </label>
              <select
                value={activeFilters.tipoGastoId ?? ""}
                onChange={(e) =>
                  updateFilter("tipoGastoId", e.target.value || "")
                }
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                <option value="">Todos</option>
                {tiposGasto.map((t) => (
                  <option key={t.TipoGastoId} value={t.TipoGastoId}>
                    {t.TipoGastoDescripcion}
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
          Mostrando {formatMiles(movimientos.length)} de{" "}
          {formatMiles(pagination?.totalItems || 0)} registros
        </div>
      </div>

      <DataTable<Movimiento>
        columns={columns}
        data={movimientos}
        onEdit={disableEdit ? undefined : onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron registros"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative w-full max-w-2xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto"
            >
              <ActionButton
                label={currentMovement ? "Actualizar" : "Crear"}
                type="submit"
              />
              <ActionButton
                label="Cancelar"
                className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
                onClick={onCloseModal}
              />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
