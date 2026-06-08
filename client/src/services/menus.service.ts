import api from "./api";
import type { AxiosError } from "axios";

export const getMenus = async (page = 1, itemsPerPage = 10, search = "") => {
  try {
    const response = await api.get("/menus", {
      params: { page, itemsPerPage, search },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener menús" };
  }
};

export const getMenuById = async (id: string | number) => {
  try {
    const response = await api.get(`/menus/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al obtener menú" };
  }
};

export const createMenu = async (menuData: Record<string, unknown>) => {
  try {
    const response = await api.post("/menus", menuData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al crear menú" };
  }
};

export const updateMenu = async (
  id: string | number,
  menuData: Record<string, unknown>
) => {
  try {
    const response = await api.put(`/menus/${id}`, menuData);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al actualizar menú" };
  }
};

export const deleteMenu = async (id: string | number) => {
  try {
    const response = await api.delete(`/menus/${id}`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw axiosError.response?.data || { message: "Error al eliminar menú" };
  }
};
