const express = require("express");
const router = express.Router();
const db = require("../db");

// Get specific queue status for the mobile app
router.get("/status", async (req, res) => {
  const { patient_id } = req.query;

  if (!patient_id) {
    return res.status(400).json({ message: "patient_id is required" });
  }

  try {
    const [myQueueRows] = await db.query(
      `SELECT q.*, p.full_name, d.name as dentist_name 
       FROM walk_in_queue q
       LEFT JOIN patients p ON q.patient_id = p.id
       LEFT JOIN dentists d ON q.dentist_id = d.id
       WHERE q.patient_id = ? AND q.status NOT IN ('Done', 'Cancelled')
       ORDER BY time_added ASC LIMIT 1`,
      [patient_id]
    );

    const [servingRows] = await db.query(
      `SELECT q.*, p.full_name 
       FROM walk_in_queue q 
       JOIN patients p ON q.patient_id = p.id
       WHERE q.status IN ('On Chair', 'Serving', 'Treatment') 
       ORDER BY time_added ASC LIMIT 1`
    );

    let nowServing = servingRows[0];
    if (!nowServing) {
      const [waitingRows] = await db.query(
        `SELECT q.*, p.full_name 
         FROM walk_in_queue q 
         JOIN patients p ON q.patient_id = p.id
         WHERE q.status IN ('Waiting', 'Checked-In') 
         ORDER BY time_added ASC LIMIT 1`
      );
      nowServing = waitingRows[0];
    }

    res.json({
      myStatus: myQueueRows[0] || null,
      nowServing: nowServing || null,
      estimatedWaitTime: "10-20 mins",
    });

  } catch (error) {
    console.error("Error fetching queue status:", error);
    res.status(500).json({ message: "Database error fetching queue status" });
  }
});

// Get entire queue
router.get("/", async (req, res) => {
  const [rows] = await db.query(
    `SELECT q.*, p.full_name, d.name as dentist_name 
     FROM walk_in_queue q
     LEFT JOIN patients p ON q.patient_id = p.id
     LEFT JOIN dentists d ON q.dentist_id = d.id
     ORDER BY FIELD(q.status, 'On Chair', 'Treatment', 'Checked-In', 'Waiting', 'Payment / Billing', 'Done', 'Cancelled'), time_added ASC`
  );
  res.json(rows);
});

// Add to Queue
router.post("/", async (req, res) => {
  const { patient_id, dentist_id, appointment_id, source, status, notes, checkedInTime } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO walk_in_queue (patient_id, dentist_id, appointment_id, source, status, notes, time_added)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, dentist_id, appointment_id, source, status, notes, checkedInTime || new Date()]
    );

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

// Update Queue Status (AND SYNC APPOINTMENT)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // 1. Update the Queue Item
    await db.query(
      `UPDATE walk_in_queue SET status = ? WHERE id = ?`,
      [status, id]
    );

    // 2. CRITICAL FIX: Find if this queue item is linked to an appointment
    const [qItem] = await db.query("SELECT appointment_id FROM walk_in_queue WHERE id = ?", [id]);
    
    // 3. If linked, update the Appointment status too!
    if (qItem.length > 0 && qItem[0].appointment_id) {
       await db.query(
         `UPDATE appointments SET status = ? WHERE id = ?`,
         [status, qItem[0].appointment_id]
       );
       console.log(`[Sync] Updated Linked Appointment ${qItem[0].appointment_id} to status: ${status}`);
    }

    res.json({ message: "Queue item updated and synchronized", id, status });
  } catch (err) {
    console.error("Error updating queue:", err);
    res.status(500).json({ message: "Failed to update queue" });
  }
});

// Delete Queue Item
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM walk_in_queue WHERE id = ?", [id]);
    res.json({ message: "Queue item deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete queue item" });
  }
});

module.exports = router;