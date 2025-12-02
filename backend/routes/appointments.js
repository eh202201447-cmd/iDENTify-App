const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  const [rows] = await db.query(
    `SELECT a.*, p.full_name 
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     ORDER BY appointment_datetime ASC`
  );
  res.json(rows);
});

router.post("/", async (req, res) => {
  const { patient_id, dentist_id, timeStart, procedure, notes, status } = req.body;

  // A basic way to merge date and time for a DATETIME SQL field.
  // This assumes the appointment is for the current day.
  const appointment_datetime = new Date();
  const [time, meridiem] = timeStart.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours);
  if (meridiem === 'PM' && hours < 12) {
    hours += 12;
  }
  if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }
  appointment_datetime.setHours(hours, parseInt(minutes), 0, 0);

  const [result] = await db.query(
    `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, reason, notes, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patient_id, dentist_id, appointment_datetime, procedure, notes, status]
  );
  
  const insertId = result.insertId;
  const [rows] = await db.query(
    `SELECT a.*, p.full_name 
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     WHERE a.id = ?`,
    [insertId]
  );

  res.status(201).json(rows[0]);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  const setClauses = [];
  const values = [];

  if (fields.timeStart) {
    const appointment_datetime = new Date();
    const [time, meridiem] = fields.timeStart.split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    if (meridiem === 'PM' && hours < 12) {
      hours += 12;
    }
    if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
    appointment_datetime.setHours(hours, parseInt(minutes), 0, 0);
    setClauses.push("appointment_datetime = ?");
    values.push(appointment_datetime);
  }

  if (fields.dentist_id) {
    setClauses.push("dentist_id = ?");
    values.push(fields.dentist_id);
  }
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

  if (setClauses.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  values.push(id);

  const sql = `UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`;

  await db.query(sql, values);

  const [rows] = await db.query(
    `SELECT a.*, p.full_name 
     FROM appointments a
     JOIN patients p ON a.patient_id = p.id
     WHERE a.id = ?`,
    [id]
  );
  res.json(rows[0]);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM appointments WHERE id = ?", [id]);
  res.json({ message: "Appointment deleted" });
});

module.exports = router;
