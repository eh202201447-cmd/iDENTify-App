const express = require("express");
const router = express.Router();
const db = require("../db");

// Get Timeline for Patient
router.get("/:patientId", async (req, res) => {
  const { patientId } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE patient_id = ? ORDER BY id DESC", [patientId]);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add Timeline Entry
router.post("/", async (req, res) => {
  const { patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price } = req.body;
  
  try {
    const [result] = await db.query(
      `INSERT INTO treatment_timeline (patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, start_time, end_time, provider, procedure_text, notes, image_url, price || 0.00]
    );
    const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error adding timeline entry:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete Timeline Entry
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