import type { ComponentType, ReactNode } from "react";

/**
 * StatCard — Technow Design System
 * Tarjeta de KPI para dashboards (ventas del día, caja, pendientes, etc.).
 *
 * Regla: el valor numérico SIEMPRE con tabular-nums (aplicado automáticamente).
 *
 * tone: neutral | brand | success | warning | danger | info
 */

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: Tone;
  trend?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
  onClick?: () => void;
  className?: string;
}

const accents: Record<Tone, { bar: string; icon: string; value: string }> = {
  neutral: {
    bar: "bg-text-subtle",
    icon: "bg-surface-muted text-text-muted",
    value: "text-text",
  },
  brand: {
    bar: "bg-brand-600",
    icon: "bg-brand-50 text-brand-700",
    value: "text-brand-700",
  },
  success: {
    bar: "bg-success-600",
    icon: "bg-success-50 text-success-700",
    value: "text-success-700",
  },
  warning: {
    bar: "bg-warning-500",
    icon: "bg-warning-50 text-warning-700",
    value: "text-warning-700",
  },
  danger: {
    bar: "bg-danger-600",
    icon: "bg-danger-50 text-danger-700",
    value: "text-danger-700",
  },
  info: {
    bar: "bg-info-600",
    icon: "bg-info-50 text-info-700",
    value: "text-info-700",
  },
};

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  trend,
  onClick,
  className = "",
}: StatCardProps) {
  const a = accents[tone];

  const trendColor =
    trend?.direction === "up"
      ? "text-success-700"
      : trend?.direction === "down"
      ? "text-danger-600"
      : "text-text-subtle";

  const trendSymbol =
    trend?.direction === "up" ? "▲" : trend?.direction === "down" ? "▼" : "•";

  const isInteractive = Boolean(onClick);
  const Wrapper = isInteractive ? "button" : "div";

  return (
    <Wrapper
      onClick={onClick}
      className={[
        "relative text-left w-full bg-surface rounded-lg border border-border shadow-card overflow-hidden",
        isInteractive
          ? "transition-colors hover:border-border-strong hover:shadow-elevated cursor-pointer"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${a.bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {label}
          </p>
          <p
            className={`mt-2 font-num text-3xl font-semibold leading-none ${a.value}`}
          >
            {value}
          </p>
          {(hint || trend) && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {trend && (
                <span className={`font-medium ${trendColor}`}>
                  {trendSymbol} {trend.label}
                </span>
              )}
              {hint && <span className="text-text-subtle">{hint}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <span
            className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-md ${a.icon}`}
          >
            <Icon className="w-5 h-5" />
          </span>
        )}
      </div>
    </Wrapper>
  );
}
