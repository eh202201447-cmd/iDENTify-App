const express = require("express");
const router = express.Router();
const db = require("../db");

// Get conditions for a specific year
router.get("/:patient_id", async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { year } = req.query; // Get year from query param

    let query = "SELECT * FROM tooth_conditions WHERE patient_id = ?";
    let params = [patient_id];

    if (year) {
        query += " AND record_year = ?";
        params.push(year);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching tooth conditions:", error);
    res.status(500).json({ message: "Failed to fetch tooth conditions" });
  }
});

// Add or update a tooth condition
router.post("/", async (req, res) => {
  try {
    const { patient_id, cell_key, condition_code, status, is_shaded, segments, record_year } = req.body;
    const yearToUse = record_year || 1;

    // Check if record exists for this specific year
    const [existing] = await db.query(
      "SELECT * FROM tooth_conditions WHERE patient_id = ? AND cell_key = ? AND record_year = ?",
      [patient_id, cell_key, yearToUse]
    );

    const segmentsJson = segments ? JSON.stringify(segments) : null;

    if (existing.length > 0) {
      await db.query(
        `UPDATE tooth_conditions 
         SET condition_code = ?, status = ?, is_shaded = ?, segments = ?
         WHERE id = ?`,
        [condition_code, status, is_shaded, segmentsJson, existing[0].id]
      );
      res.json({ id: existing[0].id, message: "Tooth condition updated" });
    } else {
      const [result] = await db.query(
        `INSERT INTO tooth_conditions (patient_id, cell_key, condition_code, status, is_shaded, segments, record_year)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [patient_id, cell_key, condition_code, status, is_shaded, segmentsJson, yearToUse]
      );
      res.status(201).json({ id: result.insertId, message: "Tooth condition created" });
    }
  } catch (error) {
    console.error("DATABASE ERROR saving tooth condition:", error.message);
    res.status(500).json({ message: "Failed to save tooth. " + error.message });
  }
});

module.exports = router;