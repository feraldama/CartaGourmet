import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const ocultarLayout = location.pathname === "/ventas";

  return (
    <div className="flex flex-col h-screen font-baloo">
      {/* Navbar con altura fija */}
      {!ocultarLayout && (
        <div className="flex-shrink-0">
          <Navbar setMobileOpen={setMobileOpen} />
        </div>
      )}

      {/* Contenedor principal que ocupa el resto */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {!ocultarLayout && (
          <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
        )}

        {/* Contenido principal con scroll */}
        <main
          className={
            ocultarLayout
              ? "flex-1 overflow-y-auto p-0 m-0"
              : "flex-1 overflow-y-auto p-4 lg:ml-64"
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
