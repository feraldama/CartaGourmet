import { useEffect, useState } from "react";
import { getCajas } from "../../services/cajas.service";
import ActionButton from "../../components/common/Button/ActionButton";
import MoneyInput from "../../components/common/Input/MoneyInput";
import { LoadingState, PermissionDenied } from "../../components/common/ui";
import { usePermiso } from "../../hooks/usePermiso";
import {
  aperturaCierreCaja,
  getEstadoAperturaPorUsuario,
} from "../../services/registrodiariocaja.service";
import { useAuth } from "../../contexts/useAuth";
import Swal from "sweetalert2";
import { formatMiles } from "../../utils/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { loadPdf } from "../../utils/lazyPdf";
import { getRegistrosDiariosCaja } from "../../services/registros.service";
import { getVentasPaginated, type Venta } from "../../services/venta.service";

import type { Caja } from "../../types";

interface RegistroDiarioCaja {
  RegistroDiarioCajaId: number;
  CajaId: number;
  UsuarioId: string;
  RegistroDiarioCajaFecha: string;
  RegistroDiarioCajaMonto: number;
  TipoGastoId: number;
  TipoGastoGrupoId: number;
}

// Estructura mínima de un documento jsPDF para emitir el PDF.
type PdfDoc = { output: (type: "blob") => Blob };

