// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// // Helper to parse Date Strings into MySQL "YYYY-MM-DD HH:MI:SS"
// function parseTime(dateTimeStr) {
//   if (!dateTimeStr) return null;

//   // 1. Try 12-Hour Format: "YYYY-MM-DD HH:MM AM/PM" (Web)
//   let parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)/);
  
//   if (parts) {
//     let [, year, month, day, hour, minute, meridiem] = parts;
//     let hourInt = parseInt(hour, 10);
//     if (meridiem === 'PM' && hourInt < 12) hourInt += 12;
//     if (meridiem === 'AM' && hourInt === 12) hourInt = 0;
//     return `${year}-${month}-${day} ${hourInt.toString().padStart(2, '0')}:${minute}:00`;
//   }

//   // 2. Try 24-Hour Format: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM" (Mobile/Standard)
//   parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(?::(\d{2}))?/);
  
//   if (parts) {
//     // Already in correct structure, just return clean string
//     let [, year, month, day, hour, minute, second] = parts;
//     return `${year}-${month}-${day} ${hour}:${minute}:${second || '00'}`;
//   }

//   // 3. Fallback: Time only "09:00 AM" -> Attach Today
//   const timeParts = dateTimeStr.match(/(\d{1,2}):(\d{2}) (AM|PM)/);
//   if (timeParts) {
//       const today = new Date();
//       const year = today.getFullYear();
//       const month = String(today.getMonth() + 1).padStart(2, '0');
//       const day = String(today.getDate()).padStart(2, '0');
//       return parseTime(`${year}-${month}-${day} ${dateTimeStr}`);
//   }

//   console.error("Invalid dateTimeStr format:", dateTimeStr);
//   return null;
// }

// router.get("/", async (req, res) => {
//   const { patient_id } = req.query;
//   let query = `
//     SELECT a.*, a.reason AS \`procedure\`, p.full_name 
//     FROM appointments a
//     JOIN patients p ON a.patient_id = p.id
//   `;
//   const params = [];

//   if (patient_id) {
//     query += " WHERE a.patient_id = ?";
//     params.push(patient_id);
//   }

//   query += " ORDER BY appointment_datetime ASC";

//   const [rows] = await db.query(query, params);
//   res.json(rows);
// });

// router.post("/", async (req, res) => {
//   const { patient_id, dentist_id, timeStart, timeEnd, procedure, notes, status } = req.body;

//   const appointment_datetime = parseTime(timeStart);
//   const end_datetime = parseTime(timeEnd);

//   if (!appointment_datetime) {
//       return res.status(400).json({ message: "Invalid Start Time Format" });
//   }

//   const [result] = await db.query(
//     `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, end_datetime, reason, notes, status)
//      VALUES (?, ?, ?, ?, ?, ?, ?)`,
//     [patient_id, dentist_id, appointment_datetime, end_datetime, procedure, notes, status || 'Scheduled']
//   );
  
//   const [rows] = await db.query(
//     `SELECT a.*, a.reason AS \`procedure\`, p.full_name 
//      FROM appointments a
//      JOIN patients p ON a.patient_id = p.id
//      WHERE a.id = ?`,
//     [result.insertId]
//   );

//   res.status(201).json(rows[0]);
// });

// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const fields = req.body;
//   const setClauses = [];
//   const values = [];

//   if (fields.timeStart) {
//     const parsed = parseTime(fields.timeStart);
//     if (parsed) { setClauses.push("appointment_datetime = ?"); values.push(parsed); }
//   }
//   if (fields.timeEnd) {
//     const parsed = parseTime(fields.timeEnd);
//     if (parsed) { setClauses.push("end_datetime = ?"); values.push(parsed); }
//   }
//   if (fields.dentist_id) { setClauses.push("dentist_id = ?"); values.push(fields.dentist_id); }
//   if (fields.procedure) { setClauses.push("reason = ?"); values.push(fields.procedure); }
//   if (fields.notes) { setClauses.push("notes = ?"); values.push(fields.notes); }
//   if (fields.status) { setClauses.push("status = ?"); values.push(fields.status); }

//   if (setClauses.length === 0) return res.status(400).json({ message: "No valid updates" });

//   values.push(id);
//   await db.query(`UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`, values);

//   const [rows] = await db.query("SELECT * FROM appointments WHERE id = ?", [id]);
//   res.json(rows[0]);
// });

// router.delete("/:id", async (req, res) => {
//   await db.query("DELETE FROM appointments WHERE id = ?", [req.params.id]);
//   res.json({ message: "Appointment deleted" });
// });

// router.get("/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const [rows] = await db.query(
//       `SELECT a.*, a.reason AS \`procedure\`, p.full_name as patient_name, d.name as dentist_name 
//        FROM appointments a
//        LEFT JOIN patients p ON a.patient_id = p.id
//        LEFT JOIN dentists d ON a.dentist_id = d.id
//        WHERE a.id = ?`,
//       [id]
//     );
//     if (rows.length === 0) return res.status(404).json({ message: "Appointment not found" });
//     res.json(rows[0]);
//   } catch (error) {
//     console.error(`Error fetching appointment ${id}:`, error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");

