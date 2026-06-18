# Reglas del proyecto CartaGourmet

## Gestor de paquetes
- **Usar SIEMPRE `pnpm`. NUNCA usar `npm` (ni `yarn`).**
- Instalar dependencias: `pnpm install`. Agregar: `pnpm add <paquete>`.
- Ejecutar scripts: `pnpm <script>` (ej. `pnpm dev`, `pnpm build`), tanto en `client/` como en `api/`.
- El lockfile válido del frontend es `pnpm-lock.yaml`; no generar `package-lock.json`.

## Base de datos
- **NUNCA ejecutar un seed (ni scripts de seed/`pnpm seed`, fixtures, `db:seed`, etc.) sin consultar y obtener confirmación explícita del usuario primero.** Un seed puede sobrescribir o borrar datos reales de la base. Ante la duda, preguntar antes de correr cualquier comando que escriba/reinicie datos.
