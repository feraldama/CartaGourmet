const mysql = require("mysql2");
require("dotenv").config();

// Crear un pool de conexiones en lugar de una conexión única
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tu_base_de_datos",
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Verificar la conexión
db.getConnection((err, connection) => {
  if (err) {
    console.error("Error conectando a MySQL:", err);
    return;
  }
  console.log("Conectado a MySQL");
  connection.release();
});

// Manejar errores del pool
db.on("error", (err) => {
  console.error("Error en el pool de conexiones MySQL:", err);
  if (err.code === "PROTOCOL_CONNECTION_LOST") {
    console.log("Conexión perdida. Reintentando...");
  }
});

module.exports = db;
