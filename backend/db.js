const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

pool.getConnection()
  .then(connection => {
    console.log("Successfully connected to the database.");
    connection.release();
  })
  .catch(error => {
    console.error("Error connecting to the database:", error);
  });

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

module.exports = pool;
