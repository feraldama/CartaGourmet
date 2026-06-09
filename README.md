# CartaGourmet

Sistema de punto de venta (POS) y gestión comercial: ventas, productos, stock por almacén, clientes, caja diaria, compras, créditos y emisión de comprobantes (Factura / Nota de Crédito).

- **`api/`** — Backend REST en **Node.js + Express 5** sobre **PostgreSQL** (acceso vía el adaptador `api/config/db.js`, que expone la API de `mysql2` sobre `pg`). Auth con JWT.
- **`client/`** — Frontend en **React 19 + Vite 6 + TypeScript**, estilado **solo con Tailwind CSS v4**.

> Este proyecto usa **siempre `pnpm`** (nunca `npm` ni `yarn`).

## Requisitos

- Node.js ≥ 18 · pnpm ≥ 9 · PostgreSQL ≥ 13

## Puesta en marcha (desarrollo)

```bash
# Instalar dependencias
cd api && pnpm install
cd ../client && pnpm install

# Configurar entorno (completar los valores)
cp api/.env.example api/.env
cp client/.env.example client/.env
```

Aplicar las migraciones SQL de `api/migration/` (ver `api/migration/README.md`).

```bash
# Levantar
cd api && pnpm dev        # backend  -> http://localhost:3025
cd client && pnpm dev     # frontend -> http://localhost:3026
```

## Scripts

| Carpeta  | Script         | Acción                                |
| -------- | -------------- | ------------------------------------- |
| `api`    | `pnpm dev`     | Backend con recarga (`nodemon`)       |
| `api`    | `pnpm start`   | Backend en producción (`node`)        |
| `client` | `pnpm dev`     | Servidor de desarrollo Vite           |
| `client` | `pnpm build`   | Typecheck + build de producción       |
| `client` | `pnpm lint`    | ESLint                                |

## Comprobantes: Factura / Nota de Crédito

Al confirmar una venta se emite un comprobante: por defecto **Factura**, o **Nota de Crédito** si se elige en el modal de pago. El tipo se guarda en la venta para diferenciar en el historial y los filtros.

- Cada tipo (FA/NC) consume el próximo correlativo de su **timbrado** (pantalla **Facturas**). El papel es **preimpreso**: el sistema registra el número/timbrado pero no lo dibuja.
- Impresión automática al confirmar; la hoja A4 lleva **2 comprobantes idénticos** (cliente y empresa).
- **Antes de facturar** hay que registrar al menos un timbrado por tipo (FA y NC). Si falta el del tipo elegido, la venta se rechaza.
