import axios from "axios";
import Swal from "sweetalert2";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api",
  timeout: 30000, // 30 segundos de timeout
});

// Interceptor para añadir token a las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isSessionExpired = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data &&
      (error.response.data.message?.toLowerCase().includes("expirado") ||
        error.response.data.message?.toLowerCase().includes("token inválido"))
    ) {
      if (!isSessionExpired) {
        isSessionExpired = true;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        Swal.fire({
          icon: "warning",
          title: "Sesión expirada",
          text: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
          confirmButtonText: "Ir al login",
          confirmButtonColor: "#3085d6",
        }).then(() => {
          isSessionExpired = false;
          window.location.href = "/login";
        });
      }
    }
    return Promise.reject(error);
  }
);

export default api;
