require("dotenv").config();
const mysql = require("mysql2/promise");

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: "127.0.0.1",
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
    console.log("Successfully connected to the database.");
    await connection.end();
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}

testConnection();
