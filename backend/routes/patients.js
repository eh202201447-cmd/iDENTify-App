const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const [rows] = await db.query("SELECT * FROM patients ORDER BY id DESC");
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { full_name, birthdate, gender, address, contact_number, email } = req.body;

  const [result] = await db.query(
    `INSERT INTO patients (full_name, birthdate, gender, address, contact_number, email)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [full_name, birthdate, gender, address, contact_number, email]
  );

  res.json({ id: result.insertId, message: "Patient created" });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: "Patient not found" });
  }
  res.json(rows[0]);
});

module.exports = router;
