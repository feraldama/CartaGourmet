import {
  Disclosure,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
} from "@headlessui/react";
import { Bars3Icon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/useAuth";
import { Link, useNavigate } from "react-router-dom";
import type { Dispatch, SetStateAction } from "react";

function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

interface NavbarProps {
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Navbar({ setMobileOpen }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Navegación fija
  const navigation = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Apertura de caja", href: "/apertura-cierre-caja" },
    { name: "Ventas", href: "/ventas" },
    { name: "Cobro de Créditos", href: "/credito-pagos" },
  ];

  return (
    <Disclosure as="nav" className="bg-sidebar">
      <div className="sticky top-0 z-30 bg-sidebar shadow-elevated">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Botón para abrir sidebar en móvil */}
            <button
              type="button"
              className="cursor-pointer rounded-md text-sidebar-text transition-colors hover:text-sidebar-text-active focus:outline-none lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <span className="sr-only">Abrir sidebar</span>
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* //*******************************  */}
            <div className="flex items-center">
              {/* Menú de navegación (visible en desktop) */}
              <div className="hidden sm:ml-6 sm:block">
                <div className="flex space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={classNames(
                        "text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active",
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors"
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {/* Resto de tu Navbar (sin cambios) */}
            <div className="flex items-center">
              {/* Menú de perfil */}
              <Menu as="div" className="relative ml-3">
                <div className="flex items-center">
                  <MenuButton className="relative flex cursor-pointer items-center gap-2 rounded-full bg-sidebar text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-sidebar">
                    <span className="text-text-inverse">
                      Hola, {user?.nombre ?? "Usuario"}
                    </span>
                    <UserCircleIcon
                      className="h-8 w-8 text-sidebar-text"
                      aria-hidden="true"
                    />
                  </MenuButton>
                </div>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-lg bg-surface py-1 shadow-modal ring-1 ring-border focus:outline-none"
                >
                  <MenuItem>
                    {({ focus }: { focus: boolean }) => (
                      <a
                        href="/profile"
                        className={classNames(
                          focus ? "bg-surface-muted" : "",
                          "block px-4 py-2 text-sm text-text"
                        )}
                      >
                        Tu Perfil
                      </a>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ focus }: { focus: boolean }) => (
                      <a
                        href="/configuraciones"
                        className={classNames(
                          focus ? "bg-surface-muted" : "",
                          "block px-4 py-2 text-sm text-text"
                        )}
                      >
                        Configuración
                      </a>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ focus }: { focus: boolean }) => (
                      <button
                        onClick={handleLogout}
                        className={classNames(
                          focus ? "bg-surface-muted" : "",
                          "block w-full text-left px-4 py-2 text-sm text-text cursor-pointer"
                        )}
                      >
                        Cerrar sesión
                      </button>
                    )}
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>

            {/* //****************************************  */}
          </div>
        </div>
      </div>
    </Disclosure>
  );
}
