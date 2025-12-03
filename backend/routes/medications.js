const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all medications for a patient
router.get("/:patient_id", async (req, res) => {
  const { patient_id } = req.params;
  const [rows] = await db.query(
    "SELECT * FROM medications WHERE patient_id = ?",
    [patient_id]
  );
  res.json(rows);
});

// Add a medication
router.post("/", async (req, res) => {
  const { patient_id, medicine, dosage, frequency, notes } = req.body;
  const [result] = await db.query(
    `INSERT INTO medications (patient_id, medicine, dosage, frequency, notes)
     VALUES (?, ?, ?, ?, ?)`,
    [patient_id, medicine, dosage, frequency, notes]
  );
  const [rows] = await db.query("SELECT * FROM medications WHERE id = ?", [result.insertId]);
  res.status(201).json(rows[0]);
});

// Delete a medication
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM medications WHERE id = ?", [id]);
  res.json({ message: "Medication deleted" });
});

module.exports = router;