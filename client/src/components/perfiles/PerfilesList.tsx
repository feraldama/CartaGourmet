import { useEffect, useState } from "react";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import SearchButton from "../common/Input/SearchButton";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getMenus } from "../../services/menus.service";
import { getPermisosByPerfil } from "../../services/perfilmenu.service";

interface Perfil {
  id: number;
  PerfilId: number;
  PerfilDescripcion: string;
  [key: string]: unknown;
}

interface PerfilesListProps {
  perfiles: Perfil[];
  onEdit?: (perfil: Perfil) => void;
  onDelete?: (id: number) => void;
  onCreate?: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentPerfil: Perfil | null;
  onSubmit: (perfil: Perfil) => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
}

// Definir tipo explícito para los permisos
const PERMISOS = [
  "puedeLeer",
  "puedeEditar",
  "puedeEliminar",
  "puedeCrear",
] as const;
type Permiso = (typeof PERMISOS)[number];

export default function PerfilesList({
  perfiles,
  onEdit,
  onDelete,
  onCreate,
  isModalOpen,
  onCloseModal,
  currentPerfil,
  onSubmit,
  searchTerm,
  onSearch,
  onKeyPress,
  onSearchSubmit,
}: PerfilesListProps) {
  const [formData, setFormData] = useState({
    PerfilDescripcion: "",
  });
  const [menus, setMenus] = useState<{ MenuId: number; MenuNombre: string }[]>(
    []
  );
  const [menusSeleccionados, setMenusSeleccionados] = useState<number[]>([]);
  const [permisosPorMenu, setPermisosPorMenu] = useState<{
    [menuId: number]: {
      puedeLeer: boolean;
      puedeEditar: boolean;
      puedeEliminar: boolean;
      puedeCrear: boolean;
    };
  }>({});

  useEffect(() => {
    if (isModalOpen) {
      getMenus(1, 1000).then((res) => {
        const menusFiltrados = (res.data || []).filter(
          (menu: { MenuId: number; MenuNombre: string }) => {
            const nombre = menu.MenuNombre.toUpperCase();
            return (
              !nombre.startsWith("WP") &&
              !nombre.startsWith("K2B") &&
              !nombre.startsWith("WW") &&
              !nombre.startsWith("INICIO")
            );
          }
        );
        setMenus(menusFiltrados);
      });
      if (currentPerfil) {
        getPermisosByPerfil(currentPerfil.PerfilId).then((res) => {
          const arr = Array.isArray(res) ? res : res.data;
          setMenusSeleccionados(
            Array.isArray(arr) ? arr.map((m) => m.MenuId) : []
          );
          // Inicializar permisos por menú si vienen del backend
          if (Array.isArray(arr)) {
            const permisos: {
              [menuId: number]: {
                puedeLeer: boolean;
                puedeEditar: boolean;
                puedeEliminar: boolean;
                puedeCrear: boolean;
              };
            } = {};
            arr.forEach((m) => {
              permisos[m.MenuId] = {
                puedeLeer: !!m.puedeLeer,
                puedeEditar: !!m.puedeEditar,
                puedeEliminar: !!m.puedeEliminar,
                puedeCrear: !!m.puedeCrear,
              };
            });
            setPermisosPorMenu(permisos);
          }
        });
      } else {
        setMenusSeleccionados([]);
        setPermisosPorMenu({});
      }
    }
  }, [isModalOpen, currentPerfil]);

  useEffect(() => {
    if (currentPerfil) {
      setFormData({
        PerfilDescripcion: currentPerfil.PerfilDescripcion,
      });
    } else {
      setFormData({ PerfilDescripcion: "" });
    }
  }, [currentPerfil]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "PerfilDescripcion" ? value.toUpperCase() : value,
    }));
  };

  const handleMenuChange = (menuId: number) => {
    setMenusSeleccionados((prev) => {
      if (prev.includes(menuId)) {
        // Quitar menú y sus permisos
        const rest = { ...permisosPorMenu };
        delete rest[menuId];
        setPermisosPorMenu(rest);
        return prev.filter((id) => id !== menuId);
      } else {
        setPermisosPorMenu((prevPermisos) => ({
          ...prevPermisos,
          [menuId]: {
            puedeLeer: false,
            puedeEditar: false,
            puedeEliminar: false,
            puedeCrear: false,
          },
        }));
        return [...prev, menuId];
      }
    });
  };

  const handlePermisoChange = (
    menuId: number,
    permiso: Permiso,
    value: boolean
  ) => {
    setPermisosPorMenu((prev) => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [permiso]: value,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const menusAsignados = menusSeleccionados.map((menuId) => ({
      PerfilId: currentPerfil?.PerfilId,
      MenuId: menuId,
      ...permisosPorMenu[menuId],
    }));
    // Enviar solo los datos del perfil y los menús asignados, sin id ni campos incompatibles
    onSubmit({
      PerfilDescripcion: formData.PerfilDescripcion,
      PerfilId: currentPerfil?.PerfilId,
      menusAsignados,
    } as unknown as Perfil);
  };

  const columns = [
    { key: "PerfilId", label: "ID" },
    { key: "PerfilDescripcion", label: "Descripción" },
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
            placeholder="Buscar perfiles"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Perfil"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <DataTable<Perfil>
        columns={columns}
        data={perfiles}
        onEdit={onEdit}
        onDelete={onDelete ? (item) => onDelete(item.PerfilId) : undefined}
        emptyMessage="No se encontraron perfiles"
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
              className="relative bg-white rounded-lg shadow max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentPerfil
                    ? `Editar perfil: ${currentPerfil.PerfilDescripcion}`
                    : "Crear nuevo perfil"}
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
              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Descripción
                    </label>
                    <input
                      type="text"
                      name="PerfilDescripcion"
                      value={formData.PerfilDescripcion}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>
                  <div className="col-span-6">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Menús
                    </label>
                    <div className="flex flex-col gap-0">
                      {menus.map((menu) => {
                        const checkboxId = `menu-checkbox-${menu.MenuId}`;
                        const isSelected = menusSeleccionados.includes(
                          menu.MenuId
                        );
                        return (
                          <div className="flex flex-col mb-2" key={menu.MenuId}>
                            <div className="flex items-center mb-1">
                              <input
                                id={checkboxId}
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleMenuChange(menu.MenuId)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500"
                              />
                              <label
                                htmlFor={checkboxId}
                                className="ms-2 text-sm font-medium text-gray-900"
                              >
                                {menu.MenuNombre}
                              </label>
                            </div>
                            {isSelected && (
                              <div className="flex gap-4 ml-6 mt-1">
                                {PERMISOS.map((permiso) => (
                                  <label
                                    key={permiso}
                                    className="flex items-center text-xs font-normal text-gray-700"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        permisosPorMenu[menu.MenuId]?.[
                                          permiso
                                        ] || false
                                      }
                                      onChange={(e) =>
                                        handlePermisoChange(
                                          menu.MenuId,
                                          permiso,
                                          e.target.checked
                                        )
                                      }
                                      className="mr-1"
                                    />
                                    {permiso.replace("puede", "")}
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentPerfil ? "Actualizar" : "Crear"}
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
