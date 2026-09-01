import api from "./api";
import type { AxiosError } from "axios";

export interface Venta {
  VentaId: number;
  VentaFecha: string;
  ClienteId: number;
  AlmacenId: number;
  VentaTipo: "CO" | "CR" | "PO" | "TR";
  VentaDocumentoTipo?: "FA" | "NC";
  VentaNroFactura?: number;
  VentaTimbrado?: number;
  VentaPagoTipo: string;
  VentaNroPOS?: string | number;
  VentaCantidadProductos: number;
  VentaUsuario: string;
  Total: number;
  VentaEntrega: string;
  ClienteNombre?: string;
  ClienteApellido?: string;
  VentaProductoId: number;
  ProductoId: number;
  VentaProductoPrecioPromedio: number;
  VentaProductoCantidad: number;
  VentaProductoPrecio: number;
  VentaProductoPrecioTotal: number;
  VentaProductoUnitario: number;
}

export interface VentaCredito {
  VentaCreditoId: number;
  VentaId: number;
  VentaCreditoPagoCant: number;
}

export interface VentaCreditoPago {
  VentaCreditoId: number;
  VentaCreditoPagoId: number;
  VentaCreditoPagoFecha: string;
  VentaCreditoPagoMonto: number;
}

export interface VentaProducto {
  VentaId: number;
  VentaProductoId: number;
  ProductoId: number;
  VentaProductoPrecioPromedio: number;
  VentaProductoCantidad: number;
  VentaProductoPrecio: number;
  VentaProductoPrecioTotal: number;
  VentaProductoUnitario: number;
}

export interface VentaFilters {
  tipo?: "CO" | "CR" | "PO" | "TR";
  documentoTipo?: "FA" | "NC";
  almacenId?: number | string;
  usuarioId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  // Rango con precisión de hora (formato "YYYY-MM-DD HH:MM:SS") para acotar
  // exactamente un turno de caja entre su apertura y su cierre.
  fechaDesdeHora?: string;
  fechaHastaHora?: string;
  estado?: "P" | "C";
}

const applyVentaFilters = (
  params: { [key: string]: string | number | undefined },
  filters?: VentaFilters
) => {
  if (!filters) return;
  if (filters.tipo) params.tipo = filters.tipo;
  if (filters.documentoTipo) params.documentoTipo = filters.documentoTipo;
  if (filters.almacenId) params.almacenId = filters.almacenId;
  if (filters.usuarioId) params.usuarioId = filters.usuarioId;
  if (filters.fechaDesde) params.fechaDesde = filters.fechaDesde;
  if (filters.fechaHasta) params.fechaHasta = filters.fechaHasta;
  if (filters.fechaDesdeHora) params.fechaDesdeHora = filters.fechaDesdeHora;
  if (filters.fechaHastaHora) params.fechaHastaHora = filters.fechaHastaHora;
  if (filters.estado) params.estado = filters.estado;
};

export const getVentas = async () => {
  const response = await api.get("/venta");
  return response.data;
};

export const getVentasPaginated = async (
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  filters?: VentaFilters
) => {
  const params: { [key: string]: string | number | undefined } = {
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  applyVentaFilters(params, filters);
  try {
    const response = await api.get("/venta/paginated", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener ventas paginadas",
      }
    );
  }
};

export const getVentaById = async (id: string | number) => {
  try {
    const response = await api.get(`/venta/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener venta" };
  }
};

export const createVenta = async (data: Record<string, unknown>) => {
  try {
    const response = await api.post("/venta", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear venta" };
  }
};

export const updateVenta = async (
  id: string | number,
  data: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/venta/${id}`, data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al actualizar venta" };
  }
};

export const deleteVenta = async (id: string | number) => {
  try {
    const response = await api.delete(`/venta/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar venta" };
  }
};

export const searchVentas = async (
  searchTerm: string,
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  filters?: VentaFilters
) => {
  const params: { [key: string]: string | number | undefined } = {
    q: searchTerm,
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  applyVentaFilters(params, filters);
  try {
    const response = await api.get("/venta/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar ventas" };
  }
};

// Servicios para VentaCredito
export const getVentaCreditoByVentaId = async (ventaId: string | number) => {
  try {
    const response = await api.get(`/ventacredito/venta/${ventaId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener crédito de venta",
      }
    );
  }
};

export const createVentaCredito = async (data: Record<string, unknown>) => {
  try {
    const response = await api.post("/ventacredito", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al crear crédito de venta",
      }
    );
  }
};

// Servicios para VentaCreditoPago
export const getPagosByVentaCreditoId = async (
  ventaCreditoId: string | number
) => {
  try {
    const response = await api.get(
      `/ventacreditopago/credito/${ventaCreditoId}`
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener pagos del crédito",
      }
    );
  }
};

export const createVentaCreditoPago = async (data: Record<string, unknown>) => {
  try {
    const response = await api.post("/ventacreditopago", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al crear pago de crédito" }
    );
  }
};

