import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import {
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  KeyIcon,
  UsersIcon,
  PencilSquareIcon,
  BanknotesIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  RectangleGroupIcon,
  CubeIcon,
  WrenchIcon,
  LockClosedIcon,
  ChartBarIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import type { Dispatch, SetStateAction } from "react";

interface NavigationChild {
  name: string;
  href: string;
  children?: NavigationChild[];
}

interface NavigationItem extends NavigationChild {
  icon?: React.ReactNode;
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: <HomeIcon className="h-7 w-6" />,
  },
  {
    name: "Apertura/Cierre de Caja",
    href: "/apertura-cierre-caja",
    icon: <LockClosedIcon className="h-7 w-6" />,
  },
  {
    name: "Ventas",
    href: "/ventas",
    icon: <CurrencyDollarIcon className="h-7 w-6" />,
  },
  {
    name: "Compras",
    href: "/compras",
    icon: <ShoppingCartIcon className="h-7 w-6" />,
  },
  {
    name: "Cobro de Créditos",
    href: "/credito-pagos",
    icon: <BanknotesIcon className="h-7 w-6" />,
  },

  {
    name: "Almacenes",
    href: "/almacenes",
    icon: <ArchiveBoxIcon className="h-7 w-6" />,
  },
  {
    name: "Productos",
    href: "/products",
    icon: <CubeIcon className="h-7 w-6" />,
  },
  {
    name: "Combos",
    href: "/combos",
    icon: <RectangleGroupIcon className="h-7 w-6" />,
  },
  {
    name: "Clientes",
    href: "/customers",
    icon: <UsersIcon className="h-7 w-6" />,
  },
  {
    name: "Reportes",
    href: "/reportes",
    icon: <ChartBarIcon className="h-7 w-6" />,
  },
  {
    name: "Registro Diario",
    href: "/movements",
    icon: <PencilSquareIcon className="h-7 w-6" />,
    children: [
      { name: "Cajas", href: "/movements/cajas" },
      { name: "Tipos de Gasto", href: "/movements/tiposgasto" },
      // { name: "Compras", href: "/movements/purchases" },
      { name: "Registro Diario Caja", href: "/movements/summary" },
    ],
  },
  {
    name: "Modificaciones",
    href: "/modifications",
    icon: <WrenchIcon className="h-7 w-6" />,
    children: [
      { name: "Facturas", href: "/facturas" },
      { name: "Ventas", href: "/modifications/ventas" },
      { name: "Compras", href: "/modifications/compras" },
      { name: "Inventario", href: "/inventario" },
    ],
  },
  {
    name: "Control de Acceso",
    href: "/access-control",
    icon: <KeyIcon className="h-7 w-6" />,
    children: [
      { name: "Locales", href: "/locales" },
      { name: "Usuarios", href: "/users" },
      { name: "Perfiles", href: "/perfiles" },
      { name: "Menús", href: "/menus" },
    ],
  },
];

interface NavItemProps {
  item: NavigationItem;
  level?: number;
}

function NavItem({ item, level = 0 }: NavItemProps) {
  const location = useLocation();
  const isActive = location.pathname === item.href;

  if (item.children) {
    return (
      <Disclosure as="div" defaultOpen={isActive}>
        {({ open }) => (
          <>
            <DisclosureButton
              className={`flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md ${
                isActive ? "bg-gray-700 text-white" : ""
              }`}
              style={{ paddingLeft: `${level * 12 + 12}px` }}
            >
              {level === 0 && <span className="mr-3 text-lg">{item.icon}</span>}
              <span className="flex-1 text-left">{item.name}</span>
              {open ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </DisclosureButton>
            <DisclosurePanel as="ul" className="space-y-1">
              {item.children &&
                item.children.map((child) => (
                  <li key={child.name}>
                    <NavItem item={child} level={level + 1} />
                  </li>
                ))}
            </DisclosurePanel>
          </>
        )}
      </Disclosure>
    );
  }

  return (
    <Link
      to={item.href}
      className={`flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white rounded-md ${
        isActive ? "bg-gray-700 text-white" : ""
      }`}
      style={{ paddingLeft: `${level * 12 + (level === 0 ? 12 : 24)}px` }}
    >
      {level === 0 && <span className="mr-3 text-lg">{item.icon}</span>}
      {item.name}
    </Link>
  );
}

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: Dispatch<SetStateAction<boolean>>;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <div
          className={`fixed inset-0 z-40 bg-gray-600 bg-opacity-75 transition-opacity ${
            mobileOpen ? "block" : "hidden"
          }`}
          onClick={() => setMobileOpen(false)}
        />

        <div
          className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform lg:relative lg:translate-x-0`}
        >
          <div className="flex h-full flex-col bg-gray-800">
            <div className="flex h-16 shrink-0 items-center justify-between px-4 bg-gray-900">
              <span className="text-white font-bold">SALVATORE</span>
              <button
                type="button"
                className="rounded-md text-gray-300 hover:text-white focus:outline-none"
                onClick={() => setMobileOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <nav className="px-2 py-4 space-y-1">
                {navigation.map((item) => (
                  <NavItem key={item.name} item={item} />
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar (siempre visible) */}
      <div
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex lg:flex-col bg-sidebar"
        style={{
          top: "64px",
          height: "calc(100vh - 64px)",
          // background: "#0F172A",
        }}
      >
        <div className="flex-1 overflow-y-auto">
          <nav className="px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
