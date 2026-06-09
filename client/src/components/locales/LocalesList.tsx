import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import Button from "../common/Button/Button";
import ModalDialog from "../common/ModalDialog";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatMiles } from "../../utils/utils";

import type { Local } from "../../types";

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
        <div className="text-sm text-text-muted">
          Mostrando {formatMiles(locales.length)} de{" "}
          {formatMiles(pagination?.totalItems || 0)} locales
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
        <ModalDialog
          open={isModalOpen}
          onClose={onCloseModal}
          title={
            currentLocal
              ? `Editar local: ${currentLocal.LocalId}`
              : "Crear nuevo local"
          }
          footer={
            <>
              <Button variant="secondary" type="button" onClick={onCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" form="local-form">
                {currentLocal ? "Actualizar" : "Crear"}
              </Button>
            </>
          }
        >
          <form id="local-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalNombre"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Nombre <span className="text-danger-700">*</span>
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
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalTelefono"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Teléfono
                    </label>
                    <input
                      type="text"
                      name="LocalTelefono"
                      id="LocalTelefono"
                      value={formData.LocalTelefono}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalCelular"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Celular
                    </label>
                    <input
                      type="text"
                      name="LocalCelular"
                      id="LocalCelular"
                      value={formData.LocalCelular}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-6">
                    <label
                      htmlFor="LocalDireccion"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="LocalDireccion"
                      id="LocalDireccion"
                      value={formData.LocalDireccion}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                    />
                  </div>
            </div>
          </form>
        </ModalDialog>
      )}
    </>
  );
}
