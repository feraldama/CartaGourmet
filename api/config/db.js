// Capa de acceso a datos sobre PostgreSQL con interfaz compatible con la API de mysql2 (callbacks).
// Permite que los modelos existentes (db.query(sql, params, cb)) sigan funcionando sin reescribirse:
//   - Convierte placeholders "?" de MySQL a "$1, $2, ..." de Postgres.
//   - Remapea las claves de los resultados de minúsculas (Postgres) a PascalCase (esquema/front original).
//   - Emula result.insertId (añadiendo RETURNING <pk> a los INSERT) y result.affectedRows.
require("dotenv").config();
const { Pool, types } = require("pg");
const columnMap = require("./columnMap.json");

// Postgres devuelve int8 (bigint) como string; los IDs/precios son pequeños -> convertir a número.
types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8 / bigint

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "postgres",
  max: 15,
  idleTimeoutMillis: 60000,
});

// Mapa tabla -> columna PK (solo claves primarias de una sola columna, para el RETURNING automático).
const pkByTable = {};
const pkReady = pool
  .query(
    `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'`
  )
  .then((res) => {
    const counts = {};
    res.rows.forEach((r) => (counts[r.table_name] = (counts[r.table_name] || 0) + 1));
    res.rows.forEach((r) => {
      if (counts[r.table_name] === 1) pkByTable[r.table_name] = r.column_name;
    });
    console.log("Conectado a PostgreSQL");
  })
  .catch((err) => console.error("Error conectando a PostgreSQL:", err.message));

pool.on("error", (err) => {
  console.error("Error en el pool de conexiones PostgreSQL:", err.message);
});

// Traduce un formato de fecha estilo MySQL (DATE_FORMAT) al estilo Postgres (to_char).
function mysqlFmtToPg(fmt) {
  return fmt
    .replace(/%Y/g, "YYYY")
    .replace(/%y/g, "YY")
    .replace(/%M/g, "Month")
    .replace(/%m/g, "MM")
    .replace(/%d/g, "DD")
    .replace(/%H/g, "HH24")
    .replace(/%h/g, "HH12")
    .replace(/%i/g, "MI")
    .replace(/%s/g, "SS")
    .replace(/%p/g, "AM");
}

// Normaliza expresiones de dialecto MySQL que no existen igual en Postgres.
function normalizeDialect(sql) {
  // CAST(x AS CHAR) -> CAST(x AS TEXT)  (en PG "CHAR" sin longitud trunca a 1 carácter)
  sql = sql.replace(/\bAS\s+CHAR\b/gi, "AS TEXT");
  // Castea el operando izquierdo (identificador simple) de LIKE a TEXT.
  // MySQL coacciona números a texto en "col LIKE ?"; PG no -> "bigint ~~ text" falla.
  // Solo afecta identificadores simples (col / alias.col); CONCAT(...), LOWER(...), CAST(...) quedan intactos.
  sql = sql.replace(
    /([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)\s+LIKE\b/gi,
    "CAST($1 AS TEXT) LIKE"
  );
  // LIKE -> ILIKE  (MySQL es insensible a mayúsculas por defecto; PG LIKE no lo es)
  sql = sql.replace(/\bLIKE\b/gi, "ILIKE");
  // DATE_FORMAT(expr, 'fmt') -> to_char(expr, 'fmtPG')
  sql = sql.replace(
    /DATE_FORMAT\(\s*([^,]+?)\s*,\s*'([^']*)'\s*\)/gi,
    (_m, expr, fmt) => `to_char(${expr}, '${mysqlFmtToPg(fmt)}')`
  );
  return sql;
}

// Convierte "?" (fuera de literales de cadena) en $1, $2, ...
function toPgPlaceholders(sql) {
  let out = "";
  let idx = 0;
  let inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (inStr) {
      out += c;
      if (c === "'") {
        if (sql[i + 1] === "'") {
          out += "'";
          i++;
        } else {
          inStr = false;
        }
      }
    } else if (c === "'") {
      inStr = true;
      out += c;
    } else if (c === "?") {
      out += "$" + ++idx;
    } else {
      out += c;
    }
  }
  return out;
}

// Si es un INSERT sin RETURNING y la tabla tiene PK simple, añade "RETURNING <pk>" para emular insertId.
function withReturning(sql) {
  if (!/^\s*INSERT\s+INTO/i.test(sql) || /\bRETURNING\b/i.test(sql)) return sql;
  const m = /^\s*INSERT\s+INTO\s+"?([a-zA-Z0-9_]+)"?/i.exec(sql);
  if (!m) return sql;
  const pk = pkByTable[m[1].toLowerCase()];
  return pk ? sql + " RETURNING " + pk : sql;
}

// Remapea claves lowercase -> PascalCase usando el diccionario; conserva las no mapeadas (alias como "total").
function remapRow(row) {
  const o = {};
  for (const k in row) o[columnMap[k] || k] = row[k];
  return o;
}

function shape(sql, res) {
  const rows = (res.rows || []).map(remapRow);
  if (res.command === "SELECT" || res.command === "SHOW") return rows;
  // INSERT / UPDATE / DELETE: emular OkPacket de mysql2
  const out = { affectedRows: res.rowCount, rows };
  if (res.rows && res.rows.length) {
    out.insertId = res.rows[0][Object.keys(res.rows[0])[0]];
  }
  return out;
}

function query(text, params, callback) {
  // Soportar firmas: query(sql, cb) y query(sql, params, cb)
  if (typeof params === "function") {
    callback = params;
    params = [];
  }
  params = params || [];

  const run = pkReady.then(() => {
    const sql = withReturning(toPgPlaceholders(normalizeDialect(text)));
    return pool.query(sql, params).then((res) => shape(sql, res));
  });

  if (typeof callback !== "function") return run;

  run.then((result) => callback(null, result)).catch((err) => callback(err));
  return undefined;
}

module.exports = {
  query,
  pool,
  getPool: () => pool,
};
