import { useEffect, useMemo, useRef, useState } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import ModalDialog from "../common/ModalDialog";
import Button from "../common/Button/Button";
import { PlusIcon } from "@heroicons/react/24/outline";
import { formatMiles } from "../../utils/utils";
import MoneyInput from "../common/Input/MoneyInput";

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
        <div className="text-sm text-text-muted">
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
      <ModalDialog
        open={isModalOpen}
        onClose={onCloseModal}
        size="2xl"
        title={
          currentCombo
            ? `Editar combo: ${currentCombo.ComboDescripcion}`
            : "Crear nuevo combo"
        }
        footer={
          <>
            <Button variant="secondary" type="button" onClick={onCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="combo-form">
              {currentCombo ? "Actualizar" : "Crear"}
            </Button>
          </>
        }
      >
        <form id="combo-form" onSubmit={handleSubmit}>
          <div className="space-y-6">
            <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ComboDescripcion"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Descripción
                    </label>
                    <input
                      type="text"
                      name="ComboDescripcion"
                      id="ComboDescripcion"
                      value={formData.ComboDescripcion}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoId"
                      className="block mb-2 text-sm font-medium text-text"
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
                        className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                        required={!formData.ProductoId}
                      />
                      {isProductoDropdownOpen && (
                        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-lg">
                          {productosFiltrados.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-text-muted">
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
                                className={`cursor-pointer px-3 py-2 text-sm hover:bg-brand-50 ${
                                  String(producto.ProductoId) ===
                                  String(formData.ProductoId)
                                    ? "bg-brand-100 font-medium"
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
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Cantidad
                    </label>
                    <input
                      type="number"
                      name="ComboCantidad"
                      id="ComboCantidad"
                      value={formData.ComboCantidad || ""}
                      onChange={handleInputChange}
                      className="bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5"
                      required
                      min={1}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ComboPrecio"
                      className="block mb-2 text-sm font-medium text-text"
                    >
                      Precio
                    </label>
                    <MoneyInput
                      name="ComboPrecio"
                      id="ComboPrecio"
                      value={formData.ComboPrecio}
                      onValueChange={(v) =>
                        setFormData((prev) => ({
                          ...prev,
                          ComboPrecio: v,
                        }))
                      }
                      required
                    />
                  </div>
            </div>
          </div>
        </form>
      </ModalDialog>
    </>
  );
}
