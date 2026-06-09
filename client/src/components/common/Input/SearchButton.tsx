import React, { useEffect, useRef } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import ActionButton from "../Button/ActionButton";

/**
 * SearchButton — buscador inline para listados/CRUDs.
 *
 * API mantenida por compatibilidad con páginas existentes (Almacenes, Productos,
 * Customers, etc.). Estilos migrados al design system Trust Navy:
 *   - Wrapper transparente (se integra con el fondo de la página)
 *   - Input con tokens (border, text, focus) en lugar de colores raw
 *   - Ícono con text-text-subtle
 *
 * Comportamiento:
 *   - Auto-focus al montarse: como muchas páginas hacen `if (loading) return ...`
 *     que desmonta este componente durante el fetch, el remount le devuelve el
 *     foco al usuario para que pueda seguir tipeando sin clickear.
 *   - Auto-search debounceado (default 500ms) al tipear: dispara onSearchSubmit
 *     cuando el usuario deja de escribir.
 *   - Enter o click en "Buscar" disparan inmediatamente y cancelan el pending.
 *   - Pasar `debounceMs={0}` desactiva el auto-search.
 *   - Pasar `autoFocus={false}` desactiva el auto-focus en el mount.
 */

interface SearchButtonProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  placeholder?: string;
  className?: string;
  hideButton?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /**
   * Milisegundos de espera tras el último cambio del input antes de disparar
   * onSearchSubmit automáticamente. Default 500ms. 0 para desactivar.
   */
  debounceMs?: number;
  /**
   * Si true (default), enfoca el input cada vez que el componente se monta.
   * En las páginas actuales esto equivale a "cada render" porque el patrón
   * `if (loading) return ...` desmonta y remonta el SearchButton en cada
   * fetch / cambio de página / sort.
   */
  autoFocus?: boolean;
}

export default function SearchButton({
  searchTerm,
  onSearch,
  onKeyPress,
  onSearchSubmit,
  placeholder = "Buscar...",
  hideButton = false,
  inputRef,
  debounceMs = 500,
  autoFocus = true,
}: SearchButtonProps) {
  // Ref al último callback — las páginas no memoizan onSearchSubmit, así que
  // no podemos meterlo en las deps de useEffect sin romper el debounce.
  const submitRef = useRef(onSearchSubmit);
  useEffect(() => {
    submitRef.current = onSearchSubmit;
  });

  // Ref al input. Si la página pasó uno externo lo respetamos; si no, usamos
  // este interno para poder enfocar automáticamente.
  const internalInputRef = useRef<HTMLInputElement | null>(null);
  const effectiveInputRef = inputRef ?? internalInputRef;

  // Auto-focus al montar. En la práctica eso significa "cada render de la
  // página" porque las páginas remontan este componente tras cada fetch.
  useEffect(() => {
    if (!autoFocus) return;
    effectiveInputRef.current?.focus();
    // Posicionar cursor al final por si ya hay texto (preserva la experiencia
    // tras un remount post-búsqueda donde searchTerm viene del estado padre).
    const el = effectiveInputRef.current;
    if (el && el.value) {
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guarda el último `searchTerm` procesado. Comparar contra este valor hace
  // que el efecto sea idempotente ante StrictMode (doble invocación en dev) y
  // ante remounts del componente — sin la guarda, ambos escenarios disparan un
  // submit fantasma que resetea la paginación de la página padre.
  const lastSearchTermRef = useRef(searchTerm);

  // Auto-search debounceado al cambiar el searchTerm.
  useEffect(() => {
    if (lastSearchTermRef.current === searchTerm) return;
    lastSearchTermRef.current = searchTerm;

    if (debounceMs <= 0) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      submitRef.current();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [searchTerm, debounceMs]);

  // Disparo manual (Enter / botón Buscar): cancelar pending y ejecutar ya.
  const flushAndSubmit = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onSearchSubmit();
  };

  return (
    <div className="flex items-center flex-row flex-wrap py-4 sm:max-w-full lg:max-w-xl gap-2">
      <div className="relative flex-1 min-w-0">
        <MagnifyingGlassIcon
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          id="table-search-users"
          className="block w-full pl-9 pr-4 py-2 text-sm text-text placeholder:text-text-subtle bg-surface border border-border rounded-md transition-colors hover:border-border-strong focus:outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            const value = e.target.value;
            // No permitir que el primer carácter sea un 0
            if (value.startsWith("0")) {
              // Si comienza con 0, remover el 0 del inicio
              const cleanValue = value.replace(/^0+/, "");
              onSearch(cleanValue);
            } else {
              onSearch(value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              flushAndSubmit();
            }
            if (onKeyPress) {
              onKeyPress(e);
            }
          }}
          ref={effectiveInputRef}
        />
      </div>
      {!hideButton && (
        <ActionButton
          label="Buscar"
          onClick={flushAndSubmit}
          className="text-white rounded-md shrink-0"
        />
      )}
    </div>
  );
}
