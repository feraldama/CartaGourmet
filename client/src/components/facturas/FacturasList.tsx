import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";

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
}

interface FacturasListProps {
  facturas: Factura[];
  onDelete?: (item: Factura) => void;
  onEdit?: (item: Factura) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentFactura?: Factura | null;
  onSubmit: (formData: Factura) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function FacturasList({
  facturas,
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
  currentFactura,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: FacturasListProps) {
  const [formData, setFormData] = useState({
    id: "",
    FacturaId: "",
    FacturaTimbrado: "",
    FacturaDesde: "",
    FacturaHasta: "",
  });

  useEffect(() => {
    if (currentFactura) {
      setFormData({
        id: String(currentFactura.id ?? currentFactura.FacturaId),
        FacturaId: String(currentFactura.FacturaId),
        FacturaTimbrado: currentFactura.FacturaTimbrado,
        FacturaDesde: currentFactura.FacturaDesde,
        FacturaHasta: currentFactura.FacturaHasta,
      });
    } else {
      setFormData({
        id: "",
        FacturaId: "",
        FacturaTimbrado: "",
        FacturaDesde: "",
        FacturaHasta: "",
      });
    }
  }, [currentFactura]);

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
    onSubmit(formData as Factura);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const columns = [
    { key: "FacturaId", label: "ID" },
    { key: "FacturaTimbrado", label: "Timbrado" },
    { key: "FacturaDesde", label: "Desde" },
    { key: "FacturaHasta", label: "Hasta" },
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
            placeholder="Buscar facturas"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Factura"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {facturas.length} de {pagination?.totalItems} facturas
        </div>
      </div>
      <DataTable<Factura>
        columns={columns}
        data={facturas}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron facturas"
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
                  {currentFactura
                    ? `Editar factura: ${currentFactura.FacturaId}`
                    : "Crear nueva factura"}
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
                      htmlFor="FacturaTimbrado"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Timbrado (máximo 8 dígitos)
                    </label>
                    <input
                      type="text"
                      name="FacturaTimbrado"
                      id="FacturaTimbrado"
                      value={formData.FacturaTimbrado}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      placeholder="12345678"
                      maxLength={8}
                      pattern="[0-9]{1,8}"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="FacturaDesde"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Desde (máximo 7 dígitos)
                    </label>
                    <input
                      type="text"
                      name="FacturaDesde"
                      id="FacturaDesde"
                      value={formData.FacturaDesde}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      placeholder="1"
                      maxLength={7}
                      pattern="[0-9]{1,7}"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="FacturaHasta"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Hasta (máximo 7 dígitos)
                    </label>
                    <input
                      type="text"
                      name="FacturaHasta"
                      id="FacturaHasta"
                      value={formData.FacturaHasta}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      placeholder="1000"
                      maxLength={7}
                      pattern="[0-9]{1,7}"
                      required
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  <p>• El timbrado debe tener máximo 8 dígitos numéricos</p>
                  <p>• Los números desde/hasta deben tener máximo 7 dígitos</p>
                  <p>• El número "Desde" debe ser menor que "Hasta"</p>
                  <p>• No se permiten superposiciones de rangos</p>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentFactura ? "Actualizar" : "Crear"}
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
