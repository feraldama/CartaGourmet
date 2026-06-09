# Technow — Design System

Sistema de diseño para Technow (POS / gestión de ventas).
Estilo: **Trust Navy — Banking / Fintech Grade**. Referencias de producto: Toast, Square, Verifone, Quickbooks.

Implementado sobre **Tailwind 4** (`@theme`) + **Headless UI** + **Heroicons**. No requiere dependencias nuevas.

> **Nota de paleta**: la versión inicial usaba indigo SaaS (#4f46e5). Migramos a azul navy (#1d4ed8) por ser más conservador y reconocible como "software de mi negocio" frente al usuario final (cajero, dueño, contador). Los `-700` desaturados como default reducen fatiga visual en jornadas largas.

---

## 1. Principios

1. **Claridad sobre estilo.** Es una herramienta operativa: evitamos efectos decorativos (glassmorphism, gradientes hero, sombras coloreadas).
2. **Jerarquía fuerte.** Un solo botón primario por pantalla. El resto es secondary/outline/ghost.
3. **Estados semánticos inequívocos.** Dinero y operativa usan SIEMPRE los tokens `success` / `warning` / `danger` / `info`. No mezclar con colores raw (`bg-red-500`).
4. **Datos numéricos tabulares.** Montos, cantidades y totales usan `font-num` (Inter + `tabular-nums`) para que columnas de números se alineen.
5. **Densidad apropiada.** Tablas y formularios pueden ser densos; dashboards respiran.
6. **Accesibilidad real.** Foco visible por defecto, labels asociados, contraste AA mínimo.

---

## 2. Tokens — Colores

Todos los tokens viven en [src/App.css](src/App.css) dentro del bloque `@theme` y se exponen como utilidades de Tailwind (`bg-*`, `text-*`, `border-*`).

### Brand (Navy / Blue)

Acciones primarias, enlaces, foco, ítems activos.

| Token | Hex | Uso |
|---|---|---|
| `brand-50` | `#eff6ff` | Fondo ghost hover |
| `brand-100` | `#dbeafe` | Fondo ghost active, badges soft |
| `brand-700` | `#1d4ed8` | **Default** botón primario, links |
| `brand-800` | `#1e40af` | Hover botón primario |
| `brand-900` | `#1e3a8a` | Sidebar activo, active state |

### Superficie y neutros

3 niveles de superficie + 2 de borde + 4 de texto. La jerarquía permite que tablas densas y secciones anidadas no se planeen.

| Token | Hex | Uso |
|---|---|---|
| `surface` | `#ffffff` | Cards, navbar claro, modales |
| `surface-alt` | `#f7f9fc` | Fondo de página (warm slate) |
| `surface-sunken` | `#eef2f7` | **Filas alternas en tablas, secciones anidadas** |
| `surface-muted` | `#f1f5f9` | Botones secondary, bloques inactivos |
| `border` | `#d6dee9` | Bordes default (blue-tinted, fintech crisp) |
| `border-strong` | `#b8c4d2` | Bordes hover/focus, separadores enfatizados |
| `text-strong` | `#020617` | **Totales y montos críticos** (max contrast) |
| `text` | `#0f172a` | Texto primario |
| `text-muted` | `#475569` | Texto secundario, labels |
| `text-subtle` | `#94a3b8` | Placeholders, disabled, hints |
| `text-inverse` | `#ffffff` | Texto sobre fondos oscuros |
| `sidebar` | `#0b1426` | Fondo sidebar (navy con tinte cálido) |
| `sidebar-hover` | `#1a2540` | Sidebar item hover |
| `sidebar-active` | `#1e3a8a` | Sidebar item activo |

### Semánticos de estado

Reglas de uso en POS/ventas. **Default `-700` (desaturado)** para reducir fatiga visual en uso prolongado.

| Estado | Token default | Aplicar cuando |
|---|---|---|
| Success | `success-700` `#15803d` | Venta aprobada, cobro confirmado, apertura de caja OK, stock OK |
| Warning | `warning-700` `#b45309` | Crédito pendiente, por vencer, stock bajo |
| Danger | `danger-700` `#b91c1c` | Eliminar, anular venta, deuda vencida, error crítico |
| Info | `info-700` `#0369a1` | Avisos neutros, tips, badges informativos |

Cada estado tiene escalas `-50` / `-100` (fondos tinted para badges soft) y `-800` (hover en botones solid).

---

## 3. Tokens — Tipografía

| Familia | CSS | Uso |
|---|---|---|
| Display | `font-display` | H1–H3, nombre de marca, totales grandes de venta |
| UI | `font-ui` (default body) | Body, tablas, forms, menús, datos |
| Num | `.font-num` | Montos, cantidades, totales (activa `tabular-nums`) |

Fuentes: **Inter** (UI) + **Baloo 2** (display), cargadas desde Google Fonts en [index.html](index.html).

### Escala (Tailwind por defecto — no la sobreescribimos)

| Clase | Tamaño | Uso típico |
|---|---|---|
| `text-xs` | 12px | Labels, helpers, metadata |
| `text-sm` | 14px | Body denso, tablas |
| `text-base` | 16px | Body default |
| `text-lg` | 18px | Título de card |
| `text-xl` | 20px | Section heading |
| `text-2xl` | 24px | Page title |
| `text-3xl` | 30px | KPI grande |
| `text-4xl` | 36px | Monto de venta destacado (POS) |

### Pesos

`font-medium` (500) para labels y buttons. `font-semibold` (600) para títulos. `font-bold` (700) reservado para montos críticos y hero de POS.

---

## 4. Tokens — Radio, sombra, spacing, motion

### Radius

`rounded-sm` (4) • `rounded-md` (6, default buttons/inputs) • `rounded-lg` (8, cards/modales) • `rounded-xl` (12, elevated) • `rounded-full` (pills/avatars).

### Sombra (semánticas)

- `shadow-card` — cards estáticos
- `shadow-elevated` — cards hover / dropdowns
- `shadow-modal` — modales / popovers
- `shadow-focus` — anillos de foco (aplicado automáticamente)

### Spacing

Grid base de 4px (Tailwind default). **No inventar valores arbitrarios** tipo `p-[17px]`.

### Motion

- `duration-150` para hover/press
- `duration-200` para dropdowns / tabs
- `duration-300` para modales
- Easing: default (`ease-in-out`). No usar bounce/elastic en UI transaccional.

---

## 5. Componentes

Todos en [src/components/common/](src/components/common/). Exportación central:

```tsx
import { Button, Card, CardHeader, TextInput, Badge, StatCard } from "@/components/common/ui";
```

### Button

```tsx
<Button variant="primary" size="md">Cobrar</Button>
<Button variant="danger" leftIcon={TrashIcon}>Anular</Button>
<Button variant="outline" loading>Exportando…</Button>
<Button variant="ghost" size="sm">Cancelar</Button>
```

Variantes: `primary` (default) • `secondary` • `ghost` • `success` • `danger` • `warning` • `outline`.
Sizes: `sm` • `md` (default) • `lg` (recomendado para pantallas POS touch).

Props adicionales: `leftIcon`, `rightIcon`, `loading`, `fullWidth`.

**Regla:** una única acción `primary` por pantalla/modal. El resto usa `outline` o `ghost`. Eliminar/Anular usa `danger`. Confirmar pago usa `success`.

### TextInput

```tsx
<TextInput
  label="Monto"
  numeric
  leftIcon={CurrencyDollarIcon}
  placeholder="0"
  helperText="Efectivo o transferencia"
/>

<TextInput label="Cliente" error="Requerido" />
```

Props: `label`, `helperText`, `error`, `leftIcon`, `rightSlot`, `numeric` (tabular-nums + align right), `size`.

### Card + CardHeader

```tsx
<Card>
  <CardHeader
    title="Ventas del día"
    description="Cajas activas"
    actions={<Button variant="outline" size="sm">Exportar</Button>}
  />
  {/* contenido */}
</Card>
```

Props Card: `padding` (`none|sm|md|lg`), `elevation` (`flat|sm|md`).

### Badge

```tsx
<Badge tone="success">Pagado</Badge>
<Badge tone="warning" variant="soft">Pendiente</Badge>
<Badge tone="danger" variant="solid">Vencido</Badge>
<Badge tone="info" variant="dot">En proceso</Badge>
```

Tones: `neutral` • `brand` • `success` • `warning` • `danger` • `info`.
Variants: `soft` (default) • `solid` • `dot`.

### StatCard

```tsx
<StatCard
  label="Ventas de hoy"
  value="₲ 2.450.000"
  tone="success"
  icon={CurrencyDollarIcon}
  trend={{ direction: "up", label: "+12% vs ayer" }}
/>
```

---

## 6. Mapeo semántico de estados del dominio

Guía rápida para que estados de negocio usen siempre la misma paleta:

| Dominio | Estado | Tone |
|---|---|---|
| Venta | Emitida / Pagada | `success` |
| Venta | Crédito pendiente | `warning` |
| Venta | Anulada | `danger` |
| Crédito | Vigente | `info` |
| Crédito | Por vencer (7d) | `warning` |
| Crédito | Vencido | `danger` |
| Crédito | Cobrado | `success` |
| Caja | Abierta | `success` |
| Caja | Cerrada | `neutral` |
| Caja | Diferencia en arqueo | `danger` |
| Stock | Disponible | `success` |
| Stock | Bajo | `warning` |
| Stock | Agotado | `danger` |
| Factura | Emitida | `brand` |
| Factura | Anulada | `danger` |

---

## 7. Patrones

### Página estándar (CRUD con tabla)

```
┌─ Page Title + acción primaria (derecha)
├─ Card: filtros + búsqueda
└─ Card (padding=none): DataTable + paginación
```

### Pantalla POS (cobro)

- Layout a ancho completo (sin sidebar, ya hay logic en Layout.tsx).
- `font-display` para el total a cobrar (`text-4xl`/`text-5xl` + `font-num`).
- Botón `success size="lg"` para confirmar cobro.
- Teclado numérico con botones `outline` tamaño `lg`.

### Dashboard

- Grid de `StatCard` (4 columnas en desktop, 2 en tablet, 1 en mobile).
- Cada KPI usa el tono semántico que corresponde al negocio (ventas=success, pendientes=warning).
- Debajo: `Card` con gráfico o tabla de últimos movimientos.

### Modales / Forms

- Header con `title` + `description`.
- Body en grid `grid-cols-1 md:grid-cols-2 gap-4`.
- Footer alineado a la derecha: `Cancelar` (`outline`) + acción (`primary` o `success`).

---

## 8. Anti-patrones (evitar)

- ❌ `bg-blue-500`, `text-red-600`, etc. directamente en código nuevo. Usar tokens semánticos.
- ❌ Más de un botón primario por pantalla.
- ❌ Gradientes, blur decorativo, "glassmorphism", neumorfismo.
- ❌ Animaciones > 400ms en UI transaccional.
- ❌ Íconos de más de 24px dentro de botones.
- ❌ Mezclar familias tipográficas en el mismo bloque (elegí display o UI).
- ❌ Montos sin `.font-num` — se desalinean en columnas.
- ❌ Tablas sin hover-row y sin zebra — la densidad alta necesita ayudas visuales.

---

## 9. Migración desde el estado anterior

- `ActionButton` y `SearchButton` existentes siguen funcionando (no se tocaron). Para código nuevo, usar `Button` y `TextInput` del barrel `ui`.
- Literales tipo `bg-gray-800` para la sidebar podrían migrarse a `bg-sidebar` (ya exportado). El Sidebar actual ya usa `bg-sidebar` en el panel desktop.
- Los aliases `primary-*` se mantienen apuntando a los mismos hex que `brand-*` para no romper código legacy. Recomendado: en código nuevo usar `brand-*`.
- Migración Indigo → Trust Navy: ningún breaking change a nivel de clase (los nombres `bg-brand-700`, `text-success-700`, etc. existen igual). Solo cambia el valor del color.

---

## 10. Checklist antes de mergear una pantalla

- [ ] Sin colores raw (`red-600`, `blue-500`…) en lógica de dominio.
- [ ] Una sola acción primaria.
- [ ] Montos con `.font-num`.
- [ ] Estados con `Badge` semántico correcto (ver §6).
- [ ] Inputs con label asociado (o `aria-label`).
- [ ] Foco visible (no deshabilitar el outline).
- [ ] Tabla con hover row.
- [ ] Responsive: prueba en 1280 / 1024 / 768 / 375.
