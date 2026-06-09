import type { HTMLAttributes, ReactNode } from "react";

/**
 * Card — Technow Design System
 * Contenedor base para secciones (panel de filtros, tablas, bloques de KPIs).
 *
 * padding: none | sm | md | lg
 * elevation: flat | sm | md  (md para modales/overlays ligeros)
 */

type Padding = "none" | "sm" | "md" | "lg";
type Elevation = "flat" | "sm" | "md";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
  elevation?: Elevation;
  children?: ReactNode;
}

const paddings: Record<Padding, string> = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

const elevations: Record<Elevation, string> = {
  flat: "border border-border",
  sm: "shadow-card border border-border",
  md: "shadow-elevated border border-border",
};

export function Card({
  padding = "md",
  elevation = "sm",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={[
        "bg-surface rounded-lg",
        paddings[padding],
        elevations[elevation],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function CardHeader({
  title,
  description,
  actions,
  className = "",
  children,
  ...rest
}: CardHeaderProps) {
  return (
    <div
      {...rest}
      className={[
        "flex items-start justify-between gap-4 pb-4 mb-4 border-b border-border",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0">
        {title && (
          <h3 className="text-lg font-semibold text-text truncate">{title}</h3>
        )}
        {description && (
          <p className="mt-0.5 text-sm text-text-muted">{description}</p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

export default Card;
