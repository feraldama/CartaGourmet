-- Migración: venta asociada para Notas de Crédito (RG 90)
-- Fecha: 2026-09-01
--
-- Contexto: el registro de comprobantes de la RG 90 (SET/DNIT) exige, para las
-- Notas de Crédito (tipo 110), informar el número y timbrado del comprobante de
-- venta asociado (campos 18 y 19 del registro de VENTAS). Hasta ahora las NC se
-- emitían sin referencia a la factura original; esta columna guarda el VentaId
-- de la factura que la NC afecta, y del que se derivan nro/timbrado asociados.
--
-- NOTA: identificador SIN comillas a propósito (Postgres lo pliega a minúscula,
-- igual que el resto del esquema). La clave se registra en config/columnMap.js
-- para que el shim devuelva el CamelCase.

ALTER TABLE venta ADD COLUMN IF NOT EXISTS VentaIdAsociada BIGINT;
