const express = require("express");
const router = express.Router();
const db = require("../db");

// Helper to parse "YYYY-MM-DD HH:MM AM/PM" into a MySQL-compatible "YYYY-MM-DD HH:MI:SS" string
function parseTime(dateTimeStr) {
  if (!dateTimeStr) return null;

  // Regex for "YYYY-MM-DD HH:MM AM/PM"
  const parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)/);
  
  if (!parts) {
    // FALLBACK: If string is just "09:00 AM", we attach today's date to prevent NULL errors
    const timeParts = dateTimeStr.match(/(\d{1,2}):(\d{2}) (AM|PM)/);
    if (timeParts) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        console.warn(`Warning: Time-only string received "${dateTimeStr}". Defaulting to today: ${year}-${month}-${day}`);
        // Recursively call with fixed string
        return parseTime(`${year}-${month}-${day} ${dateTimeStr}`);
    }
    console.error("Invalid dateTimeStr format:", dateTimeStr);
    return null;
  }

  let [, year, month, day, hour, minute, meridiem] = parts;
  let hourInt = parseInt(hour, 10);

  if (meridiem === 'PM' && hourInt < 12) {
    hourInt += 12;
  }
  if (meridiem === 'AM' && hourInt === 12) { // Midnight case
    hourInt = 0;
  }

  // Format to YYYY-MM-DD HH:MI:SS
  const formattedHour = hourInt.toString().padStart(2, '0');
  const sqlDateTime = `${year}-${month}-${day} ${formattedHour}:${minute}:00`;

  return sqlDateTime;
}

router.get("/", async (req, res) => {
  const { patient_id } = req.query;

  let query = `
    SELECT a.*, a.reason AS \`procedure\`, p.full_name 
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
  `;
  const params = [];

  if (patient_id) {
    query += " WHERE a.patient_id = ?";
    params.push(patient_id);
  }

  query += " ORDER BY appointment_datetime ASC";

  const [rows] = await db.query(query, params);
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
    const parsed = parseTime(fields.timeStart);
    if (parsed) {
        setClauses.push("appointment_datetime = ?");
        values.push(parsed);
    }
  }
  if (fields.timeEnd) {
    const parsed = parseTime(fields.timeEnd);
    if (parsed) {
        setClauses.push("end_datetime = ?");
        values.push(parsed);
    }
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

  if (setClauses.length === 0) return res.status(400).json({ message: "No valid updates" });

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

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      `SELECT 
         a.*, 
         a.reason AS \`procedure\`, 
         p.full_name as patient_name, 
         d.name as dentist_name 
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN dentists d ON a.dentist_id = d.id
       WHERE a.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(`Error fetching appointment ${id}:`, error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;