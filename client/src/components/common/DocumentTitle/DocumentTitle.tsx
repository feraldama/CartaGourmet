import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ROUTE_TITLES: Record<string, string> = {
  "/login": "Iniciar sesión",
  "/dashboard": "Dashboard",
  "/ventas": "Ventas",
  "/compras": "Compras",
  "/inventario": "Inventario",
  "/users": "Usuarios",
  "/movements/summary": "Registro Diario Caja",
  "/movements/cajas": "Cajas",
  "/movements/tiposgasto": "Tipos de gasto",
  "/customers": "Clientes",
  "/apertura-cierre-caja": "Apertura y cierre de caja",
  "/locales": "Locales",
  "/almacenes": "Almacenes",
  "/combos": "Combos",
  "/perfiles": "Perfiles",
  "/menus": "Menús",
  "/products": "Productos",
  "/modifications/ventas": "Modificaciones de ventas",
  "/modifications/compras": "Modificaciones de compras",
  "/credito-pagos": "Crédito y pagos",
  "/reportes": "Reportes",
  "/facturas": "Facturas",
};

const APP_NAME = "Salvatore";

function DocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const pageTitle = ROUTE_TITLES[pathname] || "Página no encontrada";
    document.title = `${APP_NAME} | ${pageTitle}`;
  }, [pathname]);

  return null;
}

export default DocumentTitle;
