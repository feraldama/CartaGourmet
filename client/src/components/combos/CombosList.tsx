import { useEffect, useMemo, useRef, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatMiles } from "../../utils/utils";

interface Combo {
  id: string | number;
  ComboId: string | number;
  ComboDescripcion: string;
  ProductoId: string | number;
  ComboCantidad: number;
  ComboPrecio: number;
  [key: string]: unknown;
}

interface Producto {
  ProductoId: string | number;
  ProductoNombre: string;
}

interface CombosListProps {
  combos: Combo[];
  productos: Producto[];
  onDelete?: (item: Combo) => void;
  onEdit?: (item: Combo) => void;
  onCreate?: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentCombo?: Combo | null;
  onSubmit: (formData: Combo) => void;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  pagination?: { totalItems?: number };
}

export default function CombosList({
  combos,
  productos,
  onDelete,
  onEdit,
  onCreate,
  isModalOpen,
  onCloseModal,
  currentCombo,
  onSubmit,
  onSearch,
  searchTerm,
  onKeyPress,
  onSearchSubmit,
  pagination,
}: CombosListProps) {
  const [formData, setFormData] = useState<Combo>({
    id: "",
    ComboId: "",
    ComboDescripcion: "",
    ProductoId: "",
    ComboCantidad: 1,
    ComboPrecio: 0,
  });
  const [productoSearch, setProductoSearch] = useState("");
  const [isProductoDropdownOpen, setIsProductoDropdownOpen] = useState(false);
  const productoDropdownRef = useRef<HTMLDivElement>(null);

  const productosOrdenados = useMemo(
    () =>
      [...productos].sort((a, b) =>
        a.ProductoNombre.localeCompare(b.ProductoNombre, "es", {
          sensitivity: "base",
        })
      ),
    [productos]
  );

  const productosFiltrados = useMemo(() => {
    const term = productoSearch.trim().toLowerCase();
    if (!term) return productosOrdenados;
    return productosOrdenados.filter((p) =>
      p.ProductoNombre.toLowerCase().includes(term)
    );
  }, [productosOrdenados, productoSearch]);

  const productoSeleccionado = productos.find(
    (p) => String(p.ProductoId) === String(formData.ProductoId)
  );

  useEffect(() => {
    if (!isProductoDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productoDropdownRef.current &&
        !productoDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductoDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProductoDropdownOpen]);

  useEffect(() => {
    if (!isModalOpen) {
      setProductoSearch("");
      setIsProductoDropdownOpen(false);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (currentCombo && productos.length > 0) {
      let productoId = currentCombo.ProductoId;

      // Si ProductoId no es un número, buscar por nombre
      if (isNaN(Number(productoId))) {
        const productoEncontrado = productos.find(
          (p) => p.ProductoNombre === productoId
        );
        productoId = productoEncontrado
          ? String(productoEncontrado.ProductoId)
          : "";
      } else {
        productoId = String(productoId);
      }

      setFormData({
        ...currentCombo,
        ProductoId: productoId,
      });
    } else if (!currentCombo) {
      setFormData({
        id: "",
        ComboId: "",
        ComboDescripcion: "",
        ProductoId: "",
        ComboCantidad: 1,
        ComboPrecio: 0,
      });
    }
  }, [currentCombo, productos]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "ComboCantidad" || name === "ComboPrecio"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const columns = [
    { key: "ComboId", label: "ID" },
    { key: "ComboDescripcion", label: "Descripción" },
    { key: "ProductoId", label: "Producto" },
    { key: "ComboCantidad", label: "Cantidad" },
    {
      key: "ComboPrecio",
      label: "Precio",
      render: (item: Combo) => formatMiles(item.ComboPrecio),
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
            placeholder="Buscar combos"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Combo"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {formatMiles(combos.length)} de{" "}
          {formatMiles(pagination?.totalItems ?? combos.length)} combos
        </div>
      </div>
      <DataTable<Combo>
        columns={columns}
        data={combos.map((combo) => ({
          ...combo,
          ProductoId:
            productos.find((p) => p.ProductoId === combo.ProductoId)
              ?.ProductoNombre || combo.ProductoId,
        }))}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron combos"
      />
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={onCloseModal}
          />
          <div className="relative w-full max-w-2xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow"
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentCombo
                    ? `Editar combo: ${currentCombo.ComboDescripcion}`
                    : "Crear nuevo combo"}
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
                    <label
                      htmlFor="ComboDescripcion"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Descripción
                    </label>
                    <input
                      type="text"
                      name="ComboDescripcion"
                      id="ComboDescripcion"
                      value={formData.ComboDescripcion}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoId"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Producto
                    </label>
                    <div
                      className="relative"
                      ref={productoDropdownRef}
                    >
                      <input
                        type="text"
                        id="ProductoId"
                        autoComplete="off"
                        value={
                          isProductoDropdownOpen
                            ? productoSearch
                            : productoSeleccionado?.ProductoNombre || ""
                        }
                        placeholder="Seleccione un producto"
                        onFocus={() => {
                          setProductoSearch("");
                          setIsProductoDropdownOpen(true);
                        }}
                        onChange={(e) => {
                          setProductoSearch(e.target.value);
                          setIsProductoDropdownOpen(true);
                        }}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        required={!formData.ProductoId}
                      />
                      {isProductoDropdownOpen && (
                        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                          {productosFiltrados.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-gray-500">
                              Sin resultados
                            </li>
                          ) : (
                            productosFiltrados.map((producto) => (
                              <li
                                key={String(producto.ProductoId)}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    ProductoId: String(producto.ProductoId),
                                  }));
                                  setProductoSearch("");
                                  setIsProductoDropdownOpen(false);
                                }}
                                className={`cursor-pointer px-3 py-2 text-sm hover:bg-blue-50 ${
                                  String(producto.ProductoId) ===
                                  String(formData.ProductoId)
                                    ? "bg-blue-100 font-medium"
                                    : ""
                                }`}
                              >
                                {producto.ProductoNombre}
                              </li>
                            ))
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ComboCantidad"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Cantidad
                    </label>
                    <input
                      type="number"
                      name="ComboCantidad"
                      id="ComboCantidad"
                      value={formData.ComboCantidad || ""}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                      min={1}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ComboPrecio"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Precio
                    </label>
                    <input
                      type="text"
                      name="ComboPrecio"
                      id="ComboPrecio"
                      value={
                        formData.ComboPrecio
                          ? formatMiles(formData.ComboPrecio)
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, "");
                        setFormData((prev) => ({
                          ...prev,
                          ComboPrecio: Number(raw),
                        }));
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentCombo ? "Actualizar" : "Crear"}
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
