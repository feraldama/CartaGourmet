import type { ComponentType, ReactNode } from "react";
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import Button from "../Button/Button";

/**
 * States — Technow Design System
 *
 * Componentes para reemplazar los `<div>Cargando...</div>` y
 * `<div>Error: ...</div>` planos que aparecen en las páginas CRUD.
 *
 * - LoadingState   : spinner centrado mientras se carga data
 * - ErrorState     : ícono + mensaje + retry para fallos de red/server
 * - EmptyState     : sin resultados / sin permisos / pantalla vacía
 *
 * Todos respetan el design system (colores, tipografías, sombras) y se
 * centran verticalmente en el área de contenido disponible.
 */

// ---------- LoadingState -------------------------------------------------

export interface LoadingStateProps {
  /** Texto opcional bajo el spinner. Default: "Cargando..." */
  message?: string;
  /** Si false, se muestra inline en lugar de ocupar la altura completa. */
  fullPage?: boolean;
}

export function LoadingState({
  message = "Cargando...",
  fullPage = true,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "flex flex-col items-center justify-center gap-3 text-center",
        fullPage ? "min-h-[60vh]" : "py-10",
      ].join(" ")}
    >
      <svg
        className="w-8 h-8 text-brand-700 animate-spin"
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
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

// ---------- ErrorState ---------------------------------------------------

export interface ErrorStateProps {
  /** Default: "Algo salió mal" */
  title?: string;
  /** Detalle del error. Si es "Error desconocido" se reemplaza por un mensaje más amable. */
  message?: string;
  /** Si se pasa, se muestra un botón "Reintentar" que lo invoca. */
  onRetry?: () => void;
  /** Texto del botón retry. Default: "Reintentar" */
  retryLabel?: string;
}

export function ErrorState({
  title = "Algo salió mal",
  message,
  onRetry,
  retryLabel = "Reintentar",
}: ErrorStateProps) {
  // Mensaje por defecto más amable que "Error desconocido".
  const friendlyMessage =
    !message || message === "Error desconocido"
      ? "No pudimos cargar la información. Verificá tu conexión e intentá de nuevo."
      : message;

  return (
    <div
      role="alert"
      className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4"
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-danger-50 text-danger-700">
        <ExclamationTriangleIcon className="w-7 h-7" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-1">
        <h2 className="font-display text-lg font-semibold text-text">
          {title}
        </h2>
        <p className="text-sm text-text-muted">{friendlyMessage}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

// ---------- EmptyState ---------------------------------------------------

export interface EmptyStateProps {
  /** Ícono opcional. Default: InboxIcon (caja vacía) */
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  /** Slot opcional para un botón / link de acción ("Crear primero", etc.) */
  action?: ReactNode;
  /** Si false, se renderiza inline (sin min-height). Default: true */
  fullPage?: boolean;
}

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  action,
  fullPage = true,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-4 text-center px-4",
        fullPage ? "min-h-[60vh]" : "py-12",
      ].join(" ")}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-muted text-text-muted">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>
      <div className="max-w-md space-y-1">
        <h2 className="font-display text-lg font-semibold text-text">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ---------- PermissionDenied (preset de EmptyState) ----------------------

export interface PermissionDeniedProps {
  /** Qué quiso ver el usuario, ej. "los productos". */
  resource?: string;
}

/**
 * Atajo para "no tenés permiso para ver X". Internamente es un EmptyState con
 * ícono de candado y copy específico — evita repetir copy entre páginas.
 */
export function PermissionDenied({
  resource = "esta sección",
}: PermissionDeniedProps) {
  return (
    <EmptyState
      icon={LockClosedIcon}
      title="Acceso restringido"
      description={
        <>
          No tenés permisos para ver <strong>{resource}</strong>. Si pensás que
          deberías acceder, contactá al administrador del sistema.
        </>
      }
    />
  );
}
