import { useState, useEffect, useRef, useCallback } from "react";
import SearchButton from "../../components/common/Input/SearchButton";
import "../../App.css";
import {
  getProductosPaginated,
  searchProductos,
} from "../../services/productos.service";
import ProductCard from "../../components/products/ProductCard";
import { useAuth } from "../../contexts/useAuth";
import PaymentModal from "../../components/common/PaymentModal";
import Swal from "sweetalert2";
import axios from "axios";
import { js2xml } from "xml-js";
import logo from "../../assets/img/logo.jpg";
import {
  getAllClientesSinPaginacion,
  createCliente,
} from "../../services/clientes.service";
import ClienteModal from "../../components/common/ClienteModal";
import type { Cliente } from "../../components/common/ClienteFormModal";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getEstadoAperturaPorUsuario } from "../../services/registrodiariocaja.service";
import { getCajaById } from "../../services/cajas.service";
import { getLocalById } from "../../services/locales.service";
import { useNavigate } from "react-router-dom";
import ActionButton from "../../components/common/Button/ActionButton";
import PagoModal from "../../components/common/PagoModal";
import InvoicePrintModal from "../../components/common/InvoicePrintModal";
import { getCombos } from "../../services/combos.service";
import Pagination from "../../components/common/Pagination";
import {
  formatMiles,
  generatePresupuestoPDF,
  type CarritoItem,
} from "../../utils/utils";

interface Caja {
  id: string | number;
  CajaId: string | number;
  CajaDescripcion: string;
  CajaMonto: number;
  [key: string]: unknown;
}

interface Combo {
  ComboId: number;
  ComboDescripcion: string;
  ProductoId: number;
  ComboCantidad: number;
  ComboPrecio: number;
  [key: string]: unknown;
}