// Servicios para VentaProducto
export const getProductosByVentaId = async (ventaId: string | number) => {
  try {
    const response = await api.get(`/ventaproducto/venta/${ventaId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener productos de la venta",
      }
    );
  }
};

export interface ConfirmarVentaProducto {
  ProductoId: number;
  VentaProductoCantidad: number;
  ProductoUnidad: "U" | "C";
  VentaProductoPrecioTotal: number;
  Combo: boolean;
  ComboPrecio: number;
}

export interface ConfirmarVentaPayload {
  VentaFecha: string; // ISO YYYY-MM-DD
  AlmacenOrigenId: number;
  ClienteId: number;
  CajaId: number;
  UsuarioId: string;
  VentaPagoTipo: string;
  VentaDocumentoTipo?: "FA" | "NC";
  /** NC: VentaId de la factura que la nota de crédito afecta (requerido por RG 90). */
  VentaIdAsociada?: number;
  /** NC: alternativa por número de comprobante (respaldo si no se usa el buscador). */
  VentaNroFacturaAsociada?: number;
  VentaNroFactura?: number;
  VentaTimbrado?: number;
  VentaNroPOS?: string;
  Pagos: {
    Efectivo?: number;
    Banco?: number;
    CuentaCliente?: number;
    Voucher?: number;
    Transferencia?: number;
  };
  Productos: ConfirmarVentaProducto[];
}

export const confirmarVenta = async (payload: ConfirmarVentaPayload) => {
  try {
    const response = await api.post("/venta/confirmar", payload);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al confirmar la venta" }
    );
  }
};

// Descarga un endpoint que responde archivo (blob) y dispara el guardado en el
// navegador. El nombre sale del Content-Disposition si el server lo expone.
const descargarArchivo = async (
  endpoint: string,
  params: Record<string, string>,
  fallbackFilename: string,
  errorGenerico: string
) => {
  try {
    const response = await api.get(endpoint, { params, responseType: "blob" });
    const disposition = String(response.headers["content-disposition"] || "");
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : fallbackFilename;
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    // El error viene como Blob por el responseType; se intenta leer el mensaje.
    const axiosError = error as AxiosError<Blob>;
    let message = errorGenerico;
    if (axiosError.response?.data instanceof Blob) {
      try {
        const parsed = JSON.parse(await axiosError.response.data.text());
        if (parsed?.message) message = parsed.message;
      } catch {
        // se mantiene el mensaje genérico
      }
    }
    throw { message };
  }
};

// Libro de ventas RG 90 (planilla oficial de la SET) como .xlsx.
export const descargarLibroVentasRG90 = (
  fechaDesde: string,
  fechaHasta: string
) =>
  descargarArchivo(
    "/venta/reporte-rg90",
    { fechaDesde, fechaHasta },
    `libro-ventas-rg90_${fechaDesde}_${fechaHasta}.xlsx`,
    "Error al generar el libro de ventas RG 90"
  );

// CSV de importación a Marangatu (ZIP <RUC>_REG_MMAAAA_V0001.zip).
export const descargarCsvVentasRG90 = (
  fechaDesde: string,
  fechaHasta: string
) =>
  descargarArchivo(
    "/venta/reporte-rg90-csv",
    { fechaDesde, fechaHasta },
    `rg90-ventas_${fechaDesde}_${fechaHasta}.zip`,
    "Error al generar el CSV de Marangatu"
  );

// Factura emitida candidata a asociarse a una Nota de Crédito.
export interface FacturaParaNC {
  VentaId: number;
  VentaNroFactura: number;
  VentaTimbrado: number;
  NroComprobante: string;
  VentaFecha: string;
  Total: number;
  Cliente: string;
}

// Busca facturas emitidas (por número o cliente) para asociar a una NC.
export const buscarFacturasParaNC = async (
  term: string
): Promise<FacturaParaNC[]> => {
  try {
    const response = await api.get("/venta/facturas-para-nc", {
      params: { term },
    });
    return response.data?.data || [];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al buscar facturas" }
    );
  }
};

export interface RecibirPagoCreditoPayload {
  Tipo: "V" | "C";
  ClienteId: number;
  MontoRecibido: number;
  CajaId: number;
  UsuarioId: string;
  Fecha: string; // ISO YYYY-MM-DD
  VentaPagoTipo?: "CO" | "PO" | "TR";
}

export const recibirPagoCredito = async (payload: RecibirPagoCreditoPayload) => {
  try {
    const response = await api.post("/ventacreditopago/recibir", payload);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al recibir el pago" };
  }
};

export interface DevolucionVentaPayload {
  VentaFecha: string; // ISO YYYY-MM-DD
  AlmacenOrigenId: number;
  CajaId: number;
  UsuarioId: string;
  Total2: number;
  Productos: Array<{
    ProductoId: number;
    VentaProductoCantidad: number;
    ProductoUnidad: "U" | "C";
  }>;
}

export const devolverVenta = async (payload: DevolucionVentaPayload) => {
  try {
    const response = await api.post("/venta/devolucion", payload);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al realizar la devolución" }
    );
  }
};

export const getVentasPendientesPorCliente = async (
  clienteId: number,
  localId?: number
) => {
  try {
    const params = localId ? { localId } : {};
    const response = await api.get(`/venta/pendientes/${clienteId}`, {
      params,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener ventas pendientes",
      }
    );
  }
};
