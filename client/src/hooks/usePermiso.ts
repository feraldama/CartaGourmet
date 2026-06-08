import { useAuth } from "../contexts/useAuth";

export function usePermiso(
  menu: string,
  accion: "crear" | "editar" | "eliminar" | "leer"
) {
  const { permisos, user } = useAuth();
  if (user?.isAdmin === "S") return true;
  return permisos?.[menu]?.[accion] ?? false;
}
