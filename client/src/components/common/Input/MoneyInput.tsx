import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, FocusEvent } from "react";
import { formatMiles, formatMilesWithDecimals } from "../../../utils/utils";

/**
 * MoneyInput — Carta Gourmet Design System
 * Input para montos: muestra el valor con separador de miles (es-ES) y
 * devuelve siempre un `number` por `onValueChange`. Úsalo en TODO input que
 * represente dinero (precios, montos, costos, saldos) para mantener consistencia.
 *
 * - decimals=false (default): enteros tipo guaraníes → "15.000".
 * - decimals=true: permite 2 decimales; al enfocar muestra el valor crudo
 *   para editar cómodo y al salir lo vuelve a formatear → "1.000,00".
 */
interface MoneyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | undefined;
  onValueChange: (value: number) => void;
  decimals?: boolean;
}

const baseClass =
  "bg-surface-muted border border-border text-text text-sm rounded-lg font-num focus:ring-2 focus:ring-brand-600/30 focus:border-brand-700 block w-full p-2.5";

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput(
    { value, onValueChange, decimals = false, className = "", onFocus, onBlur, ...rest },
    ref
  ) {
    const [focused, setFocused] = useState(false);

    const display = decimals
      ? focused
        ? value
          ? String(value)
          : ""
        : value
        ? formatMilesWithDecimals(value)
        : ""
      : value
      ? formatMiles(value)
      : "";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (decimals) {
        let raw = e.target.value.replace(/[^\d.]/g, "");
        const parts = raw.split(".");
        if (parts.length > 2) raw = parts[0] + "." + parts.slice(1).join("");
        const num = raw === "" || raw === "." ? 0 : parseFloat(raw);
        onValueChange(isNaN(num) ? 0 : num);
      } else {
        const raw = e.target.value.replace(/\D/g, "");
        onValueChange(raw === "" ? 0 : Number(raw));
      }
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode={decimals ? "decimal" : "numeric"}
        value={display}
        onChange={handleChange}
        onFocus={(e: FocusEvent<HTMLInputElement>) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e: FocusEvent<HTMLInputElement>) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className={`${baseClass} ${className}`.trim()}
        {...rest}
      />
    );
  }
);

export default MoneyInput;
