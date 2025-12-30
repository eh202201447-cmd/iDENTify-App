const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/:patient_id", async (req, res) => {
  const { patient_id } = req.params;
  const { year } = req.query;

  let query = "SELECT * FROM medications WHERE patient_id = ?";
  let params = [patient_id];

  if (year) {
      query += " AND record_year = ?";
      params.push(year);
  }

  const [rows] = await db.query(query, params);
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { patient_id, medicine, dosage, frequency, notes, record_year } = req.body;
  const [result] = await db.query(
    `INSERT INTO medications (patient_id, medicine, dosage, frequency, notes, record_year)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patient_id, medicine, dosage, frequency, notes, record_year || 1]
  );
  const [rows] = await db.query("SELECT * FROM medications WHERE id = ?", [result.insertId]);
  res.status(201).json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM medications WHERE id = ?", [id]);
  res.json({ message: "Medication deleted" });
});

module.exports = router;