import { forwardRef } from "react";
import type { ComponentType, InputHTMLAttributes, ReactNode } from "react";

/**
 * TextInput — Technow Design System
 * Input de texto con label, helper y estados de error.
 * Para búsquedas rápidas con botón acoplado, seguí usando SearchButton.
 */

type Size = "sm" | "md" | "lg";

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: ReactNode;
  error?: string;
  leftIcon?: ComponentType<{ className?: string }>;
  rightSlot?: ReactNode;
  size?: Size;
  /**
   * Usar cuando el campo contiene montos o cantidades:
   * activa tabular-nums y alinea a la derecha.
   */
  numeric?: boolean;
}

const sizeClasses: Record<Size, string> = {
  sm: "text-xs py-1.5",
  md: "text-sm py-2",
  lg: "text-base py-2.5",
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    label,
    helperText,
    error,
    leftIcon: LeftIcon,
    rightSlot,
    size = "md",
    numeric = false,
    className = "",
    id,
    disabled,
    ...rest
  },
  ref
) {
  const autoId = id ?? `ti-${Math.random().toString(36).slice(2, 9)}`;
  const describedBy = error
    ? `${autoId}-error`
    : helperText
    ? `${autoId}-help`
    : undefined;

  const base =
    "w-full bg-surface border rounded-md text-text placeholder:text-text-subtle transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-600/30";
  const border = error
    ? "border-danger-500 focus:border-danger-600"
    : "border-border focus:border-brand-600 hover:border-border-strong";
  const padding = LeftIcon ? "pl-9 pr-3" : "px-3";
  const numClasses = numeric ? "font-num text-right" : "";
  const disabledClasses = disabled ? "bg-surface-muted cursor-not-allowed" : "";

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={autoId}
          className="block text-xs font-medium text-text-muted mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <LeftIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
        )}
        <input
          ref={ref}
          id={autoId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            base,
            sizeClasses[size],
            border,
            padding,
            numClasses,
            disabledClasses,
            rightSlot ? "pr-10" : "",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {rightSlot}
          </div>
        )}
      </div>
      {error ? (
        <p id={`${autoId}-error`} className="mt-1 text-xs text-danger-600">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${autoId}-help`} className="mt-1 text-xs text-text-subtle">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default TextInput;
