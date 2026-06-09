import type { ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserGroupIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../contexts/useAuth";
import {
  Button,
  Card,
  CardHeader,
  StatCard,
  TextInput,
} from "../../components/common/ui";

interface QuickAccessProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  to?: string;
  active?: boolean;
}

function QuickAccess({
  icon: Icon,
  title,
  description,
  to,
  active = false,
}: QuickAccessProps) {
  const wrapper = "flex items-center gap-3 px-5 py-4 transition-colors min-w-0";

  const state = active
    ? "bg-brand-50"
    : to
    ? "hover:bg-surface-muted cursor-pointer"
    : "opacity-60";

  const iconBox = active
    ? "bg-brand-100 text-brand-700"
    : "bg-surface-muted text-text-muted";

  const titleColor = active ? "text-brand-700" : "text-text";

  const content = (
    <>
      <span
        className={`flex items-center justify-center w-10 h-10 rounded-md shrink-0 ${iconBox}`}
      >
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-medium truncate ${titleColor}`}>{title}</p>
        <p className="text-xs text-text-muted truncate">{description}</p>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`${wrapper} ${state} no-underline`}>
        {content}
      </Link>
    );
  }

  return <div className={`${wrapper} ${state}`}>{content}</div>;
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">
            Panel de Control
          </h1>
          {user && (
            <p className="text-sm text-text-muted mt-1">
              Hola,{" "}
              <span className="font-medium text-text">{user.nombre}</span>. Este
              es tu panel de administración.
            </p>
          )}
        </div>
        <Button leftIcon={PlusIcon} onClick={() => navigate("/ventas")}>
          Nueva venta
        </Button>
      </header>

      {/* KPIs */}
      <section
        aria-label="Resumen de métricas"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <StatCard
          label="Usuarios totales"
          value="25"
          tone="brand"
          icon={UserGroupIcon}
        />
        <StatCard
          label="Nuevos hoy"
          value="3"
          tone="warning"
          icon={UserPlusIcon}
          trend={{ direction: "up", label: "+3 vs ayer" }}
        />
        <StatCard
          label="Activos"
          value="18"
          tone="success"
          icon={CheckCircleIcon}
          hint="72% del total"
        />
        <StatCard
          label="Administradores"
          value="4"
          tone="info"
          icon={ShieldCheckIcon}
        />
      </section>

      {/* Búsqueda */}
      <Card>
        <CardHeader
          title="Búsqueda rápida"
          description="Encontrá usuarios, ventas o productos en todo el sistema"
        />
        <form
          onSubmit={(e) => e.preventDefault()}
          className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3"
        >
          <TextInput
            leftIcon={MagnifyingGlassIcon}
            placeholder="Buscar en el sistema..."
            size="lg"
            aria-label="Buscar en el sistema"
          />
          <Button type="submit" size="lg">
            Buscar
          </Button>
        </form>
      </Card>

      {/* Acceso rápido */}
      <Card padding="none">
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-lg font-semibold text-text">Acceso rápido</h3>
          <p className="mt-0.5 text-sm text-text-muted">
            Secciones principales del sistema
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border border-t border-border">
          <QuickAccess
            icon={ChartBarIcon}
            title="Resumen"
            description="Vista general del sistema"
            active
          />
          <QuickAccess
            icon={UserGroupIcon}
            title="Usuarios"
            description="Gestión de usuarios del sistema"
            to="/users"
          />
          <QuickAccess
            icon={DocumentChartBarIcon}
            title="Reportes"
            description="Generación de reportes"
            to="/reportes"
          />
          <QuickAccess
            icon={Cog6ToothIcon}
            title="Configuración"
            description="Ajustes del sistema"
          />
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;
