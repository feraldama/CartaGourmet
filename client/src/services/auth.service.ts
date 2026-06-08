import api from "./api";

interface Credentials {
  email: string;
  password: string;
}

export const login = async (credentials: Credentials) => {
  try {
    const response = await api.post("/usuarios/login", credentials);
    return response.data;
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "response" in error) {
      // @ts-expect-error: error.response puede existir
      throw error.response?.data || { message: "Error al iniciar sesión" };
    }
    throw { message: "Error al iniciar sesión" };
  }
};

export const getAuthUser = async () => {
  try {
    const response = await api.get("/usuarios/me");
    return response.data;
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "response" in error) {
      // @ts-expect-error: error.response puede existir
      throw error.response?.data;
    }
    throw error;
  }
};
