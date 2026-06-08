import api from "./api";
import type { AxiosError } from "axios";

export const getTiposGasto = async () => {
  const response = await api.get("/tipogasto");
  return response.data;
};

export const getTiposGastoPaginated = async (
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
    const response = await api.get("/tipogasto/paginated", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener tipos de gasto paginados",
      }
    );
  }
};

export const getTipoGastoById = async (id: string | number) => {
  try {
    const response = await api.get(`/tipogastos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener tipo de gasto" }
    );
  }
};

export const createTipoGasto = async (data: Record<string, unknown>) => {
  try {
    const response = await api.post("/tipogastos", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al crear tipo de gasto" }
    );
  }
};

export const updateTipoGasto = async (
  id: string | number,
  data: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/tipogastos/${id}`, data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al actualizar tipo de gasto",
      }
    );
  }
};

export const deleteTipoGasto = async (id: string | number) => {
  try {
    const response = await api.delete(`/tipogastos/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al eliminar tipo de gasto",
      }
    );
  }
};

export const searchTiposGasto = async (
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
    const response = await api.get("/tipogastos/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al buscar tipos de gasto" }
    );
  }
};
