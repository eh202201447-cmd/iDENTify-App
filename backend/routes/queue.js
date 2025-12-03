const express = require("express");
const router = express.Router();
const db = require("../db");

// ADDED: Get specific queue status for the mobile app
router.get("/status", async (req, res) => {
  const { patient_id } = req.query;

  if (!patient_id) {
    return res.status(400).json({ message: "patient_id is required" });
  }

  try {
    // Find the user's entry in the queue
    const [myQueueRows] = await db.query(
      `SELECT q.*, p.full_name, d.name as dentist_name 
       FROM walk_in_queue q
       LEFT JOIN patients p ON q.patient_id = p.id
       LEFT JOIN dentists d ON q.dentist_id = d.id
       WHERE q.patient_id = ? AND q.status NOT IN ('Done', 'Cancelled')
       ORDER BY time_added ASC LIMIT 1`,
      [patient_id]
    );

    // Find the patient currently being served, with a priority of statuses
    const [servingRows] = await db.query(
      `SELECT q.*, p.full_name 
       FROM walk_in_queue q 
       JOIN patients p ON q.patient_id = p.id
       WHERE q.status IN ('On Chair', 'Serving', 'Treatment') 
       ORDER BY time_added ASC LIMIT 1`
    );

    let nowServing = servingRows[0];
    if (!nowServing) {
      // If no one is actively being served, find the first person waiting
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
      estimatedWaitTime: "10-20 mins", // Placeholder logic
    });

  } catch (error) {
    console.error("Error fetching queue status:", error);
    res.status(500).json({ message: "Database error fetching queue status" });
  }
});

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