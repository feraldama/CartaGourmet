# Reglas del proyecto CartaGourmet

## Gestor de paquetes
- **Usar SIEMPRE `pnpm`. NUNCA usar `npm` (ni `yarn`).**
- Instalar dependencias: `pnpm install`. Agregar: `pnpm add <paquete>`.
- Ejecutar scripts: `pnpm <script>` (ej. `pnpm dev`, `pnpm build`), tanto en `client/` como en `api/`.
- El lockfile válido del frontend es `pnpm-lock.yaml`; no generar `package-lock.json`.
