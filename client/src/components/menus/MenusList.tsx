import { useEffect, useState } from "react";
import ActionButton from "../common/Button/ActionButton";
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
      <DataTable<Menu>
        columns={columns}
        data={menus}
        onEdit={onEdit}
        onDelete={onDelete ? (item) => onDelete(item.MenuId) : undefined}
        emptyMessage="No se encontraron menús"
      />
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseModal();
          }}
        >
          <div className="absolute inset-0 bg-black opacity-50" />
          <div className="relative w-full max-w-2xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentMenu
                    ? `Editar menú: ${currentMenu.MenuNombre}`
                    : "Crear nuevo menú"}
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
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      ID
                    </label>
                    <input
                      type="text"
                      name="MenuId"
                      value={formData.MenuId}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                      disabled={!!currentMenu}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="MenuNombre"
                      value={formData.MenuNombre}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentMenu ? "Actualizar" : "Crear"}
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
