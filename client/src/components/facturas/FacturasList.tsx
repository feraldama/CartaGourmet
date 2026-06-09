import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import Button from "../common/Button/Button";
import ModalDialog from "../common/ModalDialog";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatMiles } from "../../utils/utils";

interface Factura {
  id: string | number;
  FacturaId: string | number;
  FacturaTimbrado: string;
  FacturaDesde: string;
  FacturaHasta: string;
  FacturaDocumentoTipo?: string;
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
    FacturaDocumentoTipo: "FA",
  });

  useEffect(() => {
    if (currentFactura) {
      setFormData({
        id: String(currentFactura.id ?? currentFactura.FacturaId),
        FacturaId: String(currentFactura.FacturaId),
        FacturaTimbrado: currentFactura.FacturaTimbrado,
        FacturaDesde: currentFactura.FacturaDesde,
        FacturaHasta: currentFactura.FacturaHasta,
        FacturaDocumentoTipo: currentFactura.FacturaDocumentoTipo || "FA",
      });
    } else {
      setFormData({
        id: "",
        FacturaId: "",
        FacturaTimbrado: "",
        FacturaDesde: "",
        FacturaHasta: "",
        FacturaDocumentoTipo: "FA",
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

  const columns = [
    { key: "FacturaId", label: "ID" },
    {
      key: "FacturaDocumentoTipo",
      label: "Comprobante",
      render: (factura: Factura) =>
        factura.FacturaDocumentoTipo === "NC"
          ? "Nota de Crédito"
          : "Factura",
    },
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
        <div className="text-sm text-text-muted">
          Mostrando {formatMiles(facturas.length)} de{" "}
          {formatMiles(pagination?.totalItems || 0)} facturas
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
        <ModalDialog
          open={isModalOpen}
          onClose={onCloseModal}
          title={
            currentFactura
              ? `Editar factura: ${currentFactura.FacturaId}`
              : "Crear nueva factura"
          }
          footer={
            <>
              <Button variant="secondary" type="button" onClick={onCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" form="factura-form">
                {currentFactura ? "Actualizar" : "Crear"}
              </Button>
            </>
          }
        >
          <form id="factura-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6">
                    <label
                      htmlFor="FacturaDocumentoTipo"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Tipo de comprobante
                    </label>
                    <select
                      name="FacturaDocumentoTipo"
                      id="FacturaDocumentoTipo"
                      value={formData.FacturaDocumentoTipo}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                    >
                      <option value="FA">Factura</option>
                      <option value="NC">Nota de Crédito</option>
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="FacturaTimbrado"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Timbrado (máximo 8 dígitos)
                    </label>
                    <input
                      type="text"
                      name="FacturaTimbrado"
                      id="FacturaTimbrado"
                      value={formData.FacturaTimbrado}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                      placeholder="12345678"
                      maxLength={8}
                      pattern="[0-9]{1,8}"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="FacturaDesde"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Desde (máximo 7 dígitos)
                    </label>
                    <input
                      type="text"
                      name="FacturaDesde"
                      id="FacturaDesde"
                      value={formData.FacturaDesde}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                      placeholder="1"
                      maxLength={7}
                      pattern="[0-9]{1,7}"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="FacturaHasta"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Hasta (máximo 7 dígitos)
                    </label>
                    <input
                      type="text"
                      name="FacturaHasta"
                      id="FacturaHasta"
                      value={formData.FacturaHasta}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                      placeholder="1000"
                      maxLength={7}
                      pattern="[0-9]{1,7}"
                      required
                    />
                  </div>
            </div>
            <div className="text-sm text-text-muted">
              <p>• El timbrado debe tener máximo 8 dígitos numéricos</p>
              <p>• Los números desde/hasta deben tener máximo 7 dígitos</p>
              <p>• El número "Desde" debe ser menor que "Hasta"</p>
              <p>• No se permiten superposiciones de rangos</p>
            </div>
          </form>
        </ModalDialog>
      )}
    </>
  );
}
