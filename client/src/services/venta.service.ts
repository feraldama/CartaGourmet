import api from "./api";
import type { AxiosError } from "axios";

export interface Venta {
  VentaId: number;
  VentaFecha: string;
  ClienteId: number;
  AlmacenId: number;
  VentaTipo: "CO" | "CR" | "PO" | "TR";
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

export const getVentas = async () => {
  const response = await api.get("/venta");
  return response.data;
};

export const getVentasPaginated = async (
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc"
) => {
  const params: { [key: string]: string | number | undefined } = {
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
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
  sortOrder?: "asc" | "desc"
) => {
  const params: { [key: string]: string | number | undefined } = {
    q: searchTerm,
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
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
