import api from "./api";
import type { AxiosError } from "axios";

export const getPerfiles = async (page = 1, itemsPerPage = 10) => {
  try {
    const response = await api.get("/perfiles", {
      params: { page, itemsPerPage },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener perfiles" };
  }
};

export const getPerfilById = async (id: string | number) => {
  try {
    const response = await api.get(`/perfiles/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener perfil" };
  }
};

export const createPerfil = async (perfilData: Record<string, unknown>) => {
  try {
    const response = await api.post("/perfiles", perfilData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear perfil" };
  }
};

export const updatePerfil = async (
  id: string | number,
  perfilData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/perfiles/${id}`, perfilData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar perfil" }
    );
  }
};

export const deletePerfil = async (id: string | number) => {
  try {
    const response = await api.delete(`/perfiles/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar perfil" };
  }
};
