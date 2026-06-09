import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import ModalDialog from "../common/ModalDialog";
import Button from "../common/Button/Button";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatMiles } from "../../utils/utils";

import type { Almacen } from "../../types";

interface Pagination {
  totalItems: number;
}

interface AlmacenesListProps {
  almacenes: Almacen[];
  onDelete?: (item: Almacen) => void;
  onEdit?: (item: Almacen) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentAlmacen?: Almacen | null;
  onSubmit: (formData: Almacen) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function AlmacenesList({
  almacenes,
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
  currentAlmacen,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: AlmacenesListProps) {
  const [formData, setFormData] = useState({
    id: "",
    AlmacenId: "",
    AlmacenNombre: "",
  });

  useEffect(() => {
    if (currentAlmacen) {
      setFormData({
        id: String(currentAlmacen.id ?? currentAlmacen.AlmacenId),
        AlmacenId: String(currentAlmacen.AlmacenId),
        AlmacenNombre: currentAlmacen.AlmacenNombre,
      });
    } else {
      setFormData({
        id: "",
        AlmacenId: "",
        AlmacenNombre: "",
      });
    }
  }, [currentAlmacen]);

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
    onSubmit(formData as Almacen);
  };

  const columns = [
    { key: "AlmacenId", label: "ID" },
    { key: "AlmacenNombre", label: "Nombre" },
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
            placeholder="Buscar almacenes"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Almacén"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-text-muted">
          Mostrando {formatMiles(almacenes.length)} de{" "}
          {formatMiles(pagination?.totalItems || 0)} almacenes
        </div>
      </div>
      <DataTable<Almacen>
        columns={columns}
        data={almacenes}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron almacenes"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
      {isModalOpen && (
        <ModalDialog
          open={isModalOpen}
          onClose={onCloseModal}
          title={
            currentAlmacen
              ? `Editar almacén: ${currentAlmacen.AlmacenId}`
              : "Crear nuevo almacén"
          }
          footer={
            <>
              <Button variant="secondary" type="button" onClick={onCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" form="almacen-form">
                {currentAlmacen ? "Actualizar" : "Crear"}
              </Button>
            </>
          }
        >
          <form id="almacen-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-6">
                <label
                  htmlFor="AlmacenNombre"
                  className="block mb-2 text-sm font-medium text-text"
                >
                  Nombre
                </label>
                <input
                  type="text"
                  name="AlmacenNombre"
                  id="AlmacenNombre"
                  value={formData.AlmacenNombre}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    handleInputChange({
                      target: {
                        name: "AlmacenNombre",
                        value: value,
                      },
                    } as React.ChangeEvent<HTMLInputElement>);
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
