import api from "./api";
import type { AxiosError } from "axios";

export interface TipoGastoGrupo {
  TipoGastoId: string | number;
  TipoGastoGrupoId: string | number;
  TipoGastoGrupoDescripcion: string;
}

export const getAllTipoGastoGrupo = async () => {
  try {
    const response = await api.get("/tipogastogrupo");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener grupos" };
  }
};

export const getTipoGastoGrupoById = async (
  tipoGastoId: string | number,
  grupoId: string | number
) => {
  try {
    const response = await api.get(`/tipogastogrupo/${tipoGastoId}/${grupoId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener grupo" };
  }
};

export const getTipoGastoGrupoByTipoGastoId = async (
  tipoGastoId: string | number
) => {
  try {
    const response = await api.get(`/tipogastogrupo/by-tipo/${tipoGastoId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener grupos por tipo",
      }
    );
  }
};

export const createTipoGastoGrupo = async (
  data: Omit<TipoGastoGrupo, "TipoGastoGrupoId">
) => {
  try {
    const response = await api.post("/tipogastogrupo", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear grupo" };
  }
};

export const updateTipoGastoGrupo = async (
  tipoGastoId: string | number,
  grupoId: string | number,
  data: Partial<TipoGastoGrupo>
) => {
  try {
    const response = await api.put(
      `/tipogastogrupo/${tipoGastoId}/${grupoId}`,
      data
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al actualizar grupo" };
  }
};

export const deleteTipoGastoGrupo = async (
  tipoGastoId: string | number,
  grupoId: string | number
) => {
  try {
    const response = await api.delete(
      `/tipogastogrupo/${tipoGastoId}/${grupoId}`
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar grupo" };
  }
};

export const getTiposGastoGrupo = async () => {
  const response = await api.get("/tipogastogrupo");
  return response.data;
};
