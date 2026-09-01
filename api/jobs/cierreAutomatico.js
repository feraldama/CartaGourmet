// Cierre de caja automático programado.
//
// Todos los días a la hora configurada (CIERRE_AUTO_HORA en el .env, formato
// HH:MM, hora local del servidor) cierra todas las cajas que quedaron
// abiertas, replicando el cierre manual de aperturaCierreCaja:
//   1. registra el CIERRE en registrodiariocaja (TipoGastoId=1, Grupo=2) por
//      el monto actual de la caja, y
//   2. pone CajaMonto en 0.
// El registro queda a nombre del usuario que hizo la apertura, con el detalle
// marcado como (AUTOMÁTICO) para poder distinguirlo en los reportes.
//
// Si el servidor está apagado a esa hora, el cierre de ese día no se ejecuta
// (no hay catch-up): la caja queda abierta hasta el próximo disparo o un
// cierre manual.
const cron = require("node-cron");
const db = require("../config/db");
const RegistroDiarioCaja = require("../models/registrodiariocaja.model");
const Caja = require("../models/caja.model");

// Cierra todas las cajas con apertura vigente (última apertura posterior al
// último cierre). Devuelve un resumen por caja para el log.
async function cerrarCajasAbiertas() {
  const cajas = await Caja.getAll();
  const resumen = [];

  for (const caja of cajas) {
    try {
      const apertura = await RegistroDiarioCaja.getUltimaApertura(caja.CajaId);
      if (!apertura) continue;
      const cierre = await RegistroDiarioCaja.getUltimoCierre(caja.CajaId);
      const abierta =
        !cierre || cierre.RegistroDiarioCajaId < apertura.RegistroDiarioCajaId;
      if (!abierta) continue;

      const monto = Number(caja.CajaMonto) || 0;

      // Mismo orden que importa para la consistencia: primero el registro de
      // cierre (si falla, la caja sigue abierta y reintenta al día siguiente),
      // después el monto a 0.
      await RegistroDiarioCaja.create({
        CajaId: caja.CajaId,
        RegistroDiarioCajaFecha: new Date(),
        TipoGastoId: 1,
        TipoGastoGrupoId: 2,
        RegistroDiarioCajaDetalle: `CIERRE ${caja.CajaDescripcion} (AUTOMÁTICO)`,
        RegistroDiarioCajaMonto: monto,
        UsuarioId: apertura.UsuarioId,
      });
      await new Promise((resolve, reject) => {
        db.query(
          "UPDATE Caja SET CajaMonto = 0 WHERE CajaId = ?",
          [caja.CajaId],
          (err) => (err ? reject(err) : resolve())
        );
      });

      resumen.push({ caja: caja.CajaDescripcion, monto, ok: true });
    } catch (error) {
      console.error(
        `Cierre automático: error al cerrar ${caja.CajaDescripcion}:`,
        error
      );
      resumen.push({ caja: caja.CajaDescripcion, ok: false });
    }
  }

  return resumen;
}

// Programa el job diario según CIERRE_AUTO_HORA (HH:MM). Sin la variable (o
// con formato inválido) el cierre automático queda desactivado.
function iniciarCierreAutomatico() {
  const hora = (process.env.CIERRE_AUTO_HORA || "").trim();
  if (!hora) {
    console.log("Cierre automático de caja: desactivado (sin CIERRE_AUTO_HORA)");
    return;
  }
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hora);
  if (!m) {
    console.error(
      `Cierre automático de caja: CIERRE_AUTO_HORA inválida ("${hora}"), se esperaba HH:MM. Desactivado.`
    );
    return;
  }
  const [, hh, mm] = m;

  cron.schedule(`${Number(mm)} ${Number(hh)} * * *`, async () => {
    console.log(`Cierre automático de caja: ejecutando (${hora})...`);
    try {
      const resumen = await cerrarCajasAbiertas();
      if (resumen.length === 0) {
        console.log("Cierre automático de caja: no había cajas abiertas");
      } else {
        for (const r of resumen) {
          console.log(
            r.ok
              ? `Cierre automático: ${r.caja} cerrada con Gs. ${r.monto}`
              : `Cierre automático: ${r.caja} FALLÓ (ver error arriba)`
          );
        }
      }
    } catch (error) {
      console.error("Cierre automático de caja: error general:", error);
    }
  });

  console.log(`Cierre automático de caja: programado todos los días a las ${hora}`);
}

module.exports = { iniciarCierreAutomatico, cerrarCajasAbiertas };
