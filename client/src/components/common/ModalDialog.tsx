import { useEffect } from "react";
import type { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * ModalDialog — Carta Gourmet Design System
 * Shell de modal reutilizable: backdrop con scrim, panel sobre `surface`,
 * cabecera con título + cierre accesible, cuerpo con scroll y footer opcional.
 *
 * Centraliza el patrón que antes se copiaba en cada modal (ClienteFormModal,
 * ProveedorModal, PagoModal, etc.). Incluye:
 *  - Cierre con tecla Escape
 *  - Bloqueo de scroll del body mientras está abierto
 *  - Cierre al hacer click en el backdrop (configurable)
 */

type Size = "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";

const sizeClasses: Record<Size, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
};

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Acciones extra en la cabecera, a la derecha del título (ej. "Crear nuevo"). */
  headerActions?: ReactNode;
  children: ReactNode;
  /** Footer opcional con borde superior (ej. botones Guardar/Cancelar). */
  footer?: ReactNode;
  size?: Size;
  /** Cerrar al hacer click fuera del panel. Default: true. */
  closeOnBackdrop?: boolean;
}

export default function ModalDialog({
  open,
  onClose,
  title,
  headerActions,
  children,
  footer,
  size = "2xl",
  closeOnBackdrop = true,
}: ModalDialogProps) {
  // Cerrar con Escape + bloquear scroll del body mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${sizeClasses[size]} flex-col rounded-xl bg-surface shadow-modal`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || headerActions) && (
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
            {title ? (
              <h2 className="font-display text-xl font-semibold text-text-strong">
                {title}
              </h2>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-surface-muted hover:text-text"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
