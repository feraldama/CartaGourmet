import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  getTipoGastoGrupoByTipoGastoId,
  createTipoGastoGrupo,
  updateTipoGastoGrupo,
  deleteTipoGastoGrupo,
  type TipoGastoGrupo,
} from "../../services/tipogastogrupo.service";
import Swal from "sweetalert2";

interface TipoGasto {
  id: string | number;
  TipoGastoId: string | number;
  TipoGastoDescripcion: string;
  TipoGastoCantGastos: number;
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
}

interface TiposGastoListProps {
  tiposGasto: TipoGasto[];
  onDelete?: (item: TipoGasto) => void;
  onEdit?: (item: TipoGasto) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentTipoGasto?: TipoGasto | null;
  onSubmit: (formData: TipoGasto) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function TiposGastoList({
  tiposGasto,
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
  currentTipoGasto,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: TiposGastoListProps) {
  const [formData, setFormData] = useState({
    id: "",
    TipoGastoId: "",
    TipoGastoDescripcion: "",
    TipoGastoCantGastos: 0,
  });
  const [grupos, setGrupos] = useState<TipoGastoGrupo[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [nuevoGrupo, setNuevoGrupo] = useState("");
  const [editGrupoId, setEditGrupoId] = useState<string | number | null>(null);
  const [editGrupoDesc, setEditGrupoDesc] = useState("");

  useEffect(() => {
    if (currentTipoGasto) {
      setFormData({
        id: String(currentTipoGasto.id ?? currentTipoGasto.TipoGastoId),
        TipoGastoId: String(currentTipoGasto.TipoGastoId),
        TipoGastoDescripcion: currentTipoGasto.TipoGastoDescripcion,
        TipoGastoCantGastos: currentTipoGasto.TipoGastoCantGastos,
      });
    } else {
      setFormData({
        id: "",
        TipoGastoId: "",
        TipoGastoDescripcion: "",
        TipoGastoCantGastos: 0,
      });
    }
  }, [currentTipoGasto]);

  useEffect(() => {
    if (currentTipoGasto && currentTipoGasto.TipoGastoId) {
      setLoadingGrupos(true);
      getTipoGastoGrupoByTipoGastoId(currentTipoGasto.TipoGastoId)
        .then((data) => setGrupos(data))
        .catch(() => setGrupos([]))
        .finally(() => setLoadingGrupos(false));
    } else {
      setGrupos([]);
    }
  }, [currentTipoGasto]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "TipoGastoCantGastos" ? Number(value) : value,
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
    { key: "TipoGastoId", label: "ID" },
    { key: "TipoGastoDescripcion", label: "Descripción" },
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
            placeholder="Buscar tipos de gasto"
          />
        </div>
        <div className="py-4">
          <ActionButton
            label="Nuevo Tipo de Gasto"
            onClick={onCreate}
            icon={PlusIcon}
          />
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {tiposGasto.length} de {pagination?.totalItems} tipos de
          gasto
        </div>
      </div>
      <DataTable<TipoGasto>
        columns={columns}
        data={tiposGasto}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron tipos de gasto"
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
                  {currentTipoGasto
                    ? `Editar tipo de gasto: ${currentTipoGasto.TipoGastoDescripcion}`
                    : "Crear nuevo tipo de gasto"}
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
                  <div className="col-span-6 sm:col-span-4">
                    <label
                      htmlFor="TipoGastoDescripcion"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Descripción
                    </label>
                    <input
                      type="text"
                      name="TipoGastoDescripcion"
                      id="TipoGastoDescripcion"
                      value={formData.TipoGastoDescripcion}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                </div>
                {/* Detalle de grupos de gasto asociados */}
                {currentTipoGasto && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2 text-gray-800 text-base">
                      Grupos asociados a este tipo de gasto
                    </h4>
                    {loadingGrupos ? (
                      <div className="text-gray-500 text-sm">
                        Cargando grupos...
                      </div>
                    ) : (
                      <>
                        <ul className="divide-y divide-gray-200 mb-2">
                          {grupos.map((g) => (
                            <li
                              key={g.TipoGastoGrupoId}
                              className="py-2 px-1 flex items-center gap-2 hover:bg-gray-100 rounded"
                            >
                              {editGrupoId === g.TipoGastoGrupoId ? (
                                <>
                                  <input
                                    className="border rounded px-2 py-1 text-sm"
                                    value={editGrupoDesc}
                                    onChange={(e) =>
                                      setEditGrupoDesc(e.target.value)
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="text-green-600 hover:underline text-xs cursor-pointer"
                                    onClick={async () => {
                                      try {
                                        await updateTipoGastoGrupo(
                                          currentTipoGasto.TipoGastoId,
                                          g.TipoGastoGrupoId,
                                          {
                                            TipoGastoGrupoDescripcion:
                                              editGrupoDesc,
                                          }
                                        );
                                        setEditGrupoId(null);
                                        setEditGrupoDesc("");
                                        setLoadingGrupos(true);
                                        const data =
                                          await getTipoGastoGrupoByTipoGastoId(
                                            currentTipoGasto.TipoGastoId
                                          );
                                        setGrupos(data);
                                        setLoadingGrupos(false);
                                      } catch (error: unknown) {
                                        const err = error as {
                                          message?: string;
                                        };
                                        if (err?.message) {
                                          Swal.fire({
                                            icon: "warning",
                                            title: "No permitido",
                                            text: err.message,
                                          });
                                        } else {
                                          throw error;
                                        }
                                      }
                                    }}
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    className="text-gray-500 hover:underline text-xs ml-2 cursor-pointer"
                                    onClick={() => {
                                      setEditGrupoId(null);
                                      setEditGrupoDesc("");
                                    }}
                                  >
                                    Cancelar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="text-gray-700 flex-1">
                                    {g.TipoGastoGrupoId}-{" "}
                                    {g.TipoGastoGrupoDescripcion}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-blue-600 hover:underline text-xs cursor-pointer"
                                    title="Editar"
                                    onClick={() => {
                                      setEditGrupoId(g.TipoGastoGrupoId);
                                      setEditGrupoDesc(
                                        g.TipoGastoGrupoDescripcion
                                      );
                                    }}
                                  >
                                    <PencilSquareIcon className="h-5 w-5 inline" />
                                  </button>
                                  <button
                                    type="button"
                                    className="text-red-600 hover:underline text-xs ml-2 cursor-pointer"
                                    title="Eliminar"
                                    onClick={async () => {
                                      const confirm = await Swal.fire({
                                        title: "¿Estás seguro?",
                                        text: "¡No podrás revertir esto!",
                                        icon: "warning",
                                        showCancelButton: true,
                                        confirmButtonColor: "#3085d6",
                                        cancelButtonColor: "#d33",
                                        confirmButtonText: "Sí, eliminar!",
                                        cancelButtonText: "Cancelar",
                                      });
                                      if (!confirm.isConfirmed) return;
                                      try {
                                        const res = await deleteTipoGastoGrupo(
                                          currentTipoGasto.TipoGastoId,
                                          g.TipoGastoGrupoId
                                        );
                                        setLoadingGrupos(true);
                                        const data =
                                          await getTipoGastoGrupoByTipoGastoId(
                                            currentTipoGasto.TipoGastoId
                                          );
                                        setGrupos(data);
                                        setLoadingGrupos(false);
                                        if (
                                          res.TipoGastoCantGastos !== undefined
                                        ) {
                                          setFormData((prev) => ({
                                            ...prev,
                                            TipoGastoCantGastos:
                                              res.TipoGastoCantGastos,
                                          }));
                                        } else {
                                          setFormData((prev) => ({
                                            ...prev,
                                            TipoGastoCantGastos: Math.max(
                                              0,
                                              prev.TipoGastoCantGastos - 1
                                            ),
                                          }));
                                        }
                                        Swal.fire({
                                          position: "top-end",
                                          icon: "success",
                                          title: "Grupo eliminado exitosamente",
                                          showConfirmButton: false,
                                          timer: 1500,
                                        });
                                      } catch (error: unknown) {
                                        const err = error as {
                                          message?: string;
                                        };
                                        if (err?.message) {
                                          Swal.fire({
                                            icon: "warning",
                                            title: "No permitido",
                                            text: err.message,
                                          });
                                        } else {
                                          throw error;
                                        }
                                      }
                                    }}
                                  >
                                    <TrashIcon className="h-5 w-5 inline" />
                                  </button>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div className="flex gap-2 mt-2">
                          <input
                            className="border rounded px-2 py-1 text-sm flex-1"
                            placeholder="Nuevo grupo..."
                            value={nuevoGrupo}
                            onChange={(e) => setNuevoGrupo(e.target.value)}
                          />
                          <button
                            type="button"
                            className="text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1 text-xs"
                            onClick={async () => {
                              if (!nuevoGrupo.trim()) return;
                              const res = await createTipoGastoGrupo({
                                TipoGastoId: currentTipoGasto.TipoGastoId,
                                TipoGastoGrupoDescripcion: nuevoGrupo,
                              });
                              setNuevoGrupo("");
                              setLoadingGrupos(true);
                              const data = await getTipoGastoGrupoByTipoGastoId(
                                currentTipoGasto.TipoGastoId
                              );
                              setGrupos(data);
                              setLoadingGrupos(false);
                              if (res.TipoGastoCantGastos !== undefined) {
                                setFormData((prev) => ({
                                  ...prev,
                                  TipoGastoCantGastos: res.TipoGastoCantGastos,
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  TipoGastoCantGastos:
                                    prev.TipoGastoCantGastos + 1,
                                }));
                              }
                              Swal.fire({
                                position: "top-end",
                                icon: "success",
                                title: "Grupo agregado exitosamente",
                                showConfirmButton: false,
                                timer: 1500,
                              });
                            }}
                          >
                            Agregar
                          </button>
                        </div>
                        {grupos.length === 0 && !loadingGrupos && (
                          <div className="text-gray-500 text-sm mt-2">
                            No hay grupos asociados.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentTipoGasto ? "Actualizar" : "Crear"}
                  type="submit"
                />
                <ActionButton
                  label="Cancelar"
                  className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 cursor-pointer"
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
