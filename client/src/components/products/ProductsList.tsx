import { useEffect, useState, useRef } from "react";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { getLocales } from "../../services/locales.service";
import { getAlmacenes } from "../../services/almacenes.service";
import { formatMiles, formatMilesWithDecimals } from "../../utils/utils";

export interface ProductoAlmacenRow {
  AlmacenId: number;
  AlmacenNombre?: string;
  ProductoAlmacenStock: number;
  ProductoAlmacenStockUnitario: number;
}

interface Producto {
  ProductoId?: number;
  ProductoCodigo: string;
  ProductoNombre: string;
  ProductoPrecioVenta: number;
  ProductoPrecioVentaMayorista?: number;
  ProductoPrecioUnitario?: number;
  ProductoPrecioPromedio?: number;
  ProductoStock: number;
  ProductoStockUnitario?: number;
  ProductoCantidadCaja?: number;
  ProductoIVA?: number;
  ProductoStockMinimo?: number;
  ProductoImagen?: string;
  ProductoImagen_GXI?: string;
  LocalId: number;
  productoAlmacen?: ProductoAlmacenRow[];
  [key: string]: unknown;
}

interface Pagination {
  totalItems: number;
}

interface ProductsListProps {
  productos: Producto[];
  onDelete?: (item: Producto) => void;
  onEdit?: (item: Producto) => void;
  onCreate?: () => void;
  pagination?: Pagination;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  currentProduct?: Producto | null;
  onSubmit: (
    formData: Producto & { productoAlmacen?: ProductoAlmacenRow[] }
  ) => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
}

