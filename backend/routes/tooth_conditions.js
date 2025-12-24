const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all tooth conditions for a patient
router.get("/:patient_id", async (req, res) => {
  try {
    const { patient_id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM tooth_conditions WHERE patient_id = ?",
      [patient_id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching tooth conditions:", error);
    res.status(500).json({ message: "Failed to fetch tooth conditions" });
  }
});

// Add or update a tooth condition
router.post("/", async (req, res) => {
  try {
    const { patient_id, cell_key, condition_code, status, is_shaded, segments } = req.body;

    console.log(`Saving condition for ${cell_key}:`, segments); // Debug log

    // Check if record exists
    const [existing] = await db.query(
      "SELECT * FROM tooth_conditions WHERE patient_id = ? AND cell_key = ?",
      [patient_id, cell_key]
    );

    // Convert segments object to JSON string for storage
    const segmentsJson = segments ? JSON.stringify(segments) : null;

    if (existing.length > 0) {
      // UPDATE existing record
      await db.query(
        `UPDATE tooth_conditions 
         SET condition_code = ?, status = ?, is_shaded = ?, segments = ?
         WHERE id = ?`,
        [condition_code, status, is_shaded, segmentsJson, existing[0].id]
      );
      res.json({ id: existing[0].id, message: "Tooth condition updated" });
    } else {
      // INSERT new record
      const [result] = await db.query(
        `INSERT INTO tooth_conditions (patient_id, cell_key, condition_code, status, is_shaded, segments)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [patient_id, cell_key, condition_code, status, is_shaded, segmentsJson]
      );
      res.status(201).json({ id: result.insertId, message: "Tooth condition created" });
    }
  } catch (error) {
    console.error("DATABASE ERROR saving tooth condition:", error.message);
    res.status(500).json({ message: "Failed to save tooth. " + error.message });
  }
});

module.exports = router;