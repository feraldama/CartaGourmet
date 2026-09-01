# Migraciones de base de datos — CartaGourmet

Migraciones SQL para PostgreSQL. Los archivos se nombran por fecha
(`AAAA-MM-DD-descripcion.sql`) y se aplican **en orden cronológico**.

Todas son **idempotentes** (usan `ADD COLUMN IF NOT EXISTS`, etc.) y seguras de
re-ejecutar sobre una base con datos existentes.

## Cómo aplicar una migración en el servidor

```bash
psql "postgresql://USUARIO:PASSWORD@HOST:5432/cartagourmet" -f api/migration/<archivo>.sql
```

## Orden de despliegue (importante)

El acceso a datos usa un adaptador (`api/config/db.js`) que re-mapea los nombres
de columna a PascalCase usando `api/config/columnMap.js`. Cuando una migración
agrega columnas nuevas, esas claves deben estar registradas en `columnMap.js`
(clave en minúscula → nombre PascalCase). Para evitar errores intermedios:

1. **Primero** aplicar la migración SQL en la base.
2. **Después** desplegar el código nuevo (incluye el `columnMap.js` actualizado)
   y reiniciar el backend.

Así, desde el arranque, los `SELECT *` encuentran y mapean las columnas nuevas.

---

## Historial

### `2026-06-09-documento-tipo.sql` — Tipo de comprobante (Factura / Nota de Crédito)

Agrega:

- `venta.VentaDocumentoTipo` (`CHAR(2)`, default `'FA'`): tipo de comprobante de
  cada venta — `FA` (factura) o `NC` (nota de crédito). Backfill de las ventas
  existentes a `'FA'`.
- `factura.FacturaDocumentoTipo` (`CHAR(2)`, default `'FA'`): tipo de comprobante
  al que aplica cada rango de timbrado, para numerar FA y NC por separado.
  Backfill de los timbrados existentes a `'FA'`.

> Las columnas `VentaNroFactura` y `VentaTimbrado` (usadas por la numeración) ya
> existían; esta migración no las crea.

**Después de desplegar**, registrar en la pantalla **Facturas** al menos un
timbrado por tipo (uno `FA` y uno `NC`) con el rango `Desde/Hasta` que coincida
con los formularios preimpresos. Si no hay timbrado del tipo elegido, la venta se
rechaza con un mensaje claro.

### `2026-09-01-venta-asociada.sql` — Factura asociada a la Nota de Crédito (RG 90)

Agrega:

- `venta.VentaIdAsociada` (`BIGINT`, nullable): `VentaId` de la factura que una
  Nota de Crédito afecta. El registro de comprobantes de la RG 90 exige, para
  las NC, informar número y timbrado del comprobante de venta asociado; ambos se
  derivan de esta referencia. Las ventas existentes quedan en `NULL` (dato no
  disponible para NC históricas).

Usada por el reporte **Libro de ventas RG 90** (`GET /api/venta/reporte-rg90`),
que llena la hoja VENTAS de la planilla oficial (`api/assets/rg90-template.xlsx`)
con las ventas de un rango de fechas. El establecimiento y punto de expedición
del número de comprobante (`###-###-#######`) y las marcas de imputación se
configuran por entorno: `RG90_ESTABLECIMIENTO`, `RG90_PUNTO`, `RG90_IMPUTA_IVA`,
`RG90_IMPUTA_IRE`, `RG90_IMPUTA_IRP` (ver `api/config/rg90.js`).
