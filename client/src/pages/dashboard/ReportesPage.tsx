import React, { useMemo, useState, useEffect } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import { PermissionDenied } from "../../components/common/ui";
import { loadPdf } from "../../utils/lazyPdf";
import api from "../../services/api";
import { formatMiles } from "../../utils/utils";
import { getAllClientesSinPaginacion } from "../../services/clientes.service";
import {
  getReporteMovimientosProductos,
  getReporteMasVendidos,
  type ProductoMovimientoRow,
  type ProductoMasVendidoRow,
} from "../../services/productos.service";
import {
  getRegistrosDiariosCajaPorRango,
  type RegistroDiarioCajaRow,
} from "../../services/registros.service";

interface DeudaCliente {
  ClienteId: number;
  Cliente: string;
  TotalVentas: number;
  TotalEntregado: number;
  Saldo: number;
}

interface Cliente {
  ClienteId: number;
  ClienteNombre: string;
  ClienteApellido: string;
  ClienteRUC: string;
}

interface Pago {
  VentaCreditoPagoId: number;
  VentaCreditoPagoFecha: string;
  VentaCreditoPagoMonto: number;
}

interface Venta {
  VentaId: number;
  VentaFecha: string;
  VentaTipo: string;
  Total: number;
  VentaEntrega: number;
  SaldoPendiente: number;
  Pagos: Pago[];
  AlmacenNombre: string;
  UsuarioNombre: string;
  ClienteNombre?: string;
  ClienteApellido?: string;
  UsuarioId?: string;
  VentaUsuario?: string;
}

interface ReporteData {
  cliente: {
    ClienteId: number;
    ClienteNombre: string;
    ClienteApellido: string;
    ClienteRUC: string;
  };
  fechaDesde: string;
  fechaHasta: string;
  ventas: Venta[];
}

interface ProductoAlmacenStock {
  AlmacenNombre: string;
  ProductoAlmacenStock: number;
  ProductoAlmacenStockUnitario: number;
}

interface ProductoStockReporte {
  ProductoId: number;
  ProductoCodigo: string;
  ProductoNombre: string;
  ProductoCantidadCaja: number;
  ProductoPrecioPromedio: number;
  ProductoPrecioVenta: number;
  ProductoStock: number;
  ProductoStockUnitario: number;
  productoAlmacen: ProductoAlmacenStock[];
}

interface ResumenCierre {
  fechaCierre: string;
  fechaCierreDate: Date;
  cajaId: number;
  cajaDescripcion: string;
  usuarioId: string;
  apertura: number;
  cierre: number;
  egresos: number;
  ingresos: number;
  ingresosPOS: number;
  ingresosVoucher: number;
  ingresosTransfer: number;
  totalIngresos: number;
  diferencia: number;
  sobranteFaltante: number;
  parcial?: boolean;
}

