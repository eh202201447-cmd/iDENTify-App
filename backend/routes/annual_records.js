const express = require("express");
const router = express.Router();
const db = require("../db");

// Get Available Years for a Patient
router.get("/years/:patientId", async (req, res) => {
  try {
    const { patientId } = req.params;
    const [rows] = await db.query(
      "SELECT record_year, status FROM patient_annual_records WHERE patient_id = ? ORDER BY record_year ASC",
      [patientId]
    );
    // If no years exist, return empty array (frontend will handle creating year 1)
    res.json(rows);
  } catch (error) {
    console.error("Error fetching years:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Data for a Specific Year
router.get("/:patientId/:year", async (req, res) => {
  try {
    const { patientId, year } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM patient_annual_records WHERE patient_id = ? AND record_year = ?",
      [patientId, year]
    );

    if (rows.length === 0) {
      return res.json(null); // No record for this year yet
    }

    const record = rows[0];
    record.vitals = typeof record.vitals === 'string' ? JSON.parse(record.vitals) : (record.vitals || {});
    record.xrays = typeof record.xrays === 'string' ? JSON.parse(record.xrays) : (record.xrays || []);
    
    res.json(record);
  } catch (error) {
    console.error("Error fetching annual record:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create or Update Annual Record
router.post("/", async (req, res) => {
  try {
    const { patient_id, record_year, vitals, dental_history, xrays, status } = req.body;

    // Check if exists
    const [existing] = await db.query(
      "SELECT id FROM patient_annual_records WHERE patient_id = ? AND record_year = ?",
      [patient_id, record_year]
    );

    const vitalsJson = JSON.stringify(vitals || {});
    const xraysJson = JSON.stringify(xrays || []);
    const recordStatus = status || 'Active';

    if (existing.length > 0) {
      // Update
      await db.query(
        `UPDATE patient_annual_records 
         SET vitals = ?, dental_history = ?, xrays = ?, status = ?
         WHERE id = ?`,
        [vitalsJson, dental_history, xraysJson, recordStatus, existing[0].id]
      );
      res.json({ message: "Record updated", id: existing[0].id });
    } else {
      // Insert
      const [result] = await db.query(
        `INSERT INTO patient_annual_records (patient_id, record_year, vitals, dental_history, xrays, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [patient_id, record_year, vitalsJson, dental_history, xraysJson, recordStatus]
      );
      res.status(201).json({ message: "Record created", id: result.insertId });
    }
  } catch (error) {
    console.error("Error saving annual record:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;