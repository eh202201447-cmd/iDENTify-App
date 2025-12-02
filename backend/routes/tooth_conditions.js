const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all tooth conditions for a patient
router.get("/:patient_id", async (req, res) => {
  const { patient_id } = req.params;
  const [rows] = await db.query(
    "SELECT * FROM tooth_conditions WHERE patient_id = ?",
    [patient_id]
  );
  res.json(rows);
});

// Add or update a tooth condition
router.post("/", async (req, res) => {
  const { patient_id, cell_key, condition_code, status, is_shaded } = req.body;

  // This is an "upsert" logic. If a condition for the cell_key already exists, it will be updated.
  // Otherwise, it will be inserted.
  const [existing] = await db.query(
    "SELECT * FROM tooth_conditions WHERE patient_id = ? AND cell_key = ?",
    [patient_id, cell_key]
  );

  if (existing.length > 0) {
    const [result] = await db.query(
      `UPDATE tooth_conditions 
       SET condition_code = ?, status = ?, is_shaded = ?
       WHERE id = ?`,
      [condition_code, status, is_shaded, existing[0].id]
    );
    res.json({ id: existing[0].id, message: "Tooth condition updated" });
  } else {
    const [result] = await db.query(
      `INSERT INTO tooth_conditions (patient_id, cell_key, condition_code, status, is_shaded)
       VALUES (?, ?, ?, ?, ?)`,
      [patient_id, cell_key, condition_code, status, is_shaded]
    );
    res.status(201).json({ id: result.insertId, message: "Tooth condition created" });
  }
});

module.exports = router;
