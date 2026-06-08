import React, { useState, useEffect, useRef } from "react";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import {
  getProductosAll,
  getProductoById,
  updateProducto,
} from "../../services/productos.service";
import { getAlmacenes } from "../../services/almacenes.service";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";
import Swal from "sweetalert2";
import logo from "../../assets/img/logo.jpg";
import { useNavigate } from "react-router-dom";
import ActionButton from "../../components/common/Button/ActionButton";
import { getLocalById } from "../../services/locales.service";
import { usePermiso } from "../../hooks/usePermiso";

interface AlmacenStockRow {
  AlmacenId: number;
  AlmacenNombre: string;
  ProductoAlmacenStock: number;
  ProductoAlmacenStockUnitario: number;
}

interface CarritoItem {
  id: number;
  nombre: string;
  imagen: string;
  stock: number;
  cartItemId: number;
  ProductoCantidadCaja: number;
  almacenesStock: AlmacenStockRow[];
}

export default function Inventario() {
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [almacenes, setAlmacenes] = useState<
    { AlmacenId: number; AlmacenNombre: string }[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<
    {
      ProductoId: number;
      ProductoCodigo: string;
      ProductoNombre: string;
      ProductoPrecioVenta: number;
      ProductoPrecioPromedio?: string;
      ProductoStock: number;
      ProductoImagen?: string;
      ProductoPrecioVentaMayorista: number;
      LocalId: string | number;
      ProductoPrecioUnitario: number;
      ProductoStockUnitario?: number;
      ProductoCantidadCaja?: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const puedeCrear = usePermiso("INVENTARIO", "crear");
  const puedeEditar = usePermiso("INVENTARIO", "editar");
  const puedeEliminar = usePermiso("INVENTARIO", "eliminar");
  const puedeLeer = usePermiso("INVENTARIO", "leer");
  const [localNombre, setLocalNombre] = useState("");
  const navigate = useNavigate();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAlmacenes(1, 500).then((res) => {
      const list = (res.data ?? []).filter(
        (a: { AlmacenId: number }) => a.AlmacenId !== 0
      );
      setAlmacenes(list);
    });
  }, []);

  // Focus automático en el campo de búsqueda al cargar la página
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const agregarProducto = async (producto: {
    id: number;
    nombre: string;
    imagen: string;
    stock: number;
  }) => {
    if (!puedeCrear) {
      Swal.fire({
        icon: "warning",
        title: "Sin permisos",
        text: "No tienes permiso para agregar productos al inventario.",
      });
      return;
    }
    if (carrito.some((p) => p.id === producto.id)) {
      Swal.fire({
        icon: "info",
        title: "Ya agregado",
        text: "Este producto ya está en la lista.",
      });
      return;
    }
    try {
      const fullProduct = await getProductoById(producto.id);
      const cantidadCajaLoad = Math.max(
        1,
        Number(fullProduct.ProductoCantidadCaja) || 1
      );
      const paMap = new Map<number, AlmacenStockRow>();
      (fullProduct.productoAlmacen ?? []).forEach((pa: AlmacenStockRow) => {
        const rawU = Number(pa.ProductoAlmacenStockUnitario) || 0;
        const rawC = Number(pa.ProductoAlmacenStock) || 0;
        const cajasFromU = Math.floor(rawU / cantidadCajaLoad);
        paMap.set(pa.AlmacenId, {
          AlmacenId: pa.AlmacenId,
          AlmacenNombre: pa.AlmacenNombre ?? "",
          ProductoAlmacenStock: rawC + cajasFromU,
          ProductoAlmacenStockUnitario: rawU % cantidadCajaLoad,
        });
      });
      const almacenesStock: AlmacenStockRow[] = almacenes.map((a) => {
        const existing = paMap.get(a.AlmacenId);
        return (
          existing ?? {
            AlmacenId: a.AlmacenId,
            AlmacenNombre: a.AlmacenNombre,
            ProductoAlmacenStock: 0,
            ProductoAlmacenStockUnitario: 0,
          }
        );
      });
      const nuevoCartItemId = Date.now() + Math.random();
      setCarrito((prev) => [
        ...prev,
        {
          id: producto.id,
          nombre: producto.nombre,
          imagen: producto.imagen,
          stock: producto.stock,
          cartItemId: nuevoCartItemId,
          ProductoCantidadCaja: cantidadCajaLoad,
          almacenesStock,
        },
      ]);
      setSelectedProductId(nuevoCartItemId);
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el producto para agregar al inventario.",
      });
    }
  };

  const quitarProducto = (cartItemId: number) => {
    if (!puedeEliminar) {
      Swal.fire({
        icon: "warning",
        title: "Sin permisos",
        text: "No tienes permiso para eliminar productos del inventario.",
      });
      return;
    }
    setCarrito(carrito.filter((p) => p.cartItemId !== cartItemId));
  };

  const updateStockAlmacen = (
    cartItemId: number,
    almacenIndex: number,
    field: "ProductoAlmacenStock" | "ProductoAlmacenStockUnitario",
    value: number
  ) => {
    if (!puedeEditar) return;
    setCarrito((prev) =>
      prev.map((p) => {
        if (p.cartItemId !== cartItemId) return p;
        const cantidadCaja = Math.max(1, p.ProductoCantidadCaja || 1);
        const maxUnitario = Math.max(0, cantidadCaja - 1);
        const newStock = [...p.almacenesStock];
        if (field === "ProductoAlmacenStockUnitario") {
          newStock[almacenIndex] = {
            ...newStock[almacenIndex],
            [field]: Math.min(maxUnitario, Math.max(0, value)),
          };
        } else {
          newStock[almacenIndex] = {
            ...newStock[almacenIndex],
            [field]: Math.max(0, value),
          };
        }
        return { ...p, almacenesStock: newStock };
      })
    );
  };

  const computeTotals = (item: CarritoItem) => {
    const cantidadCaja = Math.max(1, item.ProductoCantidadCaja || 1);
    const totalCajasRaw = item.almacenesStock.reduce(
      (s, r) => s + (Number(r.ProductoAlmacenStock) || 0),
      0
    );
    const totalUnitarioRaw = item.almacenesStock.reduce(
      (s, r) => s + (Number(r.ProductoAlmacenStockUnitario) || 0),
      0
    );
    return {
      totalCajas: totalCajasRaw + Math.floor(totalUnitarioRaw / cantidadCaja),
      totalUnitario: totalUnitarioRaw % cantidadCaja,
    };
  };

  useEffect(() => {
    setLoading(true);
    getProductosAll()
      .then((data) => {
        setProductos(data.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.LocalId) {
      getLocalById(user.LocalId)
        .then((data) => {
          setLocalNombre(data.LocalNombre || "");
        })
        .catch(() => setLocalNombre(""));
    } else {
      setLocalNombre("");
    }
  }, [user?.LocalId]);

  const sendRequest = async () => {
    if (!puedeCrear && !puedeEditar) {
      Swal.fire({
        icon: "warning",
        title: "Sin permisos",
        text: "No tienes permiso para actualizar el inventario.",
      });
      return;
    }

    if (carrito.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Debes agregar al menos un producto",
      });
      return;
    }

    try {
      for (const item of carrito) {
        const { totalCajas, totalUnitario } = computeTotals(item);
        const fullProduct = await getProductoById(item.id);
        const payload = {
          ...fullProduct,
          productoAlmacen: item.almacenesStock.map((pa) => ({
            AlmacenId: pa.AlmacenId,
            ProductoAlmacenStock: Number(pa.ProductoAlmacenStock) || 0,
            ProductoAlmacenStockUnitario:
              Number(pa.ProductoAlmacenStockUnitario) || 0,
          })),
          ProductoStock: totalCajas,
          ProductoStockUnitario: totalUnitario,
        };
        await updateProducto(item.id, payload);
      }

      Swal.fire({
        icon: "success",
        title: "Inventario actualizado",
        text: "El stock por almacén se actualizó correctamente.",
      }).then(() => {
        setCarrito([]);
        getProductosAll().then((data) => setProductos(data.data || []));
      });
    } catch (error: unknown) {
      console.error("Error al actualizar inventario:", error);
      const err = error as { response?: { data?: { message?: string } } };
      const msg =
        err?.response?.data?.message || "Error al actualizar inventario";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    }
  };

  const handleSearchSubmit = () => {
    if (!busqueda.trim()) return;

    if (!puedeCrear) {
      Swal.fire({
        icon: "warning",
        title: "Sin permisos",
        text: "No tienes permiso para agregar productos al inventario.",
      });
      return;
    }

    const productosFiltrados = productos.filter(
      (p) =>
        (p.ProductoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          (p.ProductoCodigo &&
            String(p.ProductoCodigo)
              .toLowerCase()
              .includes(busqueda.toLowerCase()))) &&
        (Number(p.LocalId) === 0 || Number(p.LocalId) === Number(user?.LocalId))
    );

    if (productosFiltrados.length > 0) {
      const primerProducto = productosFiltrados[0];
      agregarProducto({
        id: primerProducto.ProductoId,
        nombre: primerProducto.ProductoNombre,
        imagen: primerProducto.ProductoImagen
          ? `data:image/jpeg;base64,${primerProducto.ProductoImagen}`
          : logo,
        stock: primerProducto.ProductoStock,
      });
      setBusqueda("");
    }
  };

  if (!puedeLeer) return <div>No tienes permiso para ver el inventario.</div>;

  return (
    <div className="flex h-screen bg-[#f5f8ff]">
      {/* Lado Izquierdo */}
      <div className="flex-1 bg-[#f5f8ff] p-4 flex flex-col justify-between">
        <div className="bg-white rounded-xl shadow-lg p-0 mb-4 flex flex-col max-h-[80vh] overflow-hidden">
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <table className="w-full border-separate border-spacing-0 min-w-[600px]">
              <thead>
                <tr className="text-left bg-[#f5f8ff]">
                  <th
                    rowSpan={2}
                    className="py-3 pl-4 font-semibold text-[14px] sticky left-0 bg-[#f5f8ff] z-10 align-middle min-w-[180px]"
                  >
                    Producto
                  </th>
                  {almacenes.map((a) => (
                    <th
                      key={a.AlmacenId}
                      colSpan={2}
                      className="py-2 px-1 font-semibold text-[13px] text-center border-l border-gray-200"
                    >
                      {a.AlmacenNombre}
                    </th>
                  ))}
                  <th
                    rowSpan={2}
                    className="py-3 px-2 font-semibold text-[13px] text-center border-l-2 border-gray-300 bg-[#e8eef7] align-middle w-[70px]"
                  >
                    Total Caja
                  </th>
                  <th
                    rowSpan={2}
                    className="py-3 px-2 font-semibold text-[13px] text-center bg-[#e8eef7] align-middle w-[70px]"
                  >
                    Total Unit.
                  </th>
                </tr>
                <tr className="bg-[#f0f4ff] text-[12px] text-gray-600">
                  {almacenes.map((a) => (
                    <React.Fragment key={a.AlmacenId}>
                      <th className="py-1 px-1 text-center border-l border-gray-200 w-[52px]">
                        Caja
                      </th>
                      <th className="py-1 px-1 text-center border-l border-gray-200 w-[52px]">
                        Unit.
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carrito.map((p, idx) => {
                  const { totalCajas, totalUnitario } = computeTotals(p);
                  return (
                    <tr
                      key={p.cartItemId}
                      className={`${
                        p.cartItemId === selectedProductId
                          ? "bg-gray-50"
                          : idx !== carrito.length - 1
                          ? "border-b border-gray-200"
                          : ""
                      } transition-colors`}
                    >
                      <td className="py-2 pl-4 align-middle sticky left-0 bg-inherit z-10">
                        <div className="flex items-center gap-2">
                          <img
                            src={p.imagen}
                            alt={p.nombre}
                            className="w-10 h-10 object-contain rounded bg-[#f5f8ff]"
                          />
                          <div>
                            <div className="font-semibold text-[14px] leading-tight">
                              {p.nombre}
                            </div>
                            {puedeEliminar && (
                              <button
                                type="button"
                                className="text-red-600 text-xs mt-0.5"
                                onClick={() => quitarProducto(p.cartItemId)}
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      {p.almacenesStock.map((pa, ai) => (
                        <React.Fragment key={pa.AlmacenId}>
                          <td className="border-l border-gray-200 px-1 py-2 align-middle text-center">
                            <input
                              type="number"
                              min={0}
                              value={pa.ProductoAlmacenStock}
                              onChange={(e) =>
                                updateStockAlmacen(
                                  p.cartItemId,
                                  ai,
                                  "ProductoAlmacenStock",
                                  Number(e.target.value) || 0
                                )
                              }
                              disabled={!puedeEditar}
                              className="w-12 h-8 text-center border border-gray-300 rounded text-sm block mx-auto"
                            />
                          </td>
                          <td className="border-l border-gray-200 px-1 py-2 align-middle text-center">
                            <input
                              type="number"
                              min={0}
                              max={Math.max(
                                0,
                                (p.ProductoCantidadCaja || 1) - 1
                              )}
                              value={pa.ProductoAlmacenStockUnitario}
                              onChange={(e) => {
                                const raw = Number(e.target.value) || 0;
                                const maxU = Math.max(
                                  0,
                                  (p.ProductoCantidadCaja || 1) - 1
                                );
                                updateStockAlmacen(
                                  p.cartItemId,
                                  ai,
                                  "ProductoAlmacenStockUnitario",
                                  Math.min(maxU, Math.max(0, raw))
                                );
                              }}
                              disabled={!puedeEditar}
                              className="w-12 h-8 text-center border border-gray-300 rounded text-sm block mx-auto"
                              title={`Máx. ${
                                (p.ProductoCantidadCaja || 1) - 1
                              }`}
                            />
                          </td>
                        </React.Fragment>
                      ))}
                      <td className="px-2 py-2 text-center font-semibold border-l-2 border-gray-300 bg-[#e8eef7] text-gray-900 align-middle">
                        {totalCajas}
                      </td>
                      <td className="px-2 py-2 text-center font-semibold bg-[#e8eef7] text-gray-900 align-middle">
                        {totalUnitario}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de control inferior */}
        <div className="bg-white rounded-xl shadow p-4">
          <div className="mb-3">
            <button
              className={`w-full border rounded-lg text-white font-medium text-lg h-[60px] flex items-center justify-center transition ${
                puedeCrear || puedeEditar
                  ? "bg-green-500 border-green-500 hover:bg-green-600"
                  : "bg-gray-400 border-gray-400 cursor-not-allowed"
              }`}
              onClick={sendRequest}
              disabled={!puedeCrear && !puedeEditar}
            >
              Fijar stock por almacén
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center">
            Los totales se calculan según Cantidad en Caja de cada producto.
          </p>
          {localNombre && (
            <div className="mt-2 text-center text-sm text-gray-600">
              Local: <span className="font-semibold">{localNombre}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lado Derecho */}
      <div className="flex-[2] p-4">
        <div className="flex items-center mb-4 justify-between">
          <div className="flex items-center gap-4">
            <SearchButton
              searchTerm={busqueda}
              onSearch={setBusqueda}
              onSearchSubmit={handleSearchSubmit}
              placeholder="Buscar por nombre o código"
              hideButton={true}
              inputRef={searchInputRef}
            />
          </div>
          {user && (
            <div className="ml-6 font-semibold text-[#222] text-[16px] flex items-center gap-2">
              <span>
                {user.nombre + " "}
                <span style={{ color: "#888", fontWeight: 400 }}>
                  ({user.id})
                </span>
              </span>
              {localNombre && (
                <span className="text-red-600 font-medium">
                  | Local: {localNombre}
                </span>
              )}
              <ActionButton
                label="Volver"
                onClick={() => navigate(-1)}
                className="bg-gray-500 hover:bg-gray-700 text-white"
              />
            </div>
          )}
        </div>

        {/* Contenedor con scroll solo para los productos */}
        <div
          className="overflow-y-auto"
          style={{ height: "calc(100vh - 120px)" }}
        >
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            }}
          >
            {loading ? (
              <div>Cargando productos...</div>
            ) : (
              productos
                .filter(
                  (p) =>
                    (p.ProductoNombre.toLowerCase().includes(
                      busqueda.toLowerCase()
                    ) ||
                      (p.ProductoCodigo &&
                        String(p.ProductoCodigo)
                          .toLowerCase()
                          .includes(busqueda.toLowerCase()))) &&
                    (Number(p.LocalId) === 0 ||
                      Number(p.LocalId) === Number(user?.LocalId))
                )
                .map((p) => (
                  <ProductCard
                    key={p.ProductoId}
                    nombre={p.ProductoNombre}
                    precio={
                      p.ProductoPrecioPromedio
                        ? Number(p.ProductoPrecioPromedio)
                        : p.ProductoPrecioVenta
                    }
                    precioMayorista={p.ProductoPrecioVentaMayorista}
                    clienteTipo="MI"
                    imagen={
                      p.ProductoImagen
                        ? `data:image/jpeg;base64,${p.ProductoImagen}`
                        : logo
                    }
                    stock={p.ProductoStock}
                    onAdd={() => {
                      if (puedeCrear) {
                        agregarProducto({
                          id: p.ProductoId,
                          nombre: p.ProductoNombre,
                          imagen: p.ProductoImagen
                            ? `data:image/jpeg;base64,${p.ProductoImagen}`
                            : logo,
                          stock: p.ProductoStock,
                        });
                      } else {
                        Swal.fire({
                          icon: "warning",
                          title: "Sin permisos",
                          text: "No tienes permiso para agregar productos al inventario.",
                        });
                      }
                    }}
                    precioUnitario={0}
                    stockUnitario={p.ProductoStockUnitario}
                  />
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
