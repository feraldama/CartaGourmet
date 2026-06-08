import api from "./api";
import type { AxiosError } from "axios";

export const getFacturas = async (
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
    const response = await api.get("/factura", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener facturas" };
  }
};

export const getFacturaById = async (id: string | number) => {
  try {
    const response = await api.get(`/factura/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener factura" };
  }
};

export const createFactura = async (facturaData: Record<string, unknown>) => {
  try {
    const response = await api.post("/factura", facturaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear factura" };
  }
};

export const updateFactura = async (
  id: string | number,
  facturaData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/factura/${id}`, facturaData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar factura" }
    );
  }
};

export const deleteFactura = async (id: string | number) => {
  try {
    const response = await api.delete(`/factura/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar factura" };
  }
};

export const searchFacturas = async (
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
    const response = await api.get("/factura/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar facturas" };
  }
};

export const getNextAvailableNumber = async () => {
  try {
    const response = await api.get("/factura/next-number");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener próximo número",
      }
    );
  }
};

export const getCurrentFactura = async (numeroFactura: string | number) => {
  try {
    const response = await api.get(`/factura/current/${numeroFactura}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener factura actual",
      }
    );
  }
};
