import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { getLocales } from "../../services/locales.service";
import { getPerfiles } from "../../services/perfiles.service";
import { getPerfilesByUsuario } from "../../services/usuarioperfil.service";

interface Usuario {
  id: string | number;
  UsuarioId: string;
  UsuarioNombre: string;
  UsuarioApellido: string;
  UsuarioCorreo: string;
  UsuarioIsAdmin: "S" | "N";
  UsuarioEstado: "A" | "I";
  LocalId: number;
  LocalNombre?: string;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface UsuariosListProps {
  usuarios: Usuario[];
  onDelete?: (item: Usuario) => void;
  onEdit?: (item: Usuario) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentUser?: Usuario | null;
  onSubmit: (formData: Usuario) => void;
  editingPassword: boolean;
  setEditingPassword: (value: boolean) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function UsuariosList({
  usuarios,
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
  currentUser,
  onSubmit,
  editingPassword,
  setEditingPassword,
  sortKey,
  sortOrder,
  onSort,
}: UsuariosListProps) {
  const [formData, setFormData] = useState({
    id: "",
    UsuarioId: "",
    UsuarioContrasena: "",
    UsuarioNombre: "",
    UsuarioApellido: "",
    UsuarioCorreo: "",
    UsuarioIsAdmin: "N" as "S" | "N",
    UsuarioEstado: "A" as "A" | "I",
    LocalId: 1,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [locales, setLocales] = useState<
    { LocalId: number; LocalNombre: string }[]
  >([]);
  const [perfiles, setPerfiles] = useState<
    { PerfilId: number; PerfilDescripcion: string }[]
  >([]);
  const [perfilesSeleccionados, setPerfilesSeleccionados] = useState<number[]>(
    []
  );

  // Inicializar formData cuando currentUser cambia
  useEffect(() => {
    if (currentUser) {
      setFormData({
        id: String(currentUser.id ?? currentUser.UsuarioId),
        UsuarioId: String(currentUser.UsuarioId),
        UsuarioContrasena: "", // No cargamos la contraseña por seguridad
        UsuarioNombre: currentUser.UsuarioNombre,
        UsuarioApellido: currentUser.UsuarioApellido,
        UsuarioCorreo: currentUser.UsuarioCorreo,
        UsuarioIsAdmin: currentUser.UsuarioIsAdmin,
        UsuarioEstado: currentUser.UsuarioEstado,
        LocalId: currentUser.LocalId,
      });
      // setEditingPassword(false); // Resetear estado de edición de contraseña
    } else {
      // Resetear para nuevo usuario
      setFormData({
        id: "",
        UsuarioId: "",
        UsuarioContrasena: "",
        UsuarioNombre: "",
        UsuarioApellido: "",
        UsuarioCorreo: "",
        UsuarioIsAdmin: "N",
        UsuarioEstado: "A",
        LocalId: 1,
      });
    }
    getLocales(1, 1000).then((res) => {
      setLocales(res.data || []);
    });
  }, [currentUser, setEditingPassword]);

  useEffect(() => {
    if (isModalOpen) {
      getPerfiles(1, 1000).then((res) => setPerfiles(res.data || []));
      if (currentUser) {
        getPerfilesByUsuario(currentUser.UsuarioId).then((res) => {
          const perfilesArray = Array.isArray(res) ? res : res.data;
          setPerfilesSeleccionados(
            Array.isArray(perfilesArray)
              ? perfilesArray.map((p) => p.PerfilId)
              : []
          );
        });
      } else {
        setPerfilesSeleccionados([]);
      }
    }
  }, [isModalOpen, currentUser]);

  // Manejar cambios en el formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Enviar formulario
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ ...formData, perfilesSeleccionados });
  };

  // Determinar el estado visual
  const getEstadoVisual = (estado: unknown) => {
    return (estado as string) === "A" ? "Activo" : "Inactivo";
  };

  // Determinar el color del estado
  const getEstadoColor = (estado: unknown) => {
    return (estado as string) === "A" ? "bg-green-500" : "bg-red-500";
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCloseModal();
    }
  };

  const handlePerfilChange = (perfilId: number) => {
    setPerfilesSeleccionados((prev) =>
      prev.includes(perfilId)
        ? prev.filter((id) => id !== perfilId)
        : [...prev, perfilId]
    );
  };

  // Configuración de columnas para la tabla
  const columns = [
    {
      key: "UsuarioId",
      label: "Usuario",
    },
    {
      key: "UsuarioNombre",
      label: "Nombre",
      render: (item: Usuario) =>
        `${item.UsuarioNombre} ${item.UsuarioApellido}`,
    },
    {
      key: "UsuarioCorreo",
      label: "Email",
      render: (item: Usuario) => item.UsuarioCorreo || "-",
    },
    {
      key: "UsuarioIsAdmin",
      label: "Admin",
      render: (item: Usuario) => (item.UsuarioIsAdmin === "S" ? "Sí" : "No"),
    },
    {
      key: "UsuarioEstado",
      label: "Estado",
      status: true,
    },
    {
      key: "LocalNombre",
      label: "Local",
      render: (item: Usuario) => item.LocalNombre || item.LocalId || "-",
    },
  ];

