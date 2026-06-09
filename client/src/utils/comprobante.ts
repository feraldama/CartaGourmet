// Generación e impresión del comprobante (Factura / Nota de Crédito).
//
// El papel es PREIMPRESO: el formulario ya trae timbrado, número y los recuadros
// dibujados. Por eso acá NO se dibuja el número de comprobante; sólo se posicionan
// los datos (fecha, cliente, ítems, totales) con márgenes para caer dentro de las
// casillas del formulario. La hoja contiene 2 comprobantes idénticos (uno para el
// cliente y otro para la empresa).
//
// Factura y Nota de Crédito comparten exactamente el mismo layout; lo único que
// cambia es el título del documento (se usa en el título de la ventana/impresión).

export type DocumentoTipo = "FA" | "NC";

export interface ComprobanteProducto {
  VentaProductoCantidad?: number;
  VentaProductoPrecio?: number;
  VentaProductoPrecioTotal?: number;
  ProductoNombre?: string;
  ProductoCodigo?: string;
}

export interface ComprobanteVenta {
  VentaId: number;
  VentaFecha: string;
  Total?: number;
  ClienteRazonSocial?: string;
  ClienteRUC?: string;
  ClienteTelefono?: string;
  ClienteDireccion?: string;
}

const calcularIVA = (total: number) => {
  if (total === undefined || total === null || isNaN(total)) return 0;
  return total / 11; // IVA 10%
};

const formatearNumero = (numero: number) => {
  if (numero === undefined || numero === null || isNaN(numero)) return "0";
  const numeroRedondeado = Math.round(numero);
  return numeroRedondeado.toLocaleString("es-PY", { useGrouping: true });
};

const formatearFecha = (fecha: string) => {
  const date = new Date(fecha);
  return date.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

const numeroALetras = (numero: number): string => {
  const unidades = [
    "",
    "UNO",
    "DOS",
    "TRES",
    "CUATRO",
    "CINCO",
    "SEIS",
    "SIETE",
    "OCHO",
    "NUEVE",
  ];
  const decenas = [
    "",
    "DIEZ",
    "VEINTE",
    "TREINTA",
    "CUARENTA",
    "CINCUENTA",
    "SESENTA",
    "SETENTA",
    "OCHENTA",
    "NOVENTA",
  ];
  const centenas = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ];

  if (numero === 0) return "CERO";

  const entero = Math.floor(numero);

  if (entero < 10) return unidades[entero];

  if (entero < 100) {
    if (entero < 20) {
      const especiales = [
        "DIEZ",
        "ONCE",
        "DOCE",
        "TRECE",
        "CATORCE",
        "QUINCE",
        "DIECISÉIS",
        "DIECISIETE",
        "DIECIOCHO",
        "DIECINUEVE",
      ];
      return especiales[entero - 10];
    }
    const decena = Math.floor(entero / 10);
    const unidad = entero % 10;
    if (unidad === 0) return decenas[decena];
    return decenas[decena] + " Y " + unidades[unidad];
  }

  if (entero < 1000) {
    const centena = Math.floor(entero / 100);
    const resto = entero % 100;
    if (centena === 1 && resto === 0) return "CIEN";
    if (resto === 0) return centenas[centena];
    return centenas[centena] + " " + numeroALetras(resto);
  }

  if (entero < 1000000) {
    const miles = Math.floor(entero / 1000);
    const resto = entero % 1000;
    let resultado = "";
    if (miles === 1) {
      resultado = "MIL";
    } else {
      resultado = numeroALetras(miles) + " MIL";
    }
    if (resto > 0) {
      resultado += " ";
      resultado += numeroALetras(resto);
    }
    return resultado;
  }

  return numero.toLocaleString("es-PY", { useGrouping: true }) + " GUARANÍES";
};

