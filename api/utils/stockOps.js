// Operaciones de stock que replican el patrón unitario del GeneXus.
// Un producto "unitario" tiene una caja con `CantidadCaja` unidades. El stock
// se trackea en dos campos: `Stock` (cajas enteras) + `StockUnitario` (unidades
// sueltas, 0..CantidadCaja-1). Cuando vendés/quitás unidades sueltas y no hay,
// se "abre" una caja: Stock-=1 y StockUnitario pasa a CantidadCaja-1.
// Al sumar/devolver, cuando StockUnitario llega a CantidadCaja-1, se "cierra"
// una caja: Stock+=1, StockUnitario=0.
//
// Las funciones devuelven los nuevos valores de Stock y StockUnitario después
// de aplicar `cantidad` movimientos. El caller hace el UPDATE.

function restarUnidades(stock, stockUnitario, cantidad, cantidadCaja) {
  let s = Number(stock);
  let su = Number(stockUnitario);
  let restar = Number(cantidad);
  while (restar !== 0) {
    if (su === 0) {
      su = cantidadCaja - 1;
      s -= 1;
    } else {
      su -= 1;
    }
    restar -= 1;
  }
  return { stock: s, stockUnitario: su };
}

function sumarUnidades(stock, stockUnitario, cantidad, cantidadCaja) {
  let s = Number(stock);
  let su = Number(stockUnitario);
  let sumar = Number(cantidad);
  while (sumar !== 0) {
    if (su === cantidadCaja - 1) {
      su = 0;
      s += 1;
    } else {
      su += 1;
    }
    sumar -= 1;
  }
  return { stock: s, stockUnitario: su };
}

// Variante "reverse-buy" del PRC PBorrarRegistoDiarioWS:RestaStock — cuando
// StockUnitario llega a 0, lo sube a CantidadCaja (NO CantidadCaja-1 como
// en restarUnidades normal). El usuario pidió replicarlo literal aunque sume
// 1 unidad fantasma; queda este TODO para revisar después.
// TODO(GX-quirk): comparar con el comportamiento de MariaDB y decidir si
// alinear con restarUnidades estándar.
function restarUnidadesReverseCompra(stock, stockUnitario, cantidad, cantidadCaja) {
  let s = Number(stock);
  let su = Number(stockUnitario);
  let restar = Number(cantidad);
  while (restar !== 0) {
    if (su === 0) {
      su = cantidadCaja;
      s -= 1;
    } else {
      su -= 1;
    }
    restar -= 1;
  }
  return { stock: s, stockUnitario: su };
}

module.exports = { restarUnidades, sumarUnidades, restarUnidadesReverseCompra };
