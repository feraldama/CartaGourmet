import { useState, useEffect, useRef } from "react";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import { getProductosAll } from "../../services/productos.service";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";
import Swal from "sweetalert2";
import axios from "axios";
import { js2xml } from "xml-js";
import logo from "../../assets/img/logo.jpg";
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

interface Proveedor {
  ProveedorId: number;
  ProveedorRUC: string;
  ProveedorNombre: string;
  ProveedorDireccion?: string;
  ProveedorTelefono?: string;
}

interface CreateProveedorData {
  ProveedorRUC: string;
  ProveedorNombre: string;
  ProveedorDireccion?: string;
  ProveedorTelefono?: string;
}

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

export default function Compras() {
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

  useEffect(() => {
    setLoading(true);
    getProductosAll()
      .then((data) => {
        setProductos(data.data || []);
      })
      .finally(() => setLoading(false));

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

    // Formatear la fecha seleccionada al formato DD/MM/YY
    // Parsear directamente del string para evitar problemas de zona horaria
    const [añoCompleto, mesCompleto, diaCompleto] = compraFecha.split("-");
    const diaFormato = parseInt(diaCompleto, 10);
    const mesFormato = parseInt(mesCompleto, 10);
    const añoFormato = parseInt(añoCompleto, 10) % 100;
    const diaStr = diaFormato < 10 ? `0${diaFormato}` : diaFormato.toString();
    const mesStr = mesFormato < 10 ? `0${mesFormato}` : mesFormato.toString();
    const añoStr = añoFormato < 10 ? `0${añoFormato}` : añoFormato.toString();
    const fechaFormateada = `${diaStr}/${mesStr}/${añoStr}`;

    // Mapear el carrito (CompraProductoId se asignará en GeneXus usando el contador &i)
    const SDTCompraItem = carrito.map((p) => ({
      ProveedorId: proveedorSeleccionado.ProveedorId,
      Producto: {
        ProductoId: p.id,
        // CompraProductoId NO se envía aquí porque el SDT no lo tiene definido
        // Se asignará automáticamente en GeneXus usando el contador &i
        CompraProductoCantidad: p.cantidad,
        CompraProductoPrecio: p.precioUnitario,
        AlmacenId: user.LocalId || 1,
        Bonificacion: 0,
        CompraProductoCantidadUnidad: p.caja ? "C" : "U",
      },
    }));

    const json = {
      Envelope: {
        _attributes: {
          xmlns: "http://schemas.xmlsoap.org/soap/envelope/",
        },
        Body: {
          "PCompraConfirmarWS.VENTACONFIRMAR": {
            _attributes: { xmlns: "Tech" },
            Sdtcompra: {
              SDTCompraItem: SDTCompraItem,
            },
            Comprafechastring: fechaFormateada,
            Comprafactura: parseInt(compraFactura),
            Compratipo: compraTipo,
            Entregado: compraEntrega,
            Total: total,
            Usuarioid: user.id,
          },
        },
      },
    };

    const xml = js2xml(json, {
      compact: true,
      ignoreComment: true,
      spaces: 4,
    });

    // Verificar que el XML tenga todos los productos
    const productosEnXML = (xml.match(/SDTCompraItem/g) || []).length;
    console.log("Productos encontrados en XML:", productosEnXML);

    const config = {
      headers: {
        "Content-Type": "text/xml",
      },
    };

    try {
      await axios.post(
        `${import.meta.env.VITE_APP_URL}${
          import.meta.env.VITE_APP_URL_GENEXUS
        }apcompraconfirmarws`,
        xml,
        config
      );

      // El webservice SOAP se encarga de crear la compra en la base de datos

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
          window.location.reload();
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

  const handleSearchSubmit = () => {
    if (!busqueda.trim()) return;

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
        precio: primerProducto.ProductoPrecioPromedio
          ? Number(primerProducto.ProductoPrecioPromedio)
          : primerProducto.ProductoPrecioVenta,
        imagen: primerProducto.ProductoImagen
          ? `data:image/jpeg;base64,${primerProducto.ProductoImagen}`
          : logo,
        stock: primerProducto.ProductoStock,
        precioVentaActual: primerProducto.ProductoPrecioVenta,
      });
      setBusqueda("");
    }
  };

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
                    onAdd={() =>
                      agregarProducto({
                        id: p.ProductoId,
                        nombre: p.ProductoNombre,
                        precio: p.ProductoPrecioPromedio
                          ? Number(p.ProductoPrecioPromedio)
                          : p.ProductoPrecioVenta,
                        imagen: p.ProductoImagen
                          ? `data:image/jpeg;base64,${p.ProductoImagen}`
                          : logo,
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
      </div>
    </div>
  );
}
