import { useAuth } from "../../../contexts/useAuth";
import { Navigate } from "react-router-dom";
import "./PrivateRoute.css";
import type { ReactNode } from "react";

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-container">Cargando...</div>;
  }

  return user ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
