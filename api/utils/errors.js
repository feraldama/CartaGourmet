/**
 * Helpers para devolver errores al cliente sin exponer detalles internos
 * (stack traces, nombres de tabla, SQL, mensajes del driver).
 *
 * - Errores "seguros" (plain objects como `reject({ message: "..." })` lanzados
 *   intencionalmente desde los models para mostrar al usuario) se pasan tal cual.
 * - Errores de DB o Error nativos se ocultan tras un `fallback` genérico y el
 *   detalle queda en `console.error` del servidor.
 */

function isSafeMessage(err) {
  if (!err) return false;
  // mysql2 / mariadb errors: tienen estas props
  if (err.code || err.errno || err.sqlMessage || err.sqlState || err.sql) {
    return false;
  }
  // Plain objects con message string → errores de negocio propios
  if (!(err instanceof Error) && typeof err.message === "string") return true;
  return false;
}

function sendError(res, err, status = 500, fallback = "Error interno") {
  if (!isSafeMessage(err)) {
    console.error("API error:", err);
    return res.status(status).json({ message: fallback });
  }
  return res.status(status).json({ message: err.message });
}

module.exports = { isSafeMessage, sendError };
