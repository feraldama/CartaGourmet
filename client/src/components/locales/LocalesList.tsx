import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Local {
  id: string | number;
  LocalId: string | number;
  LocalNombre: string;
  LocalTelefono?: string;
  LocalCelular?: string;
  LocalDireccion?: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface LocalesListProps {
  locales: Local[];
  onDelete?: (item: Local) => void;
  onEdit?: (item: Local) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentLocal?: Local | null;
  onSubmit: (formData: Local) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function LocalesList({
  locales,
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
  currentLocal,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: LocalesListProps) {
  const [formData, setFormData] = useState<Local>({
    id: "",
    LocalId: "",
    LocalNombre: "",
    LocalTelefono: "",
    LocalCelular: "",
    LocalDireccion: "",
  });

  useEffect(() => {
    if (currentLocal) {
      setFormData({
        id: String(currentLocal.id ?? currentLocal.LocalId),
        LocalId: String(currentLocal.LocalId),
        LocalNombre: currentLocal.LocalNombre,
        LocalTelefono: currentLocal.LocalTelefono || "",
        LocalCelular: currentLocal.LocalCelular || "",
        LocalDireccion: currentLocal.LocalDireccion || "",
      });
    } else {
      setFormData({
        id: "",
        LocalId: "",
        LocalNombre: "",
        LocalTelefono: "",
        LocalCelular: "",
        LocalDireccion: "",
      });
    }
  }, [currentLocal]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const columns = [
    { key: "LocalId", label: "ID" },
    { key: "LocalNombre", label: "Nombre" },
    { key: "LocalTelefono", label: "Teléfono" },
    { key: "LocalCelular", label: "Celular" },
    { key: "LocalDireccion", label: "Dirección" },
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
            placeholder="Buscar locales"
          />
        </div>
        <div className="py-4">
          <ActionButton
            label="Nuevo Local"
            onClick={onCreate}
            icon={PlusIcon}
          />
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {locales.length} de {pagination?.totalItems} locales
        </div>
      </div>
      <DataTable<Local>
        columns={columns}
        data={locales}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron locales"
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
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentLocal
                    ? `Editar local: ${currentLocal.LocalId}`
                    : "Crear nuevo local"}
                </h3>
                <button
                  type="button"
                  className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center"
                  onClick={onCloseModal}
                >
                  <svg
                    className="w-3 h-3"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 14 14"
                  >
                    <path
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalNombre"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="LocalNombre"
                      id="LocalNombre"
                      value={formData.LocalNombre}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleInputChange({
                          target: {
                            name: "LocalNombre",
                            value: value,
                          },
                        } as React.ChangeEvent<HTMLInputElement>);
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalTelefono"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="LocalTelefono"
                      id="LocalTelefono"
                      value={formData.LocalTelefono}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalCelular"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Celular
                    </label>
                    <input
                      type="text"
                      name="LocalCelular"
                      id="LocalCelular"
                      value={formData.LocalCelular}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-6">
                    <label
                      htmlFor="LocalDireccion"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="LocalDireccion"
                      id="LocalDireccion"
                      value={formData.LocalDireccion}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentLocal ? "Actualizar" : "Crear"}
                  type="submit"
                />
                <ActionButton
                  label="Cancelar"
                  className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10"
                  onClick={onCloseModal}
                />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
