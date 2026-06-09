import React, { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import {
  getVentasPaginated,
  searchVentas,
  type Venta,
  getProductosByVentaId,
} from "../../services/venta.service";
import { getClienteById } from "../../services/clientes.service";
import {
  generarComprobanteHTML,
  imprimirComprobante,
} from "../../utils/comprobante";

interface VentaProducto {
  VentaId: number;
  VentaProductoId: number;
  ProductoId: number;
  VentaProductoPrecioPromedio: number;
  VentaProductoCantidad: number;
  VentaProductoPrecio: number;
  VentaProductoPrecioTotal: number;
  VentaProductoUnitario: string;
  ProductoNombre?: string;
  ProductoCodigo?: string;
  ProductoPrecioVenta?: number;
  ProductoIVA?: number;
}

interface VentaCompleta extends Venta {
  ClienteRazonSocial?: string;
  ClienteRUC?: string;
  ClienteTelefono?: string;
  ClienteDireccion?: string;
  VentaProductos?: VentaProducto[];
}

interface InvoicePrintModalProps {
  show: boolean;
  onClose: () => void;
}

const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  show,
  onClose,
}) => {
  const [ventas, setVentas] = useState<VentaCompleta[]>([]);
  const [ventaSeleccionada, setVentaSeleccionada] =
    useState<VentaCompleta | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage] = useState(10);

  const fetchVentas = useCallback(async () => {
    try {
      setLoading(true);
      let data;

      if (searchTerm.trim()) {
        data = await searchVentas(
          searchTerm,
          currentPage,
          itemsPerPage,
          "VentaId",
          "desc"
        );
      } else {
        data = await getVentasPaginated(
          currentPage,
          itemsPerPage,
          "VentaId",
          "desc"
        );
      }

      // Enriquecer las ventas con datos del cliente
      const ventasEnriquecidas = await Promise.all(
        data.data.map(async (venta: Venta) => {
          try {
            const cliente = await getClienteById(venta.ClienteId);
            console.log(
              `Cliente cargado para venta ${venta.VentaId}:`,
              cliente
            );

            const ventaEnriquecida = {
              ...venta,
              ClienteRazonSocial:
                cliente.ClienteRazonSocial ||
                `${cliente.ClienteNombre} ${cliente.ClienteApellido}`.trim(),
              ClienteRUC: cliente.ClienteRUC || "",
              ClienteTelefono: cliente.ClienteTelefono || "",
              ClienteDireccion: cliente.ClienteDireccion || "",
            };

            console.log(
              `Venta enriquecida ${venta.VentaId}:`,
              ventaEnriquecida
            );
            return ventaEnriquecida;
          } catch (error) {
            console.error(`Error al cargar cliente ${venta.ClienteId}:`, error);
            return {
              ...venta,
              ClienteRazonSocial: "Cliente no encontrado",
              ClienteRUC: "",
              ClienteTelefono: "",
              ClienteDireccion: "",
            };
          }
        })
      );

      setVentas(ventasEnriquecidas);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error al cargar ventas:", error);
      Swal.fire("Error", "No se pudieron cargar las ventas", "error");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage, itemsPerPage]);

  // Cargar ventas al abrir el modal
  useEffect(() => {
    if (show) {
      fetchVentas();
      setVentaSeleccionada(null);
    }
  }, [show, currentPage, fetchVentas]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchVentas();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const cargarProductosVenta = async (venta: VentaCompleta) => {
    try {
      console.log("Cargando productos para venta:", venta);
      const productos = await getProductosByVentaId(venta.VentaId);
      console.log("Productos cargados:", productos);

      // Los productos ya vienen con la descripción del JOIN en el backend
      const ventaCompleta = {
        ...venta,
        VentaProductos: productos,
      };

      console.log("Venta completa con productos:", ventaCompleta);
      setVentaSeleccionada(ventaCompleta);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      Swal.fire(
        "Error",
        "No se pudieron cargar los productos de la venta",
        "error"
      );
    }
  };

  const calcularNroFactura = (venta: VentaCompleta) => {
    // Lógica similar a GeneXus
    // Por ahora usamos el ID de la venta como número de factura
    return venta.VentaId;
  };

  const calcularIVA = (total: number) => {
    if (total === undefined || total === null || isNaN(total)) {
      return 0;
    }
    return total / 11; // IVA 10%
  };

  const formatearNumero = (numero: number) => {
    if (numero === undefined || numero === null || isNaN(numero)) {
      return "0";
    }
    // Redondear al entero más cercano
    const numeroRedondeado = Math.round(numero);
    return numeroRedondeado.toLocaleString("es-PY", { useGrouping: true });
  };

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString("es-PY", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  };

  const imprimirFactura = () => {
    if (!ventaSeleccionada) {
      Swal.fire("Error", "Debe seleccionar una venta", "error");
      return;
    }

    // Reimprime respetando el tipo de comprobante de la venta (FA/NC).
    const html = generarComprobanteHTML(
      {
        VentaId: ventaSeleccionada.VentaId,
        VentaFecha: ventaSeleccionada.VentaFecha,
        Total: ventaSeleccionada.Total,
        ClienteRazonSocial: ventaSeleccionada.ClienteRazonSocial,
        ClienteRUC: ventaSeleccionada.ClienteRUC,
        ClienteTelefono: ventaSeleccionada.ClienteTelefono,
        ClienteDireccion: ventaSeleccionada.ClienteDireccion,
      },
      ventaSeleccionada.VentaProductos || [],
      ventaSeleccionada.VentaDocumentoTipo === "NC" ? "NC" : "FA"
    );
    imprimirComprobante(html);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" />
      <div className="bg-white rounded-xl shadow-lg w-full max-w-6xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-text-subtle hover:text-text-muted text-2xl cursor-pointer"
          onClick={onClose}
        >
          &times;
        </button>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-text-strong">
            Imprimir Factura
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel izquierdo - Búsqueda y lista de ventas */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Buscar ventas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-2 focus:ring-brand-600/30"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition"
                >
                  Buscar
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-8 text-text-muted">
                  Cargando ventas...
                </div>
              ) : ventas.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  No se encontraron ventas
                </div>
              ) : (
                ventas.map((venta) => (
                  <div
                    key={venta.VentaId}
                    className={`p-3 border rounded-lg cursor-pointer transition ${
                      ventaSeleccionada?.VentaId === venta.VentaId
                        ? "border-brand-700 bg-brand-50"
                        : "border-border hover:border-border"
                    }`}
                    onClick={() => cargarProductosVenta(venta)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">Venta #{venta.VentaId}</p>
                        <p className="text-sm text-text-muted">
                          {formatearFecha(venta.VentaFecha)}
                        </p>
                        <p className="text-sm text-text-muted">
                          Cliente: {venta.ClienteRazonSocial || "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-success-700">
                          {formatearNumero(venta.Total || 0)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {venta.VentaCantidadProductos || 0} productos
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-text-muted">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-muted"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

          {/* Panel derecho - Vista previa */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Vista Previa</h3>
            {ventaSeleccionada ? (
              <div className="border rounded-lg p-4 bg-surface-muted">
                <div className="space-y-2">
                  <p>
                    <strong>N° Factura:</strong>{" "}
                    {calcularNroFactura(ventaSeleccionada)}
                  </p>
                  <p>
                    <strong>Fecha:</strong>{" "}
                    {formatearFecha(ventaSeleccionada.VentaFecha)}
                  </p>
                  <p>
                    <strong>Cliente:</strong>{" "}
                    {ventaSeleccionada.ClienteRazonSocial || "N/A"}
                  </p>
                  <p>
                    <strong>RUC:</strong>{" "}
                    {ventaSeleccionada.ClienteRUC || "N/A"}
                  </p>
                  <p>
                    <strong>Dirección:</strong>{" "}
                    {ventaSeleccionada.ClienteDireccion ||
                      "Sin dirección registrada"}
                  </p>
                  <p>
                    <strong>Total:</strong>{" "}
                    {formatearNumero(ventaSeleccionada.Total || 0)}
                  </p>
                  <p>
                    <strong>IVA 10%:</strong>{" "}
                    {formatearNumero(calcularIVA(ventaSeleccionada.Total || 0))}
                  </p>
                  <p>
                    <strong>Productos:</strong>{" "}
                    {ventaSeleccionada.VentaProductos?.length || 0}
                  </p>

                  {ventaSeleccionada.VentaProductos &&
                    ventaSeleccionada.VentaProductos.length > 0 && (
                      <div className="mt-3">
                        <p className="font-semibold mb-2">Productos:</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {ventaSeleccionada.VentaProductos.slice(0, 5).map(
                            (producto, index) => (
                              <div
                                key={index}
                                className="text-sm text-text-muted"
                              >
                                {producto.VentaProductoCantidad}x{" "}
                                {producto.ProductoNombre ||
                                  producto.ProductoCodigo}
                              </div>
                            )
                          )}
                          {ventaSeleccionada.VentaProductos.length > 5 && (
                            <p className="text-xs text-text-muted">
                              ... y{" "}
                              {ventaSeleccionada.VentaProductos.length - 5}{" "}
                              productos más
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-surface-muted text-center text-text-muted">
                Seleccione una venta para ver la vista previa
              </div>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            className="px-4 py-2 text-text-muted border border-border rounded-lg hover:bg-surface-muted transition"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className={`px-6 py-2 rounded-lg transition ${
              ventaSeleccionada
                ? "bg-brand-700 text-white hover:bg-brand-800"
                : "bg-gray-300 text-text-muted cursor-not-allowed"
            }`}
            onClick={imprimirFactura}
            disabled={!ventaSeleccionada}
          >
            Imprimir Factura
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintModal;
