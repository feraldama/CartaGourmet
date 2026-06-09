import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import ModalDialog from "../common/ModalDialog";
import Button from "../common/Button/Button";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatMiles } from "../../utils/utils";

import type { Caja } from "../../types";

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
        <div className="text-sm text-text-muted">
          Mostrando {formatMiles(cajas.length)} de{" "}
          {formatMiles(pagination?.totalItems || 0)} cajas
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
        <ModalDialog
          open={isModalOpen}
          onClose={onCloseModal}
          title={
            currentCaja
              ? `Editar caja: ${currentCaja.CajaId}`
              : "Crear nueva caja"
          }
          footer={
            <>
              <Button variant="secondary" type="button" onClick={onCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" form="caja-form">
                {currentCaja ? "Actualizar" : "Crear"}
              </Button>
            </>
          }
        >
          <form id="caja-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="CajaDescripcion"
                  className="block mb-2 text-sm font-medium text-text"
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
                  className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                  required
                />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label
                  htmlFor="CajaMonto"
                  className="block mb-2 text-sm font-medium text-text"
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
                  className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                  required
                />
              </div>
            </div>
          </form>
        </ModalDialog>
      )}
    </>
  );
}
