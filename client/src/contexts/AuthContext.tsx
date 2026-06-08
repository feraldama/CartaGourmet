import { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

interface User {
  // Define aquí las propiedades del usuario según tu modelo, por ejemplo:
  id: string;
  nombre: string;
  email: string;
  LocalId?: number;
  LocalNombre?: string;
  isAdmin?: string;
  // Agrega más campos si es necesario
}

interface Credentials {
  email: string;
  password: string;
}

interface PermisosPorMenu {
  [menu: string]: {
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    leer: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  permisos: PermisosPorMenu;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [permisos, setPermisos] = useState<PermisosPorMenu>(() => {
    const storedPerms = localStorage.getItem("permisos");
    return storedPerms ? JSON.parse(storedPerms) : {};
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = async (credentials: Credentials) => {
    setLoading(true);
    try {
      const response = await fetch(
        import.meta.env.VITE_API_URL + "/usuarios/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("permisos", JSON.stringify(data.permisos || {}));
      setUser(data.user);
      setPermisos(data.permisos || {});
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("permisos");
    setUser(null);
    setPermisos({});
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, permisos, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export type { AuthContextType };
