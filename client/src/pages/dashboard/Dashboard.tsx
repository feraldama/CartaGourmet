// import React from "react";
import { useAuth } from "../../contexts/useAuth";
import { Link } from "react-router-dom";
import {
  UserGroupIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

function Dashboard() {
  const { user } = useAuth();

  return (
    <main className="py-6 px-6 space-y-12 bg-gray-100 w-full">
      {/* Sección de Bienvenida */}
      {user && (
        <section className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
          <div className="mt-4">
            <h2 className="text-xl font-semibold text-blue-600">
              Bienvenido, {user.nombre}
            </h2>
            <p className="text-gray-600 mt-1">
              Este es tu panel de administración
            </p>
          </div>
        </section>
      )}

      {/* Sección de Navegación */}
      <section
        className="flex flex-col md:grid md:grid-cols-4 bg-white divide-y md:divide-y-0 md:divide-x w-full rounded-lg shadow-md"
        style={{ marginBottom: "1px" }}
      >
        <div className="flex px-8 py-5 text-gray-900 items-center hover:bg-gray-100 bg-blue-50 border-l-gray-100 border-b-blue-500 border-b-4">
          <ChartBarIcon className="w-14 text-gray-600" />
          <div className="ml-3">
            <div className="font-medium leading-6 text-blue-600">Resumen</div>
            <div className="mt-0.5 text-sm text-gray-500">
              Vista general del sistema
            </div>
          </div>
        </div>
        <Link
          to="/users"
          className="flex px-8 py-5 cursor-pointer text-gray-900 items-center hover:bg-gray-100 no-underline"
        >
          <UserGroupIcon className="w-14 text-gray-600" />
          <div className="ml-3">
            <div className="font-medium leading-6 text-gray-600">Usuarios</div>
            <div className="mt-0.5 text-sm text-gray-500">
              Gestión de usuarios del sistema
            </div>
          </div>
        </Link>
        <Link
          to="/reportes"
          className="flex px-8 py-5 cursor-pointer text-gray-900 items-center hover:bg-gray-100 no-underline"
        >
          <DocumentChartBarIcon className="w-14 text-gray-600" />
          <div className="ml-3">
            <div className="font-medium leading-6 text-gray-600">Reportes</div>
            <div className="mt-0.5 text-sm text-gray-500">
              Generación de reportes
            </div>
          </div>
        </Link>

        <div className="flex px-8 py-5 cursor-pointer text-gray-900 items-center hover:bg-gray-100">
          <Cog6ToothIcon className="w-14 text-gray-600" />
          <div className="ml-3">
            <div className="font-medium leading-6">Configuración</div>
            <div className="mt-0.5 text-sm text-gray-500">
              Ajustes del sistema
            </div>
          </div>
        </div>
      </section>

      {/* Sección de Contenido Principal */}
      <div className="flex flex-col h-full w-full mx-auto space-y-6">
        <section className="flex flex-col mx-auto bg-white rounded-lg p-6 shadow-md space-y-6 w-full">
          {/* Barra de búsqueda y acciones */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <form className="flex flex-row md:col-span-3 w-full relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="#5f6368"
                >
                  <path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z" />
                </svg>
              </div>

              <input
                type="search"
                id="default-search"
                className="flex-grow py-4 ps-12 text-sm text-gray-900 border border-gray-100 rounded-l bg-gray-50 focus:ring-blue-500"
                placeholder="Buscar en el sistema..."
                // style={{ paddingLeft: "35px" }}
                required
              />
              <button
                type="submit"
                className="text-white bg-blue-500 hover:bg-blue-600 font-medium text-base px-4 py-2 rounded-r"
              >
                Buscar
              </button>
            </form>

            <div className="col-span-1 flex items-center">
              <button className="w-full h-full px-4 py-2 rounded bg-blue-500 text-white font-medium hover:bg-blue-600">
                Nueva acción
              </button>
            </div>
          </div>

          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full min-w-0">
            <div className="flex flex-col px-6 py-2 bg-white shadow rounded-lg overflow-hidden">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-6xl font-bold tracking-tight leading-none text-blue-500">
                  25
                </div>
                <div className="text-lg font-medium text-blue-500">
                  Usuarios totales
                </div>
              </div>
            </div>
            <div className="flex flex-col px-6 py-2 bg-white shadow rounded-lg overflow-hidden">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-6xl font-bold tracking-tight leading-none text-amber-500">
                  3
                </div>
                <div className="text-lg font-medium text-amber-600">
                  Nuevos hoy
                </div>
              </div>
            </div>
            <div className="flex flex-col px-6 py-2 bg-white shadow rounded-lg overflow-hidden">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-6xl font-bold tracking-tight leading-none text-green-500">
                  18
                </div>
                <div className="text-lg font-medium text-green-600">
                  Activos
                </div>
              </div>
            </div>
            <div className="flex flex-col px-6 py-2 bg-white shadow rounded-lg overflow-hidden">
              <div className="flex flex-col items-center space-y-2">
                <div className="text-6xl font-bold tracking-tight leading-none text-primary-900">
                  4
                </div>
                <div className="text-lg font-medium text-primary-900">
                  Administradores
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Dashboard;
