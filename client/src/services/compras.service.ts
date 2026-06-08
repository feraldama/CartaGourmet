import api from "./api";
import type { AxiosError } from "axios";

export interface Compra {
  CompraId: number;
  CompraFecha: string;
  ProveedorId: number;
  UsuarioId: string;
  CompraFactura: number;
  CompraTipo: string;
  CompraPagoCompleto: boolean;
  CompraEntrega: number;
  Total: number;
  AlmacenId: number;
  ProveedorNombre?: string;
  ProveedorRUC?: string;
  proveedor?: {
    ProveedorId: number;
    ProveedorNombre: string;
    ProveedorRUC: string;
  };
  productos?: CompraProducto[];
}

export interface CompraProducto {
  CompraId: number;
  CompraProductoId: number;
  ProductoId: number;
  CompraProductoCantidad: number;
  CompraProductoCantidadUnidad: string;
  CompraProductoBonificacion: number;
  CompraProductoPrecio: number;
  AlmacenOrigenId: number;
  ProductoNombre?: string;
  ProductoCodigo?: string;
  ProductoPrecioVenta?: number;
  ProductoIVA?: number;
  producto?: {
    ProductoId: number;
    ProductoNombre: string;
    ProductoCodigo: string;
  };
}

export interface CreateCompraData {
  ProveedorId: number;
  UsuarioId: string;
  CompraFactura: number;
  CompraTipo: string;
  CompraEntrega: number;
  productos: {
    CompraProductoId?: number;
    ProductoId: number;
    CompraProductoCantidad: number;
    CompraProductoCantidadUnidad?: string;
    CompraProductoBonificacion?: number;
    CompraProductoPrecio: number;
    AlmacenOrigenId: number;
  }[];
}

export interface ComprasResponse {
  success: boolean;
  data: Compra[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

export interface CompraResponse {
  success: boolean;
  data: Compra;
}

// Obtener todas las compras con paginación
export const getAllCompras = async (
  page: number = 1,
  limit: number = 10,
  search: string = ""
): Promise<ComprasResponse> => {
  try {
    const response = await api.get("/compras", {
      params: { page, limit, search },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener compras" };
  }
};

// Obtener compra por ID
export const getCompraById = async (id: number): Promise<CompraResponse> => {
  try {
    const response = await api.get(`/compras/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener compra" };
  }
};

// Crear nueva compra
export const createCompra = async (
  data: CreateCompraData
): Promise<CompraResponse> => {
  try {
    const response = await api.post("/compras", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear compra" };
  }
};

// Actualizar compra
export const updateCompra = async (
  id: number,
  data: Partial<CreateCompraData>
): Promise<CompraResponse> => {
  try {
    const response = await api.put(`/compras/${id}`, data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar compra" }
    );
  }
};

// Eliminar compra
export const deleteCompra = async (
  id: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.delete(`/compras/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar compra" };
  }
};

// Obtener compras con paginación (para la página de historial)
export const getComprasPaginated = async (
  page: number = 1,
  limit: number = 10,
  sortKey: string = "CompraId",
  sortOrder: "asc" | "desc" = "desc"
): Promise<ComprasResponse> => {
  try {
    const response = await api.get("/compras", {
      params: { page, limit, sortKey, sortOrder },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener compras" };
  }
};

// Buscar compras
export const searchCompras = async (
  searchTerm: string,
  page: number = 1,
  limit: number = 10,
  sortKey: string = "CompraId",
  sortOrder: "asc" | "desc" = "desc"
): Promise<ComprasResponse> => {
  try {
    const response = await api.get("/compras/search", {
      params: { search: searchTerm, page, limit, sortKey, sortOrder },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar compras" };
  }
};

// Obtener productos de una compra
export const getProductosByCompraId = async (
  compraId: number
): Promise<CompraProducto[]> => {
  try {
    const response = await api.get(`/compras/${compraId}/productos`);
    return response.data.data || [];
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener productos de la compra",
      }
    );
  }
};