// Genera el HTML de una hoja con 2 comprobantes idénticos (cliente + empresa),
// distribuyendo proporcionalmente el recargo por método de pago entre los ítems.
const generarHoja = (
  venta: ComprobanteVenta,
  productos: ComprobanteProducto[]
) => {
  const subtotalProductos = productos.reduce(
    (sum, p) => sum + (p.VentaProductoPrecioTotal || 0),
    0
  );

  const totalReal = venta.Total || subtotalProductos;
  const factorRecargo =
    subtotalProductos > 0 ? totalReal / subtotalProductos : 1;

  const productosConRecargo = productos.map((p) => {
    const precioUnitarioOriginal = p.VentaProductoPrecio || 0;
    const precioUnitarioConRecargo = Math.round(
      precioUnitarioOriginal * factorRecargo
    );
    const cantidad = p.VentaProductoCantidad || 0;
    const precioTotalConRecargo = Math.round(
      precioUnitarioConRecargo * cantidad
    );
    return {
      ...p,
      VentaProductoPrecioConRecargo: precioUnitarioConRecargo,
      VentaProductoPrecioTotalConRecargo: precioTotalConRecargo,
    };
  });

  const subtotalConRecargo = productosConRecargo.reduce(
    (sum, p) => sum + (p.VentaProductoPrecioTotalConRecargo || 0),
    0
  );

  const diferenciaRedondeo = totalReal - subtotalConRecargo;
  if (diferenciaRedondeo !== 0 && productosConRecargo.length > 0) {
    const ultimoProducto = productosConRecargo[productosConRecargo.length - 1];
    ultimoProducto.VentaProductoPrecioTotalConRecargo =
      (ultimoProducto.VentaProductoPrecioTotalConRecargo || 0) +
      diferenciaRedondeo;
    const cantidadUltimo = ultimoProducto.VentaProductoCantidad || 1;
    ultimoProducto.VentaProductoPrecioConRecargo = Math.round(
      ultimoProducto.VentaProductoPrecioTotalConRecargo / cantidadUltimo
    );
  }

  const ivaReal = calcularIVA(totalReal);

  const comprobanteIndividual = `
    <div class="factura">
      <div class="cliente-info">
        <div class="cliente-left">
          <p style="margin-left: 295px;">
            <span>${formatearFecha(venta.VentaFecha)}</span>
            <span style="margin-left: 202px;">Contado</span>
          </p>
          <p style="margin-left: 320px;">${
            venta.ClienteRazonSocial || "N/A"
          }</p>
          <p style="margin-left: 280px;">
            <span>${venta.ClienteRUC || "N/A"}</span>
            <span style="margin-left: 75px;">${
              venta.ClienteTelefono || ""
            }</span>
          </p>
          <p style="margin-left: 300px; margin-bottom: 15px;">${
            venta.ClienteDireccion || "Sin dirección registrada"
          }</p>
        </div>
      </div>

      <div class="productos-lista">
        ${productosConRecargo
          .map(
            (p) => `
          <div class="producto-item">
            <span class="col-cantidad">${p.VentaProductoCantidad || 0}</span>
            <span class="col-descripcion">${
              p.ProductoNombre ||
              p.ProductoCodigo ||
              "Producto sin descripción"
            }</span>
            <span class="col-precio">${formatearNumero(
              p.VentaProductoPrecioConRecargo || p.VentaProductoPrecio || 0
            )}</span>
            <span class="col-exentas">0</span>
            <span class="col-iva5">0</span>
            <span style="margin-right: 30px;" class="col-iva10">${formatearNumero(
              p.VentaProductoPrecioTotalConRecargo ||
                p.VentaProductoPrecioTotal ||
                0
            )}</span>
          </div>
        `
          )
          .join("")}

        ${Array.from(
          { length: Math.max(0, 16 - productosConRecargo.length) },
          () => `
          <div class="producto-item">
            <span class="col-cantidad">&nbsp;</span>
            <span class="col-descripcion">&nbsp;</span>
            <span class="col-precio">&nbsp;</span>
            <span class="col-exentas">&nbsp;</span>
            <span class="col-iva5">&nbsp;</span>
            <span class="col-iva10">&nbsp;</span>
          </div>
        `
        ).join("")}
      </div>

      <div class="totales" style="margin-top: -9px;">
        <div class="totales-left">
          <p style="display: flex; justify-content: flex-end;">
            <span style="margin-right: 30px;" class="subtotal">${formatearNumero(
              totalReal
            )}</span>
          </p>
          <p style="display: flex; justify-content: space-between;">
            <span style="margin-left: 80px;" class="total-letras">${numeroALetras(
              totalReal
            )}</span>
            <span style="margin-right: 30px;" class="subtotal">${formatearNumero(
              totalReal
            )}</span>
          </p>
          <p style="display: flex; justify-content: space-between; margin-top: -5px;">
            <span style="margin-left: 110px;" class="liquidacion-iva">0</span>
            <span style="margin-left: 0px;" class="liquidacion-iva">${formatearNumero(
              ivaReal
            )}</span>
            <span style="margin-right: 320px;" class="total-iva">${formatearNumero(
              ivaReal
            )}</span>
          </p>
        </div>
      </div>
    </div>
  `;

  // La hoja es horizontal (landscape) con los 2 comprobantes idénticos uno al
  // lado del otro (izquierda = cliente, derecha = empresa).
  return `
    <div class="hoja">
      <div class="col">${comprobanteIndividual}</div>
      <div class="col">${comprobanteIndividual}</div>
    </div>
  `;
};

