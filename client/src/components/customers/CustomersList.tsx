import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon, FunnelIcon, XMarkIcon } from "@heroicons/react/24/outline";
import ClienteFormModal from "../common/ClienteFormModal";
import type { Cliente } from "../common/ClienteFormModal";
import type { ClienteFilters } from "../../services/clientes.service";
import { formatMiles } from "../../utils/utils";

interface Pagination {
  totalItems: number;
}

interface CustomersListProps {
  clientes: Cliente[];
  onDelete?: (item: Cliente) => void;
  onEdit?: (item: Cliente) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentCliente?: Cliente | null;
  onSubmit: (formData: Cliente) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
  filters?: ClienteFilters;
  onFiltersChange?: (filters: ClienteFilters) => void;
  showFilters?: boolean;
  onToggleFilters?: () => void;
}

export default function CustomersList({
  clientes,
  onDelete,
  onEdit,
  onCreate,
  pagination,
  onSearch,
  searchTerm,
  onKeyPress,
  onSearchSubmit,
  isModalOpen,
  onCloseModal,
  currentCliente,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
  filters,
  onFiltersChange,
  showFilters = false,
  onToggleFilters,
}: CustomersListProps) {
  const activeFilters = filters || {};
  const activeFilterCount = Object.values(activeFilters).filter(
    (v) => v !== undefined && v !== "" && v !== null
  ).length;

  const updateFilter = <K extends keyof ClienteFilters>(
    key: K,
    value: ClienteFilters[K] | ""
  ) => {
    if (!onFiltersChange) return;
    const next: ClienteFilters = { ...activeFilters };
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
  const columns = [
    { key: "ClienteId", label: "ID" },
    { key: "ClienteRUC", label: "RUC" },
    { key: "ClienteNombre", label: "Nombre" },
    { key: "ClienteApellido", label: "Apellido" },
    { key: "ClienteDireccion", label: "Dirección" },
    { key: "ClienteTelefono", label: "Teléfono" },
    { key: "ClienteTipo", label: "Tipo" },
    { key: "UsuarioId", label: "Usuario" },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <SearchButton
            searchTerm={searchTerm}
            onSearch={onSearch}
            onKeyPress={onKeyPress}
            onSearchSubmit={onSearchSubmit}
            placeholder="Buscar clientes"
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
              label="Nuevo Cliente"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      {onFiltersChange && showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-700">
                Tipo de cliente
              </label>
              <select
                value={activeFilters.tipo || ""}
                onChange={(e) =>
                  updateFilter(
                    "tipo",
                    (e.target.value as ClienteFilters["tipo"]) || ""
                  )
                }
                className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
              >
                <option value="">Todos</option>
                <option value="MI">Minorista</option>
                <option value="MA">Mayorista</option>
              </select>
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
          Mostrando {formatMiles(clientes.length)} de{" "}
          {formatMiles(pagination?.totalItems || 0)} clientes
        </div>
      </div>
      <DataTable<Cliente & { id: string | number }>
        columns={columns}
        data={clientes.map((c) => ({
          ...c,
          id: c.id || c.ClienteId || "",
        }))}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron clientes"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
      <ClienteFormModal
        isOpen={isModalOpen}
        onClose={onCloseModal}
        currentCliente={currentCliente}
        onSubmit={onSubmit}
      />
    </>
  );
}