// Helper to parse Date Strings into MySQL "YYYY-MM-DD HH:MI:SS"
function parseTime(dateTimeStr) {
  if (!dateTimeStr) return null;

  // 1. Try 12-Hour Format: "YYYY-MM-DD HH:MM AM/PM" (Web)
  let parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM)/);
  
  if (parts) {
    let [, year, month, day, hour, minute, meridiem] = parts;
    let hourInt = parseInt(hour, 10);
    if (meridiem === 'PM' && hourInt < 12) hourInt += 12;
    if (meridiem === 'AM' && hourInt === 12) hourInt = 0;
    return `${year}-${month}-${day} ${hourInt.toString().padStart(2, '0')}:${minute}:00`;
  }

  // 2. Try 24-Hour Format: "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD HH:MM" (Mobile/Standard)
  parts = dateTimeStr.match(/(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})(?::(\d{2}))?/);
  
  if (parts) {
    // Already in correct structure, just return clean string
    let [, year, month, day, hour, minute, second] = parts;
    return `${year}-${month}-${day} ${hour}:${minute}:${second || '00'}`;
  }

  // 3. Fallback: Time only "09:00 AM" -> Attach Today
  const timeParts = dateTimeStr.match(/(\d{1,2}):(\d{2}) (AM|PM)/);
  if (timeParts) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return parseTime(`${year}-${month}-${day} ${dateTimeStr}`);
  }

  console.error("Invalid dateTimeStr format:", dateTimeStr);
  return null;
}

// --- NEW ENDPOINT: Check Daily Limit ---
router.get("/check-limit", async (req, res) => {
  const { dentist_id, date } = req.query;

  if (!dentist_id || !date) {
    return res.status(400).json({ message: "Missing dentist_id or date" });
  }

  try {
    const [countResult] = await db.query(
      `SELECT COUNT(*) as count 
       FROM appointments 
       WHERE dentist_id = ? 
         AND DATE(appointment_datetime) = ? 
         AND status != 'Cancelled'`,
      [dentist_id, date]
    );

    const count = countResult[0].count;
    const limit = 5;
    
    res.json({
      count,
      limit,
      isFull: count >= limit,
      remaining: Math.max(0, limit - count)
    });
  } catch (err) {
    console.error("Error checking limit:", err);
    res.status(500).json({ message: "Server error" });
  }
});

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
  const { patient_id, dentist_id, timeStart, procedure, notes, status } = req.body;

  const appointment_datetime = parseTime(timeStart);

  if (!appointment_datetime) {
      return res.status(400).json({ message: "Invalid Start Time Format" });
  }

  // Double Check Limit on Save (Security)
  try {
    const dateOnly = appointment_datetime.split(' ')[0];
    const [countResult] = await db.query(
      `SELECT COUNT(*) as count 
       FROM appointments 
       WHERE dentist_id = ? 
         AND DATE(appointment_datetime) = ? 
         AND status != 'Cancelled'`,
      [dentist_id, dateOnly]
    );

    if (countResult[0].count >= 5) {
      return res.status(400).json({ 
        message: "Daily limit reached (5/5). Please proceed as a Walk-In." 
      });
    }
  } catch (err) {
    console.error("Error checking appointment limit:", err);
    return res.status(500).json({ message: "Server error checking availability" });
  }

  // REMOVED end_datetime from INSERT
  const [result] = await db.query(
    `INSERT INTO appointments (patient_id, dentist_id, appointment_datetime, reason, notes, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patient_id, dentist_id, appointment_datetime, procedure, notes, status || 'Scheduled']
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
    if (parsed) { setClauses.push("appointment_datetime = ?"); values.push(parsed); }
  }
  // REMOVED timeEnd check
  if (fields.dentist_id) { setClauses.push("dentist_id = ?"); values.push(fields.dentist_id); }
  if (fields.procedure) { setClauses.push("reason = ?"); values.push(fields.procedure); }
  if (fields.notes) { setClauses.push("notes = ?"); values.push(fields.notes); }
  if (fields.status) { setClauses.push("status = ?"); values.push(fields.status); }

  if (setClauses.length === 0) return res.status(400).json({ message: "No valid updates" });

  values.push(id);
  await db.query(`UPDATE appointments SET ${setClauses.join(", ")} WHERE id = ?`, values);

  const [rows] = await db.query("SELECT * FROM appointments WHERE id = ?", [id]);
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
      `SELECT a.*, a.reason AS \`procedure\`, p.full_name as patient_name, d.name as dentist_name 
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN dentists d ON a.dentist_id = d.id
       WHERE a.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "Appointment not found" });
    res.json(rows[0]);
  } catch (error) {
    console.error(`Error fetching appointment ${id}:`, error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;