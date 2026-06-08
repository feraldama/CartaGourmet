import { useEffect, useState, useCallback } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import {
  getVentasPaginated,
  searchVentas,
  type Venta,
  getProductosByVentaId,
  type VentaProducto,
  deleteVenta,
} from "../../services/venta.service";
import { getClienteById } from "../../services/clientes.service";
import { getProductoById } from "../../services/productos.service";
import { getAlmacenById } from "../../services/almacenes.service";
import VentasList from "../../components/ventas/VentasList";
import Pagination from "../../components/common/Pagination";
import { formatCurrency } from "../../utils/utils";
import Swal from "sweetalert2";
import axios from "axios";
import { js2xml } from "xml-js";

interface Pagination {
  totalItems: number;
  totalPages: number;
  [key: string]: unknown;
}

export default function VentasPage() {
  const [ventasData, setVentasData] = useState<{
    ventas: Venta[];
    pagination: Pagination;
  }>({ ventas: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string>("VentaId");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const puedeCrear = usePermiso("VENTAS", "crear");
  const puedeLeer = usePermiso("VENTAS", "leer");
  const puedeEliminar = usePermiso("VENTAS", "eliminar");

  const loadClientesData = async (ventasData: Venta[]) => {
    try {
      const ventasConClientes = await Promise.all(
        ventasData.map(async (venta) => {
          try {
            const cliente = await getClienteById(venta.ClienteId);
            return {
              ...venta,
              ClienteNombre: cliente.ClienteNombre,
              ClienteApellido: cliente.ClienteApellido,
            };
          } catch (error) {
            console.error(`Error al cargar cliente ${venta.ClienteId}:`, error);
            return venta;
          }
        })
      );
      return ventasConClientes;
    } catch (error) {
      console.error("Error al cargar datos de clientes:", error);
      return ventasData;
    }
  };

  const fetchVentas = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchVentas(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getVentasPaginated(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      const ventasConClientes = await loadClientesData(data.data);
      setVentasData({
        ventas: ventasConClientes,
        pagination: data.pagination,
      });
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, appliedSearchTerm, itemsPerPage, sortKey, sortOrder]);

  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const applySearch = () => {
    setAppliedSearchTerm(searchTerm);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      applySearch();
    }
  };

  const handleViewDetails = async (venta: Venta) => {
    try {
      // Obtener los productos de la venta
      const ventaProductos = await getProductosByVentaId(venta.VentaId);

      // Obtener los detalles de cada producto
      const productosConDetalles = await Promise.all(
        ventaProductos.map(async (ventaProducto: VentaProducto) => {
          const producto = await getProductoById(ventaProducto.ProductoId);
          return {
            ...ventaProducto,
            ProductoNombre: producto.ProductoNombre,
            PromedioTotal:
              ventaProducto.VentaProductoPrecioPromedio *
              ventaProducto.VentaProductoCantidad,
          };
        })
      );

      // Obtener los detalles del almacén
      const almacen = await getAlmacenById(venta.AlmacenId);

      const clienteInfo = venta.ClienteNombre
        ? `${venta.ClienteNombre} ${venta.ClienteApellido}`
        : `Cliente #${venta.ClienteId}`;

      const getTipoVentaText = (tipo: string) => {
        switch (tipo) {
          case "CO":
            return "Contado";
          case "CR":
            return "Crédito";
          case "PO":
            return "POS";
          case "TR":
            return "Transfer";
          default:
            return tipo;
        }
      };

      // Crear la tabla HTML de productos
      const productosTable = `
        <table class="w-full mt-4" style="min-width: 1200px">
          <thead>
            <tr class="bg-gray-100">
              <th class="text-left py-2 px-4" style="min-width: 200px">Producto</th>
              <th class="text-right py-2 px-4" style="min-width: 120px">Cantidad</th>
              <th class="text-right py-2 px-4" style="min-width: 160px">Precio Unit.</th>
              <th class="text-right py-2 px-4" style="min-width: 160px">Precio Prom.</th>
              <th class="text-right py-2 px-4" style="min-width: 160px">Prom. Total</th>
              <th class="text-right py-2 px-4" style="min-width: 160px">Precio</th>
              <th class="text-right py-2 px-4" style="min-width: 160px">Precio Total</th>
              <th class="text-right py-2 px-4" style="min-width: 160px">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${productosConDetalles
              .map(
                (prod) => `
              <tr class="border-b hover:bg-gray-50">
                <td class="py-2 px-4">${prod.ProductoNombre}</td>
                <td class="text-right py-2 px-4">${
                  prod.VentaProductoCantidad
                }</td>
                <td class="text-right py-2 px-4">${formatCurrency(
                  prod.VentaProductoPrecio
                )}</td>
                <td class="text-right py-2 px-4">${formatCurrency(
                  prod.VentaProductoPrecioPromedio
                )}</td>
                <td class="text-right py-2 px-4">${formatCurrency(
                  prod.PromedioTotal
                )}</td>
                <td class="text-right py-2 px-4">${formatCurrency(
                  prod.VentaProductoPrecio
                )}</td>
                <td class="text-right py-2 px-4">${formatCurrency(
                  prod.VentaProductoPrecioTotal
                )}</td>
                <td class="text-right py-2 px-4">${formatCurrency(
                  prod.VentaProductoPrecioTotal
                )}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      Swal.fire({
        title: `Venta #${venta.VentaId}`,
        html: `
          <div class="text-left" style="overflow-x: auto;">
            <p><strong>Cliente:</strong> ${clienteInfo}</p>
            <p><strong>Fecha:</strong> ${new Date(
              venta.VentaFecha
            ).toLocaleString()}</p>
            <p><strong>Tipo:</strong> ${getTipoVentaText(venta.VentaTipo)}</p>
            <p><strong>Almacén:</strong> ${almacen.AlmacenNombre}</p>
            <p><strong>Usuario:</strong> ${venta.VentaUsuario}</p>
            <div class="mt-4">
              <h3 class="font-bold mb-2">Detalle de Productos</h3>
              ${productosTable}
            </div>
            <p class="text-right mt-4 pr-4"><strong>Total:</strong> ${formatCurrency(
              venta.Total
            )}</p>
          </div>
        `,
        width: "1400px",
        icon: "info",
        confirmButtonText: "Cerrar",
        customClass: {
          container: "swal2-container-custom",
          popup: "swal2-popup-custom",
          htmlContainer: "swal2-html-container-custom",
        },
      });
    } catch (error) {
      console.error("Error al cargar los detalles de la venta:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudieron cargar los detalles de la venta",
        icon: "error",
      });
    }
  };

  const handleDelete = async (venta: Venta) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar!",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // Preparar fecha para el webservice
          const fechaDate = new Date();
          const dia = fechaDate.getDate();
          const mes = fechaDate.getMonth() + 1;
          const año = fechaDate.getFullYear() % 100;
          const diaStr = dia < 10 ? `0${dia}` : dia.toString();
          const mesStr = mes < 10 ? `0${mes}` : mes.toString();
          const añoStr = año < 10 ? `0${año}` : año.toString();
          const fechaFormateada = `${diaStr}/${mesStr}/${añoStr}`;

          // Preparar datos para el webservice
          const json = {
            Envelope: {
              _attributes: {
                xmlns: "http://schemas.xmlsoap.org/soap/envelope/",
              },
              Body: {
                "PBorrarRegistoDiarioWS.VENTACONFIRMAR": {
                  _attributes: { xmlns: "TechNow" },
                  Ventaid: venta.VentaId,
                  Fechastring: fechaFormateada,
                  Regla: 1, // Valor por defecto para Regla
                },
              },
            },
          };

          const xml = js2xml(json, {
            compact: true,
            ignoreComment: true,
            spaces: 4,
          });
          const config = {
            headers: {
              "Content-Type": "text/xml",
            },
          };

          // PRIMERO: Llamar al webservice
          await axios.post(
            `${import.meta.env.VITE_APP_URL}${
              import.meta.env.VITE_APP_URL_GENEXUS
            }apborrarregistodiariows`,
            xml,
            config
          );

          // SEGUNDO: Solo si el webservice fue exitoso, eliminar la venta
          await deleteVenta(venta.VentaId);

          let timerInterval: ReturnType<typeof setInterval>;
          Swal.fire({
            title: "Venta eliminada exitosamente!",
            html: "Actualizando en <b></b> segundos.",
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
                  timerInterval = setInterval(() => {
                    const timerLeft = Swal.getTimerLeft();
                    const secondsLeft = timerLeft
                      ? Math.ceil(timerLeft / 1000)
                      : 0;
                    timer.textContent = `${secondsLeft}`;
                  }, 100);
                }
              }
            },
            willClose: () => {
              clearInterval(timerInterval);
            },
          }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
              fetchVentas();
            }
          });
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar la venta";
          Swal.fire({
            icon: "warning",
            title: "No permitido",
            text: msg,
          });
        }
      }
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleCreateVenta = () => {
    // Implementar la lógica para crear una nueva venta
    console.log("Crear nueva venta");
  };

  if (!puedeLeer) return <div>No tienes permiso para ver las ventas.</div>;
  if (loading) return <div>Cargando ventas...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Historial de Ventas</h1>
      <VentasList
        ventas={ventasData.ventas}
        onViewDetails={handleViewDetails}
        onCreate={puedeCrear ? handleCreateVenta : undefined}
        onDelete={puedeEliminar ? handleDelete : undefined}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        pagination={ventasData.pagination}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={(key, order) => {
          setSortKey(key);
          setSortOrder(order);
          setCurrentPage(1);
        }}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={ventasData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
