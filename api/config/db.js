// PostgreSQL adapter that exposes the mysql2 API surface used by this codebase.
// Migration was done with table/column names left unquoted in DDL, so Postgres
// physically stores them lowercase. This adapter:
//   - translates `?` placeholders to `$N`
//   - rewrites a handful of MySQL-specific bits (LIKE -> ILIKE, CAST AS CHAR -> AS TEXT)
//   - appends RETURNING <pk> to INSERTs so mysql2's `result.insertId` keeps working
//   - renames lowercase result keys back to original PascalCase (so API responses
//     and the React frontend keep the keys they were built against)
//   - supports both the callback API (`db.query(sql, params, cb)`) used in models
//     and the promise API (`db.promise().getConnection()`) used in pago.controller
//     for explicit transactions
const { Pool, types } = require("pg");
const { EventEmitter } = require("events");
const { columnNameByLower, pkByTable } = require("./columnMap");
require("dotenv").config();

// Parse BIGINT as Number (mysql2 default). Values >2^53 would lose precision —
// sales totals are well below that.
types.setTypeParser(20, (v) => (v === null ? null : Number(v)));
// DATE: return as ISO string (YYYY-MM-DD) to avoid timezone shifts that occur
// when pg's default parser builds a JS Date at local midnight.
types.setTypeParser(1082, (v) => v); // raw string

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "technow",
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  max: 15,
  idleTimeoutMillis: 60000,
});

function isInsertSql(sql) {
  return /^\s*INSERT\b/i.test(sql);
}
function isWriteSql(sql) {
  return /^\s*(INSERT|UPDATE|DELETE)\b/i.test(sql);
}

// Translate MySQL-flavoured SQL to PG. Tokenises around single-quoted string
// literals so we never rewrite content inside them.
function translate(sql) {
  let result = "";
  let i = 0;
  let placeholderIdx = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      // Copy string literal verbatim, including doubled '' escapes.
      result += ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          result += "''";
          i += 2;
        } else if (sql[i] === "'") {
          result += "'";
          i++;
          break;
        } else {
          result += sql[i];
          i++;
        }
      }
    } else if (ch === "?") {
      placeholderIdx++;
      result += `$${placeholderIdx}`;
      i++;
    } else {
      result += ch;
      i++;
    }
  }
  // Apply substitutions only on the assembled non-string parts. We split on
  // string literals so we don't touch their contents.
  result = mapOutsideStrings(result, (chunk) => {
    // CAST(... AS CHAR) is MySQL syntax for stringifying for LIKE compares; PG
    // wants AS TEXT. Do this first so the LIKE rewrite below sees the new form.
    let r = chunk.replace(
      /CAST\s*\(\s*([^)]+?)\s+AS\s+CHAR\s*\)/gi,
      "CAST($1 AS TEXT)",
    );
    // Wrap the left-hand side of every LIKE in CAST(... AS TEXT) so integer/
    // bigint columns work (MySQL implicit-casts, PG doesn't) and switch to the
    // case-insensitive ILIKE operator (MySQL's default collation is CI).
    const LHS =
      /(CAST\s*\([^)]+\)|CONCAT\s*\([^)]+\)|[A-Za-z_][\w]*\.[A-Za-z_]\w*|[A-Za-z_]\w*)\s+LIKE\b/gi;
    r = r.replace(LHS, (_m, lhs) => {
      const alreadyCast = /^CAST\s*\(/i.test(lhs);
      return `${alreadyCast ? lhs : `CAST(${lhs} AS TEXT)`} ILIKE`;
    });
    // Catch-all: si quedó algún `LIKE` sin transformar (típico cuando el
    // CONCAT del LHS contiene strings literales y mapOutsideStrings lo parte,
    // dejando la pieza con paréntesis intermedios sin matchear el regex de
    // arriba) lo cambiamos a ILIKE igual. CONCAT/text expressions devuelven
    // text, así que no necesitan CAST adicional. Esto preserva el contrato
    // case-insensitive de MySQL.
    r = r.replace(/\bLIKE\b/gi, "ILIKE");
    // Quote column aliases that start with PascalCase (`AS HasImagen` ->
    // `AS "HasImagen"`) so PG preserves the original casing in the result
    // fields. Without this, an alias like `HasImagen` comes back as
    // `hasimagen` and the frontend (which keys off `HasImagen`) fails to
    // pick up the value. Type-cast targets like `AS CHAR`, `AS TEXT`,
    // `AS BIGINT` are ALL-CAPS so the regex (initial upper + at least one
    // lowercase) skips them. `AS`/`as` matched case-insensitively since SQL
    // accepts both, but the alias capture stays case-sensitive on PascalCase.
    r = r.replace(/\b[Aa][Ss]\s+([A-Z][a-z]\w*)\b/g, 'AS "$1"');
    return r;
  });
  return result;
}

