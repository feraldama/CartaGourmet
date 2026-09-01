// Códigos y configuración del Registro de Comprobantes RG 90/2021 (SET/DNIT).
// Fuente: "Especificación Técnica para Importación Registro de Comprobantes"
// (Marangatu, versión 06/2021) — tablas de códigos 1 a 5.
require("dotenv").config();

module.exports = {
  // Tabla 1: tipo de registro
  TIPO_REGISTRO_VENTAS: 1,

  // Tabla 3: tipo de identificación del comprador
  IDENTIFICACION_RUC: 11,
  IDENTIFICACION_CEDULA: 12,
  IDENTIFICACION_SIN_NOMBRE: 15,

  // Comprador sin RUC informado: se registra como "SIN NOMBRE" (tipo 15).
  // Para ese tipo el nombre no es requerido; el número se informa como 0.
  SIN_NOMBRE_NUMERO: "0",
  SIN_NOMBRE_RAZON_SOCIAL: "SIN NOMBRE",

  // Tabla 4: tipo de comprobante (VentaDocumentoTipo -> código SET)
  COMPROBANTE_POR_DOCUMENTO_TIPO: {
    FA: 109, // FACTURA
    NC: 110, // NOTA DE CRÉDITO
  },

  // Tabla 2: condición de la operación
  CONDICION_CONTADO: 1,
  CONDICION_CREDITO: 2,

  // Número de comprobante formato ###-###-#######: la BD guarda solo el
  // correlativo (VentaNroFactura); establecimiento y punto de expedición se
  // configuran por variables de entorno (RG90_ESTABLECIMIENTO / RG90_PUNTO).
  ESTABLECIMIENTO: (process.env.RG90_ESTABLECIMIENTO || "001").padStart(3, "0"),
  PUNTO_EXPEDICION: (process.env.RG90_PUNTO || "001").padStart(3, "0"),

  // Tasa de IVA asumida cuando las líneas de la venta no tienen desglose
  // (productos sin ProductoIVA cargado): 10 es la tasa general del rubro
  // gastronómico. Valores admitidos: 10, 5 o 0 (exento).
  IVA_POR_DEFECTO: Number(process.env.RG90_IVA_DEFECTO || 10),

  // Tabla 5 (S/N): a qué obligaciones imputa cada comprobante. Configurable
  // por entorno según las obligaciones del contribuyente (IVA general por
  // defecto; IRE/IRP según corresponda).
  IMPUTA_IVA: process.env.RG90_IMPUTA_IVA || "S",
  IMPUTA_IRE: process.env.RG90_IMPUTA_IRE || "N",
  IMPUTA_IRP: process.env.RG90_IMPUTA_IRP || "N",

  // Formatea el número de comprobante EST-PUNTO-NNNNNNN (7 dígitos).
  formatNroComprobante(correlativo, establecimiento, punto) {
    const nro = Number(correlativo) || 0;
    const est = (establecimiento || module.exports.ESTABLECIMIENTO).padStart(3, "0");
    const pun = (punto || module.exports.PUNTO_EXPEDICION).padStart(3, "0");
    return `${est}-${pun}-${String(nro).padStart(7, "0")}`;
  },
};
