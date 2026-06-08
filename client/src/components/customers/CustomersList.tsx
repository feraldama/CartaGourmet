import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import ClienteFormModal from "../common/ClienteFormModal";
import type { Cliente } from "../common/ClienteFormModal";

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
}: CustomersListProps) {
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
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Cliente"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {clientes.length} de {pagination?.totalItems} clientes
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
