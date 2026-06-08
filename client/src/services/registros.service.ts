import api from "./api";
import type { AxiosError } from "axios";

export const getRegistrosDiariosCaja = async (
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
    const response = await api.get("/registrodiariocaja", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener registros diarios de caja",
      }
    );
  }
};

export const searchRegistrosDiariosCaja = async (
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
    const response = await api.get(`/registrodiariocaja/search`, { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al buscar registros diarios de caja",
      }
    );
  }
};

/** Obtener registros diarios de caja por rango de fechas (para reportes). */
export const getRegistrosDiariosCajaPorRango = async (
  fechaDesde: string,
  fechaHasta: string
) => {
  try {
    const response = await api.get("/registrodiariocaja/rango", {
      params: { fechaDesde, fechaHasta, limit: 10000 },
    });
    return response.data as { data: RegistroDiarioCajaRow[] };
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener registros por rango de fechas",
      }
    );
  }
};

export interface RegistroDiarioCajaRow {
  RegistroDiarioCajaId: number;
  CajaId: number;
  UsuarioId: string;
  /** Fecha en formato ISO datetime (ej. "2026-02-16T14:01:56.000Z") */
  RegistroDiarioCajaFecha: string;
  RegistroDiarioCajaMonto: number;
  TipoGastoId: number;
  TipoGastoGrupoId: number;
  CajaDescripcion?: string;
}

export const getRegistroDiarioCajaById = async (id: string | number) => {
  try {
    const response = await api.get(`/registrodiariocaja/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al obtener el registro" }
    );
  }
};

export const createRegistroDiarioCaja = async (
  registroData: Record<string, unknown>
) => {
  try {
    const response = await api.post("/registrodiariocaja", registroData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al crear el registro" }
    );
  }
};

export const updateRegistroDiarioCaja = async (
  id: string | number,
  registroData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/registrodiariocaja/${id}`, registroData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al actualizar el registro",
      }
    );
  }
};

export const deleteRegistroDiarioCaja = async (id: string | number) => {
  try {
    const response = await api.delete(`/registrodiariocaja/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al eliminar el registro" }
    );
  }
};
