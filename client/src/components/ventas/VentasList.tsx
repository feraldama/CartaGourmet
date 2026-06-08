import { useEffect, useState } from "react";
import DataTable from "../common/Table/DataTable";
import type { Venta, VentaCreditoPago } from "../../services/venta.service";
import { formatCurrency } from "../../utils/utils";
import { getAlmacenById } from "../../services/almacenes.service";
import SearchButton from "../common/Input/SearchButton";
import ActionButton from "../common/Button/ActionButton";
import { PlusIcon } from "@heroicons/react/24/outline";
import Swal from "sweetalert2";
import {
  getVentaCreditoByVentaId,
  getPagosByVentaCreditoId,
} from "../../services/venta.service";

interface VentasListProps {
  ventas: Venta[];
  onSort?: (key: string, order: "asc" | "desc") => void;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onViewDetails?: (venta: Venta) => void;
  onCreate?: () => void;
  onDelete?: (venta: Venta) => void;
  onSearch: (value: string) => void;
  searchTerm: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  pagination?: {
    totalItems: number;
  };
}

interface VentaWithId extends Venta {
  id: number;
  AlmacenNombre?: string;
  Saldo?: number;
  [key: string]: string | number | undefined;
}

const VentasList = ({
  ventas,
  onSort,
  sortKey,
  sortOrder,
  onViewDetails,
  onCreate,
  onDelete,
  onSearch,
  searchTerm,
  onKeyPress,
  onSearchSubmit,
  pagination,
}: VentasListProps) => {
  const [ventasWithAlmacen, setVentasWithAlmacen] = useState<VentaWithId[]>([]);

  useEffect(() => {
    const loadAlmacenesData = async () => {
      const ventasData = ventas.map((venta) => ({
        ...venta,
        id: venta.VentaId,
        Saldo: venta.Total - Number(venta.VentaEntrega || 0),
      }));

      try {
        const ventasWithAlmacenData = await Promise.all(
          ventasData.map(async (venta) => {
            try {
              const almacen = await getAlmacenById(venta.AlmacenId);
              return {
                ...venta,
                AlmacenNombre: almacen.AlmacenNombre,
              };
            } catch (error) {
              console.error(
                `Error al cargar almacén ${venta.AlmacenId}:`,
                error
              );
              return venta;
            }
          })
        );
        setVentasWithAlmacen(ventasWithAlmacenData);
      } catch (error) {
        console.error("Error al cargar datos de almacenes:", error);
        setVentasWithAlmacen(ventasData);
      }
    };

    loadAlmacenesData();
  }, [ventas]);

  const handleViewCreditDetails = async (venta: VentaWithId) => {
    try {
      // Obtener los detalles del crédito
      const ventaCredito = await getVentaCreditoByVentaId(venta.VentaId);
      if (!ventaCredito) {
        Swal.fire({
          title: "Error",
          text: "No se encontraron detalles del crédito",
          icon: "error",
        });
        return;
      }

      // Obtener los pagos del crédito
      const pagos = await getPagosByVentaCreditoId(ventaCredito.VentaCreditoId);

      // Calcular el total pagado y el saldo pendiente
      const totalPagado = pagos.reduce(
        (sum: number, pago: VentaCreditoPago) =>
          sum + pago.VentaCreditoPagoMonto,
        0
      );
      const saldoPendiente = venta.Total - totalPagado;

      // Crear la tabla HTML de pagos
      const pagosTable = `
        <table class="w-full mt-4">
          <thead>
            <tr class="bg-gray-100">
              <th class="text-left py-2 px-4">ID Pago</th>
              <th class="text-left py-2 px-4">Fecha</th>
              <th class="text-right py-2 px-4">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${pagos
              .map(
                (pago: VentaCreditoPago) => `
              <tr class="border-b hover:bg-gray-50">
                <td class="py-2 px-4">${pago.VentaCreditoPagoId}</td>
                <td class="py-2 px-4">${new Date(
                  pago.VentaCreditoPagoFecha
                ).toLocaleString()}</td>
                <td class="text-right py-2 px-4">${formatCurrency(
                  pago.VentaCreditoPagoMonto
                )}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      Swal.fire({
        title: `Detalles del Crédito - Venta #${venta.VentaId}`,
        html: `
          <div class="text-left">
            <p><strong>Cliente:</strong> ${
              venta.ClienteNombre
                ? `${venta.ClienteNombre} ${venta.ClienteApellido}`
                : `Cliente #${venta.ClienteId}`
            }</p>
            <p><strong>Fecha de Venta:</strong> ${new Date(
              venta.VentaFecha
            ).toLocaleString()}</p>
            <p><strong>Monto Total:</strong> ${formatCurrency(venta.Total)}</p>
            <p><strong>Cantidad de Pagos:</strong> ${
              ventaCredito.VentaCreditoPagoCant
            }</p>
            <p><strong>Total Pagado:</strong> ${formatCurrency(totalPagado)}</p>
            <p><strong>Saldo Pendiente:</strong> ${formatCurrency(
              saldoPendiente
            )}</p>
            <div class="mt-4">
              <h3 class="font-bold mb-2">Historial de Pagos</h3>
              ${pagosTable}
            </div>
          </div>
        `,
        width: "800px",
        icon: "info",
        confirmButtonText: "Cerrar",
      });
    } catch (error) {
      console.error("Error al cargar los detalles del crédito:", error);
      Swal.fire({
        title: "Error",
        text: "No se pudieron cargar los detalles del crédito",
        icon: "error",
      });
    }
  };

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

  const columns = [
    {
      key: "VentaId",
      label: "ID",
    },
    {
      key: "VentaFecha",
      label: "Fecha",
      render: (venta: VentaWithId) => {
        const fecha = new Date(venta.VentaFecha);
        return fecha.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    {
      key: "Cliente",
      label: "Cliente",
      render: (venta: VentaWithId) =>
        venta.ClienteNombre
          ? `${venta.ClienteNombre} ${venta.ClienteApellido}`
          : `Cliente #${venta.ClienteId}`,
    },
    {
      key: "AlmacenNombre",
      label: "Almacén",
      render: (venta: VentaWithId) =>
        venta.AlmacenNombre || `Almacén #${venta.AlmacenId}`,
    },
    {
      key: "VentaTipo",
      label: "Tipo",
      render: (venta: VentaWithId) => getTipoVentaText(venta.VentaTipo),
    },
    {
      key: "VentaNroPOS",
      label: "Nro. POS",
      render: (venta: VentaWithId) =>
        venta.VentaNroPOS != null && String(venta.VentaNroPOS).trim() !== ""
          ? venta.VentaNroPOS
          : "-",
    },
    {
      key: "Total",
      label: "Total",
      render: (venta: VentaWithId) => formatCurrency(venta.Total),
    },
    {
      key: "VentaEntrega",
      label: "Entrega",
      render: (venta: VentaWithId) =>
        venta.VentaEntrega ? formatCurrency(Number(venta.VentaEntrega)) : "-",
    },
    {
      key: "Saldo",
      label: "Saldo",
      render: (venta: VentaWithId) => formatCurrency(venta.Saldo || 0),
    },
    {
      key: "VentaUsuario",
      label: "Usuario",
    },
  ];

  const getStatusColor = (status: unknown) => {
    switch (status) {
      case "P":
        return "bg-yellow-500"; // Pendiente
      case "C":
        return "bg-green-500"; // Completado
      case "A":
        return "bg-red-500"; // Anulado
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: unknown) => {
    switch (status) {
      case "P":
        return "Pendiente";
      case "C":
        return "Completado";
      case "A":
        return "Anulado";
      default:
        return "Desconocido";
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <SearchButton
            searchTerm={searchTerm}
            onSearch={onSearch}
            onKeyPress={onKeyPress}
            onSearchSubmit={onSearchSubmit}
            placeholder="Buscar ventas..."
          />
        </div>
        <div className="py-4">
          {onCreate && (
            <ActionButton
              label="Nueva Venta"
              onClick={onCreate}
              icon={PlusIcon}
            />
          )}
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Mostrando {ventasWithAlmacen.length} de{" "}
          {pagination?.totalItems || ventasWithAlmacen.length} ventas
        </div>
      </div>

      <DataTable<VentaWithId>
        columns={columns}
        data={ventasWithAlmacen}
        onEdit={onViewDetails}
        onDelete={onDelete}
        onViewCredit={handleViewCreditDetails}
        emptyMessage="No hay ventas registradas"
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={onSort}
      />
    </>
  );
};

export default VentasList;
