/**
 * Technow Design System — Barrel export de componentes UI.
 * Importá desde aquí para no depender de rutas internas:
 *   import { Button, Card, TextInput, Badge, StatCard } from "@/components/common/ui";
 */
export { default as Button } from "./Button/Button";
export type { ButtonProps } from "./Button/Button";

export { default as TextInput } from "./Input/TextInput";
export type { TextInputProps } from "./Input/TextInput";

export { Card, CardHeader } from "./Card/Card";
export type { CardProps, CardHeaderProps } from "./Card/Card";

export { default as Badge } from "./Badge/Badge";
export type { BadgeProps } from "./Badge/Badge";

export { default as StatCard } from "./StatCard/StatCard";
export type { StatCardProps } from "./StatCard/StatCard";

export {
  LoadingState,
  ErrorState,
  EmptyState,
  PermissionDenied,
} from "./States/States";
export type {
  LoadingStateProps,
  ErrorStateProps,
  EmptyStateProps,
  PermissionDeniedProps,
} from "./States/States";
