import api from "./api";
import type { AxiosError } from "axios";

export const aperturaCierreCaja = async (data: {
  apertura: 0 | 1;
  CajaId: string | number;
  Monto: number;
  UsuarioId?: string | number;
}) => {
  try {
    const response = await api.post(
      "/registrodiariocaja/apertura-cierre",
      data
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error en apertura/cierre de caja",
      }
    );
  }
};

export const getEstadoAperturaPorUsuario = async (
  usuarioId: string | number
) => {
  try {
    const response = await api.get(`/registrodiariocaja/estado-apertura`, {
      params: { usuarioId },
    });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    throw (
      axiosError.response?.data || {
        message: "Error al consultar estado de apertura de caja",
      }
    );
  }
};
