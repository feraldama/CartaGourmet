import axios, { type AxiosResponse } from "axios";

/**
 * Llama a un endpoint SOAP del backend GeneXus.
 *
 * - Arma el Envelope SOAP estándar.
 * - Convierte a XML con `xml-js` (lazy-loaded para que no entre al bundle
 *   inicial del cliente).
 * - Hace POST con `Content-Type: text/xml`.
 *
 * Reemplaza el patrón duplicado que existía en Sales, Compras, ComprasPage,
 * VentasPage y CreditoPagosPage.
 */
export interface GenexusSoapOptions {
  /** Path del servlet, ej: `"apventaconfirmarws"`. */
  endpoint: string;
  /** Operación completa incluyendo el servlet prefix, ej: `"PVentaConfirmarWS.VENTACONFIRMAR"`. */
  operation: string;
  /** Namespace XML, ej: `"TechNow"` o `"Tech"`. */
  namespace: string;
  /** Contenido del request que va dentro del operation element. */
  payload: Record<string, unknown>;
}

export async function callGenexusSoap({
  endpoint,
  operation,
  namespace,
  payload,
}: GenexusSoapOptions): Promise<AxiosResponse> {
  // Import dinámico: `xml-js` queda en su propio chunk y solo se baja la
  // primera vez que se confirma una venta/compra/pago.
  const { js2xml } = await import("xml-js");

  const json = {
    Envelope: {
      _attributes: { xmlns: "http://schemas.xmlsoap.org/soap/envelope/" },
      Body: {
        [operation]: {
          _attributes: { xmlns: namespace },
          ...payload,
        },
      },
    },
  };

  const xml = js2xml(json, {
    compact: true,
    ignoreComment: true,
    spaces: 4,
  });

  const url =
    import.meta.env.VITE_APP_URL +
    import.meta.env.VITE_APP_URL_GENEXUS +
    endpoint;

  return axios.post(url, xml, {
    headers: { "Content-Type": "text/xml" },
  });
}
