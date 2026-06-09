import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import Button from "../common/Button/Button";
import ModalDialog from "../common/ModalDialog";
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
      useGrouping: true,
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
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-text bg-white border border-border rounded-md hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-2 focus:ring-brand-600/30 cursor-pointer"
            >
              <FunnelIcon className="w-4 h-4" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold text-white bg-brand-700 rounded-full">
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
        <div className="bg-surface-muted border border-border rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-xs font-medium text-text">
                Caja
              </label>
              <select
                value={activeFilters.cajaId ?? ""}
                onChange={(e) => updateFilter("cajaId", e.target.value || "")}
                className="w-full bg-white border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 p-2"
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
              <label className="block mb-1 text-xs font-medium text-text">
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
                className="w-full bg-white border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 p-2"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-text">
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
                className="w-full bg-white border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 p-2"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-text">
                Tipo Gasto
              </label>
              <select
                value={activeFilters.tipoGastoId ?? ""}
                onChange={(e) =>
                  updateFilter("tipoGastoId", e.target.value || "")
                }
                className="w-full bg-white border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 p-2"
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
              <label className="block mb-1 text-xs font-medium text-text">
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
                className="w-full bg-white border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 p-2"
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-text">
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
                className="w-full bg-white border border-border text-text text-sm rounded-md focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 p-2"
              />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-text-muted hover:text-text cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-text-muted">
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
        <ModalDialog
          open={isModalOpen}
          onClose={onCloseModal}
          title={currentMovement ? "Actualizar registro" : "Crear registro"}
          footer={
            <>
              <Button variant="secondary" type="button" onClick={onCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" form="movimiento-form">
                {currentMovement ? "Actualizar" : "Crear"}
              </Button>
            </>
          }
        >
          <form id="movimiento-form" onSubmit={handleSubmit} />
        </ModalDialog>
      )}
    </>
  );
}
