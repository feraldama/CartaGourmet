import api from "./api";
import type { AxiosError } from "axios";

export interface Proveedor {
  ProveedorId: number;
  ProveedorRUC: string;
  ProveedorNombre: string;
  ProveedorDireccion?: string;
  ProveedorTelefono?: string;
}

export interface ProveedoresResponse {
  success: boolean;
  data: Proveedor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProveedorResponse {
  success: boolean;
  data: Proveedor;
}

export interface CreateProveedorData {
  ProveedorRUC: string;
  ProveedorNombre: string;
  ProveedorDireccion?: string;
  ProveedorTelefono?: string;
}

// Obtener todos los proveedores con paginación
export const getAllProveedores = async (
  page: number = 1,
  limit: number = 10,
  search: string = ""
): Promise<ProveedoresResponse> => {
  try {
    const response = await api.get("/proveedores", {
      params: { page, limit, search },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener proveedores" }
    );
  }
};

// Obtener todos los proveedores sin paginación
export const getAllProveedoresSinPaginacion =
  async (): Promise<ProveedoresResponse> => {
    try {
      const response = await api.get("/proveedores/all");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      throw (
        axiosError.response?.data || {
          message: "Error al obtener todos los proveedores",
        }
      );
    }
  };

// Obtener proveedor por ID
export const getProveedorById = async (
  id: number
): Promise<ProveedorResponse> => {
  try {
    const response = await api.get(`/proveedores/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener proveedor" }
    );
  }
};

// Crear nuevo proveedor
export const createProveedor = async (
  data: CreateProveedorData
): Promise<ProveedorResponse> => {
  try {
    const response = await api.post("/proveedores", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear proveedor" };
  }
};

// Actualizar proveedor
export const updateProveedor = async (
  id: number,
  data: Partial<CreateProveedorData>
): Promise<ProveedorResponse> => {
  try {
    const response = await api.put(`/proveedores/${id}`, data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar proveedor" }
    );
  }
};

// Eliminar proveedor
export const deleteProveedor = async (
  id: number
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.delete(`/proveedores/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al eliminar proveedor" }
    );
  }
};
