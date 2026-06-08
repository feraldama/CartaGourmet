import api from "./api";
import type { AxiosError } from "axios";

export const getPermisosByPerfil = async (perfilId: string | number) => {
  try {
    const response = await api.get(`/perfilmenu/perfil/${perfilId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener permisos del perfil",
      }
    );
  }
};

export const getPermisosByUsuario = async (usuarioId: string | number) => {
  try {
    const response = await api.get(`/perfilmenu/usuario/${usuarioId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al obtener permisos del usuario",
      }
    );
  }
};

export const createPerfilMenu = async (data: Record<string, unknown>) => {
  try {
    const response = await api.post("/perfilmenu", data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear permiso" };
  }
};

export const updatePerfilMenu = async (
  perfilId: string | number,
  menuId: string | number,
  data: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/perfilmenu/${perfilId}/${menuId}`, data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar permiso" }
    );
  }
};

export const deletePerfilMenu = async (
  perfilId: string | number,
  menuId: string | number
) => {
  try {
    const response = await api.delete(`/perfilmenu/${perfilId}/${menuId}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar permiso" };
  }
};
