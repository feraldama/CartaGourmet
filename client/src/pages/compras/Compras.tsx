import { useState, useEffect, useRef, useCallback } from "react";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import {
  getProductosPaginated,
  searchProductos,
} from "../../services/productos.service";
import Pagination from "../../components/common/Pagination";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";
import Swal from "sweetalert2";
import { confirmarCompra } from "../../services/compras.service";
import { usePermiso } from "../../hooks/usePermiso";
import { PermissionDenied } from "../../components/common/ui";
import { resolveProductoImagen } from "../../utils/productImage";
import {
  getAllProveedoresSinPaginacion,
  createProveedor,
} from "../../services/proveedores.service";
import ProveedorModal from "../../components/common/ProveedorModal";
import { useNavigate } from "react-router-dom";
import ActionButton from "../../components/common/Button/ActionButton";
import { formatMiles } from "../../utils/utils";
import { getEstadoAperturaPorUsuario } from "../../services/registrodiariocaja.service";
import { getCajaById } from "../../services/cajas.service";
import { getLocalById } from "../../services/locales.service";

import type { Proveedor } from "../../types";

interface CreateProveedorData {
  ProveedorRUC: string;
  ProveedorNombre: string;
  ProveedorDireccion?: string;
  ProveedorTelefono?: string;
}

import type { Caja } from "../../types";

