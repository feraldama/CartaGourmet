-- Migración: tipo de documento del cliente (RUC / Cédula de Identidad)
-- Fecha: 2026-09-01
--
-- Contexto: el registro de comprobantes de la RG 90 distingue el tipo de
-- identificación del comprador (Tabla 3): 11 = RUC, 12 = Cédula de Identidad.
-- El campo ClienteRUC guarda ambos indistintamente; esta columna indica cuál
-- es, para informarlo con el código correcto (Marangatu valida los RUC contra
-- su padrón y rechaza una CI informada como RUC).
--
-- Valores: 'RU' (RUC, default) o 'CI' (cédula). Backfill de los existentes a
-- 'RU', que replica el comportamiento previo del reporte.
--
-- NOTA: identificador SIN comillas a propósito (Postgres lo pliega a
-- minúscula). La clave se registra en config/columnMap.js.

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ClienteDocumentoTipo CHAR(2) DEFAULT 'RU';
UPDATE clientes SET ClienteDocumentoTipo = 'RU' WHERE ClienteDocumentoTipo IS NULL;
