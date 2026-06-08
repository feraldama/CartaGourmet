import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatMiles } from "../../utils/utils";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface CajasListProps {
  cajas: Caja[];
  onDelete?: (item: Caja) => void;
  onEdit?: (item: Caja) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentCaja?: Caja | null;
  onSubmit: (formData: Caja) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function CajasList({
  cajas,
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
  currentCaja,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: CajasListProps) {
  const [formData, setFormData] = useState({
    id: "",
    CajaId: "",
    CajaDescripcion: "",
    CajaMonto: 0,
  });

  useEffect(() => {
    if (currentCaja) {
      setFormData({
        id: String(currentCaja.id ?? currentCaja.CajaId),
        CajaId: String(currentCaja.CajaId),
        CajaDescripcion: currentCaja.CajaDescripcion,
        CajaMonto: currentCaja.CajaMonto,
      });
    } else {
      setFormData({
        id: "",
        CajaId: "",
        CajaDescripcion: "",
        CajaMonto: 0,
      });
    }
  }, [currentCaja]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "CajaMonto" ? Number(value) : value,
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
    { key: "CajaId", label: "ID" },
    { key: "CajaDescripcion", label: "Descripción" },
    {
      key: "CajaMonto",
      label: "Monto",
      render: (caja: Caja) => `Gs. ${formatMiles(caja.CajaMonto)}`,
    },
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
            placeholder="Buscar cajas"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Caja"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {cajas.length} de {pagination?.totalItems} cajas
        </div>
      </div>
      <DataTable<Caja>
        columns={columns}
        data={cajas}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron cajas"
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
                  {currentCaja
                    ? `Editar caja: ${currentCaja.CajaId}`
                    : "Crear nueva caja"}
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
                      htmlFor="CajaDescripcion"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Descripción
                    </label>
                    <input
                      type="text"
                      name="CajaDescripcion"
                      id="CajaDescripcion"
                      value={formData.CajaDescripcion}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleInputChange({
                          target: {
                            name: "CajaDescripcion",
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
                      htmlFor="CajaMonto"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Monto
                    </label>
                    <input
                      type="text"
                      name="CajaMonto"
                      id="CajaMonto"
                      value={
                        formData.CajaMonto ? formatMiles(formData.CajaMonto) : 0
                      }
                      onChange={(e) => {
                        const raw = e.target.value
                          .replace(/\./g, "")
                          .replace(/\s/g, "");
                        const num = Number(raw);
                        if (!isNaN(num)) {
                          setFormData((prev) => ({ ...prev, CajaMonto: num }));
                        }
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentCaja ? "Actualizar" : "Crear"}
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
