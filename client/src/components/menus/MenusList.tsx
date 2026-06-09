import { useEffect, useState } from "react";
import ActionButton from "../common/Button/ActionButton";
import Button from "../common/Button/Button";
import ModalDialog from "../common/ModalDialog";
import DataTable from "../common/Table/DataTable";
import SearchButton from "../common/Input/SearchButton";
import { PlusIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";

interface Menu {
  id: string;
  MenuId: string;
  MenuNombre: string;
  [key: string]: unknown;
}

interface MenusListProps {
  menus: Menu[];
  onEdit?: (menu: Menu) => void;
  onDelete?: (id: string) => void;
  onCreate?: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentMenu: Menu | null;
  onSubmit: (menu: Menu) => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  pagination?: { totalItems?: number };
}

export default function MenusList({
  menus,
  onEdit,
  onDelete,
  onCreate,
  isModalOpen,
  onCloseModal,
  currentMenu,
  onSubmit,
  searchTerm,
  onSearch,
  onKeyPress,
  onSearchSubmit,
  pagination,
}: MenusListProps) {
  const [formData, setFormData] = useState({
    MenuId: "",
    MenuNombre: "",
  });

  useEffect(() => {
    if (currentMenu) {
      setFormData({
        MenuId: currentMenu.MenuId,
        MenuNombre: currentMenu.MenuNombre,
      });
    } else {
      setFormData({ MenuId: "", MenuNombre: "" });
    }
  }, [currentMenu]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "MenuNombre" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ ...currentMenu, ...formData } as Menu);
    Swal.fire({
      position: "top-end",
      icon: "success",
      title: currentMenu ? "Menú actualizado" : "Menú creado",
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const columns = [
    { key: "MenuId", label: "ID" },
    { key: "MenuNombre", label: "Nombre" },
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
            placeholder="Buscar menús"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Menú"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-text-muted">
          Mostrando {menus.length} de {pagination?.totalItems ?? menus.length} menús
        </div>
      </div>
      <DataTable<Menu>
        columns={columns}
        data={menus}
        onEdit={onEdit}
        onDelete={onDelete ? (item) => onDelete(item.MenuId) : undefined}
        emptyMessage="No se encontraron menús"
      />
      {isModalOpen && (
        <ModalDialog
          open={isModalOpen}
          onClose={onCloseModal}
          title={
            currentMenu
              ? `Editar menú: ${currentMenu.MenuNombre}`
              : "Crear nuevo menú"
          }
          footer={
            <>
              <Button variant="secondary" type="button" onClick={onCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" form="menu-form">
                {currentMenu ? "Actualizar" : "Crear"}
              </Button>
            </>
          }
        >
          <form id="menu-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block mb-2 text-sm font-medium text-text">
                      ID
                    </label>
                    <input
                      type="text"
                      name="MenuId"
                      value={formData.MenuId}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                      required
                      disabled={!!currentMenu}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block mb-2 text-sm font-medium text-text">
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="MenuNombre"
                      value={formData.MenuNombre}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                      required
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
            </div>
          </form>
        </ModalDialog>
      )}
    </>
  );
}
