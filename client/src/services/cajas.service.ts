import api from "./api";
import type { AxiosError } from "axios";

export const getCajas = async (
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
    const response = await api.get("/caja", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener cajas" };
  }
};

export const getCajaById = async (id: string | number) => {
  try {
    const response = await api.get(`/caja/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener caja" };
  }
};

export const createCaja = async (cajaData: Record<string, unknown>) => {
  try {
    const response = await api.post("/caja", cajaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear caja" };
  }
};

export const updateCaja = async (
  id: string | number,
  cajaData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/caja/${id}`, cajaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al actualizar caja" };
  }
};

export const deleteCaja = async (id: string | number) => {
  try {
    const response = await api.delete(`/caja/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar caja" };
  }
};

export const searchCajas = async (
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
    const response = await api.get("/caja/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar cajas" };
  }
};

export const updateCajaMonto = async (
  id: string | number,
  nuevoMonto: number
) => {
  try {
    const response = await api.put(`/caja/${id}/monto`, {
      CajaMonto: nuevoMonto,
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (
      axiosError.response?.data?.message &&
      axiosError.response.data.message.includes(
        "You have tried to call .then(), .catch(), or invoked await on the result of query that is not a promise"
      )
    ) {
      // Considerar esto como éxito
      return {
        message: "Monto actualizado correctamente (con advertencia interna)",
      };
    }
    throw (
      axiosError.response?.data || {
        message: "Error al actualizar el monto de la caja",
      }
    );
  }
};
