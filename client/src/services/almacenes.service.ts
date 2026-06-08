import api from "./api";
import type { AxiosError } from "axios";

export const getAlmacenes = async (
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
    const response = await api.get("/almacen", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener almacenes" }
    );
  }
};

export const getAlmacenById = async (id: string | number) => {
  try {
    const response = await api.get(`/almacen/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener almacén" };
  }
};

export const createAlmacen = async (almacenData: Record<string, unknown>) => {
  try {
    const response = await api.post("/almacen", almacenData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear almacén" };
  }
};

export const updateAlmacen = async (
  id: string | number,
  almacenData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/almacen/${id}`, almacenData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar almacén" }
    );
  }
};

export const deleteAlmacen = async (id: string | number) => {
  try {
    const response = await api.delete(`/almacen/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar almacén" };
  }
};

export const searchAlmacenes = async (
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
    const response = await api.get("/almacen/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar almacenes" };
  }
};
