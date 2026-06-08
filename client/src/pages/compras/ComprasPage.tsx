import { useEffect, useState, useCallback } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import {
  getComprasPaginated,
  searchCompras,
  type Compra,
  getProductosByCompraId,
  type CompraProducto,
  deleteCompra,
} from "../../services/compras.service";
import { getProveedorById } from "../../services/proveedores.service";
import { getProductoById } from "../../services/productos.service";
import { getAlmacenById } from "../../services/almacenes.service";
import ComprasList from "../../components/compras/ComprasList";
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

export default function ComprasPage() {
  const [comprasData, setComprasData] = useState<{
    compras: Compra[];
    pagination: Pagination;
  }>({ compras: [], pagination: { totalItems: 0, totalPages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<string>("CompraId");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const puedeCrear = usePermiso("COMPRAS", "crear");
  const puedeLeer = usePermiso("COMPRAS", "leer");
  const puedeEliminar = usePermiso("COMPRAS", "eliminar");

  const loadProveedoresData = async (comprasData: Compra[]) => {
    try {
      const comprasConProveedores = await Promise.all(
        comprasData.map(async (compra) => {
          try {
            const proveedorResponse = await getProveedorById(
              compra.ProveedorId
            );
            // El API retorna directamente el objeto del proveedor (según respuesta: { ProveedorId, ProveedorNombre, ... })
            // El tipo TypeScript indica { success, data }, pero el backend retorna directamente el objeto
            const proveedor = proveedorResponse as unknown as {
              ProveedorNombre?: string;
              ProveedorRUC?: string;
              data?: { ProveedorNombre: string; ProveedorRUC: string };
            };

            // El backend retorna directamente el objeto, así que accedemos directamente
            const proveedorNombre =
              proveedor.ProveedorNombre || proveedor.data?.ProveedorNombre;
            const proveedorRUC =
              proveedor.ProveedorRUC || proveedor.data?.ProveedorRUC || "";

            if (proveedorNombre) {
              return {
                ...compra,
                ProveedorNombre: proveedorNombre,
                ProveedorRUC: proveedorRUC,
              };
            }

            console.warn(
              `Proveedor ${compra.ProveedorId} no tiene nombre válido`
            );
            return compra;
          } catch (error) {
            console.error(
              `Error al cargar proveedor ${compra.ProveedorId}:`,
              error
            );
            return compra;
          }
        })
      );
      return comprasConProveedores;
    } catch (error) {
      console.error("Error al cargar datos de proveedores:", error);
      return comprasData;
    }
  };

  const fetchCompras = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (appliedSearchTerm) {
        data = await searchCompras(
          appliedSearchTerm,
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      } else {
        data = await getComprasPaginated(
          currentPage,
          itemsPerPage,
          sortKey,
          sortOrder
        );
      }
      const comprasConProveedores = await loadProveedoresData(data.data);
      setComprasData({
        compras: comprasConProveedores,
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
    fetchCompras();
  }, [fetchCompras]);

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

  const handleViewDetails = async (compra: Compra) => {
    try {
      // Obtener los productos de la compra
      const compraProductos = await getProductosByCompraId(compra.CompraId);

      // Obtener los detalles de cada producto
      const productosConDetalles = await Promise.all(
        compraProductos.map(async (compraProducto: CompraProducto) => {
          const producto = await getProductoById(compraProducto.ProductoId);
          return {
            ...compraProducto,
            ProductoNombre: producto.ProductoNombre,
            PrecioTotal:
              compraProducto.CompraProductoPrecio *
              compraProducto.CompraProductoCantidad,
          };
        })
      );

      // Obtener los detalles del almacén
      const almacen = await getAlmacenById(compra.AlmacenId);

      const proveedorInfo = compra.ProveedorNombre
        ? compra.ProveedorRUC && compra.ProveedorRUC.trim()
          ? `${compra.ProveedorNombre} (${compra.ProveedorRUC})`
          : compra.ProveedorNombre
        : `Proveedor #${compra.ProveedorId}`;

      const getTipoCompraText = (tipo: string) => {
        switch (tipo) {
          case "CO":
            return "Contado";
          case "CR":
            return "Crédito";
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
              <th class="text-right py-2 px-4" style="min-width: 160px">Precio Total</th>
              <th class="text-right py-2 px-4" style="min-width: 160px">Unidad</th>
            </tr>
          </thead>
          <tbody>
            ${productosConDetalles
              .map(
                (prod) => `
              <tr class="border-b hover:bg-gray-50">
                <td class="py-2 px-4">${prod.ProductoNombre}</td>
                <td class="text-right py-2 px-4">${
                  prod.CompraProductoCantidad
                }</td>
                <td class="text-right py-2 px-4">${formatCurrency(
                  prod.CompraProductoPrecio
                )}</td>
                <td class="text-right py-2 px-4">${formatCurrency(
                  prod.PrecioTotal
                )}</td>
                <td class="text-right py-2 px-4">${
                  prod.CompraProductoCantidadUnidad === "C" ? "Caja" : "Unidad"
                }</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      Swal.fire({
        title: `Compra #${compra.CompraId}`,
        html: `
          <div class="text-left" style="overflow-x: auto;">
            <p><strong>Proveedor:</strong> ${proveedorInfo}</p>
            <p><strong>Fecha:</strong> ${new Date(
              compra.CompraFecha
            ).toLocaleString()}</p>
            <p><strong>Tipo:</strong> ${getTipoCompraText(
              compra.CompraTipo
            )}</p>
            <p><strong>Almacén:</strong> ${almacen.AlmacenNombre}</p>
            <p><strong>Factura:</strong> ${compra.CompraFactura}</p>
            <div class="mt-4">
              <h3 class="font-bold mb-2">Detalle de Productos</h3>
              ${productosTable}
            </div>
            <p class="text-right mt-4 pr-4"><strong>Total:</strong> ${formatCurrency(
              compra.Total
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
      console.error("Error al cargar los detalles de la compra:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudieron cargar los detalles de la compra",
        icon: "error",
      });
    }
  };

  const handleDelete = async (compra: Compra) => {
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
                  Ventaid: compra.CompraId,
                  Fechastring: fechaFormateada,
                  Regla: 2, // Valor por defecto para Regla
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

          // SEGUNDO: Solo si el webservice fue exitoso, eliminar la compra
          await deleteCompra(compra.CompraId);

          let timerInterval: ReturnType<typeof setInterval>;
          Swal.fire({
            title: "Compra eliminada exitosamente!",
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
              fetchCompras();
            }
          });
        } catch (error: unknown) {
          const err = error as { message?: string };
          const msg = err?.message || "No se pudo eliminar la compra";
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

  const handleCreateCompra = () => {
    // Implementar la lógica para crear una nueva compra
    console.log("Crear nueva compra");
  };

  if (!puedeLeer) return <div>No tienes permiso para ver las compras.</div>;
  if (loading) return <div>Cargando compras...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-medium mb-3">Historial de Compras</h1>
      <ComprasList
        compras={comprasData.compras}
        onViewDetails={handleViewDetails}
        onCreate={puedeCrear ? handleCreateCompra : undefined}
        onDelete={puedeEliminar ? handleDelete : undefined}
        onSearch={handleSearch}
        searchTerm={searchTerm}
        onKeyPress={handleKeyPress}
        onSearchSubmit={applySearch}
        pagination={comprasData.pagination}
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
        totalPages={comprasData.pagination.totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