function mapOutsideStrings(sql, fn) {
  let out = "";
  let i = 0;
  let buf = "";
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      out += fn(buf);
      buf = "";
      let lit = "'";
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          lit += "''";
          i += 2;
        } else if (sql[i] === "'") {
          lit += "'";
          i++;
          break;
        } else {
          lit += sql[i];
          i++;
        }
      }
      out += lit;
    } else {
      buf += ch;
      i++;
    }
  }
  out += fn(buf);
  return out;
}

function detectInsertTable(sql) {
  const m = sql.match(/^\s*INSERT\s+INTO\s+`?(\w+)`?/i);
  return m ? m[1].toLowerCase() : null;
}

// Build the per-statement name map from PG's field metadata. Only rename
// fields that come from an actual table column (tableID > 0); leave aliases
// and computed expressions (COUNT(*) AS total, COALESCE(...), etc.) alone, so
// a generic alias like `total` isn't accidentally remapped to the `venta.Total`
// column's PascalCase name.
function buildRowMapper(fields) {
  const names = fields.map((f) =>
    f.tableID > 0 && columnNameByLower[f.name]
      ? columnNameByLower[f.name]
      : f.name,
  );
  return (row) => {
    const out = {};
    for (let i = 0; i < fields.length; i++) {
      out[names[i]] = row[fields[i].name];
    }
    return out;
  };
}

async function runQuery(executor, sql, params) {
  let translated = translate(sql);
  let pkCol = null;
  if (isInsertSql(translated) && !/\bRETURNING\b/i.test(translated)) {
    const table = detectInsertTable(translated);
    if (table) {
      const pk = pkByTable[table];
      // Skip RETURNING for composite PKs (would need multiple columns; insertId
      // is meaningless anyway since callers don't use it for those tables).
      if (pk && !pk.includes(",")) {
        pkCol = pk;
        translated += ` RETURNING ${pk.toLowerCase()}`;
      }
    }
  }
  const res = await executor.query(translated, params || []);
  const mapper = buildRowMapper(res.fields || []);
  const rows = (res.rows || []).map(mapper);
  if (isWriteSql(sql)) {
    let insertId = 0;
    if (pkCol && rows.length) insertId = rows[0][pkCol];
    return Object.assign(rows, {
      insertId,
      affectedRows: res.rowCount,
    });
  }
  return rows;
}

function callbackQuery(sql, paramsOrCb, maybeCb) {
  let params = [];
  let cb;
  if (typeof paramsOrCb === "function") {
    cb = paramsOrCb;
  } else {
    params = paramsOrCb || [];
    cb = maybeCb;
  }
  runQuery(pool, sql, params)
    .then((r) => cb && cb(null, r))
    .catch((err) => cb && cb(err));
}

class PromiseConnection {
  constructor(client, releaseFn) {
    this.client = client;
    this.releaseFn = releaseFn;
  }
  async query(sql, params) {
    const r = await runQuery(this.client, sql, params);
    return [r, undefined]; // mysql2 returns [results, fields]
  }
  async beginTransaction() {
    await this.client.query("BEGIN");
  }
  async commit() {
    await this.client.query("COMMIT");
  }
  async rollback() {
    await this.client.query("ROLLBACK");
  }
  release() {
    this.releaseFn();
  }
}

const promiseApi = {
  async getConnection() {
    const client = await pool.connect();
    return new PromiseConnection(client, () => client.release());
  },
  async query(sql, params) {
    const r = await runQuery(pool, sql, params);
    return [r, undefined];
  },
};

const events = new EventEmitter();

const db = {
  query: callbackQuery,
  promise: () => promiseApi,
  getConnection(cb) {
    pool
      .connect()
      .then((client) => cb(null, { release: () => client.release() }))
      .catch((err) => cb(err));
  },
  on: (...args) => events.on(...args),
};

pool.on("error", (err) => {
  console.error("Error en pool PostgreSQL:", err);
  events.emit("error", err);
});

pool
  .query("SELECT 1")
  .then(() => console.log("Conectado a PostgreSQL"))
  .catch((err) => console.error("Error conectando a PostgreSQL:", err));

module.exports = db;
