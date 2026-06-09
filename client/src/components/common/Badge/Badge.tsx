import type { HTMLAttributes, ReactNode } from "react";

/**
 * Badge — Technow Design System
 * Indicador de estado pequeño. Pensado para estados de venta, cobro, stock.
 *
 * tone:
 *   - neutral   genérico
 *   - brand     resaltar estado nuevo/destacado
 *   - success   pagado, aprobado, en stock
 *   - warning   pendiente, por vencer, stock bajo
 *   - danger    anulado, vencido, sin stock
 *   - info      informativo
 *
 * variant:
 *   - soft   fondo tinted + texto oscuro  (default, fintech-friendly)
 *   - solid  fondo saturado + texto blanco (altos contrastes)
 *   - dot    solo puntito + label
 */

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
type Variant = "soft" | "solid" | "dot";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: Variant;
  children?: ReactNode;
}

const soft: Record<Tone, string> = {
  neutral: "bg-surface-muted text-text-muted",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  info: "bg-info-50 text-info-700",
};

const solid: Record<Tone, string> = {
  neutral: "bg-text-muted text-white",
  brand: "bg-brand-700 text-white",
  success: "bg-success-700 text-white",
  warning: "bg-warning-700 text-white",
  danger: "bg-danger-700 text-white",
  info: "bg-info-700 text-white",
};

const dotColor: Record<Tone, string> = {
  neutral: "bg-text-subtle",
  brand: "bg-brand-700",
  success: "bg-success-700",
  warning: "bg-warning-700",
  danger: "bg-danger-700",
  info: "bg-info-700",
};

export default function Badge({
  tone = "neutral",
  variant = "soft",
  className = "",
  children,
  ...rest
}: BadgeProps) {
  if (variant === "dot") {
    return (
      <span
        {...rest}
        className={[
          "inline-flex items-center gap-1.5 text-xs font-medium text-text-muted",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor[tone]}`} />
        {children}
      </span>
    );
  }

  const palette = variant === "solid" ? solid[tone] : soft[tone];

  return (
    <span
      {...rest}
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        palette,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