export default function Sales() {
  const [carrito, setCarrito] = useState<
    {
      id: number;
      nombre: string;
      precio: number;
      imagen: string;
      stock: number;
      cantidad: number;
      caja: boolean;
      cartItemId: number;
      // Precios guardados para no depender del array productos
      precioVenta: number;
      precioVentaMayorista: number;
      precioUnitario: number;
    }[]
  >([]);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [productos, setProductos] = useState<
    {
      ProductoId: number;
      ProductoCodigo: string;
      ProductoNombre: string;
      ProductoPrecioVenta: number;
      ProductoStock: number;
      ProductoImagen?: string;
      ProductoPrecioVentaMayorista: number;
      LocalId: string | number;
      ProductoPrecioUnitario: number;
      ProductoStockUnitario?: number;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    itemsPerPage: 10,
  });
  // const [modalPago, setModalPago] = useState(false);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showInvoicePrintModal, setShowInvoicePrintModal] = useState(false);
  const [totalRest, setTotalRest] = useState(0);
  const [efectivo, setEfectivo] = useState(0);
  const [banco, setBanco] = useState(0);
  const [bancoDebito, setBancoDebito] = useState(0);
  const [bancoCredito, setBancoCredito] = useState(0);
  const [cuentaCliente, setCuentaCliente] = useState(0);
  const [voucher, setVoucher] = useState(0);
  const [ventaNroPOS, setVentaNroPOS] = useState("");
  const [printTicket, setPrintTicket] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>({
      ClienteId: 1,
      ClienteNombre: "SIN NOMBRE MINORISTA",
      ClienteRUC: "",
      ClienteTelefono: "",
      ClienteTipo: "MI",
      UsuarioId: "",
      ClienteApellido: "",
      ClienteDireccion: "",
    });
  useState<Cliente | null>(null);
  const [cajaAperturada, setCajaAperturada] = useState<Caja | null>(null);
  const [localNombre, setLocalNombre] = useState("");
  const navigate = useNavigate();
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [isDevolucion, setIsDevolucion] = useState(false);
  const cantidadRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    precioMayorista?: number;
    imagen: string;
    stock: number;
    precioUnitario?: number;
  }) => {
    const tipo = clienteSeleccionado?.ClienteTipo || "MI";
    const precioFinal =
      tipo === "MA" && producto.precioMayorista !== undefined
        ? producto.precioMayorista
        : producto.precio;

    const precioSeguro = precioFinal ?? 0;

    const nuevoCartItemId = Date.now() + Math.random();
    setCarrito([
      ...carrito,
      {
        ...producto,
        precio: precioSeguro,
        cantidad: 1,
        caja: false,
        cartItemId: nuevoCartItemId,
        // Guardar los precios originales para cálculos posteriores
        precioVenta: producto.precio,
        precioVentaMayorista: producto.precioMayorista ?? producto.precio,
        precioUnitario: producto.precioUnitario ?? producto.precio,
      },
    ]);
    setSelectedProductId(nuevoCartItemId); // Focus en el input de cantidad del producto nuevo
  };

  const quitarProducto = (cartItemId: number) => {
    setCarrito(carrito.filter((p) => p.cartItemId !== cartItemId));
  };

  const cambiarCantidad = (cartItemId: number, cantidad: number) => {
    setCarrito(
      carrito.map((p) =>
        p.cartItemId === cartItemId
          ? { ...p, cantidad: Math.max(1, cantidad) }
          : p,
      ),
    );
  };

  // Función para obtener el precio unitario según el check Caja
  const obtenerPrecio = (p: (typeof carrito)[0]) => {
    // Usar los precios guardados en el carrito en lugar de buscar en productos
    if (p.caja) {
      return clienteSeleccionado?.ClienteTipo === "MA"
        ? p.precioVentaMayorista
        : p.precioVenta;
    } else {
      const combo = combos.find((c) => Number(c.ProductoId) === Number(p.id));
      if (combo) {
        // El precio unitario se calcula en base al combo
        return (
          calcularPrecioConCombo(p.id, p.cantidad, p.precioUnitario) /
          p.cantidad
        );
      }
      return p.precioUnitario;
    }
  };

  // Función para obtener el total según el check Caja
  const obtenerTotal = (p: (typeof carrito)[0]) => {
    // Usar los precios guardados en el carrito en lugar de buscar en productos
    if (p.caja) {
      const precio =
        clienteSeleccionado?.ClienteTipo === "MA"
          ? p.precioVentaMayorista
          : p.precioVenta;
      return precio * p.cantidad;
    } else {
      const combo = combos.find((c) => Number(c.ProductoId) === Number(p.id));
      if (combo) {
        return calcularPrecioConCombo(p.id, p.cantidad, p.precioUnitario);
      }
      return p.precioUnitario * p.cantidad;
    }
  };

  const total = carrito.reduce((acc, p) => acc + obtenerTotal(p), 0);

  // Función para cargar productos con paginación
  const fetchProductos = useCallback(async () => {
    if (!cajaAperturada) return;

    setLoading(true);
    try {
      const localIdUsuario = user?.LocalId ?? null;
      let data;
      if (busquedaDebounced.trim()) {
        // Si hay búsqueda, usar el endpoint de búsqueda paginado (stock del almacén del local del usuario)
        data = await searchProductos(
          busquedaDebounced.trim(),
          currentPage,
          itemsPerPage,
          undefined,
          undefined,
          localIdUsuario,
        );
      } else {
        // Si no hay búsqueda, cargar productos paginados (stock del almacén del local del usuario)
        data = await getProductosPaginated(
          currentPage,
          itemsPerPage,
          undefined,
          undefined,
          localIdUsuario,
        );
      }

      // Filtrar productos por LocalId: mostrar si es 0 (todos) o si coincide con el local del usuario
      const localUsuario = Number(user?.LocalId);
      const productosFiltrados = (data.data || []).filter(
        (p: { LocalId: string | number }) => {
          const localProd = Number(p.LocalId);
          return (
            localProd === 0 || (localUsuario && localProd === localUsuario)
          );
        },
      );

      setProductos(productosFiltrados);
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
  }, [
    cajaAperturada,
    busquedaDebounced,
    currentPage,
    itemsPerPage,
    user?.LocalId,
  ]);

  // Cargar combos solo una vez al montar
  useEffect(() => {
    getCombos(1, 1000).then((data) => setCombos(data.data || []));
  }, []);

  // Cargar productos cuando cambian las dependencias
  useEffect(() => {
    if (cajaAperturada) {
      fetchProductos();
    }
  }, [fetchProductos, cajaAperturada]);

  // Efecto para buscar cuando cambia el término de búsqueda (con debounce)
  useEffect(() => {
    if (!cajaAperturada) return;

    // Cancelar timeout anterior si existe
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Resetear página cuando cambia la búsqueda
    setCurrentPage(1);

    const timeoutId = setTimeout(() => {
      setBusquedaDebounced(busqueda);
      debounceTimeoutRef.current = null;
    }, 500); // Debounce de 500ms

    debounceTimeoutRef.current = timeoutId;

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [busqueda, cajaAperturada]);

  // Cargar clientes solo cuando se abre el modal
  useEffect(() => {
    if (showClienteModal) {
      getAllClientesSinPaginacion()
        .then((data) => {
          setClientes(data.data || []);
        })
        .catch(() =>
          setClientes([
            {
              ClienteId: 1,
              ClienteRUC: "",
              ClienteNombre: "SIN NOMBRE MINORISTA",
              ClienteApellido: "",
              ClienteDireccion: "",
              ClienteTelefono: "",
              ClienteTipo: "MI",
              UsuarioId: "",
            },
          ]),
        );
    }
  }, [showClienteModal]);

  const handleCreateCliente = async (clienteData: Cliente) => {
    try {
      const nuevoCliente = await createCliente({
        ClienteId: clienteData.ClienteId,
        ClienteRUC: clienteData.ClienteRUC,
        ClienteNombre: clienteData.ClienteNombre,
        ClienteApellido: clienteData.ClienteApellido,
        ClienteDireccion: clienteData.ClienteDireccion,
        ClienteTelefono: clienteData.ClienteTelefono,
        ClienteTipo: clienteData.ClienteTipo,
        UsuarioId: clienteData.UsuarioId
          ? String(clienteData.UsuarioId).trim()
          : "",
      });
      // Recargar la lista de clientes
      const response = await getAllClientesSinPaginacion();
      setClientes(response.data || []);
      // Seleccionar el nuevo cliente creado
      if (nuevoCliente.data) {
        setClienteSeleccionado(nuevoCliente.data);
        setShowClienteModal(false);
      }
      Swal.fire({
        icon: "success",
        title: "Cliente creado exitosamente",
        text: "El cliente ha sido creado y seleccionado",
      });
    } catch (error) {
      console.error("Error al crear cliente:", error);
      Swal.fire({
        icon: "error",
        title: "Error al crear cliente",
        text: "Hubo un problema al crear el cliente",
      });
    }
  };

  useEffect(() => {
    if (!clienteSeleccionado) return;
    setCarrito((carritoActual) =>
      carritoActual.map((item) => {
        // Usar los precios guardados en el carrito
        const tipo = clienteSeleccionado.ClienteTipo;
        const nuevoPrecio =
          tipo === "MA" ? item.precioVentaMayorista : item.precioVenta;
        return { ...item, precio: nuevoPrecio ?? 0 };
      }),
    );
  }, [clienteSeleccionado]);

  // Simulación de items y cliente seleccionados (ajusta según tu lógica real)
  const cartItems = carrito.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    quantity: p.cantidad,
    salePrice: p.precio,
    price: p.precio,
    unidad: "U",
    totalPrice: obtenerTotal(p),
  }));

  function getSubtotal(items: Array<{ totalPrice: number }>): number {
    return items.reduce(
      (acc: number, item: { totalPrice: number }) => acc + item.totalPrice,
      0,
    );
  }

  function calcularPrecioConCombo(
    productoId: number,
    cantidad: number,
    precioUnitario: number,
  ) {
    const combo = combos.find(
      (c) => Number(c.ProductoId) === Number(productoId),
    );
    if (!combo) return cantidad * precioUnitario;
    const comboCantidad = Number(combo.ComboCantidad);
    const comboPrecio = Number(combo.ComboPrecio);
    if (cantidad < comboCantidad) {
      return cantidad * precioUnitario;
    }
    const cantidadCombos = Math.floor(cantidad / comboCantidad);
    const cantidadRestante = cantidad % comboCantidad;
    return cantidadCombos * comboPrecio + cantidadRestante * precioUnitario;
  }

  const sendRequest = async () => {
    const fecha = new Date();
    // Restar 3h (Paraguay UTC-3): Genexus/MySQL suman 3 al guardar, así queda la hora local correcta
    const fechaAjustada = new Date(fecha.getTime() - 3 * 60 * 60 * 1000);
    const dia = fechaAjustada.getDate();
    const mes = fechaAjustada.getMonth() + 1;
    const año = fechaAjustada.getFullYear() % 100;
    const diaStr = dia < 10 ? `0${dia}` : dia.toString();
    const mesStr = mes < 10 ? `0${mes}` : mes.toString();
    const añoStr = año < 10 ? `0${año}` : año.toString();
    const horas = String(fechaAjustada.getHours()).padStart(2, "0");
    const minutos = String(fechaAjustada.getMinutes()).padStart(2, "0");
    const segundos = String(fechaAjustada.getSeconds()).padStart(2, "0");
    const fechaFormateada = `${diaStr}/${mesStr}/${añoStr} ${horas}:${minutos}:${segundos}`;

    const SDTProductoItem = carrito.map((p) => {
      const combo = combos.find((c) => Number(c.ProductoId) === Number(p.id));
      // Usar el precio unitario guardado en el carrito
      const precioUnitario = p.precioUnitario;
      const comboCantidad = combo ? Number(combo.ComboCantidad) : 0;
      const totalCombo = calcularPrecioConCombo(
        p.id,
        p.cantidad,
        precioUnitario,
      );
      const esCombo = combo && p.cantidad >= comboCantidad;
      return {
        ClienteId: clienteSeleccionado?.ClienteId,
        Producto: {
          ProductoId: p.id,
          VentaProductoCantidad: p.cantidad,
          ProductoPrecioVenta: p.precio,
          ProductoUnidad: p.caja ? "C" : "U",
          VentaProductoPrecioTotal: obtenerTotal(p),
          Combo: esCombo ? "S" : "N",
          ComboPrecio: esCombo ? totalCombo : 0,
        },
      };
    });

    // Determinar si es venta o devolución
    const isDevolucionMode = isDevolucion;
    const endpoint = isDevolucionMode ? "apdevolucionws" : "apventaconfirmarws";
    const operationName = isDevolucionMode
      ? "PDevolucionWS.VENTACONFIRMAR"
      : "PVentaConfirmarWS.VENTACONFIRMAR";
    const namespace = isDevolucionMode ? "Tech" : "TechNow";

    const json = {
      Envelope: {
        _attributes: { xmlns: "http://schemas.xmlsoap.org/soap/envelope/" },
        Body: {
          [operationName]: {
            _attributes: { xmlns: namespace },
            Sdtproducto: {
              SDTProductoItem: SDTProductoItem,
            },
            ...(isDevolucionMode
              ? {
                  Ventafechastring: fechaFormateada,
                  Almacenorigenid: user?.LocalId,
                  Clientetipo: clienteSeleccionado?.ClienteTipo,
                  Cajaid: cajaAperturada?.CajaId,
                  Usuarioid: user?.id,
                  Efectivo: efectivo,
                  Total2: getSubtotal(cartItems),
                  Ventatipo: "CO",
                  Clienteid: clienteSeleccionado?.ClienteId,
                  Voucherreact: voucher,
                  Transferreact: Number(banco),
                  Ventanrofactura: 0,
                  Ventatimbrado: 0,
                }
              : {
                  Ventafechastring: fechaFormateada,
                  Almacenorigenid: user?.LocalId,
                  Clientetipo: clienteSeleccionado?.ClienteTipo,
                  Cajaid: cajaAperturada?.CajaId,
                  Usuarioid: user?.id,
                  Efectivo: efectivo,
                  Total2: getSubtotal(cartItems),
                  Ventatipo: "CO",
                  Pagotipo: "E",
                  Clienteid: clienteSeleccionado?.ClienteId,
                  Efectivoreact: Number(efectivo) + Number(totalRest),
                  Bancoreact: Number(bancoDebito) + Number(bancoCredito),
                  Clientecuentareact: cuentaCliente,
                  Voucherreact: voucher,
                  Transferreact: Number(banco),
                  Ventanrofactura: 0,
                  Ventatimbrado: 0,
                  Ventanropos:
                    bancoDebito > 0 || bancoCredito > 0
                      ? ventaNroPOS.trim() || "0"
                      : "0",
                }),
          },
        },
      },
    };

    const xml = js2xml(json, { compact: true, ignoreComment: true, spaces: 4 });
    const config = {
      headers: {
        "Content-Type": "text/xml",
      },
    };
    try {
      await axios.post(
        import.meta.env.VITE_APP_URL +
          import.meta.env.VITE_APP_URL_GENEXUS +
          endpoint,
        xml,
        config,
      );
      if (printTicket) {
        generateTicketPDF();
      }

      const successMessage = isDevolucionMode
        ? "Devolución realizada con éxito!"
        : "Venta realizada con éxito!";

      Swal.fire({
        title: successMessage,
        icon: "success",
        timer: 1000,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        window.location.reload();
      });
    } catch (error) {
      console.error(error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: isDevolucionMode
          ? "Error al realizar la devolución"
          : "Error al realizar la venta",
      });
    }
    // Limpiar estados de pago
    setEfectivo(0);
    setBanco(0);
    setBancoDebito(0);
    setBancoCredito(0);
    setCuentaCliente(0);
    setVoucher(0);
    setVentaNroPOS("");
    setTotalRest(0);
    setPrintTicket(false);
    setShowModal(false);
    setIsDevolucion(false); // Resetear el checkbox de devolución
  };

  const generateTicketPDF = () => {
    // Crear una instancia de jsPDF con un tamaño personalizado (80mm de ancho)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 297], // 80mm de ancho y 297mm de alto (A4 cortado)
    });

    const fechaActual = new Date();
    const dia = String(fechaActual.getDate()).padStart(2, "0");
    const mes = String(fechaActual.getMonth() + 1).padStart(2, "0");
    const año = fechaActual.getFullYear().toString().slice(-2);
    const horas = String(fechaActual.getHours()).padStart(2, "0");
    const minutos = String(fechaActual.getMinutes()).padStart(2, "0");
    const segundos = String(fechaActual.getSeconds()).padStart(2, "0");

    const fechaFormateada = `${dia}/${mes}/${año}`;
    const horaFormateada = `${horas}:${minutos}:${segundos}`;

    // Configuración inicial
    doc.setFontSize(8); // Tamaño de fuente más pequeño
    doc.setFont("helvetica", "normal");

    // Encabezado del ticket
    doc.text("Auto Shop Alonso", 0, 15);
    doc.text("BODEGA", 0, 20);
    doc.text("Bernardino Caballero c/ Antequera, Ypacaraí", 0, 25);
    doc.text("Teléfono: +595 892 784989", 0, 30);
    doc.text(`Fecha: ${fechaFormateada} - Hora: ${horaFormateada}`, 0, 35);
    doc.text(
      clienteSeleccionado?.ClienteRUC
        ? "RUC: " + clienteSeleccionado.ClienteRUC
        : "RUC: SIN RUC",
      0,
      40,
    );
    doc.text(
      "Cliente: " +
        (clienteSeleccionado?.ClienteNombre +
          " " +
          clienteSeleccionado?.ClienteApellido || ""),
      0,
      45,
    );

    // Línea separadora
    doc.setLineWidth(0.2); // Línea más delgada
    doc.line(0, 48, 75, 48); // Ajustar el ancho de la línea

    // Encabezados de la tabla
    const headers = [["Desc.", "Cant", "Precio", "Total"]];

    // Datos de la tabla
    const tableData = carrito.map((p) => {
      // Usar los precios guardados en el carrito
      let precioUnitario = 0;
      let precioLabel = "";
      let totalLinea = 0;
      if (p.caja) {
        // Caja: precio minorista o mayorista
        precioUnitario =
          clienteSeleccionado?.ClienteTipo === "MA"
            ? p.precioVentaMayorista
            : p.precioVenta;
        precioLabel = `Caja (${
          clienteSeleccionado?.ClienteTipo === "MA" ? "Mayorista" : "Minorista"
        })`;
        totalLinea = precioUnitario * p.cantidad;
      } else {
        // Unidad: puede aplicar combo
        const combo = combos.find((c) => Number(c.ProductoId) === Number(p.id));
        if (combo && p.cantidad >= combo.ComboCantidad) {
          // Aplica combo
          precioUnitario = p.precioUnitario;
          precioLabel = `Unidad (Combo)`;
          totalLinea = calcularPrecioConCombo(p.id, p.cantidad, precioUnitario);
        } else {
          // Solo unidad
          precioUnitario = p.precioUnitario;
          precioLabel = `Unidad`;
          totalLinea = precioUnitario * p.cantidad;
        }
      }
      return [
        p.nombre,
        p.cantidad,
        `Gs. ${precioUnitario.toLocaleString("es-ES")}\n${precioLabel}`,
        `Gs. ${totalLinea.toLocaleString("es-ES")}`,
      ];
    });

    // Agregar la tabla al PDF
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 50,
      theme: "plain",
      styles: {
        fontSize: 7,
        textColor: [0, 0, 0],
        fillColor: [255, 255, 255],
      },
      // headStyles: { fillColor: [200, 200, 200] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 9 },
        2: { cellWidth: 14 },
        3: { cellWidth: 20 },
      },
      margin: { left: 0 }, // Margen izquierdo
    });

    // Total de la compra
    const totalCost = carrito.reduce(
      (sum, item) => sum + obtenerTotal(item),
      0,
    );
    const lastAutoTable = (
      doc as unknown as { lastAutoTable: { finalY: number } }
    ).lastAutoTable;
    doc.text(
      `Total a Pagar Gs. ${totalCost.toLocaleString("es-ES")}`,
      0,
      lastAutoTable.finalY + 5,
    );

    // Pie de página
    doc.text("--GRACIAS POR SU PREFERENCIA--", 0, lastAutoTable.finalY + 10);

    // Guardar el PDF
    doc.save("ticket_venta.pdf");
  };

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
            text: "Debes aperturar una caja antes de realizar ventas.",
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
          // Solo permitir números
          if (/^\d+$/.test(String(valor))) {
            nuevaCantidad = nuevaCantidad + valor;
          }
        }
        return { ...item, cantidad: Math.max(0, Number(nuevaCantidad)) };
      }),
    );
  };

  // --- Generar PDF de Presupuesto ---
  const handlePresupuestoPDF = () => {
    // Convertir el carrito al formato esperado por la función de utils
    const carritoItems: CarritoItem[] = carrito.map((item) => ({
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio: item.precio,
    }));

    generatePresupuestoPDF(carritoItems, clienteSeleccionado || undefined);
  };

  // --- Función para manejar ENTER en la búsqueda ---
  const handleSearchSubmit = async () => {
    if (!busqueda.trim() || !cajaAperturada) return;

    // Cancelar el debounce pendiente si existe
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Actualizar busquedaDebounced inmediatamente para evitar que el debounce se ejecute después
    setBusquedaDebounced(busqueda);

    try {
      // Buscar productos usando el servicio de búsqueda (stock del almacén del local del usuario)
      const data = await searchProductos(
        busqueda.trim(),
        1,
        10,
        undefined,
        undefined,
        user?.LocalId ?? null,
      );
      const localUsuario = Number(user?.LocalId);
      const productosFiltrados = (data.data || []).filter(
        (p: { LocalId: string | number }) => {
          const localProd = Number(p.LocalId);
          return (
            localProd === 0 || (localUsuario && localProd === localUsuario)
          );
        },
      );

      // Agregar el primer producto encontrado
      if (productosFiltrados.length > 0) {
        const primerProducto = productosFiltrados[0];

        // Agregar el producto al carrito
        agregarProducto({
          id: primerProducto.ProductoId,
          nombre: primerProducto.ProductoNombre,
          precio: primerProducto.ProductoPrecioVenta,
          precioMayorista: primerProducto.ProductoPrecioVentaMayorista,
          imagen: primerProducto.ProductoImagen
            ? `data:image/jpeg;base64,${primerProducto.ProductoImagen}`
            : logo,
          stock: primerProducto.ProductoStock,
          precioUnitario: primerProducto.ProductoPrecioUnitario,
        });

        // Limpiar la búsqueda
        setBusqueda("");
        setBusquedaDebounced("");
      }
    } catch (error) {
      console.error("Error al buscar producto:", error);
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
                    onClick={() => {
                      setSelectedProductId(p.cartItemId);
                      setTimeout(() => {
                        cantidadRefs.current[p.cartItemId]?.focus();
                      }, 0);
                    }}
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
                    <td className="py-3 align-middle">
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
                                    : item,
                                ),
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
                      <>Gs. {formatMiles(obtenerPrecio(p))}</>
                    </td>
                    <td className="py-3 pr-6 align-middle text-right font-medium text-[17px] text-gray-700">
                      Gs. {formatMiles(obtenerTotal(p))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Pad numérico y botón pagar - NUEVO DISEÑO TAILWIND */}
        <div className="bg-white rounded-xl shadow p-4">
          {/* Checkbox de Devolución */}
          <div className="flex items-center mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <input
              type="checkbox"
              id="devolucion-checkbox"
              checked={isDevolucion}
              onChange={(e) => setIsDevolucion(e.target.checked)}
              className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
            />
            <label
              htmlFor="devolucion-checkbox"
              className="ml-2 text-sm font-medium text-red-700 cursor-pointer select-none"
            >
              {isDevolucion ? "🔴 MODO DEVOLUCIÓN" : "⚪ MODO VENTA"}
            </label>
          </div>
          {/* Total */}
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-lg">Total</span>
            <span
              className={`font-semibold text-lg ${
                isDevolucion ? "text-red-500" : "text-blue-500"
              }`}
            >
              Gs. {formatMiles(total)}
            </span>
          </div>
          {/* Grid de botones */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            {/* Botón Pagar/Devolver grande */}
            <button
              className={`text-white font-semibold rounded-lg flex items-center justify-center text-lg h-[100px] border-2 transition cursor-pointer ${
                isDevolucion
                  ? "bg-red-500 border-red-500 hover:bg-red-600"
                  : "bg-blue-500 border-blue-500 hover:bg-blue-600"
              }`}
              onClick={() => setShowModal(true)}
            >
              {isDevolucion ? "Devolver" : "Pagar"}
            </button>
            {/* Botón Presupuesto */}
            <button
              className="bg-white border border-gray-200 rounded-lg text-gray-700 font-medium text-lg h-[100px] flex items-center justify-center hover:bg-gray-100 transition"
              onClick={handlePresupuestoPDF}
            >
              Presupuesto
            </button>
            {/* Botón Imprimir Factura */}
            <button
              className="bg-green-500 border border-green-500 rounded-lg text-white font-medium text-lg h-[100px] flex items-center justify-center hover:bg-green-600 transition"
              onClick={() => setShowInvoicePrintModal(true)}
            >
              Imprimir Factura
            </button>
          </div>
          {/* Recuadro inferior para el nombre del cliente */}
          <div className="mt-2">
            <button
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 text-center text-gray-700 font-semibold text-base tracking-wide hover:bg-blue-100 transition cursor-pointer"
              onClick={() => setShowClienteModal(true)}
            >
              {clienteSeleccionado
                ? `${clienteSeleccionado.ClienteNombre} ${
                    clienteSeleccionado.ClienteApellido || ""
                  }`
                : clientes[0]
                  ? `${clientes[0].ClienteNombre} ${
                      clientes[0].ClienteApellido || ""
                    }`
                  : "SIN NOMBRE MINORISTA"}
            </button>
            <ClienteModal
              show={showClienteModal}
              onClose={() => setShowClienteModal(false)}
              clientes={clientes}
              onSelect={(cliente: Cliente) => {
                setClienteSeleccionado(cliente);
                setShowClienteModal(false);
              }}
              onCreateCliente={handleCreateCliente}
              currentUserId={user?.id}
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
            {isDevolucion && (
              <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
                🔴 MODO DEVOLUCIÓN
              </div>
            )}
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
                label="Apertura/Cierre"
                onClick={() => navigate("/apertura-cierre-caja")}
                className="bg-blue-500 hover:bg-blue-700 text-white"
              />
              <ActionButton
                label="Pagos"
                onClick={() => setShowPagoModal(true)}
                className="bg-green-500 hover:bg-green-700 text-white"
              />
            </div>
          )}
        </div>
        {/* Nuevo contenedor con scroll solo para los productos */}
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
                    precio={p.ProductoPrecioVenta}
                    precioMayorista={p.ProductoPrecioVentaMayorista}
                    clienteTipo={clienteSeleccionado?.ClienteTipo || "MI"}
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
                        precio: p.ProductoPrecioVenta,
                        precioMayorista: p.ProductoPrecioVentaMayorista,
                        imagen: p.ProductoImagen
                          ? `data:image/jpeg;base64,${p.ProductoImagen}`
                          : logo,
                        stock: p.ProductoStock,
                        precioUnitario: p.ProductoPrecioUnitario,
                      })
                    }
                    precioUnitario={p.ProductoPrecioUnitario}
                    stockUnitario={p.ProductoStockUnitario}
                  />
                ))
              )}
            </div>
          </div>
          {/* Paginación */}
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
        <PagoModal
          show={showPagoModal}
          handleClose={() => setShowPagoModal(false)}
          cajaAperturada={cajaAperturada}
          usuario={user}
        />

        <InvoicePrintModal
          show={showInvoicePrintModal}
          onClose={() => setShowInvoicePrintModal(false)}
        />
      </div>
      <PaymentModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        totalCost={total}
        totalRest={totalRest}
        setTotalRest={setTotalRest}
        efectivo={efectivo}
        setEfectivo={setEfectivo}
        setPrintTicket={setPrintTicket}
        printTicket={printTicket}
        banco={banco}
        setBanco={setBanco}
        bancoDebito={bancoDebito}
        setBancoDebito={setBancoDebito}
        bancoCredito={bancoCredito}
        setBancoCredito={setBancoCredito}
        cuentaCliente={cuentaCliente}
        setCuentaCliente={setCuentaCliente}
        sendRequest={sendRequest}
        voucher={voucher}
        setVoucher={setVoucher}
        ventaNroPOS={ventaNroPOS}
        setVentaNroPOS={setVentaNroPOS}
      />
    </div>
  );
}
