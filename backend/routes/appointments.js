const express = require("express");
const router = express.Router();
const db = require("../db");

// Helper to parse time strings like "09:00 AM" into a Date object
function parseTime(timeStr) {
  if (!timeStr) return null;
  const date = new Date();
  const [time, meridiem] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours);
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  date.setHours(hours, parseInt(minutes), 0, 0);
  return date;
}

router.get("/", async (req, res) => {
  // We select 'reason' as 'procedure' so the frontend receives the field it expects
  const [rows] = await db.query(
    `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     ORDER BY appointment_datetime ASC`
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { patient_id, dentist_id, timeStart, timeEnd, procedure, notes, status } = req.body;

  const appointment_datetime = parseTime(timeStart);
  const end_datetime = parseTime(timeEnd);

  const [result] = await db.query(
    `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, end_datetime, reason, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [patient_id, dentist_id, appointment_datetime, end_datetime, procedure, notes, status || 'Scheduled']
  );
  
  const [rows] = await db.query(
    `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     WHERE a.id = ?`,
    [result.insertId]
  );

  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  const setClauses = [];
  const values = [];

  if (fields.timeStart) {
    setClauses.push("appointment_datetime = ?");
    values.push(parseTime(fields.timeStart));
  }
  if (fields.timeEnd) {
    setClauses.push("end_datetime = ?");
    values.push(parseTime(fields.timeEnd));
  }
  if (fields.dentist_id) {
    setClauses.push("dentist_id = ?");
    values.push(fields.dentist_id);
  }
  // Map frontend 'procedure' to backend 'reason'
  if (fields.procedure) {
    setClauses.push("reason = ?");
    values.push(fields.procedure);
  }
  if (fields.notes) {
    setClauses.push("notes = ?");
    values.push(fields.notes);
  }
  if (fields.status) {
    setClauses.push("status = ?");
    values.push(fields.status);
  }

  if (setClauses.length === 0) return res.status(400).json({ message: "No updates" });

  values.push(id);
  await db.query(`UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`, values);

  const [rows] = await db.query(
    `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     WHERE a.id = ?`,
    [id]
  );
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  await db.query("DELETE FROM appointments WHERE id = ?", [req.params.id]);
  res.json({ message: "Appointment deleted" });
});

module.exports = router;