function toLocalDateStr(fechaRegistro: string): string {
  const d = new Date(fechaRegistro);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateDDMMYYYY(fecha: Date | string): string {
  const d =
    typeof fecha === "string"
      ? new Date(fecha.includes("T") ? fecha : fecha + "T12:00:00")
      : fecha;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getHoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function calcularTotalesCiclo(
  registrosCajaUsuario: RegistroDiarioCajaRow[],
  idApertura: number,
  idCierre: number,
) {
  const filtrados = registrosCajaUsuario.filter(
    (r) =>
      r.RegistroDiarioCajaId >= idApertura &&
      r.RegistroDiarioCajaId <= idCierre,
  );
  const aperturaReg = filtrados.find(
    (r) => r.TipoGastoId === 2 && r.TipoGastoGrupoId === 2,
  );
  const cierreReg = filtrados.find(
    (r) => r.TipoGastoId === 1 && r.TipoGastoGrupoId === 2,
  );
  const apertura = aperturaReg?.RegistroDiarioCajaMonto ?? 0;
  const cierre = cierreReg?.RegistroDiarioCajaMonto ?? 0;

  let egresos = 0;
  let ingresos = 0;
  let ingresosPOS = 0;
  let ingresosVoucher = 0;
  let ingresosTransfer = 0;
  for (const reg of filtrados) {
    if (
      reg.TipoGastoId === 2 &&
      reg.TipoGastoGrupoId !== 2 &&
      reg.TipoGastoGrupoId !== 4 &&
      reg.TipoGastoGrupoId !== 5 &&
      reg.TipoGastoGrupoId !== 6
    ) {
      ingresos += reg.RegistroDiarioCajaMonto;
    }
    if (reg.TipoGastoId === 1 && reg.TipoGastoGrupoId !== 2) {
      egresos += reg.RegistroDiarioCajaMonto;
    }
    if (reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 4) {
      ingresosPOS += reg.RegistroDiarioCajaMonto;
    }
    if (reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 5) {
      ingresosVoucher += reg.RegistroDiarioCajaMonto;
    }
    if (reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 6) {
      ingresosTransfer += reg.RegistroDiarioCajaMonto;
    }
  }
  const totalIngresos =
    ingresos + ingresosPOS + ingresosVoucher + ingresosTransfer;
  const diferencia = totalIngresos - egresos;
  const sobranteFaltante = ingresos + apertura - (cierre + egresos);

  return {
    apertura,
    cierre,
    egresos,
    ingresos,
    ingresosPOS,
    ingresosVoucher,
    ingresosTransfer,
    totalIngresos,
    diferencia,
    sobranteFaltante,
  };
}

function buildResumenesCierre(
  registros: RegistroDiarioCajaRow[],
  fechaDesde: string,
  fechaHasta: string,
): ResumenCierre[] {
  if (registros.length === 0) return [];

  const cierres = registros
    .filter((r) => r.TipoGastoId === 1 && r.TipoGastoGrupoId === 2)
    .sort((a, b) => a.RegistroDiarioCajaId - b.RegistroDiarioCajaId);

  const resumenes: ResumenCierre[] = [];

  for (const cierreReg of cierres) {
    const fechaCierreLocal = toLocalDateStr(cierreReg.RegistroDiarioCajaFecha);
    if (fechaCierreLocal < fechaDesde || fechaCierreLocal > fechaHasta)
      continue;
    const registrosCajaUsuario = registros.filter(
      (r) =>
        r.CajaId === cierreReg.CajaId && r.UsuarioId === cierreReg.UsuarioId,
    );
    const mismosCajaUsuarioHastaCierre = registrosCajaUsuario.filter(
      (r) => r.RegistroDiarioCajaId <= cierreReg.RegistroDiarioCajaId,
    );
    const aperturas = mismosCajaUsuarioHastaCierre
      .filter(
        (r) =>
          r.TipoGastoId === 2 &&
          r.TipoGastoGrupoId === 2 &&
          r.RegistroDiarioCajaId < cierreReg.RegistroDiarioCajaId,
      )
      .sort((a, b) => b.RegistroDiarioCajaId - a.RegistroDiarioCajaId);
    const aperturaReg = aperturas[0];
    if (!aperturaReg) continue;
    if (cierreReg.RegistroDiarioCajaId <= aperturaReg.RegistroDiarioCajaId)
      continue;

    const totals = calcularTotalesCiclo(
      registrosCajaUsuario,
      aperturaReg.RegistroDiarioCajaId,
      cierreReg.RegistroDiarioCajaId,
    );

    const fechaCierreDate = new Date(cierreReg.RegistroDiarioCajaFecha);
    resumenes.push({
      fechaCierre: formatDateDDMMYYYY(fechaCierreDate),
      fechaCierreDate,
      cajaId: cierreReg.CajaId,
      cajaDescripcion: cierreReg.CajaDescripcion ?? `Caja ${cierreReg.CajaId}`,
      usuarioId: cierreReg.UsuarioId,
      ...totals,
    });
  }

  resumenes.sort(
    (a, b) => a.fechaCierreDate.getTime() - b.fechaCierreDate.getTime(),
  );
  return resumenes;
}

const PAGE_SIZE = 25;

const ReportesPage: React.FC = () => {
  const puedeLeer = usePermiso("REPORTES", "leer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("TODOS");
  const [fechaDesde, setFechaDesde] = useState(() => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return primerDiaMes.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().split("T")[0];
  });

  const [resumenesCierre, setResumenesCierre] = useState<ResumenCierre[]>([]);
  const [paginaCierre, setPaginaCierre] = useState(1);
  const [fechaDesdeCierre, setFechaDesdeCierre] = useState(() => getHoyISO());
  const [fechaHastaCierre, setFechaHastaCierre] = useState(() => getHoyISO());

  // Estado del reporte "Productos vendidos y comprados"
  const [fechaDesdeMov, setFechaDesdeMov] = useState(() => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return primerDiaMes.toISOString().split("T")[0];
  });
  const [fechaHastaMov, setFechaHastaMov] = useState(() => getHoyISO());

  // Estado del reporte "Productos más vendidos"
  const [fechaDesdeTop, setFechaDesdeTop] = useState(() => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return primerDiaMes.toISOString().split("T")[0];
  });
  const [fechaHastaTop, setFechaHastaTop] = useState(() => getHoyISO());

  // Cuál tarjeta de reporte está abierta en modal (slug del reporte) o null
  const [reporteActivo, setReporteActivo] = useState<string | null>(null);

  const totalPaginasCierre = Math.max(
    1,
    Math.ceil(resumenesCierre.length / PAGE_SIZE),
  );
  const resumenesPaginados = useMemo(() => {
    const from = (paginaCierre - 1) * PAGE_SIZE;
    return resumenesCierre.slice(from, from + PAGE_SIZE);
  }, [resumenesCierre, paginaCierre]);

  const totalesGeneralesCierre = useMemo(() => {
    return resumenesCierre.reduce(
      (acc, r) => ({
        apertura: acc.apertura + r.apertura,
        cierre: acc.cierre + r.cierre,
        egresos: acc.egresos + r.egresos,
        ingresos: acc.ingresos + r.ingresos,
        ingresosPOS: acc.ingresosPOS + r.ingresosPOS,
        ingresosVoucher: acc.ingresosVoucher + r.ingresosVoucher,
        ingresosTransfer: acc.ingresosTransfer + r.ingresosTransfer,
        totalIngresos: acc.totalIngresos + r.totalIngresos,
        diferencia: acc.diferencia + r.diferencia,
      }),
      {
        apertura: 0,
        cierre: 0,
        egresos: 0,
        ingresos: 0,
        ingresosPOS: 0,
        ingresosVoucher: 0,
        ingresosTransfer: 0,
        totalIngresos: 0,
        diferencia: 0,
      },
    );
  }, [resumenesCierre]);

  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const response = await getAllClientesSinPaginacion();
        const todosLosClientes = response.data || [];
        const clientesOrdenados = todosLosClientes.sort(
          (a: Cliente, b: Cliente) =>
            a.ClienteNombre.localeCompare(b.ClienteNombre),
        );
        setClientes(clientesOrdenados);
      } catch (error) {
        console.error("Error al cargar clientes:", error);
      }
    };
    cargarClientes();
  }, []);

  if (!puedeLeer) return <PermissionDenied resource="los reportes" />;

  // Función para formatear fecha de aaaa-mm-dd a dd-mm-aaaa
  const formatearFecha = (fecha: string): string => {
    const [año, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${año}`;
  };

  // Formatea fecha y hora de un datetime ISO para reportes (dd/mm/aaaa HH:mm)
  const formatearFechaHora = (fechaStr: string): string => {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    const dia = String(d.getDate()).padStart(2, "0");
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const año = d.getFullYear();
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dia}/${mes}/${año} ${h}:${min}`;
  };

  const handleGenerarPDF = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/venta/pendientes");
      const deudas: DeudaCliente[] = res.data.data || [];
      const { jsPDF, autoTable } = await loadPdf();
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Créditos Pendientes a Cobrar", 14, 18);
      let y = 28;
      let totalGeneral = 0;
      const rows = deudas.map((d) => [
        d.ClienteId,
        d.Cliente,
        formatMiles(d.TotalVentas),
        formatMiles(d.TotalEntregado),
        formatMiles(d.Saldo),
      ]);
      autoTable(doc, {
        head: [["CLIENTE ID", "CLIENTE", "TOTAL", "ENTREGA", "SALDO"]],
        body: rows,
        startY: y,
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 11 },
        margin: { left: 14, right: 14 },
      });
      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 12; // Más espacio
      totalGeneral = deudas.reduce((acc, d) => acc + Number(d.Saldo), 0);
      doc.setFontSize(14);
      doc.text(`TOTAL GENERAL: Gs. ${formatMiles(totalGeneral)}`, 14, y);
      doc.save("creditos_pendientes.pdf");
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError("Error al generar el PDF de deudas pendientes");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarReporteVentas = async () => {
    if (!fechaDesde || !fechaHasta) {
      setError("Debes seleccionar ambas fechas");
      return;
    }

    if (new Date(fechaDesde) > new Date(fechaHasta)) {
      setError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/venta/reporte", {
        params: {
          clienteId: clienteSeleccionado,
          fechaDesde,
          fechaHasta,
        },
      });

      const reporte: ReporteData = res.data.data;
      const esTodos = clienteSeleccionado.toUpperCase() === "TODOS";

      const { jsPDF, autoTable } = await loadPdf();
      const doc = new jsPDF({ orientation: esTodos ? "landscape" : "portrait" });
      let y = 20;

      // Título
      doc.setFontSize(18);
      doc.text("Reporte de Ventas por Cliente", 14, y);
      y += 10;

      // Información del cliente o TODOS
      doc.setFontSize(12);
      doc.text(
        `Cliente: ${reporte.cliente.ClienteNombre} ${reporte.cliente.ClienteApellido}`.trim() || "TODOS",
        14,
        y,
      );
      y += 6;
      if (reporte.cliente.ClienteRUC) {
        doc.text(`RUC: ${reporte.cliente.ClienteRUC}`, 14, y);
        y += 6;
      }
      doc.text(
        `Período: ${formatearFecha(fechaDesde)} al ${formatearFecha(
          fechaHasta,
        )}`,
        14,
        y,
      );
      y += 10;

      // Totales por tipo de venta
      let totalVentas = 0;
      let totalSaldoPendiente = 0;
      let totalEfectivo = 0;
      let totalPOS = 0;
      let totalTransfer = 0;
      let totalCredito = 0;

      const ventasRows: string[][] = [];

      reporte.ventas.forEach((venta) => {
        const tipoVenta =
          venta.VentaTipo === "CO"
            ? "Contado"
            : venta.VentaTipo === "CR"
              ? "Crédito"
              : venta.VentaTipo === "PO"
                ? "POS"
                : venta.VentaTipo === "TR"
                  ? "Transfer"
                  : venta.VentaTipo;

        const fechaVenta = formatearFechaHora(venta.VentaFecha);
        const clienteNombre = [venta.ClienteNombre, venta.ClienteApellido]
          .filter(Boolean)
          .join(" ")
          .trim() || "-";
        const usuarioId = String(venta.UsuarioId ?? venta.VentaUsuario ?? "").trim() || "-";

        totalVentas += Number(venta.Total);
        if (venta.VentaTipo === "CO") totalEfectivo += Number(venta.Total);
        else if (venta.VentaTipo === "PO") totalPOS += Number(venta.Total);
        else if (venta.VentaTipo === "TR") totalTransfer += Number(venta.Total);
        else if (venta.VentaTipo === "CR") {
          totalCredito += Number(venta.Total);
          totalSaldoPendiente += Number(venta.SaldoPendiente);
        }

        if (esTodos) {
          ventasRows.push([
            venta.VentaId.toString(),
            clienteNombre,
            fechaVenta,
            tipoVenta,
            formatMiles(venta.Total),
            venta.VentaTipo === "CR" ? formatMiles(venta.SaldoPendiente) : "-",
            usuarioId,
          ]);
        } else {
          ventasRows.push([
            venta.VentaId.toString(),
            fechaVenta,
            tipoVenta,
            formatMiles(venta.Total),
            venta.VentaTipo === "CR" ? formatMiles(venta.SaldoPendiente) : "-",
            usuarioId,
          ]);
        }

        // Si es crédito y tiene pagos, agregar información de pagos
        if (venta.VentaTipo === "CR" && venta.Pagos && venta.Pagos.length > 0) {
          venta.Pagos.forEach((pago) => {
            const fechaPago = formatearFechaHora(pago.VentaCreditoPagoFecha);
            if (esTodos) {
              ventasRows.push(["", "", fechaPago, `  Pago ${pago.VentaCreditoPagoId}`, formatMiles(pago.VentaCreditoPagoMonto), "", ""]);
            } else {
              ventasRows.push(["", fechaPago, `  Pago ${pago.VentaCreditoPagoId}`, formatMiles(pago.VentaCreditoPagoMonto), "", ""]);
            }
          });
        }
      });

      const tableHead = esTodos
        ? [["ID", "CLIENTE", "FECHA", "TIPO", "TOTAL", "SALDO PEND.", "USUARIO"]]
        : [["ID", "FECHA", "TIPO", "TOTAL", "SALDO PEND.", "USUARIO"]];

      const columnStyles: Record<number, { cellWidth: number }> = esTodos
        ? {
            0: { cellWidth: 18 },
            1: { cellWidth: 45 },
            2: { cellWidth: 28 },
            3: { cellWidth: 28 },
            4: { cellWidth: 32 },
            5: { cellWidth: 35 },
            6: { cellWidth: 25 },
          }
        : {
            0: { cellWidth: 18 },
            1: { cellWidth: 28 },
            2: { cellWidth: 28 },
            3: { cellWidth: 32 },
            4: { cellWidth: 35 },
            5: { cellWidth: 25 },
          };

      autoTable(doc, {
        head: tableHead,
        body: ventasRows,
        startY: y,
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: esTodos ? 9 : 10 },
        margin: { left: 14, right: 14 },
        columnStyles,
      });

      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      // Totales generales y por tipo (como Reporte de cierre de caja)
      doc.setFontSize(12);
      doc.text("TOTALES", 14, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(`Total Ventas: Gs. ${formatMiles(totalVentas)}`, 14, y);
      y += 6;
      doc.text(
        `Efectivo: ${formatMiles(totalEfectivo)} | POS: ${formatMiles(totalPOS)} | Transfer: ${formatMiles(totalTransfer)} | Crédito: ${formatMiles(totalCredito)}`,
        14,
        y,
      );
      y += 6;
      if (totalSaldoPendiente > 0) {
        doc.text(
          `Total Saldo Pendiente: Gs. ${formatMiles(totalSaldoPendiente)}`,
          14,
          y,
        );
      }

      const nombreArchivo = `reporte_ventas_${esTodos ? "todos" : reporte.cliente.ClienteId}_${fechaDesde}_${fechaHasta}.pdf`;
      doc.save(nombreArchivo);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message ||
          "Error al generar el reporte de ventas",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarReporteStock = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/productos/reporte-stock");
      const data = res.data?.data;
      const productos: ProductoStockReporte[] = Array.isArray(data?.productos)
        ? data.productos
        : [];

      // Para cada producto calculo:
      //   totalUnidades  = stockCajas * cantCaja + stockUnitario
      //   precioUnitario = precioPromedio / cantCaja (si cantCaja > 0)
      //   valorStock     = stockCajas * precioPromedio +
      //                    stockUnitario * precioUnitario
      // Solo se listan productos con stock > 0, ordenados por valor DESC.
      const enriquecidos = productos
        .map((p) => {
          const cantCaja = Number(p.ProductoCantidadCaja) || 0;
          const stockCajas = Number(p.ProductoStock) || 0;
          const stockUni = Number(p.ProductoStockUnitario) || 0;
          const precioCajaCosto = Number(p.ProductoPrecioPromedio) || 0;
          const precioUniCosto =
            cantCaja > 0 ? precioCajaCosto / cantCaja : 0;
          const totalUnidades = stockCajas * cantCaja + stockUni;
          const valorStock =
            stockCajas * precioCajaCosto + stockUni * precioUniCosto;
          return {
            p,
            cantCaja,
            stockCajas,
            stockUni,
            totalUnidades,
            precioCajaCosto,
            precioUniCosto,
            valorStock,
          };
        })
        .filter((r) => r.totalUnidades > 0)
        .sort((a, b) => b.valorStock - a.valorStock);

      const capitalTotal = enriquecidos.reduce((acc, r) => acc + r.valorStock, 0);
      const totalCajas = enriquecidos.reduce((acc, r) => acc + r.stockCajas, 0);
      const totalUnidadesSueltas = enriquecidos.reduce(
        (acc, r) => acc + r.stockUni,
        0,
      );

      const { jsPDF, autoTable } = await loadPdf();
      const doc = new jsPDF({ orientation: "landscape" });
      let y = 18;

      doc.setFontSize(16);
      doc.text("Reporte de stock valorizado", 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(
        `Generado: ${new Date().toLocaleDateString("es-PY")} — ${enriquecidos.length} producto(s) con stock`,
        14,
        y,
      );
      y += 4;

      if (enriquecidos.length === 0) {
        doc.setFontSize(11);
        doc.text("No hay productos con stock.", 14, y + 8);
      } else {
        const tableRows: (string | { content: string; styles?: object })[][] = [];
        enriquecidos.forEach((r, idx) => {
          const { p } = r;
          tableRows.push([
            String(idx + 1),
            String(p.ProductoCodigo ?? ""),
            String(p.ProductoNombre ?? ""),
            r.cantCaja ? String(r.cantCaja) : "-",
            `${formatMiles(r.stockCajas)} cj / ${formatMiles(r.stockUni)} un`,
            formatMiles(r.totalUnidades),
            formatMiles(r.precioCajaCosto),
            formatMiles(r.valorStock),
          ]);
          (p.productoAlmacen || [])
            .filter(
              (pa) =>
                (pa.ProductoAlmacenStock ?? 0) > 0 ||
                (pa.ProductoAlmacenStockUnitario ?? 0) > 0,
            )
            .forEach((pa) => {
              tableRows.push([
                "",
                "",
                {
                  content: `   · ${pa.AlmacenNombre ?? ""}`,
                  styles: { textColor: [90, 90, 90], fontStyle: "italic" },
                },
                "",
                {
                  content: `${formatMiles(pa.ProductoAlmacenStock ?? 0)} cj / ${formatMiles(pa.ProductoAlmacenStockUnitario ?? 0)} un`,
                  styles: { textColor: [90, 90, 90], fontStyle: "italic" },
                },
                "",
                "",
                "",
              ]);
            });
        });

        autoTable(doc, {
          head: [
            [
              "#",
              "Código",
              "Producto",
              "Cant. caja",
              "Stock (cj/un)",
              "Total unid.",
              "P. costo caja",
              "Valor stock",
            ],
          ],
          body: tableRows,
          startY: y + 4,
          theme: "grid",
          headStyles: { fillColor: [29, 78, 216], fontSize: 9 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 10, halign: "right" },
            1: { cellWidth: 32 },
            2: { cellWidth: "auto" },
            3: { cellWidth: 18, halign: "right" },
            4: { cellWidth: 34, halign: "right" },
            5: { cellWidth: 22, halign: "right" },
            6: { cellWidth: 28, halign: "right" },
            7: { cellWidth: 32, halign: "right" },
          },
        });

        y =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
            .finalY + 10;

        const pageHeight = doc.internal.pageSize.getHeight();
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 18;
        }

        doc.setFontSize(13);
        doc.text("RESUMEN", 14, y);
        y += 7;
        doc.setFontSize(10);
        doc.text(
          `Productos con stock: ${enriquecidos.length}`,
          14,
          y,
        );
        y += 6;
        doc.text(
          `Total cajas: ${formatMiles(totalCajas)} cj — Total unidades sueltas: ${formatMiles(totalUnidadesSueltas)} un`,
          14,
          y,
        );
        y += 8;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(
          `CAPITAL INMOVILIZADO EN STOCK: Gs. ${formatMiles(capitalTotal)}`,
          14,
          y,
        );
        doc.setFont("helvetica", "normal");
      }

      const nombreArchivo = `reporte_stock_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      doc.save(nombreArchivo);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(
        error.response?.data?.message || "Error al generar el reporte de stock",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarReporteMovimientos = async () => {
    if (!fechaDesdeMov || !fechaHastaMov) {
      setError("Debes seleccionar ambas fechas");
      return;
    }
    if (new Date(fechaDesdeMov) > new Date(fechaHastaMov)) {
      setError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getReporteMovimientosProductos(
        fechaDesdeMov,
        fechaHastaMov,
      );
      const productos: ProductoMovimientoRow[] = data?.productos ?? [];

      const { jsPDF, autoTable } = await loadPdf();
      const doc = new jsPDF({ orientation: "landscape" });
      let y = 18;

      // Título y período
      doc.setFontSize(16);
      doc.text("Reporte de productos vendidos y comprados", 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(
        `Período: ${formatearFecha(fechaDesdeMov)} al ${formatearFecha(fechaHastaMov)}`,
        14,
        y,
      );
      y += 6;

      if (productos.length === 0) {
        doc.setFontSize(11);
        doc.text("Sin movimientos en el período seleccionado.", 14, y + 6);
      } else {
        // Formatea "5 cj / 12 un". Si una parte es 0, igual se muestra para
        // mantener alineación visual entre filas.
        const fmtCjUn = (cajas: number, unidades: number) =>
          `${formatMiles(cajas)} cj / ${formatMiles(unidades)} un`;

        // Filas: una por producto
        const rows = productos.map((p) => {
          const ganancia = p.MontoVendido - p.CostoVendido;
          const margen =
            p.MontoVendido > 0 ? (ganancia / p.MontoVendido) * 100 : 0;
          return [
            String(p.ProductoCodigo ?? ""),
            String(p.ProductoNombre ?? ""),
            fmtCjUn(p.CantidadVendidaCajas, p.CantidadVendidaUnidades),
            fmtCjUn(p.CantidadCompradaCajas, p.CantidadCompradaUnidades),
            formatMiles(p.MontoVendido),
            formatMiles(p.CostoVendido),
            formatMiles(ganancia),
            `${margen.toFixed(1)}%`,
          ];
        });

        autoTable(doc, {
          head: [
            [
              "Código",
              "Producto",
              "Cant. vend. (cj/un)",
              "Cant. comp. (cj/un)",
              "Monto venta",
              "Costo venta",
              "Ganancia",
              "Margen",
            ],
          ],
          body: rows,
          startY: y + 2,
          theme: "grid",
          headStyles: { fillColor: [29, 78, 216], fontSize: 9 }, // brand-700
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: "auto" },
            2: { cellWidth: 32, halign: "right" },
            3: { cellWidth: 32, halign: "right" },
            4: { cellWidth: 28, halign: "right" },
            5: { cellWidth: 28, halign: "right" },
            6: { cellWidth: 28, halign: "right" },
            7: { cellWidth: 18, halign: "right" },
          },
        });

        y =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
            .finalY + 10;

        // Totales generales
        const totales = productos.reduce(
          (acc, p) => {
            acc.cantidadVendidaCajas += p.CantidadVendidaCajas;
            acc.cantidadVendidaUnidades += p.CantidadVendidaUnidades;
            acc.cantidadCompradaCajas += p.CantidadCompradaCajas;
            acc.cantidadCompradaUnidades += p.CantidadCompradaUnidades;
            acc.montoVendido += p.MontoVendido;
            acc.costoVendido += p.CostoVendido;
            acc.montoComprado += p.MontoComprado;
            return acc;
          },
          {
            cantidadVendidaCajas: 0,
            cantidadVendidaUnidades: 0,
            cantidadCompradaCajas: 0,
            cantidadCompradaUnidades: 0,
            montoVendido: 0,
            costoVendido: 0,
            montoComprado: 0,
          },
        );
        const gananciaTotal = totales.montoVendido - totales.costoVendido;
        const margenPromedio =
          totales.montoVendido > 0
            ? (gananciaTotal / totales.montoVendido) * 100
            : 0;

        // Si no entra el resumen en la página actual, salto a una nueva
        const pageHeight = doc.internal.pageSize.getHeight();
        if (y > pageHeight - 60) {
          doc.addPage();
          y = 18;
        }

        doc.setFontSize(13);
        doc.text("RESUMEN GENERAL", 14, y);
        y += 7;
        doc.setFontSize(10);
        doc.text(
          `Productos con movimiento     : ${productos.length}`,
          14,
          y,
        );
        y += 6;
        doc.text(
          `Cantidad vendida (cj / un)   : ${formatMiles(totales.cantidadVendidaCajas)} cj / ${formatMiles(totales.cantidadVendidaUnidades)} un`,
          14,
          y,
        );
        y += 6;
        doc.text(
          `Cantidad comprada (cj / un)  : ${formatMiles(totales.cantidadCompradaCajas)} cj / ${formatMiles(totales.cantidadCompradaUnidades)} un`,
          14,
          y,
        );
        y += 6;
        doc.text(
          `Monto total ventas       : Gs. ${formatMiles(totales.montoVendido)}`,
          14,
          y,
        );
        y += 6;
        doc.text(
          `Costo total ventas       : Gs. ${formatMiles(totales.costoVendido)}`,
          14,
          y,
        );
        y += 6;
        doc.text(
          `Monto total compras      : Gs. ${formatMiles(totales.montoComprado)}`,
          14,
          y,
        );
        y += 6;
        doc.setFontSize(11);
        doc.text(
          `Ganancia total           : Gs. ${formatMiles(gananciaTotal)}   |   Margen promedio: ${margenPromedio.toFixed(1)}%`,
          14,
          y,
        );
      }

      const nombreArchivo = `reporte_movimientos_productos_${fechaDesdeMov}_${fechaHastaMov}.pdf`;
      doc.save(nombreArchivo);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      const e = err as { message?: string };
      setError(
        e?.message || "Error al generar el reporte de productos vendidos/comprados",
      );
    } finally {
      setLoading(false);
    }
  };

  // Convierte un total de unidades a "cajas + unidades" usando cantidadCaja.
  // Ej: 15 unidades con cantidadCaja=12 → 1 caja y 3 unidades.
  const dividirEnCajasYUnidades = (
    totalUnidades: number,
    cantidadCaja: number,
  ): { cajas: number; unidades: number } => {
    if (!cantidadCaja || cantidadCaja <= 0) {
      return { cajas: 0, unidades: Math.trunc(totalUnidades) };
    }
    const total = Math.trunc(totalUnidades);
    const cajas = Math.trunc(total / cantidadCaja);
    const unidades = total - cajas * cantidadCaja;
    return { cajas, unidades };
  };

  const handleGenerarReporteMasVendidos = async () => {
    if (!fechaDesdeTop || !fechaHastaTop) {
      setError("Debes seleccionar ambas fechas");
      return;
    }
    if (new Date(fechaDesdeTop) > new Date(fechaHastaTop)) {
      setError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getReporteMasVendidos(fechaDesdeTop, fechaHastaTop);
      const productos: ProductoMasVendidoRow[] = data?.productos ?? [];

      const { jsPDF, autoTable } = await loadPdf();
      const doc = new jsPDF({ orientation: "landscape" });
      let y = 18;

      doc.setFontSize(16);
      doc.text("Reporte de productos más vendidos", 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.text(
        `Período: ${formatearFecha(fechaDesdeTop)} al ${formatearFecha(fechaHastaTop)}`,
        14,
        y,
      );
      y += 6;

      if (productos.length === 0) {
        doc.setFontSize(11);
        doc.text("Sin ventas en el período seleccionado.", 14, y + 6);
      } else {
        const fmtCjUn = (cajas: number, unidades: number) =>
          `${formatMiles(cajas)} cj / ${formatMiles(unidades)} un`;

        const rows = productos.map((p, idx) => {
          const vendido = dividirEnCajasYUnidades(
            p.CantidadVendidaTotalUnidades,
            p.ProductoCantidadCaja,
          );
          const ganancia = p.MontoVendido - p.CostoVendido;
          return [
            String(idx + 1),
            String(p.ProductoCodigo ?? ""),
            String(p.ProductoNombre ?? ""),
            fmtCjUn(vendido.cajas, vendido.unidades),
            formatMiles(p.ProductoPrecioVenta),
            formatMiles(p.ProductoPrecioPromedio),
            formatMiles(ganancia),
            fmtCjUn(p.ProductoStock, p.ProductoStockUnitario),
          ];
        });

        autoTable(doc, {
          head: [
            [
              "#",
              "Código",
              "Producto",
              "Cant. vendida (cj/un)",
              "Precio venta",
              "Precio costo",
              "Ganancia",
              "Stock actual (cj/un)",
            ],
          ],
          body: rows,
          startY: y + 2,
          theme: "grid",
          headStyles: { fillColor: [29, 78, 216], fontSize: 9 },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 },
          columnStyles: {
            0: { cellWidth: 10, halign: "right" },
            1: { cellWidth: 32 },
            2: { cellWidth: "auto" },
            3: { cellWidth: 34, halign: "right" },
            4: { cellWidth: 26, halign: "right" },
            5: { cellWidth: 26, halign: "right" },
            6: { cellWidth: 28, halign: "right" },
            7: { cellWidth: 34, halign: "right" },
          },
        });

        y =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
            .finalY + 10;

        const totales = productos.reduce(
          (acc, p) => {
            acc.totalUnidades += p.CantidadVendidaTotalUnidades;
            acc.montoVendido += p.MontoVendido;
            acc.costoVendido += p.CostoVendido;
            return acc;
          },
          { totalUnidades: 0, montoVendido: 0, costoVendido: 0 },
        );
        const gananciaTotal = totales.montoVendido - totales.costoVendido;

        const pageHeight = doc.internal.pageSize.getHeight();
        if (y > pageHeight - 40) {
          doc.addPage();
          y = 18;
        }

        doc.setFontSize(13);
        doc.text("RESUMEN", 14, y);
        y += 7;
        doc.setFontSize(10);
        doc.text(`Productos vendidos: ${productos.length}`, 14, y);
        y += 6;
        doc.text(
          `Total unidades vendidas: ${formatMiles(totales.totalUnidades)} un`,
          14,
          y,
        );
        y += 6;
        doc.text(
          `Monto total ventas: Gs. ${formatMiles(totales.montoVendido)}`,
          14,
          y,
        );
        y += 6;
        doc.text(
          `Costo total ventas: Gs. ${formatMiles(totales.costoVendido)}`,
          14,
          y,
        );
        y += 6;
        doc.setFontSize(11);
        doc.text(
          `Ganancia total: Gs. ${formatMiles(gananciaTotal)}`,
          14,
          y,
        );
      }

      const nombreArchivo = `reporte_mas_vendidos_${fechaDesdeTop}_${fechaHastaTop}.pdf`;
      doc.save(nombreArchivo);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      const e = err as { message?: string };
      setError(
        e?.message || "Error al generar el reporte de productos más vendidos",
      );
    } finally {
      setLoading(false);
    }
  };

  const generarReporteCierre = async () => {
    if (!fechaDesdeCierre || !fechaHastaCierre) {
      setError("Seleccione fecha desde y hasta");
      return;
    }
    if (new Date(fechaDesdeCierre) > new Date(fechaHastaCierre)) {
      setError("La fecha desde no puede ser mayor que la fecha hasta");
      return;
    }
    setLoading(true);
    setError(null);
    setResumenesCierre([]);
    setPaginaCierre(1);
    try {
      const { data } = await getRegistrosDiariosCajaPorRango(
        fechaDesdeCierre,
        fechaHastaCierre,
      );
      const lista = Array.isArray(data) ? data : [];
      const res = buildResumenesCierre(
        lista,
        fechaDesdeCierre,
        fechaHastaCierre,
      );
      setResumenesCierre(res);
    } catch (e) {
      setError(
        (e as { message?: string })?.message ??
          "Error al cargar registros por rango de fechas",
      );
    } finally {
      setLoading(false);
    }
  };


  const exportarCierrePDF = async () => {
    if (resumenesCierre.length === 0) return;
    const { jsPDF, autoTable } = await loadPdf();
    const doc = new jsPDF({ orientation: "landscape", format: "a4" });
    doc.setFontSize(14);
    doc.text(
      `Reporte de cierre de caja - ${formatDateDDMMYYYY(fechaDesdeCierre)} a ${formatDateDDMMYYYY(fechaHastaCierre)}`,
      14,
      14,
    );
    const rows = resumenesCierre.map((r) => [
      r.fechaCierre,
      r.cajaDescripcion,
      r.usuarioId,
      formatMiles(r.apertura),
      formatMiles(r.cierre),
      formatMiles(r.egresos),
      formatMiles(r.ingresos),
      formatMiles(r.ingresosPOS),
      formatMiles(r.ingresosVoucher),
      formatMiles(r.ingresosTransfer),
      formatMiles(r.totalIngresos),
      formatMiles(r.diferencia),
      formatMiles(r.sobranteFaltante),
    ]);
    autoTable(doc, {
      head: [
        [
          "Fecha cierre",
          "Caja",
          "Usuario",
          "Apertura",
          "Cierre",
          "Egresos",
          "Ing.Efect.",
          "POS",
          "Voucher",
          "Transfer",
          "Total ing.",
          "Diferencia",
          "S/F",
        ],
      ],
      body: rows,
      startY: 22,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      styles: { fontSize: 7 },
      margin: { left: 14, right: 14 },
    });
    let y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 10;
    doc.setFontSize(11);
    doc.text("TOTALES", 14, y);
    y += 5;
    doc.setFontSize(8);
    doc.text("Suma de todos los registros del período", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(
      `Total registros: ${resumenesCierre.length} | Total ingresos: ${formatMiles(
        totalesGeneralesCierre.totalIngresos,
      )} | Total egresos: ${formatMiles(totalesGeneralesCierre.egresos)}`,
      14,
      y,
    );
    y += 6;
    doc.setFontSize(9);
    doc.text(
      `Ing. efectivo: ${formatMiles(
        totalesGeneralesCierre.ingresos,
      )} | POS: ${formatMiles(
        totalesGeneralesCierre.ingresosPOS,
      )} | Voucher: ${formatMiles(
        totalesGeneralesCierre.ingresosVoucher,
      )} | Transfer: ${formatMiles(totalesGeneralesCierre.ingresosTransfer)}`,
      14,
      y,
    );

    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `reporte_cierre_caja_${fechaDesdeCierre}_${fechaHastaCierre}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    const openLink = document.createElement("a");
    openLink.href = pdfUrl;
    openLink.target = "_blank";
    document.body.appendChild(openLink);
    openLink.click();
    document.body.removeChild(openLink);
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 2000);
  };

  // Metadata de las tarjetas (para grid + abrir modal)
  const renderCard = (
    titulo: string,
    descripcion: string,
    icono: string,
    accent: string,
    onClick: () => void,
  ) => (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-left bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:${accent} hover:shadow-md transition group disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl leading-none mt-0.5">{icono}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">
            {titulo}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {descripcion}
          </p>
        </div>
      </div>
    </button>
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
        <p className="text-sm text-slate-500 mt-1">
          Elegí un reporte para generarlo en PDF.
        </p>
      </div>

      {error && (
        <div className="text-red-700 bg-red-50 border border-red-200 p-3 rounded-md mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* === Sección Ventas y Stock === */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ventas y stock
            </h2>
            <span className="text-xs text-slate-400">5 reportes</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {renderCard(
              "Stock valorizado",
              "Productos con stock + capital inmovilizado a precio de costo. Desglose por almacén.",
              "📦",
              "border-teal-300",
              () => {
                setError(null);
                handleGenerarReporteStock();
              },
            )}
            {renderCard(
              "Créditos pendientes",
              "Lista de saldos a cobrar por cliente con totales por venta.",
              "💳",
              "border-green-300",
              () => {
                setError(null);
                handleGenerarPDF();
              },
            )}
            {renderCard(
              "Ventas por cliente",
              "Detalle de ventas por cliente (o todos), con pagos de crédito y totales por tipo.",
              "🧾",
              "border-blue-300",
              () => {
                setError(null);
                setReporteActivo("ventas");
              },
            )}
            {renderCard(
              "Productos vendidos y comprados",
              "Por período: cantidades, monto facturado, costo, ganancia y margen %.",
              "🔁",
              "border-blue-300",
              () => {
                setError(null);
                setReporteActivo("movimientos");
              },
            )}
            {renderCard(
              "Productos más vendidos",
              "Ranking de productos por cantidad vendida con precio venta, costo y stock actual.",
              "🏆",
              "border-indigo-300",
              () => {
                setError(null);
                setReporteActivo("masvendidos");
              },
            )}
          </div>
        </section>

        {/* === Sección Caja === */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Caja
            </h2>
            <span className="text-xs text-slate-400">1 reporte</span>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-2xl leading-none">💼</div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm">
                  Cierre de caja por rango
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Apertura, ingresos por método, egresos y diferencia de cada cierre del período.
                </p>
              </div>
            </div>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={fechaDesdeCierre}
                onChange={(e) => setFechaDesdeCierre(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={fechaHastaCierre}
                onChange={(e) => setFechaHastaCierre(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-1.5 px-4 rounded-md shadow-sm transition disabled:opacity-50"
              onClick={generarReporteCierre}
              disabled={loading}
            >
              {loading ? "Cargando…" : "Generar"}
            </button>
            {resumenesCierre.length > 0 && (
              <button
                className="bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold py-1.5 px-4 rounded-md shadow-sm transition"
                onClick={exportarCierrePDF}
              >
                Exportar PDF
              </button>
            )}
          </div>

          {resumenesCierre.length > 0 && (
            <>
              <p className="text-xs text-slate-500 mb-2">
                {resumenesCierre.length} cierre(s) en el período. Página{" "}
                {paginaCierre} de {totalPaginasCierre}.
              </p>
              <div className="overflow-x-auto -mx-2 mb-4">
                <table className="w-full border-collapse text-sm min-w-[900px]">
                  <thead className="sticky top-0 bg-slate-100 z-10">
                    <tr className="border-b border-slate-300">
                      <th className="text-left py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Fecha cierre
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Caja
                      </th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Usuario
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Apertura
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Cierre
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Egresos
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Ing. Efectivo
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        POS
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Voucher
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Transfer
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Total ing.
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Diferencia
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-800 whitespace-nowrap">
                        Sobrante/Faltante
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenesPaginados.map((r, idx) => (
                      <tr
                        key={`${r.fechaCierre}-${r.cajaId}-${r.usuarioId}-${idx}`}
                        className="border-b border-slate-200 hover:bg-slate-50"
                      >
                        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">
                          {r.fechaCierre}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">
                          {r.cajaDescripcion}
                        </td>
                        <td className="py-1.5 px-2 whitespace-nowrap text-slate-700">
                          {r.usuarioId}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.apertura)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.cierre)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.egresos)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.ingresos)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.ingresosPOS)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.ingresosVoucher)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.ingresosTransfer)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.totalIngresos)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {formatMiles(r.diferencia)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-700">
                          {r.sobranteFaltante > 0
                            ? `Falt. ${formatMiles(r.sobranteFaltante)}`
                            : r.sobranteFaltante < 0
                              ? `Sobr. ${formatMiles(-r.sobranteFaltante)}`
                              : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPaginasCierre > 1 && (
                <div className="flex items-center justify-between mb-4">
                  <button
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50"
                    onClick={() => setPaginaCierre((p) => Math.max(1, p - 1))}
                    disabled={paginaCierre <= 1}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-slate-600">
                    Página {paginaCierre} de {totalPaginasCierre}
                  </span>
                  <button
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50"
                    onClick={() =>
                      setPaginaCierre((p) =>
                        Math.min(totalPaginasCierre, p + 1),
                      )
                    }
                    disabled={paginaCierre >= totalPaginasCierre}
                  >
                    Siguiente
                  </button>
                </div>
              )}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-1">TOTALES</h3>
                <p className="text-slate-500 text-xs mb-3">
                  Suma de todos los registros del período
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Ingresos efectivo:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGeneralesCierre.ingresos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">POS:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGeneralesCierre.ingresosPOS)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Voucher:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGeneralesCierre.ingresosVoucher)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Transfer:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGeneralesCierre.ingresosTransfer)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total ingresos:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGeneralesCierre.totalIngresos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total egresos:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGeneralesCierre.egresos)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Diferencia:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatMiles(totalesGeneralesCierre.diferencia)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
          </div>
        </section>
      </div>

      {/* Loading overlay durante generación */}
      {loading && (
        <div className="fixed top-4 right-4 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-md shadow-lg z-50">
          Generando reporte…
        </div>
      )}

      {/* Modal de configuración de reportes */}
      {reporteActivo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4"
          onClick={() => !loading && setReporteActivo(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {reporteActivo === "ventas" && "Ventas por cliente"}
                {reporteActivo === "movimientos" && "Productos vendidos y comprados"}
                {reporteActivo === "masvendidos" && "Productos más vendidos"}
              </h3>
              <button
                onClick={() => setReporteActivo(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none p-0 w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {reporteActivo === "ventas" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cliente
                  </label>
                  <select
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                    value={clienteSeleccionado}
                    onChange={(e) => setClienteSeleccionado(e.target.value)}
                    disabled={loading}
                  >
                    <option value="TODOS">TODOS</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.ClienteId} value={cliente.ClienteId}>
                        {cliente.ClienteNombre} {cliente.ClienteApellido}
                        {cliente.ClienteRUC ? ` - ${cliente.ClienteRUC}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerarReporteVentas}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {loading ? "Generando…" : "Generar PDF"}
                </button>
              </div>
            )}

            {reporteActivo === "movimientos" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={fechaDesdeMov}
                      onChange={(e) => setFechaDesdeMov(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={fechaHastaMov}
                      onChange={(e) => setFechaHastaMov(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerarReporteMovimientos}
                  disabled={loading}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {loading ? "Generando…" : "Generar PDF"}
                </button>
              </div>
            )}

            {reporteActivo === "masvendidos" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Desde
                    </label>
                    <input
                      type="date"
                      value={fechaDesdeTop}
                      onChange={(e) => setFechaDesdeTop(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Hasta
                    </label>
                    <input
                      type="date"
                      value={fechaHastaTop}
                      onChange={(e) => setFechaHastaTop(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerarReporteMasVendidos}
                  disabled={loading}
                  className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-semibold py-2 rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {loading ? "Generando…" : "Generar PDF"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesPage;
