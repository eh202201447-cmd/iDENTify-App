const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  // Join with patients and dentists to get readable names
  const [rows] = await db.query(
    `SELECT q.*, p.full_name, d.name as dentist_name 
     FROM walk_in_queue q
     LEFT JOIN patients p ON q.patient_id = p.id
     LEFT JOIN dentists d ON q.dentist_id = d.id
     ORDER BY time_added ASC`
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { patient_id, dentist_id, appointment_id, source, status, notes, checkedInTime } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO walk_in_queue (patient_id, dentist_id, appointment_id, source, status, notes, time_added)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, dentist_id, appointment_id, source, status, notes, checkedInTime]
    );

    // Return the full object with names so the UI updates instantly
    const [rows] = await db.query(
      `SELECT q.*, p.full_name, d.name as dentist_name
       FROM walk_in_queue q
       LEFT JOIN patients p ON q.patient_id = p.id
       LEFT JOIN dentists d ON q.dentist_id = d.id
       WHERE q.id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error adding to queue:", error);
    res.status(500).json({ message: "Database error adding to queue" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await db.query(
    `UPDATE walk_in_queue SET status = ? WHERE id = ?`,
    [status, id]
  );

  res.json({ message: "Queue item updated", id, status });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM walk_in_queue WHERE id = ?", [id]);
  res.json({ message: "Queue item deleted" });
});

module.exports = router;