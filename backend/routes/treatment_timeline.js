const express = require("express");
const router = express.Router();
const db = require("../db");

// --- NEW ROUTE: Get Single Record by ID (Must be BEFORE /:patientId) ---
router.get("/record/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching record details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get All Records for a Patient (Optional Year Filter)
router.get("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  const { year } = req.query;

  try {
    let query = "SELECT * FROM treatment_timeline WHERE patient_id = ?";
    let params = [patientId];

    if (year) {
        query += " AND record_year = ?";
        params.push(year);
    }
    
    query += " ORDER BY id DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  const { patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price, record_year } = req.body;
  
  try {
    const [result] = await db.query(
      `INSERT INTO treatment_timeline (patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price, record_year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price || 0.00, record_year || 1]
    );
    const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error adding timeline entry:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM treatment_timeline WHERE id = ?", [id]);
    res.json({ message: "Entry deleted" });
  } catch (error) {
    console.error("Error deleting timeline entry:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;