export default function ProductsList({
  productos,
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
  currentProduct,
  onSubmit,
  sortKey,
  sortOrder,
  onSort,
}: ProductsListProps) {
  const [formData, setFormData] = useState<Producto>({
    ProductoCodigo: "0",
    ProductoNombre: "",
    ProductoPrecioVenta: 0,
    ProductoPrecioVentaMayorista: 0,
    ProductoPrecioUnitario: 0,
    ProductoPrecioPromedio: 0,
    ProductoStock: 0,
    ProductoStockUnitario: 0,
    ProductoCantidadCaja: 1,
    ProductoIVA: 0,
    ProductoStockMinimo: 0,
    ProductoImagen: "",
    ProductoImagen_GXI: "",
    LocalId: 1,
  });
  const [locales, setLocales] = useState<
    { LocalId: number; LocalNombre: string }[]
  >([]);
  const [almacenes, setAlmacenes] = useState<
    { AlmacenId: number; AlmacenNombre: string }[]
  >([]);
  const [stockAlmacenes, setStockAlmacenes] = useState<ProductoAlmacenRow[]>(
    []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [precioCostoFocused, setPrecioCostoFocused] = useState(false);

  useEffect(() => {
    getAlmacenes(1, 500).then((res) => {
      setAlmacenes(res.data ?? []);
    });
  }, []);

  useEffect(() => {
    if (currentProduct) {
      const cantidadCajaLoad = Math.max(
        1,
        Number(currentProduct.ProductoCantidadCaja) || 1
      );
      setStockAlmacenes(
        (currentProduct.productoAlmacen ?? []).map((pa) => {
          const rawUnitario = Number(pa.ProductoAlmacenStockUnitario) || 0;
          const rawCajas = Number(pa.ProductoAlmacenStock) || 0;
          const cajasFromUnitario = Math.floor(rawUnitario / cantidadCajaLoad);
          const unitarioNorm = rawUnitario % cantidadCajaLoad;
          return {
            AlmacenId: pa.AlmacenId,
            AlmacenNombre: pa.AlmacenNombre,
            ProductoAlmacenStock: rawCajas + cajasFromUnitario,
            ProductoAlmacenStockUnitario: unitarioNorm,
          };
        })
      );
      setFormData({
        ...currentProduct,
        ProductoPrecioVenta: currentProduct.ProductoPrecioVenta || 0,
        ProductoPrecioVentaMayorista:
          currentProduct.ProductoPrecioVentaMayorista || 0,
        ProductoPrecioUnitario: currentProduct.ProductoPrecioUnitario || 0,
        ProductoPrecioPromedio:
          typeof currentProduct.ProductoPrecioPromedio === "string"
            ? parseFloat(currentProduct.ProductoPrecioPromedio)
            : currentProduct.ProductoPrecioPromedio || 0,
        ProductoStock: currentProduct.ProductoStock || 0,
        ProductoStockUnitario: currentProduct.ProductoStockUnitario || 0,
        ProductoCantidadCaja: currentProduct.ProductoCantidadCaja || 0,
        ProductoIVA: currentProduct.ProductoIVA || 0,
        ProductoStockMinimo: currentProduct.ProductoStockMinimo || 0,
        ProductoImagen: currentProduct.ProductoImagen || "",
        ProductoImagen_GXI: currentProduct.ProductoImagen_GXI || "",
        LocalId: currentProduct.LocalId,
      });
    } else {
      setStockAlmacenes([]);
      setFormData({
        ProductoCodigo: "0",
        ProductoNombre: "",
        ProductoPrecioVenta: 0,
        ProductoPrecioVentaMayorista: 0,
        ProductoPrecioUnitario: 0,
        ProductoPrecioPromedio: 0,
        ProductoStock: 0,
        ProductoStockUnitario: 0,
        ProductoCantidadCaja: 1,
        ProductoIVA: 0,
        ProductoStockMinimo: 0,
        ProductoImagen: "",
        ProductoImagen_GXI: "",
        LocalId: 1,
      });
    }
    setPrecioCostoFocused(false); // Resetear el estado de foco cuando cambia el producto
    getLocales(1, 1000).then((res) => {
      setLocales(res.data || []);
    });
  }, [currentProduct]);

  // Manejar cambios en el formulario
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  // Manejar cambios en el nombre del producto (forzar mayúsculas)
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setFormData((prev) => ({
      ...prev,
      ProductoNombre: value,
    }));
  };

  // Manejar cambio de imagen (file input)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        ProductoImagen: (reader.result as string).split(",")[1] || "",
      }));
    };
    reader.readAsDataURL(file);
  };

  // Eliminar imagen
  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, ProductoImagen: "" }));
  };

  const addStockAlmacen = () => {
    const usedIds = new Set(stockAlmacenes.map((s) => s.AlmacenId));
    const firstAvailable = almacenes.find((a) => !usedIds.has(a.AlmacenId));
    if (firstAvailable) {
      setStockAlmacenes((prev) => [
        ...prev,
        {
          AlmacenId: firstAvailable.AlmacenId,
          AlmacenNombre: firstAvailable.AlmacenNombre,
          ProductoAlmacenStock: 0,
          ProductoAlmacenStockUnitario: 0,
        },
      ]);
    }
  };

  const removeStockAlmacen = (index: number) => {
    setStockAlmacenes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStockAlmacen = (
    index: number,
    field: keyof ProductoAlmacenRow,
    value: number | string
  ) => {
    setStockAlmacenes((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const setStockAlmacenAlmacenId = (index: number, AlmacenId: number) => {
    const almacen = almacenes.find((a) => a.AlmacenId === AlmacenId);
    setStockAlmacenes((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              AlmacenId,
              AlmacenNombre: almacen?.AlmacenNombre ?? row.AlmacenNombre,
            }
          : row
      )
    );
  };

  // Calcular stock total (cajas) y stock unitario total teniendo en cuenta Cantidad en Caja
  const cantidadCaja = Math.max(1, Number(formData.ProductoCantidadCaja) || 1);
  const totalCajasRaw = stockAlmacenes.reduce(
    (s, row) => s + (Number(row.ProductoAlmacenStock) || 0),
    0
  );
  const totalUnitarioRaw = stockAlmacenes.reduce(
    (s, row) => s + (Number(row.ProductoAlmacenStockUnitario) || 0),
    0
  );
  const stockTotalCajas =
    totalCajasRaw + Math.floor(totalUnitarioRaw / cantidadCaja);
  const stockUnitarioTotal = totalUnitarioRaw % cantidadCaja;

  // Enviar formulario
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ProductoImagen_GXI, ...cleanFormData } = formData; // Limpiamos ProductoImagen_GXI antes de enviar
    const payload = {
      ...cleanFormData,
      ProductoStock: stockTotalCajas,
      ProductoStockUnitario: stockUnitarioTotal,
      productoAlmacen: stockAlmacenes.map((pa) => ({
        AlmacenId: pa.AlmacenId,
        ProductoAlmacenStock: Number(pa.ProductoAlmacenStock) || 0,
        ProductoAlmacenStockUnitario:
          Number(pa.ProductoAlmacenStockUnitario) || 0,
      })),
    };
    onSubmit(payload);
  };

  // Configuración de columnas para la tabla
  const columns = [
    {
      key: "ProductoCodigo",
      label: "Código",
    },
    {
      key: "ProductoNombre",
      label: "Nombre",
    },
    {
      key: "ProductoPrecioVenta",
      label: "Precio Venta",
      render: (item: Producto) =>
        `Gs. ${item.ProductoPrecioVenta?.toLocaleString()}`,
    },
    {
      key: "ProductoStock",
      label: "Stock",
    },
    {
      key: "ProductoStockUnitario",
      label: "Stock Unitario",
    },
    {
      key: "LocalId",
      label: "Local",
      render: (item: Producto) =>
        String(item.LocalNombre || item.LocalId || "-"),
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
            placeholder="Buscar productos"
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nuevo Producto"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {productos.length} de {pagination?.totalItems} productos
        </div>
      </div>

      {/* Tabla de productos usando el componente DataTable */}
      <DataTable<Producto & { id: number }>
        columns={columns}
        data={productos.map((p) => ({ ...p, id: p.ProductoId ?? 0 }))}
        onEdit={onEdit}
        onDelete={onDelete}
        emptyMessage="No se encontraron productos"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />

      {/* Modal para crear/editar */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseModal();
          }}
        >
          {/* Fondo opacado */}
          <div className="absolute inset-0 bg-black opacity-50" />

          <div className="relative w-full max-w-2xl max-h-full z-10">
            <form
              onSubmit={handleSubmit}
              className="relative bg-white rounded-lg shadow"
            >
              <div className="flex items-start justify-between p-4 border-b rounded-t">
                <h3 className="text-xl font-semibold text-gray-900">
                  {currentProduct
                    ? `Editar producto: ${currentProduct.ProductoNombre}`
                    : "Crear nuevo producto"}
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

              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoCodigo"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Código
                    </label>
                    <input
                      type="text"
                      name="ProductoCodigo"
                      id="ProductoCodigo"
                      value={formData.ProductoCodigo}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoNombre"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Nombre
                    </label>
                    <input
                      type="text"
                      name="ProductoNombre"
                      id="ProductoNombre"
                      value={formData.ProductoNombre}
                      onChange={handleNombreChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 uppercase"
                      required
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoPrecioVenta"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Precio Minorista
                    </label>
                    <input
                      type="text"
                      name="ProductoPrecioVenta"
                      id="ProductoPrecioVenta"
                      value={formatMiles(formData.ProductoPrecioVenta)}
                      onChange={(e) => {
                        // Eliminar puntos y formatear a número
                        const raw = e.target.value.replace(/\./g, "");
                        setFormData((prev) => ({
                          ...prev,
                          ProductoPrecioVenta: Number(raw),
                        }));
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      required
                    />
                  </div>
                  {/* Campos adicionales opcionales */}
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoPrecioVentaMayorista"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Precio Mayorista
                    </label>
                    <input
                      type="text"
                      name="ProductoPrecioVentaMayorista"
                      id="ProductoPrecioVentaMayorista"
                      value={formatMiles(
                        formData.ProductoPrecioVentaMayorista || 0
                      )}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\./g, "");
                        setFormData((prev) => ({
                          ...prev,
                          ProductoPrecioVentaMayorista: Number(raw),
                        }));
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoPrecioUnitario"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Precio Unitario
                    </label>
                    <input
                      type="number"
                      name="ProductoPrecioUnitario"
                      id="ProductoPrecioUnitario"
                      value={formData.ProductoPrecioUnitario}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoPrecioPromedio"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Precio Costo
                    </label>
                    <input
                      type="text"
                      name="ProductoPrecioPromedio"
                      id="ProductoPrecioPromedio"
                      value={
                        precioCostoFocused
                          ? formData.ProductoPrecioPromedio?.toString() || ""
                          : formatMilesWithDecimals(
                              formData.ProductoPrecioPromedio || 0
                            )
                      }
                      onFocus={() => setPrecioCostoFocused(true)}
                      onBlur={() => setPrecioCostoFocused(false)}
                      onChange={(e) => {
                        // Permitir escribir números y punto decimal
                        let raw = e.target.value.replace(/[^\d.]/g, "");

                        // Asegurar que solo haya un punto decimal
                        const parts = raw.split(".");
                        if (parts.length > 2) {
                          raw = parts[0] + "." + parts.slice(1).join("");
                        }

                        const numValue =
                          raw === "" || raw === "." ? 0 : parseFloat(raw);
                        setFormData((prev) => ({
                          ...prev,
                          ProductoPrecioPromedio: isNaN(numValue)
                            ? 0
                            : numValue,
                        }));
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoStock"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Stock total (todos los almacenes)
                    </label>
                    <input
                      type="number"
                      name="ProductoStock"
                      id="ProductoStock"
                      min={0}
                      value={stockTotalCajas}
                      readOnly
                      className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 cursor-not-allowed"
                      title="Cajas + unidades convertidas a cajas (según Cantidad por Caja)"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoStockUnitario"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Stock unitario total (todos los almacenes)
                    </label>
                    <input
                      type="number"
                      name="ProductoStockUnitario"
                      id="ProductoStockUnitario"
                      min={0}
                      value={stockUnitarioTotal}
                      readOnly
                      className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 cursor-not-allowed"
                      title="Resto de unidades después de formar cajas (según Cantidad por Caja)"
                    />
                  </div>
                  {/* Stock por almacén */}
                  <div className="col-span-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-900">
                        Stock por almacén (editar cantidades aquí)
                      </label>
                      <button
                        type="button"
                        onClick={addStockAlmacen}
                        className="text-blue-600 hover:text-blue-800 border border-blue-300 bg-white rounded px-3 py-1 text-sm font-medium cursor-pointer flex items-center gap-1"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Agregar almacén
                      </button>
                    </div>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full text-sm text-left text-gray-900">
                        <thead className="bg-gray-100 text-gray-700">
                          <tr>
                            <th className="px-3 py-2">Almacén</th>
                            <th className="px-3 py-2">Stock (cajas)</th>
                            <th className="px-3 py-2">Stock unitario</th>
                            <th className="px-3 py-2 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockAlmacenes.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-4 text-gray-500"
                              >
                                Sin almacenes. Agregue al menos uno para cargar
                                stock.
                              </td>
                            </tr>
                          ) : (
                            stockAlmacenes.map((row, index) => (
                              <tr
                                key={index}
                                className="border-t border-gray-200 bg-white"
                              >
                                <td className="px-3 py-2">
                                  <select
                                    value={row.AlmacenId}
                                    onChange={(e) =>
                                      setStockAlmacenAlmacenId(
                                        index,
                                        Number(e.target.value)
                                      )
                                    }
                                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                                  >
                                    {almacenes.map((a) => {
                                      const used =
                                        stockAlmacenes.some(
                                          (s, i) =>
                                            i !== index &&
                                            s.AlmacenId === a.AlmacenId
                                        ) ?? false;
                                      return (
                                        <option
                                          key={a.AlmacenId}
                                          value={a.AlmacenId}
                                          disabled={used}
                                        >
                                          {a.AlmacenNombre}
                                          {used ? " (ya agregado)" : ""}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min={0}
                                    value={row.ProductoAlmacenStock}
                                    onChange={(e) =>
                                      updateStockAlmacen(
                                        index,
                                        "ProductoAlmacenStock",
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={Math.max(0, cantidadCaja - 1)}
                                    value={row.ProductoAlmacenStockUnitario}
                                    onChange={(e) => {
                                      const raw = Number(e.target.value) || 0;
                                      const clamped = Math.min(
                                        Math.max(0, raw),
                                        Math.max(0, cantidadCaja - 1)
                                      );
                                      updateStockAlmacen(
                                        index,
                                        "ProductoAlmacenStockUnitario",
                                        clamped
                                      );
                                    }}
                                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                                    title={`Máximo ${
                                      cantidadCaja - 1
                                    } (Cantidad en Caja - 1)`}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => removeStockAlmacen(index)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded"
                                    title="Eliminar"
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoCantidadCaja"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Cantidad por Caja
                    </label>
                    <input
                      type="number"
                      name="ProductoCantidadCaja"
                      id="ProductoCantidadCaja"
                      value={formData.ProductoCantidadCaja}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoIVA"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      IVA
                    </label>
                    <input
                      type="number"
                      name="ProductoIVA"
                      id="ProductoIVA"
                      value={formData.ProductoIVA}
                      onChange={handleInputChange}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label
                      htmlFor="ProductoStockMinimo"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      name="ProductoStockMinimo"
                      id="ProductoStockMinimo"
                      value={formData.ProductoStockMinimo}
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
                  {/* Imagen: solo mostrar base64 si existe */}
                  <div className="col-span-6">
                    <label className="block mb-2 text-sm font-medium text-gray-900">
                      Imagen del producto
                    </label>
                    <div className="flex items-center gap-4 mb-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-800 border border-blue-300 bg-white rounded px-3 py-1 text-sm font-medium cursor-pointer"
                      >
                        Seleccionar imagen
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        ref={fileInputRef}
                      />
                      {formData.ProductoImagen && (
                        <>
                          <img
                            src={`data:image/jpeg;base64,${formData.ProductoImagen}`}
                            alt="Imagen producto"
                            className="w-32 h-32 object-contain border rounded"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="text-red-600 hover:text-red-800 border border-red-300 bg-white rounded px-3 py-1 text-sm"
                          >
                            Eliminar imagen
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                <ActionButton
                  label={currentProduct ? "Actualizar" : "Crear"}
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
