import { useEffect, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import ModalDialog from "../common/ModalDialog";
import Button from "../common/Button/Button";
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
import { formatMiles } from "../../utils/utils";

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
        <div className="text-sm text-text-muted">
          Mostrando {formatMiles(tiposGasto.length)} de{" "}
          {formatMiles(pagination?.totalItems || 0)} tipos de gasto
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
        <ModalDialog
          open={isModalOpen}
          onClose={onCloseModal}
          title={
            currentTipoGasto
              ? `Editar tipo de gasto: ${currentTipoGasto.TipoGastoDescripcion}`
              : "Crear nuevo tipo de gasto"
          }
          footer={
            <>
              <Button variant="secondary" type="button" onClick={onCloseModal}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" form="tipogasto-form">
                {currentTipoGasto ? "Actualizar" : "Crear"}
              </Button>
            </>
          }
        >
          <form id="tipogasto-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-4">
                <label
                  htmlFor="TipoGastoDescripcion"
                  className="block mb-2 text-sm font-medium text-text"
                >
                  Descripción
                </label>
                <input
                  type="text"
                  name="TipoGastoDescripcion"
                  id="TipoGastoDescripcion"
                  value={formData.TipoGastoDescripcion}
                  onChange={handleInputChange}
                  className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                  required
                />
              </div>
            </div>
            {/* Detalle de grupos de gasto asociados */}
                {currentTipoGasto && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-2 text-text-strong text-base">
                      Grupos asociados a este tipo de gasto
                    </h4>
                    {loadingGrupos ? (
                      <div className="text-text-muted text-sm">
                        Cargando grupos...
                      </div>
                    ) : (
                      <>
                        <ul className="divide-y divide-gray-200 mb-2">
                          {grupos.map((g) => (
                            <li
                              key={g.TipoGastoGrupoId}
                              className="py-2 px-1 flex items-center gap-2 hover:bg-surface-muted rounded"
                            >
                              {editGrupoId === g.TipoGastoGrupoId ? (
                                <>
                                  <input
                                    className="border rounded px-2 py-1 text-sm uppercase"
                                    value={editGrupoDesc}
                                    onChange={(e) =>
                                      setEditGrupoDesc(e.target.value)
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="text-success-700 hover:underline text-xs cursor-pointer"
                                    onClick={async () => {
                                      try {
                                        await updateTipoGastoGrupo(
                                          currentTipoGasto.TipoGastoId,
                                          g.TipoGastoGrupoId,
                                          {
                                            TipoGastoGrupoDescripcion:
                                              editGrupoDesc.toUpperCase(),
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
                                    className="text-text-muted hover:underline text-xs ml-2 cursor-pointer"
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
                                  <span className="text-text flex-1">
                                    {g.TipoGastoGrupoId}-{" "}
                                    {g.TipoGastoGrupoDescripcion}
                                  </span>
                                  <button
                                    type="button"
                                    className="text-brand-700 hover:underline text-xs cursor-pointer"
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
                                    className="text-danger-700 hover:underline text-xs ml-2 cursor-pointer"
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
                            className="border rounded px-2 py-1 text-sm flex-1 uppercase"
                            placeholder="Nuevo grupo..."
                            value={nuevoGrupo}
                            onChange={(e) => setNuevoGrupo(e.target.value)}
                          />
                          <button
                            type="button"
                            className="text-white bg-brand-700 hover:bg-brand-800 rounded px-3 py-1 text-xs"
                            onClick={async () => {
                              if (!nuevoGrupo.trim()) return;
                              const res = await createTipoGastoGrupo({
                                TipoGastoId: currentTipoGasto.TipoGastoId,
                                TipoGastoGrupoDescripcion:
                                  nuevoGrupo.toUpperCase(),
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
                          <div className="text-text-muted text-sm mt-2">
                            No hay grupos asociados.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
          </form>
        </ModalDialog>
      )}
    </>
  );
}
