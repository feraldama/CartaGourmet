import api from "./api";
import type { AxiosError } from "axios";

// Traer todos los productos sin paginación
export const getProductos = async (params = {}) => {
  const res = await api.get("/productos/all", { params });
  return res.data;
};

// Traer productos paginados (localId opcional: si se pasa, el stock es solo del almacén con ese LocalId)
export const getProductosPaginated = async (
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  localId?: string | number | null
) => {
  const params: { [key: string]: string | number | undefined } = {
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  if (localId != null && localId !== "") params.localId = localId;
  try {
    const response = await api.get("/productos", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener productos" }
    );
  }
};

export const getProductosAll = async () => {
  const res = await api.get("/productos/all");
  return res.data;
};

export const getProductoById = async (id: string | number) => {
  try {
    const response = await api.get(`/productos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener producto" };
  }
};

export const createProducto = async (productoData: Record<string, unknown>) => {
  try {
    const response = await api.post("/productos", productoData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear producto" };
  }
};

export const updateProducto = async (
  id: string | number,
  productoData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/productos/${id}`, productoData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar producto" }
    );
  }
};

export const deleteProducto = async (id: string | number) => {
  try {
    const response = await api.delete(`/productos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al eliminar producto" }
    );
  }
};

// localId opcional: si se pasa, el stock devuelto es solo del almacén con ese LocalId
export const searchProductos = async (
  searchTerm: string,
  page = 1,
  limit = 10,
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  localId?: string | number | null
) => {
  const params: { [key: string]: string | number | undefined } = {
    q: searchTerm,
    page,
    limit,
  };
  if (sortBy) params.sortBy = sortBy;
  if (sortOrder) params.sortOrder = sortOrder;
  if (localId != null && localId !== "") params.localId = localId;
  try {
    const response = await api.get("/productos/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar productos" };
  }
};