// HTML completo (con estilos) de la hoja de comprobante para una venta.
export const generarComprobanteHTML = (
  venta: ComprobanteVenta,
  productos: ComprobanteProducto[],
  documentoTipo: DocumentoTipo = "FA"
): string => {
  const titulo =
    documentoTipo === "NC" ? "Nota de Crédito" : "Factura";

  if (!productos || productos.length === 0) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Error - ${titulo} ${venta.VentaId}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 14px; text-align: center; padding: 50px; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1 class="error">Error al generar el comprobante</h1>
        <p>La venta seleccionada no tiene productos asociados.</p>
        <p>Venta ID: ${venta.VentaId}</p>
      </body>
      </html>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${titulo} ${venta.VentaId}</title>
      <style>
        @media print {
          body { margin: 0; padding: 0; }
          .factura { page-break-after: avoid; }
          .hoja { page-break-after: avoid; }
          @page { margin: 0; size: A4 landscape; }
          body::before,
          body::after,
          *::before,
          *::after {
            display: none !important;
          }
        }

        body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 0; }

        /* Hoja horizontal: las 2 facturas (cliente + empresa) van una al lado de
           la otra. Cada columna ocupa la mitad del ancho de la hoja apaisada y
           recorta lo que sobre; la factura conserva su ancho/diseño original
           (794px) y se escala para entrar en su mitad. */
        .hoja { display: flex; flex-direction: row; align-items: flex-start; width: 100%; }
        .col { box-sizing: border-box; width: 50%; flex: 0 0 50%; overflow: hidden; }
        /* --offset-top empuja todo el contenido hacia abajo para que caiga
           DEBAJO del membrete preimpreso (logo + FACTURA + número). Subí o bajá
           ese único valor para alinear el texto con los recuadros del formulario. */
        .factura { --offset-top: 250px; box-sizing: border-box; width: 794px; transform: scale(0.68); transform-origin: top left; margin: 0; padding: var(--offset-top) 20px 20px 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h2 { margin: 0; font-size: 18px; }

        .cliente-info { margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; }
        .cliente-left { flex: 1; margin-right: 20px; }
        .cliente-left p { margin: 2px 0; font-size: 11px; text-align: left; min-height: 15px; }
        .cliente-right { flex: 0 0 auto; text-align: right; }
        .factura-details p { margin: 2px 0; font-size: 10px; text-align: right; }
        .factura-series { font-size: 12px !important; margin: 5px 0 !important; }
        .factura-number { font-size: 16px !important; margin: 5px 0 !important; }

        .productos-lista { margin-bottom: 2px; margin-top: 10px; }
        .productos-header { display: flex; font-weight: bold; font-size: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
        .producto-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; font-size: 10px; }
        .col-cantidad { width: 60px; text-align: center; font-weight: bold; }
        .col-descripcion { flex: 1; text-align: left; margin: 0 10px; }
        .col-precio { width: 80px; text-align: right; margin-right: 10px; }
        .col-exentas { width: 60px; text-align: center; }
        .col-iva5 { width: 60px; text-align: center; }
        .col-iva10 { width: 60px; text-align: center; }

        .totales { margin-top: 10px; padding-top: 5px; display: flex; justify-content: space-between; }
        .totales-left { flex: 1; }
        .totales-right { flex: 0 0 auto; text-align: right; }

        .total-letras { font-size: 11px; font-weight: bold; margin-bottom: 0; text-transform: uppercase; line-height: 1; }
        .liquidacion-iva { font-size: 11px; margin: 0; min-height: 8px; line-height: 1; }
        .subtotal { text-align: right; font-weight: bold; margin: 0; font-size: 12px; line-height: 1; }
        .total-iva { text-align: right; margin: 0; font-size: 11px; font-weight: bold; line-height: 1; }
      </style>
    </head>
    <body>
      ${generarHoja(venta, productos)}
    </body>
    </html>
  `;
};

// Abre una ventana e imprime el HTML del comprobante.
export const imprimirComprobante = (html: string) => {
  const ventanaImpresion = window.open("", "_blank");
  if (!ventanaImpresion) return;
  ventanaImpresion.document.title = "";
  ventanaImpresion.document.write(html);
  ventanaImpresion.document.close();
  ventanaImpresion.onload = () => {
    ventanaImpresion.print();
  };
  setTimeout(() => {
    if (ventanaImpresion.document.readyState === "complete") {
      ventanaImpresion.print();
    }
  }, 300);
};
