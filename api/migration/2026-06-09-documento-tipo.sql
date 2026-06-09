-- Migración: tipo de comprobante (Factura / Nota de Crédito)
-- Fecha: 2026-06-09
--
-- Contexto: la venta puede emitirse como Factura ('FA') o Nota de Crédito ('NC').
-- Se guarda el tipo en `venta` para diferenciar facturados vs notas de crédito,
-- y se reutilizan las columnas existentes VentaNroFactura / VentaTimbrado para
-- almacenar el correlativo y el timbrado asignados (hoy se insertan en 0).
--
-- La tabla `factura` administra rangos de timbrado; se le agrega el tipo para
-- poder registrar rangos/correlativos separados por tipo de comprobante (la NC
-- lleva timbrado y numeración propios).
--
-- NOTA: los identificadores van SIN comillas a propósito: Postgres los pliega a
-- minúscula, igual que el resto del esquema migrado desde MySQL. Las claves se
-- registran en config/columnMap.js para que el shim devuelva el CamelCase.

-- venta: tipo de comprobante de cada venta
ALTER TABLE venta ADD COLUMN IF NOT EXISTS VentaDocumentoTipo CHAR(2) DEFAULT 'FA';
UPDATE venta SET VentaDocumentoTipo = 'FA' WHERE VentaDocumentoTipo IS NULL;

-- factura (timbrados): tipo de comprobante al que aplica el rango
ALTER TABLE factura ADD COLUMN IF NOT EXISTS FacturaDocumentoTipo CHAR(2) DEFAULT 'FA';
UPDATE factura SET FacturaDocumentoTipo = 'FA' WHERE FacturaDocumentoTipo IS NULL;