// Normaliza un timestamp del API a "YYYY-MM-DD HH:MM:SS" para comparar contra
// la columna VentaFecha. Si el string ya viene sin zona horaria se respeta tal
// cual; si trae zona (Z u offset) se convierte a la hora local del navegador.
function toSqlDateTime(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (m && !/([zZ]|[+-]\d{2}:?\d{2})$/.test(value)) {
    const [, y, mo, d, hh, mm, ss = "00"] = m;
    return `${y}-${mo}-${d} ${hh}:${mm}:${ss}`;
  }
  const dt = new Date(value);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())} ${p(
    dt.getHours()
  )}:${p(dt.getMinutes())}:${p(dt.getSeconds())}`;
}

// Descarga (y opcionalmente abre) un PDF generado en memoria.
function descargarYAbrirPDF(doc: PdfDoc, filename: string, abrir = false) {
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  const link = document.createElement("a");
  link.href = pdfUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (abrir) {
    setTimeout(() => {
      const openLink = document.createElement("a");
      openLink.href = pdfUrl;
      openLink.target = "_blank";
      document.body.appendChild(openLink);
      openLink.click();
      document.body.removeChild(openLink);
    }, 500);
  }

  setTimeout(() => URL.revokeObjectURL(pdfUrl), 2000);
}

export default function AperturaCierreCajaPage() {
  const [tipo, setTipo] = useState<"0" | "1">("0");
  const [tipoDisabled, setTipoDisabled] = useState(false);
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [cajaId, setCajaId] = useState<string | number>("");
  const [monto, setMonto] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cajaDisabled, setCajaDisabled] = useState(false);
  const [registrosCaja, setRegistrosCaja] = useState<RegistroDiarioCaja[]>([]);
  const [descargarPDF, setDescargarPDF] = useState(false);
  const [operacionCompletada, setOperacionCompletada] = useState(false);

  useEffect(() => {
    const fetchCajas = async () => {
      try {
        setLoading(true);
        const data = await getCajas(1, 100);
        setCajas(data.data);
        // No establecer caja por defecto, el usuario debe seleccionar
      } catch {
        setError("Error al cargar cajas");
      } finally {
        setLoading(false);
      }
    };
    fetchCajas();
  }, []);

  useEffect(() => {
    // Lógica para detectar si el usuario tiene una caja aperturada
    const checkCajaAperturada = async () => {
      if (!user) return;
      try {
        const data = await getEstadoAperturaPorUsuario(user.id);
        // Si apertura > cierre, forzar cierre y deshabilitar el select de tipo y de caja
        if (data.aperturaId > data.cierreId) {
          setTipo("1"); // Cierre
          setTipoDisabled(true);
          setCajaDisabled(true); // Solo puede cerrar la caja que tiene abierta
          if (data.cajaId) setCajaId(data.cajaId);
        } else {
          // No tiene ninguna caja abierta, forzar apertura y deshabilitar solo el select de tipo
          setTipo("0");
          setTipoDisabled(true);
          setCajaDisabled(false); // Puede elegir la caja que desee
        }
      } catch {
        // Si hay error, no forzar nada
      }
    };
    checkCajaAperturada();
  }, [user, location.pathname]);

  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: "warning",
        title: "Aviso",
        text: error,
        confirmButtonColor: "#2563eb",
      });
      setError(null);
    }
  }, [error]);

  // Obtener registros de la caja al cerrar
  const fetchRegistrosCaja = async () => {
    try {
      // Traer todos los registros sin filtrar primero
      const data = await getRegistrosDiariosCaja(1, 1000, undefined, "desc");

      // Filtrar por caja y usuario
      const registrosFiltrados = data.data.filter(
        (r: RegistroDiarioCaja) =>
          r.CajaId == cajaId && r.UsuarioId === user?.id
      );

      setRegistrosCaja(registrosFiltrados);
    } catch (error) {
      console.error("Error al cargar registros:", error);
      setRegistrosCaja([]);
    }
  };

  // Función para generar el PDF
  async function generarResumenCierrePDF(
    registrosPasados?: RegistroDiarioCaja[]
  ) {
    if (!user || !cajaId) return;

    // Usar registros pasados como parámetro o cargar nuevos si no se proporcionan
    let registrosParaUsar = registrosPasados || registrosCaja;

    if (registrosParaUsar.length === 0) {
      try {
        const data = await getRegistrosDiariosCaja(1, 1000, undefined, "desc");
        const registrosFiltrados = data.data.filter(
          (r: RegistroDiarioCaja) =>
            r.CajaId == cajaId && r.UsuarioId === user?.id
        );
        registrosParaUsar = registrosFiltrados;

        if (registrosParaUsar.length === 0) {
          Swal.fire({
            icon: "warning",
            title: "No hay registros",
            text: "No se han cargado los registros de caja. Intente descargar el PDF manualmente.",
            confirmButtonColor: "#2563eb",
          });
          return;
        }
      } catch (error) {
        console.error("Error al cargar registros para PDF:", error);
        Swal.fire({
          icon: "warning",
          title: "Error al cargar registros",
          text: "No se pudieron cargar los registros de caja.",
          confirmButtonColor: "#2563eb",
        });
        return;
      }
    }

    const cajaDescripcion =
      cajas.find((c) => c.CajaId == cajaId)?.CajaDescripcion || "";
    const fecha = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString();

    // --- Nueva lógica: buscar última apertura y cierre del usuario ---
    const registros = registrosParaUsar.filter((r) => r.UsuarioId == user.id);

    // Buscar la última apertura del usuario (ordenar por ID descendente y tomar el primero)
    const aperturas = registros
      .filter((reg) => reg.TipoGastoId === 2 && reg.TipoGastoGrupoId === 2)
      .sort((a, b) => b.RegistroDiarioCajaId - a.RegistroDiarioCajaId);

    const aperturaReg = aperturas[0];
    if (!aperturaReg) {
      Swal.fire({
        icon: "warning",
        title: "No se encontró apertura",
        text: "No se encontró una apertura de caja para este usuario. Los registros pueden estar en proceso de carga.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Buscar el último cierre del usuario (ordenar por ID descendente y tomar el primero)
    const cierres = registros
      .filter((reg) => reg.TipoGastoId === 1 && reg.TipoGastoGrupoId === 2)
      .sort((a, b) => b.RegistroDiarioCajaId - a.RegistroDiarioCajaId);

    const cierreReg = cierres[0];
    if (!cierreReg) {
      Swal.fire({
        icon: "warning",
        title: "No se encontró cierre",
        text: "No se encontró un cierre de caja para este usuario.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Verificar que el cierre sea posterior a la apertura
    if (cierreReg.RegistroDiarioCajaId <= aperturaReg.RegistroDiarioCajaId) {
      Swal.fire({
        icon: "warning",
        title: "Error en registros",
        text: "El cierre debe ser posterior a la apertura. Verifique los registros.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // Filtrar los registros entre apertura y cierre (inclusive)
    const registrosFiltrados = registrosParaUsar.filter(
      (reg) =>
        reg.UsuarioId == user.id &&
        reg.RegistroDiarioCajaId >= aperturaReg.RegistroDiarioCajaId &&
        reg.RegistroDiarioCajaId <= cierreReg.RegistroDiarioCajaId
    );
    // Calcular totales
    const apertura = aperturaReg.RegistroDiarioCajaMonto;
    const cierre = cierreReg.RegistroDiarioCajaMonto;
    let egresos = 0;
    let ingresos = 0;
    let ingresosPOS = 0;
    let ingresosVoucher = 0;
    let ingresosTransfer = 0;
    for (const reg of registrosFiltrados) {
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
    const sobranteFaltante = ingresos + apertura - (cierre + egresos);
    let txtSobranteFaltante = "";
    if (sobranteFaltante > 0) {
      txtSobranteFaltante = `Faltante de: Gs. ${formatMiles(sobranteFaltante)}`;
    } else if (sobranteFaltante < 0) {
      txtSobranteFaltante = `Sobrante de: Gs. ${formatMiles(
        Math.abs(sobranteFaltante)
      )}`;
    } else {
      txtSobranteFaltante = `Sobrante/Faltante: Gs. 0`;
    }
    // --- Generar PDF ---
    const { jsPDF } = await loadPdf();
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, 200], // 80mm de ancho, 200mm de alto
    });
    doc.setFontSize(16);
    doc.text("RESUMEN CIERRE CAJA", 40, 15, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha} - Hora: ${hora}`, 10, 30);
    doc.text(`Usuario: ${user.nombre}`, 10, 38);
    doc.text(`Caja: ${cajaDescripcion}`, 10, 46);
    doc.line(10, 50, 200, 50);
    let y = 58;
    doc.text(`Apertura: ${formatMiles(apertura)}`, 10, y);
    y += 8;
    doc.text(`Cierre: ${formatMiles(cierre)}`, 10, y);
    y += 8;
    doc.line(10, y, 200, y);
    y += 8;
    doc.text(`Egresos: ${formatMiles(egresos)}`, 10, y);
    y += 8;
    doc.line(10, y, 200, y);
    y += 8;
    doc.text(`Ingresos Efectivo: ${formatMiles(ingresos)}`, 10, y);
    y += 8;
    doc.text(`Ingresos POS: ${formatMiles(ingresosPOS)}`, 10, y);
    y += 8;
    doc.text(`Ingresos Voucher: ${formatMiles(ingresosVoucher)}`, 10, y);
    y += 8;
    doc.text(`Ingresos Transfer: ${formatMiles(ingresosTransfer)}`, 10, y);
    y += 8;
    doc.line(10, y, 200, y);
    y += 8;
    const totalIngresos =
      ingresos + ingresosPOS + ingresosVoucher + ingresosTransfer;
    doc.text(`Total Ingresos: ${formatMiles(totalIngresos)}`, 10, y);
    y += 8;
    // Línea nueva para Total Egresos
    doc.text(`Total Egresos: ${formatMiles(egresos)}`, 10, y);
    y += 8;
    // Línea nueva para Diferencia
    const diferencia = totalIngresos - egresos;
    doc.text(`Diferencia: ${formatMiles(diferencia)}`, 10, y);
    y += 8;
    doc.line(10, y, 200, y);
    y += 8;
    doc.text(txtSobranteFaltante, 10, y);
    y += 12;
    doc.text("--GRACIAS POR SU PREFERENCIA--", 10, y);

    // Resumen de caja: descargar y abrir automáticamente.
    descargarYAbrirPDF(
      doc,
      `ResumenCierreCaja_${fecha.replace(/\//g, "-")}.pdf`,
      true
    );

    // Además del resumen de caja, emitir un ticket de detalle por cada tipo de
    // comprobante (Facturas y Notas de Crédito) emitido durante el turno,
    // acotado por usuario y por el rango horario [apertura, cierre]. Se aísla
    // de errores para no afectar al resumen de caja ya emitido.
    try {
      await generarTicketsComprobantes(
        toSqlDateTime(aperturaReg.RegistroDiarioCajaFecha),
        toSqlDateTime(cierreReg.RegistroDiarioCajaFecha)
      );
    } catch (error) {
      console.error("Error al generar los tickets de comprobantes:", error);
    }
  }

  // Genera los dos tickets de detalle del turno: uno con las Facturas y otro
  // con las Notas de Crédito emitidas entre la apertura y el cierre.
  async function generarTicketsComprobantes(desde: string, hasta: string) {
    await generarTicketComprobante("FA", "FACTURAS - CIERRE", desde, hasta);
    await generarTicketComprobante(
      "NC",
      "NOTAS DE CRÉDITO - CIERRE",
      desde,
      hasta
    );
  }

  // Genera un ticket de detalle (formato térmico 80mm) listando cada
  // comprobante del tipo indicado emitido por el usuario durante el turno.
  async function generarTicketComprobante(
    tipo: "FA" | "NC",
    titulo: string,
    desde: string,
    hasta: string
  ) {
    if (!user || !cajaId) return;

    const cajaDescripcion =
      cajas.find((c) => c.CajaId == cajaId)?.CajaDescripcion || "";
    const fecha = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString();

    let ventas: Venta[] = [];
    try {
      const res = await getVentasPaginated(1, 1000, "VentaId", "asc", {
        documentoTipo: tipo,
        usuarioId: user.id,
        fechaDesdeHora: desde,
        fechaHastaHora: hasta,
      });
      ventas = res.data || [];
    } catch (error) {
      console.error(`Error al cargar comprobantes ${tipo}:`, error);
      Swal.fire({
        icon: "warning",
        title: `No se pudo generar el ticket de ${
          tipo === "NC" ? "Notas de Crédito" : "Facturas"
        }`,
        text: "No se pudieron cargar los comprobantes del turno.",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    // El LEFT JOIN a ventacredito en el backend puede duplicar filas; se deja
    // una sola por venta.
    const vistos = new Set<number>();
    ventas = ventas.filter((v) => {
      if (vistos.has(v.VentaId)) return false;
      vistos.add(v.VentaId);
      return true;
    });

    // Alto dinámico (rollo continuo): cabecera + una línea por comprobante + pie.
    const lineH = 6;
    const alto = Math.max(120, 70 + ventas.length * lineH + 30);

    const { jsPDF } = await loadPdf();
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [80, alto],
    });

    doc.setFontSize(13);
    doc.text(titulo, 40, 12, { align: "center" });
    doc.setFontSize(9);
    doc.text(`Fecha: ${fecha} ${hora}`, 6, 22);
    doc.text(`Usuario: ${user.nombre}`, 6, 28);
    doc.text(`Caja: ${cajaDescripcion}`, 6, 34);
    doc.line(6, 38, 74, 38);

    let y = 44;
    doc.text("N°", 6, y);
    doc.text("Cliente", 20, y);
    doc.text("Total", 74, y, { align: "right" });
    y += 3;
    doc.line(6, y, 74, y);
    y += 5;

    let total = 0;
    if (ventas.length === 0) {
      doc.text("Sin comprobantes en el turno", 6, y);
      y += lineH;
    } else {
      for (const v of ventas) {
        const cliente =
          `${v.ClienteNombre || ""} ${v.ClienteApellido || ""}`.trim() || "-";
        const clienteCorto =
          cliente.length > 18 ? cliente.slice(0, 17) + "…" : cliente;
        doc.text(String(v.VentaNroFactura ?? v.VentaId), 6, y);
        doc.text(clienteCorto, 20, y);
        doc.text(formatMiles(v.Total), 74, y, { align: "right" });
        total += Number(v.Total) || 0;
        y += lineH;
      }
    }

    doc.line(6, y, 74, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Cantidad: ${ventas.length}`, 6, y);
    y += 6;
    doc.text(`Total: Gs. ${formatMiles(total)}`, 6, y);
    y += 10;
    doc.setFontSize(9);
    doc.text("--GRACIAS POR SU PREFERENCIA--", 6, y);

    const nombreArchivo = `${
      tipo === "NC" ? "NotasCredito" : "Facturas"
    }_Cierre_${fecha.replace(/\//g, "-")}.pdf`;
    descargarYAbrirPDF(doc, nombreArchivo, false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    setOperacionCompletada(true); // Deshabilitar el botón inmediatamente
    try {
      const result = await aperturaCierreCaja({
        apertura: tipo === "0" ? 0 : 1,
        CajaId: cajaId,
        Monto: monto,
      });
      if (tipo === "0") {
        await Swal.fire({
          icon: "success",
          title: "Apertura exitosa",
          text: result.message || "La caja se aperturó correctamente",
          confirmButtonText: "Ir a ventas",
          confirmButtonColor: "#2563eb",
        });
        navigate("/ventas");
      } else {
        setSuccess(result.message || "Operación realizada correctamente");
        await fetchRegistrosCaja();
        setDescargarPDF(true);
        // Descarga automática del PDF después de cargar registros
        setTimeout(async () => {
          await generarResumenCierrePDF();
        }, 2000); // Reducir el delay inicial
      }
    } catch (err) {
      setError(
        (err as { message?: string })?.message || "Error en la operación"
      );
      setOperacionCompletada(false); // Rehabilitar el botón si hay error
    } finally {
      setSubmitting(false);
    }
  };

  const puedeLeer = usePermiso("APERTURACAJA", "leer");
  if (!puedeLeer) return <PermissionDenied resource="la apertura/cierre de caja" />;
  if (loading) return <LoadingState message="Cargando cajas..." />;

  return (
    <div className="container mx-auto px-4 max-w-xl">
      <h1 className="text-2xl font-medium mb-6">Apertura/Cierre de Caja</h1>
      {user && (
        <div className="mb-4 p-3 bg-surface-muted rounded text-text">
          <span className="font-semibold">Usuario:</span> {user.nombre} (
          {user.id})
          {tipoDisabled && cajaId && (
            <span className="ml-2 text-sm text-text-muted">
              | Caja:{" "}
              {cajas.find((c) => c.CajaId == cajaId)?.CajaDescripcion || ""}
            </span>
          )}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-6 space-y-6"
      >
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block mb-2 text-sm font-medium text-text">
              Tipo de operación
            </label>
            <select
              className={`bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5 ${
                tipoDisabled ? "bg-border text-text-muted" : ""
              }`}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as "0" | "1")}
              required
              disabled={tipoDisabled}
            >
              <option value="0">Apertura</option>
              <option value="1">Cierre</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text">
              Caja
            </label>
            <select
              className={`bg-surface-muted border border-border text-text text-sm rounded-lg focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5 ${
                cajaDisabled ? "bg-border text-text-muted" : ""
              }`}
              value={cajaId}
              onChange={(e) => setCajaId(e.target.value)}
              required
              disabled={cajaDisabled}
            >
              <option value="">Seleccione una caja</option>
              {cajas.map((caja) => (
                <option key={caja.CajaId} value={caja.CajaId}>
                  {caja.CajaDescripcion}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-text">
              {tipo === "1" ? "Monto de cierre" : "Monto de apertura"}
            </label>
            <MoneyInput
              value={monto}
              onValueChange={(v) => setMonto(v)}
              min={0}
              required
            />
          </div>
        </div>
        <div className="flex justify-end">
          <ActionButton
            onClick={handleSubmit}
            label="CONFIRMAR"
            disabled={submitting || operacionCompletada}
          />
        </div>
        {success && (
          <div className="text-success-700 text-center font-medium mt-2">
            {success}
          </div>
        )}
      </form>
      {success && tipo === "1" && descargarPDF && (
        <div className="flex justify-center mt-4">
          <ActionButton
            label="Descargar Tickets de Cierre"
            onClick={() => generarResumenCierrePDF()}
          />
        </div>
      )}
    </div>
  );
}
