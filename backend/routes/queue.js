const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const [rows] = await db.query(
    `SELECT q.*, p.full_name 
     FROM walk_in_queue q
     JOIN patients p ON q.patient_id = p.id
     ORDER BY time_added ASC`
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { patient_id, dentist_id, appointment_id, source, status, notes, checkedInTime } = req.body;

  const [result] = await db.query(
    `INSERT INTO walk_in_queue (patient_id, dentist_id, appointment_id, source, status, notes, time_added)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [patient_id, dentist_id, appointment_id, source, status, notes, checkedInTime]
  );

  res.json({ id: result.insertId, message: "Patient added to queue" });
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  await db.query(
    `UPDATE walk_in_queue SET status = ? WHERE id = ?`,
    [status, id]
  );

  res.json({ message: "Queue item updated" });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM walk_in_queue WHERE id = ?", [id]);
  res.json({ message: "Queue item deleted" });
});

module.exports = router;
