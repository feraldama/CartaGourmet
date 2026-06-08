import api from "./api";
import type { AxiosError } from "axios";

export const getPerfilesByUsuario = async (usuarioId: string | number) => {
  try {
    const response = await api.get(`/usuarioperfil/usuario/${usuarioId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener perfiles del usuario",
      }
    );
  }
};

export const createUsuarioPerfil = async (data: Record<string, unknown>) => {
  try {
    const response = await api.post("/usuarioperfil", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al asignar perfil" };
  }
};

export const deleteUsuarioPerfil = async (
  usuarioId: string | number,
  perfilId: string | number
) => {
  try {
    const response = await api.delete(
      `/usuarioperfil/${usuarioId}/${perfilId}`
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al eliminar perfil del usuario",
      }
    );
  }
};
