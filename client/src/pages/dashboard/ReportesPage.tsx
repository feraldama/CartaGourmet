import React, { useMemo, useState, useEffect } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../../services/api";
import { formatMiles } from "../../utils/utils";
import { getAllClientesSinPaginacion } from "../../services/clientes.service";
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

  if (!puedeLeer) return <div>No tienes permiso para ver los reportes</div>;

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

      const productosOrdenados = [...productos].sort((a, b) =>
        String(a.ProductoNombre ?? "").localeCompare(
          String(b.ProductoNombre ?? ""),
        ),
      );

      const doc = new jsPDF({ orientation: "landscape" });
      let y = 20;

      doc.setFontSize(18);
      doc.text("Reporte de stock total y por almacén", 14, y);
      y += 10;

      const tableRows: string[][] = [];
      productosOrdenados.forEach((p: ProductoStockReporte) => {
        tableRows.push([
          String(p.ProductoCodigo ?? ""),
          String(p.ProductoNombre ?? ""),
          String(p.ProductoStock ?? 0),
          String(p.ProductoStockUnitario ?? 0),
        ]);
        (p.productoAlmacen || []).forEach((pa: ProductoAlmacenStock) => {
          tableRows.push([
            "",
            `  - ${pa.AlmacenNombre ?? ""}`,
            String(pa.ProductoAlmacenStock ?? 0),
            String(pa.ProductoAlmacenStockUnitario ?? 0),
          ]);
        });
      });

      autoTable(doc, {
        head: [["Código", "Producto", "Stock (cajas)", "Stock unitario"]],
        body: tableRows.length > 0 ? tableRows : [["Sin datos", "", "", ""]],
        startY: y,
        theme: "grid",
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: "auto" },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
        },
      });

      y =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 10;

      doc.setFontSize(10);
      doc.text(
        `Total productos: ${
          productosOrdenados.length
        } — Generado: ${new Date().toLocaleDateString("es-PY")}`,
        14,
        y,
      );

      const nombreArchivo = `reporte_stock_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      doc.save(nombreArchivo);

      // Abrir en nueva pestaña con blob URL (evita límite de data URL y muestra el PDF correctamente)
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

  const exportarCierrePDF = () => {
    if (resumenesCierre.length === 0) return;
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Reportes</h1>
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        {/* Reporte de Stock total y por almacén */}
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Stock total y por almacén
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Lista todos los productos con su stock total (cajas y unitario) y el
            desglose por cada almacén.
          </p>
          <button
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarReporteStock}
            disabled={loading}
          >
            GENERAR REPORTE DE STOCK
          </button>
        </div>

        {/* Reporte de Créditos Pendientes */}
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Créditos Pendientes a Cobrar
          </h2>
          <button
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarPDF}
            disabled={loading}
          >
            GENERAR REPORTE
          </button>
        </div>

        {/* Reporte de Ventas por Cliente */}
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Reporte de Ventas por Cliente
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Desde
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg text-lg shadow transition disabled:opacity-50"
              onClick={handleGenerarReporteVentas}
              disabled={loading}
            >
              GENERAR REPORTE
            </button>
          </div>
        </div>

        {/* Reporte de cierre de caja por rango de fechas */}
        <div className="w-full bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">
            Reporte de cierre de caja por rango de fechas
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Obtenga la misma información del cierre diario para un período (ej.
            julio a octubre 2025). Seleccione el rango y genere el reporte.
          </p>
          <div className="flex flex-wrap items-end gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={fechaDesdeCierre}
                onChange={(e) => setFechaDesdeCierre(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={fechaHastaCierre}
                onChange={(e) => setFechaHastaCierre(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
              />
            </div>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition disabled:opacity-50"
              onClick={generarReporteCierre}
              disabled={loading}
            >
              {loading ? "Cargando…" : "Generar reporte"}
            </button>
            {resumenesCierre.length > 0 && (
              <button
                className="bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-6 rounded-lg shadow transition"
                onClick={exportarCierrePDF}
              >
                Exportar a PDF
              </button>
            )}
          </div>

          {resumenesCierre.length > 0 && (
            <>
              <p className="text-sm text-gray-500 mb-2">
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

        {loading && (
          <div className="text-center text-gray-600">Generando PDF...</div>
        )}
        {error && (
          <div className="text-red-600 bg-red-50 p-4 rounded-lg w-full">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportesPage;