export default function Compras() {
  const puedeLeerCompras = usePermiso("NUEVACOMPRA", "leer");
  const [carrito, setCarrito] = useState<
    {
      id: number;
      nombre: string;
      precioTotal: number; // Precio total pagado por el producto
      precioUnitario: number; // Precio unitario (costo) calculado
      precioVentaActual: number; // Precio al que se vende actualmente
      imagen: string;
      stock: number;
      cantidad: number;
      caja: boolean; // Indica si es caja o unidad
      cartItemId: number;
    }[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });
  const [productos, setProductos] = useState<
    {
      ProductoId: number;
      ProductoCodigo: string;
      ProductoNombre: string;
      ProductoPrecioVenta: number;
      ProductoPrecioPromedio?: string;
      ProductoStock: number;
      HasImagen?: number | boolean;
      ProductoPrecioVentaMayorista: number;
      LocalId: string | number;
      ProductoPrecioUnitario: number;
      ProductoStockUnitario?: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [showProveedorModal, setShowProveedorModal] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] =
    useState<Proveedor | null>(null);
  const [compraFactura, setCompraFactura] = useState("");
  const [compraTipo, setCompraTipo] = useState("CO");
  const [compraEntrega, setCompraEntrega] = useState(0);
  const [cajaAperturada, setCajaAperturada] = useState<Caja | null>(null);
  const [localNombre, setLocalNombre] = useState("");
  const navigate = useNavigate();
  // Estado para la fecha de la compra (por defecto fecha de hoy)
  const [compraFecha, setCompraFecha] = useState(() => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${año}-${mes}-${dia}`;
  });
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const cantidadRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addFirstOnNextResultsRef = useRef(false);

  useEffect(() => {
    if (selectedProductId !== null && cantidadRefs.current[selectedProductId]) {
      cantidadRefs.current[selectedProductId]?.focus();
    }
  }, [selectedProductId, carrito.length]);

  // Focus automático en el campo de búsqueda al cargar la página
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const agregarProducto = (producto: {
    id: number;
    nombre: string;
    precio: number;
    imagen: string;
    stock: number;
    precioVentaActual?: number;
  }) => {
    const nuevoCartItemId = Date.now() + Math.random();
    const precioTotal = producto.precio; // El precio que viene es el precio total (costo)
    const precioUnitario = producto.precio; // Inicialmente es igual al total (cantidad 1)

    setCarrito([
      ...carrito,
      {
        ...producto,
        precioTotal: precioTotal,
        precioUnitario: precioUnitario,
        precioVentaActual: producto.precioVentaActual ?? 0,
        cantidad: 1,
        caja: true, // Por defecto es unidad
        cartItemId: nuevoCartItemId,
      },
    ]);
    setSelectedProductId(nuevoCartItemId);
  };

  const quitarProducto = (cartItemId: number) => {
    setCarrito(carrito.filter((p) => p.cartItemId !== cartItemId));
  };

  const cambiarCantidad = (cartItemId: number, cantidad: number) => {
    setCarrito(
      carrito.map((p) => {
        if (p.cartItemId === cartItemId) {
          const nuevaCantidad = Math.max(1, cantidad);
          const precioUnitario = p.precioTotal / nuevaCantidad;
          return {
            ...p,
            cantidad: nuevaCantidad,
            precioUnitario: precioUnitario,
          };
        }
        return p;
      })
    );
  };

  const cambiarPrecioTotal = (cartItemId: number, precioTotal: number) => {
    setCarrito(
      carrito.map((p) => {
        if (p.cartItemId === cartItemId) {
          const precioUnitario = precioTotal / p.cantidad;
          return {
            ...p,
            precioTotal: precioTotal,
            precioUnitario: precioUnitario,
          };
        }
        return p;
      })
    );
  };

  const total = carrito.reduce((acc, p) => acc + p.precioTotal, 0);

  // Actualizar el monto entregado cuando cambie el total
  useEffect(() => {
    setCompraEntrega(total);
  }, [total]);

  // Carga paginada de productos (antes se traía todo el catálogo al entrar,
  // lo que demoraba varios segundos). Con paginación + búsqueda remota cada
  // pedido devuelve sólo la página visible.
  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      // El backend filtra por el local del usuario incluyendo los productos
      // "universales" (LocalId=0). Así la paginación ya devuelve exactamente
      // los ítems visibles y no quedan páginas incompletas.
      const localUsuario = Number(user?.LocalId);
      const filters = localUsuario ? { localIdOrZero: localUsuario } : undefined;
      const data = busquedaDebounced.trim()
        ? await searchProductos(
            busquedaDebounced.trim(),
            currentPage,
            itemsPerPage,
            undefined,
            undefined,
            filters,
          )
        : await getProductosPaginated(
            currentPage,
            itemsPerPage,
            undefined,
            undefined,
            filters,
          );

      setProductos(data.data || []);
      setPagination({
        totalItems: data.pagination?.totalItems || 0,
        totalPages: data.pagination?.totalPages || 1,
        currentPage: data.pagination?.currentPage || 1,
        itemsPerPage: data.pagination?.itemsPerPage || itemsPerPage,
      });
    } catch (error) {
      console.error("Error al cargar productos:", error);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }, [busquedaDebounced, currentPage, itemsPerPage, user?.LocalId]);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  // Debounce de 500ms entre lo que se tipea y la búsqueda remota.
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setCurrentPage(1);
    const timeoutId = setTimeout(() => {
      setBusquedaDebounced(busqueda);
      debounceTimeoutRef.current = null;
    }, 500);
    debounceTimeoutRef.current = timeoutId;
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [busqueda]);

  useEffect(() => {
    getAllProveedoresSinPaginacion()
      .then((data) => {
        setProveedores(data.data || []);
      })
      .catch(() => setProveedores([]));
  }, []);

  useEffect(() => {
    const fetchCaja = async () => {
      if (!user?.id) return;
      try {
        const estado = await getEstadoAperturaPorUsuario(user.id);
        if (estado.cajaId && estado.aperturaId > estado.cierreId) {
          const caja = await getCajaById(estado.cajaId);
          setCajaAperturada(caja);
        } else {
          Swal.fire({
            icon: "warning",
            title: "Caja no aperturada",
            text: "Debes aperturar una caja antes de realizar compras.",
            confirmButtonColor: "#2563eb",
          }).then(() => {
            navigate("/apertura-cierre-caja");
          });
          setCajaAperturada(null);
        }
      } catch {
        setCajaAperturada(null);
      }
    };
    fetchCaja();
  }, [user, navigate]);

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

  const handleCreateProveedor = async (proveedorData: CreateProveedorData) => {
    try {
      const nuevoProveedor = await createProveedor(proveedorData);
      const response = await getAllProveedoresSinPaginacion();
      setProveedores(response.data || []);
      if (nuevoProveedor.data) {
        setProveedorSeleccionado(nuevoProveedor.data);
        setShowProveedorModal(false);
      }
      Swal.fire({
        icon: "success",
        title: "Proveedor creado exitosamente",
        text: "El proveedor ha sido creado y seleccionado",
      });
    } catch (error) {
      console.error("Error al crear proveedor:", error);
      Swal.fire({
        icon: "error",
        title: "Error al crear proveedor",
        text: "Hubo un problema al crear el proveedor",
      });
    }
  };

  const sendRequest = async () => {
    if (!proveedorSeleccionado) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Debes seleccionar un proveedor",
      });
      return;
    }

    if (!compraFactura.trim()) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Debes ingresar el número de factura",
      });
      return;
    }

    if (!user?.id) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Usuario no válido. Por favor, inicia sesión nuevamente",
      });
      return;
    }

    // Combino la fecha del input (YYYY-MM-DD) con la hora local actual para
    // que CompraFecha (TIMESTAMP) registre el momento de confirmación.
    const ahora = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const compraFechaConHora =
      `${compraFecha}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:` +
      `${pad(ahora.getSeconds())}`;

    if (!cajaAperturada) {
      Swal.fire({
        icon: "error",
        title: "Caja no abierta",
        text: "Tenés que abrir tu caja antes de confirmar la compra.",
      });
      return;
    }

    try {
      await confirmarCompra({
        CompraFecha: compraFechaConHora,
        CompraFactura: parseInt(compraFactura),
        CompraTipo: compraTipo as "CO" | "CR",
        Entregado: compraEntrega,
        Total: total,
        UsuarioId: String(user.id),
        CajaId: Number(cajaAperturada.CajaId),
        Productos: carrito.map((p) => ({
          ProveedorId: Number(proveedorSeleccionado.ProveedorId),
          ProductoId: Number(p.id),
          CompraProductoCantidad: Number(p.cantidad),
          CompraProductoPrecio: Number(p.precioUnitario),
          AlmacenId: Number(user.LocalId || 1),
          Bonificacion: 0,
          CompraProductoCantidadUnidad: p.caja ? "C" : "U",
        })),
      });

      Swal.fire({
        title: "Compra realizada con éxito!",
        html: `Nueva compra en <b></b> segundos.`,
        timer: 3000,
        timerProgressBar: true,
        width: "90%",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
          const popup = Swal.getPopup();
          if (popup) {
            const timer = popup.querySelector("b");
            if (timer) {
              const timerInterval = setInterval(() => {
                const timerLeft = Swal.getTimerLeft();
                const secondsLeft = timerLeft ? Math.ceil(timerLeft / 1000) : 0;
                timer.textContent = `${secondsLeft}`;
              }, 100);

              // Limpiar el intervalo cuando el popup se cierre
              const originalClose = Swal.close;
              Swal.close = () => {
                clearInterval(timerInterval);
                originalClose.call(Swal);
              };
            }
          }
        },
      }).then((result) => {
        if (result.dismiss === Swal.DismissReason.timer) {
          setCarrito([]);
          setSelectedProductId(null);
          setBusqueda("");
          setBusquedaDebounced("");
          setCurrentPage(1);
          setProveedorSeleccionado(null);
          fetchProductos();
          searchInputRef.current?.focus();
        }
      });
    } catch (error: unknown) {
      console.error("Error al realizar la compra:", error);
      const err = error as { message?: string };
      const msg = err?.message || "Error al realizar la compra";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: msg,
      });
    }

    // Limpiar estados
    setCompraFactura("");
    setCompraEntrega(0);
    setCarrito([]);
    // Restaurar fecha a hoy
    const hoy = new Date();
    const añoHoy = hoy.getFullYear();
    const mesHoy = String(hoy.getMonth() + 1).padStart(2, "0");
    const diaHoy = String(hoy.getDate()).padStart(2, "0");
    setCompraFecha(`${añoHoy}-${mesHoy}-${diaHoy}`);
  };

  const handleTecladoNumerico = (valor: string | number) => {
    if (selectedProductId === null) return;
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.cartItemId !== selectedProductId) return item;
        let nuevaCantidad = String(item.cantidad);
        if (valor === "C" || valor === "c") {
          nuevaCantidad = "0";
        } else if (valor === "←") {
          nuevaCantidad =
            nuevaCantidad.length > 1 ? nuevaCantidad.slice(0, -1) : "0";
        } else {
          if (/^\d+$/.test(String(valor))) {
            nuevaCantidad = nuevaCantidad + valor;
          }
        }
        const cantidad = Math.max(0, Number(nuevaCantidad));
        const precioUnitario = item.precioTotal / cantidad;
        return { ...item, cantidad: cantidad, precioUnitario: precioUnitario };
      })
    );
  };

  // Agrega el primer producto visible al carrito (helper compartido por el
  // Enter inmediato y por el efecto que espera los resultados asíncronos).
  const agregarPrimerProductoVisible = () => {
    if (productos.length === 0) return;
    const p = productos[0];
    agregarProducto({
      id: p.ProductoId,
      nombre: p.ProductoNombre,
      precio: p.ProductoPrecioPromedio
        ? Number(p.ProductoPrecioPromedio)
        : p.ProductoPrecioVenta,
      imagen: resolveProductoImagen(p.ProductoId, p.HasImagen),
      stock: p.ProductoStock,
      precioVentaActual: p.ProductoPrecioVenta,
    });
  };

  // Cuando Enter dispara una búsqueda por código y los resultados todavía no
  // llegaron, este efecto agrega el primer producto al llegar la respuesta.
  useEffect(() => {
    if (!addFirstOnNextResultsRef.current) return;
    if (loading) return;
    addFirstOnNextResultsRef.current = false;
    agregarPrimerProductoVisible();
    setBusqueda("");
    searchInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, productos]);

  // ENTER dispara la búsqueda remota inmediatamente (saltea el debounce).
  // Si el término son solo dígitos lo tratamos como código y agregamos el
  // primer resultado; si tiene letras, solo filtramos y el usuario elige.
  const handleSearchSubmit = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (!busqueda.trim()) {
      setBusquedaDebounced(busqueda);
      return;
    }

    const esCodigo = /^\d+$/.test(busqueda.trim());
    if (!esCodigo) {
      setBusquedaDebounced(busqueda);
      return;
    }

    if (busqueda === busquedaDebounced && !loading) {
      agregarPrimerProductoVisible();
      setBusqueda("");
      return;
    }

    addFirstOnNextResultsRef.current = true;
    setBusquedaDebounced(busqueda);
  };

  if (!puedeLeerCompras)
    return <PermissionDenied resource="la pantalla de compras" />;

  return (
    <div className="flex h-screen bg-[#f5f8ff]">
      {/* Lado Izquierdo */}
      <div className="flex-1 bg-[#f5f8ff] p-4 flex flex-col justify-between">
        <div className="bg-white rounded-xl shadow-lg p-0 mb-4 flex flex-col max-h-[80vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="text-left bg-[#f5f8ff]">
                  <th className="py-4 pl-6 font-semibold text-[15px]">
                    Nombre
                  </th>
                  <th className="py-4 font-semibold text-[15px]">Cantidad</th>
                  <th className="py-4 font-semibold text-[15px]">
                    Precio Uni.
                  </th>
                  <th className="py-4 font-semibold text-[15px]">
                    Venta / % Gan.
                  </th>
                  <th className="py-4 pr-6 font-semibold text-[15px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {carrito.map((p, idx) => (
                  <tr
                    key={p.cartItemId}
                    className={`${
                      p.cartItemId === selectedProductId
                        ? "bg-gray-50 border-gray-300"
                        : idx !== carrito.length - 1
                        ? "border-b border-gray-200"
                        : ""
                    } transition-colors`}
                  >
                    <td className="py-3 pl-6 align-middle">
                      <div className="flex items-center gap-4">
                        <img
                          src={p.imagen}
                          alt={p.nombre}
                          className="w-14 h-14 object-contain rounded-lg bg-[#f5f8ff] shadow"
                        />
                        <div>
                          <div className="font-bold text-[17px] text-[#222] leading-tight">
                            {p.nombre}
                          </div>
                          <div
                            className="text-red-600 text-sm mt-1 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              quitarProducto(p.cartItemId);
                            }}
                          >
                            Eliminar
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="py-3 align-middle"
                      onClick={() => {
                        setSelectedProductId(p.cartItemId);
                        setTimeout(() => {
                          cantidadRefs.current[p.cartItemId]?.focus();
                        }, 0);
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(p.cartItemId, p.cantidad - 1);
                              setSelectedProductId(p.cartItemId);
                            }}
                            className="w-8 h-8 border border-gray-300 rounded bg-gray-50 text-gray-700 text-lg font-bold flex items-center justify-center hover:bg-gray-100"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={p.cantidad}
                            min={0}
                            className="w-10 h-8 text-center border border-gray-300 rounded bg-gray-50 text-base font-semibold text-[#222] mx-1"
                            readOnly
                            ref={(el) => {
                              cantidadRefs.current[p.cartItemId] = el || null;
                            }}
                            tabIndex={0}
                            onFocus={() => setSelectedProductId(p.cartItemId)}
                            onKeyDown={(e) => {
                              if (selectedProductId !== p.cartItemId) return;
                              if (e.key >= "0" && e.key <= "9") {
                                e.preventDefault();
                                handleTecladoNumerico(e.key);
                              } else if (e.key === "Backspace") {
                                e.preventDefault();
                                handleTecladoNumerico("←");
                              } else if (e.key.toLowerCase() === "c") {
                                e.preventDefault();
                                handleTecladoNumerico("C");
                              } else if (e.key === "ArrowUp") {
                                e.preventDefault();
                                cambiarCantidad(p.cartItemId, p.cantidad + 1);
                              } else if (e.key === "ArrowDown") {
                                e.preventDefault();
                                cambiarCantidad(p.cartItemId, p.cantidad - 1);
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              cambiarCantidad(p.cartItemId, p.cantidad + 1);
                              setSelectedProductId(p.cartItemId);
                            }}
                            className="w-8 h-8 border border-gray-300 rounded bg-gray-50 text-gray-700 text-lg font-bold flex items-center justify-center hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center mt-1">
                          <input
                            type="checkbox"
                            id={`caja-checkbox-${p.cartItemId}`}
                            checked={p.caja}
                            onChange={() =>
                              setCarrito(
                                carrito.map((item) =>
                                  item.cartItemId === p.cartItemId
                                    ? { ...item, caja: !item.caja }
                                    : item
                                )
                              )
                            }
                            className="cursor-pointer"
                          />
                          <label
                            htmlFor={`caja-checkbox-${p.cartItemId}`}
                            className="text-lg text-gray-700 cursor-pointer select-none font-medium"
                          >
                            Caja
                          </label>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 align-middle text-right font-medium text-[17px] text-gray-700">
                      Gs. {formatMiles(p.precioUnitario)}
                    </td>
                    <td className="py-3 align-middle text-right text-sm text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        <span>
                          Venta:{" "}
                          {p.precioVentaActual > 0
                            ? `Gs. ${formatMiles(p.precioVentaActual)}`
                            : "—"}
                        </span>
                        <span
                          className={
                            p.precioUnitario > 0 &&
                            p.precioVentaActual > 0 &&
                            ((p.precioVentaActual - p.precioUnitario) /
                              p.precioUnitario) *
                              100 <
                              2
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          % Gan:{" "}
                          {p.precioUnitario > 0 && p.precioVentaActual > 0
                            ? `${(
                                ((p.precioVentaActual - p.precioUnitario) /
                                  p.precioUnitario) *
                                100
                              ).toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-6 align-middle">
                      <input
                        type="text"
                        value={
                          p.precioTotal > 0 ? formatMiles(p.precioTotal) : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d]/g, "");
                          cambiarPrecioTotal(p.cartItemId, Number(value));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        className="w-24 p-2 border border-gray-300 rounded text-center"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de control inferior */}
        <div className="bg-white rounded-xl shadow p-4">
          {/* Total */}
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-lg">Total</span>
            <span className="font-semibold text-lg text-green-500">
              Gs. {formatMiles(total)}
            </span>
          </div>

          {/* Información de la compra */}
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Factura
              </label>
              <input
                type="text"
                value={compraFactura}
                onChange={(e) => setCompraFactura(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="Ej: 001-001-0001234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Compra
              </label>
              <select
                value={compraTipo}
                onChange={(e) => setCompraTipo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="CO">Contado</option>
                <option value="CR">Crédito</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto Entregado
              </label>
              <input
                type="text"
                value={compraEntrega > 0 ? formatMiles(compraEntrega) : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "");
                  setCompraEntrega(Number(value));
                }}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Compra
              </label>
              <input
                type="date"
                value={compraFecha}
                onChange={(e) => setCompraFecha(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Botón Comprar */}
          <div className="mb-3">
            <button
              className="w-full bg-green-500 border border-green-500 rounded-lg text-white font-medium text-lg h-[60px] flex items-center justify-center hover:bg-green-600 transition"
              onClick={sendRequest}
            >
              Comprar
            </button>
          </div>

          {/* Recuadro inferior para el nombre del proveedor */}
          <div className="mt-2">
            <button
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 text-center text-gray-700 font-semibold text-base tracking-wide hover:bg-green-100 transition cursor-pointer"
              onClick={() => setShowProveedorModal(true)}
            >
              {proveedorSeleccionado
                ? proveedorSeleccionado.ProveedorNombre
                : "Seleccionar Proveedor"}
            </button>
            <ProveedorModal
              show={showProveedorModal}
              onClose={() => setShowProveedorModal(false)}
              proveedores={proveedores}
              onSelect={(proveedor: Proveedor) => {
                setProveedorSeleccionado(proveedor);
                setShowProveedorModal(false);
              }}
              onCreateProveedor={handleCreateProveedor}
            />
          </div>
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
              {cajaAperturada && (
                <span className="text-blue-600 font-medium">
                  | Caja: {cajaAperturada.CajaDescripcion}
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
          className="flex flex-col"
          style={{ height: "calc(100vh - 120px)" }}
        >
          <div className="overflow-y-auto flex-1 mb-4">
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              }}
            >
              {loading ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Cargando productos...
                </div>
              ) : productos.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No se encontraron productos
                </div>
              ) : (
                productos.map((p) => (
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
                    imagen={resolveProductoImagen(p.ProductoId, p.HasImagen)}
                    stock={p.ProductoStock}
                    onAdd={() =>
                      agregarProducto({
                        id: p.ProductoId,
                        nombre: p.ProductoNombre,
                        precio: p.ProductoPrecioPromedio
                          ? Number(p.ProductoPrecioPromedio)
                          : p.ProductoPrecioVenta,
                        imagen: resolveProductoImagen(
                          p.ProductoId,
                          p.HasImagen
                        ),
                        stock: p.ProductoStock,
                        precioVentaActual: p.ProductoPrecioVenta,
                      })
                    }
                    precioUnitario={0}
                    stockUnitario={p.ProductoStockUnitario}
                  />
                ))
              )}
            </div>
          </div>
          {!loading && productos.length > 0 && pagination.totalPages > 1 && (
            <div className="bg-white rounded-lg shadow p-4">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={pagination.itemsPerPage}
                onItemsPerPageChange={(newItemsPerPage) => {
                  setItemsPerPage(newItemsPerPage);
                  setCurrentPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
