import type {
  ButtonHTMLAttributes,
  ComponentType,
  ReactNode,
} from "react";

/**
 * Button — Technow Design System
 * Variantes pensadas para flujos de POS/gestión. Úsalo en lugar de <button>
 * crudo o ActionButton cuando necesites jerarquía semántica clara.
 *
 * variant:
 *   - primary   acción principal de la pantalla (Guardar venta, Cobrar)
 *   - secondary acción alternativa (Cancelar, Volver)
 *   - ghost     acción terciaria sobre fondo claro (links tipo "Ver más")
 *   - success   confirmar cobro / aprobar
 *   - danger    eliminar / anular / revertir
 *   - warning   advertencia (pendiente, por vencer)
 *   - outline   acción neutra con borde (filtros, descargar)
 *
 * size:
 *   - sm   densidad alta (barras de herramientas, tablas)
 *   - md   por defecto
 *   - lg   acciones cruciales de pantallas tipo POS touch
 */

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "success"
  | "danger"
  | "warning"
  | "outline";

type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: ComponentType<{ className?: string }>;
  rightIcon?: ComponentType<{ className?: string }>;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none";

const sizes: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm cursor-pointer",
  secondary:
    "bg-surface-muted text-text hover:bg-border active:bg-border-strong cursor-pointer",
  ghost:
    "bg-transparent text-brand-700 hover:bg-brand-50 active:bg-brand-100 cursor-pointer",
  success:
    "bg-success-700 text-white hover:bg-success-800 active:bg-success-800 shadow-sm cursor-pointer",
  danger:
    "bg-danger-700 text-white hover:bg-danger-800 active:bg-danger-800 shadow-sm cursor-pointer",
  warning:
    "bg-warning-700 text-white hover:bg-warning-800 active:bg-warning-800 shadow-sm cursor-pointer",
  outline:
    "bg-surface text-text border border-border hover:bg-surface-muted hover:border-border-strong cursor-pointer",
};

const iconSizeByButtonSize: Record<Size, string> = {
  sm: "w-4 h-4",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export default function Button({
  variant = "primary",
  size = "md",
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const iconClass = iconSizeByButtonSize[size];
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[
        base,
        sizes[size],
        variants[variant],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading && (
        <svg
          className={`${iconClass} animate-spin`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-25"
          />
          <path
            d="M4 12a8 8 0 018-8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-75"
          />
        </svg>
      )}
      {!loading && LeftIcon && <LeftIcon className={iconClass} />}
      {children}
      {!loading && RightIcon && <RightIcon className={iconClass} />}
    </button>
  );
}
