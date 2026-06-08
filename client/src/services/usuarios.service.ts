// src/services/usuarios.service.js
import api from "./api";
import type { AxiosError } from "axios";

export const getUsuarios = async (
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
    const response = await api.get("/usuarios", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener usuarios" };
  }
};

export const getUsuarioById = async (id: string | number) => {
  try {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener usuario" };
  }
};

export const createUsuario = async (usuarioData: Record<string, unknown>) => {
  try {
    const response = await api.post("/usuarios", usuarioData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear usuario" };
  }
};

export const updateUsuario = async (
  id: string | number,
  usuarioData: Record<string, unknown>
) => {
  try {
    // Eliminar contraseña vacía si no se quiere cambiar
    if (usuarioData.UsuarioContrasena === "") {
      delete usuarioData.UsuarioContrasena;
    }

    const response = await api.put(`/usuarios/${id}`, usuarioData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || { message: "Error al actualizar usuario" }
    );
  }
};

export const deleteUsuario = async (id: string | number) => {
  // Validar que el ID sea válido
  if (!id || String(id).trim() === "") {
    throw { message: "ID de usuario inválido" };
  }

  try {
    const userId = encodeURIComponent(String(id));
    const url = `/usuarios/${userId}`;

    const response = await api.delete(url, {
      timeout: 30000, // 30 segundos de timeout
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{
      message?: string;
      tablas?: Array<{ tabla: string; descripcion: string; cantidad: number }>;
    }>;

    // Si no hay respuesta, podría ser un problema de conexión
    if (!axiosError.response) {
      throw {
        message: "No se pudo conectar con el servidor. Verifica tu conexión.",
      };
    }

    throw axiosError.response?.data || { message: "Error al eliminar usuario" };
  }
};

export const searchUsuarios = async (
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
    const response = await api.get("/usuarios/search", { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al buscar usuarios" };
  }
};