  return (
    <>
      {/* Barra superior de búsqueda y acciones */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <SearchButton
            searchTerm={searchTerm}
            onSearch={onSearch}
            onKeyPress={onKeyPress}
            onSearchSubmit={onSearchSubmit}
            placeholder="Buscar usuarios"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Usuario"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {usuarios.length} de {pagination?.totalItems} usuarios
        </div>
      </div>

      {/* Tabla de usuarios usando el componente DataTable */}
      <DataTable<Usuario>
        columns={columns}
        data={usuarios}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron usuarios"
        getStatusColor={getEstadoColor}
        getStatusText={getEstadoVisual}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />

      {/* Modal para crear/editar */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          {/* Fondo opacado */}
          <div className="absolute inset-0 bg-black opacity-50" />

          <div className="relative w-full max-w-2xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentUser
                    ? `Editar usuario: ${currentUser.UsuarioId}`
                    : "Crear nuevo usuario"}
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
                  {!currentUser && (
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="UsuarioId"
                        className="block mb-2 text-sm font-medium text-gray-900"
                      >
                        ID de Usuario
                      </label>
                      <input
                        type="text"
                        name="UsuarioId"
                        id="UsuarioId"
                        value={formData.UsuarioId}
                        onChange={handleInputChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        required
                      />
                    </div>
                  )}
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="UsuarioNombre"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="UsuarioNombre"
                      id="UsuarioNombre"
                      value={formData.UsuarioNombre}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleInputChange({
                          target: {
                            name: "UsuarioNombre",
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
                      htmlFor="UsuarioApellido"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Apellido
                    </label>
                    <input
                      type="text"
                      name="UsuarioApellido"
                      id="UsuarioApellido"
                      value={formData.UsuarioApellido}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        handleInputChange({
                          target: {
                            name: "UsuarioApellido",
                            value: value,
                          },
                        } as React.ChangeEvent<HTMLInputElement>);
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="UsuarioCorreo"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      name="UsuarioCorreo"
                      id="UsuarioCorreo"
                      value={formData.UsuarioCorreo}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="LocalId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Local
                    </label>
                    <select
                      name="LocalId"
                      id="LocalId"
                      value={formData.LocalId}
                      onChange={handleInputChange}
                      className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5"
                      required
                    >
                      <option value="">Seleccione un local</option>
                      {locales.map((local) => (
                        <option key={local.LocalId} value={local.LocalId}>
                          {local.LocalNombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="UsuarioIsAdmin"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      ¿Es administrador?
                    </label>
                    <select
                      name="UsuarioIsAdmin"
                      id="UsuarioIsAdmin"
                      value={formData.UsuarioIsAdmin}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="N">No</option>
                      <option value="S">Sí</option>
                    </select>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="UsuarioEstado"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Estado
                    </label>
                    <select
                      name="UsuarioEstado"
                      id="UsuarioEstado"
                      value={formData.UsuarioEstado}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option value="A">Activo</option>
                      <option value="I">Inactivo</option>
                    </select>
                  </div>
                  {currentUser && !editingPassword && (
                    <div className="col-span-6 sm:col-span-3 flex items-end">
                      <button
                        type="button"
                        onClick={() => setEditingPassword(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Cambiar contraseña
                      </button>
                    </div>
                  )}
                  {/* Campo de contraseña para nuevos usuarios o cuando se edita */}
                  {(!currentUser || editingPassword) && (
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="UsuarioContrasena"
                        className="block mb-2 text-sm font-medium text-gray-900"
                      >
                        Contraseña
                        {currentUser && (
                          <span className="text-gray-500 text-xs ml-1">
                            (dejar en blanco para no cambiar)
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          name="UsuarioContrasena"
                          id="UsuarioContrasena"
                          className="shadow-sm bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 pr-10"
                          value={formData.UsuarioContrasena}
                          onChange={handleInputChange}
                          required={!currentUser}
                          placeholder={
                            currentUser ? "Nueva contraseña" : "Contraseña"
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500"
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5" />
                          ) : (
                            <EyeIcon className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="col-span-6">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Perfiles
                    </label>
                    <div className="flex flex-col gap-0">
                      {perfiles.map((perfil) => {
                        const checkboxId = `perfil-checkbox-${perfil.PerfilId}`;
                        return (
                          <div
                            className="flex items-center mb-2"
                            key={perfil.PerfilId}
                          >
                            <input
                              id={checkboxId}
                              type="checkbox"
                              checked={perfilesSeleccionados.includes(
                                perfil.PerfilId
                              )}
                              onChange={() =>
                                handlePerfilChange(perfil.PerfilId)
                              }
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label
                              htmlFor={checkboxId}
                              className="ms-2 text-sm font-medium text-gray-900"
                            >
                              {perfil.PerfilDescripcion}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentUser ? "Actualizar" : "Crear"}
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
