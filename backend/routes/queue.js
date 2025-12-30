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
    // 1. Fetch ALL active items to calculate positions
    // We filter out 'Done' and 'Cancelled' because they don't count towards the line number.
    const [allActiveRows] = await db.query(
      `SELECT q.*, p.full_name, d.name as dentist_name 
       FROM walk_in_queue q
       LEFT JOIN patients p ON q.patient_id = p.id
       LEFT JOIN dentists d ON q.dentist_id = d.id
       WHERE q.status NOT IN ('Done', 'Cancelled')
       ORDER BY FIELD(q.status, 'On Chair', 'Treatment', 'Serving', 'Checked-In', 'Waiting', 'Payment / Billing'), time_added ASC`
    );

    // 2. Find "My Status" and calculate "My Number" (Position in the List)
    // We search the sorted list for the current user.
    const myIndex = allActiveRows.findIndex(row => String(row.patient_id) === String(patient_id));
    
    // If found, the "Ticket Number" is the index + 1 (so the first person is #1, not #0)
    const myStatusRow = myIndex !== -1 ? allActiveRows[myIndex] : null;
    const myNumber = myIndex !== -1 ? myIndex + 1 : null; 

    // 3. Find "Now Serving" and calculate "Serving Number"
    // The "Now Serving" person is the first one with status 'On Chair', 'Serving', or 'Treatment'.
    let servingIndex = allActiveRows.findIndex(row => 
      ['On Chair', 'Serving', 'Treatment'].includes(row.status)
    );

    // Fallback: If nobody is explicitly "On Chair", the first person in the list is the one being served.
    if (servingIndex === -1 && allActiveRows.length > 0) {
      servingIndex = 0;
    }

    const servingRow = servingIndex !== -1 ? allActiveRows[servingIndex] : null;
    const servingNumber = servingIndex !== -1 ? servingIndex + 1 : null; 

    // 4. Return the CALCULATED numbers (myNumber, servingNumber) that the App expects
    res.json({
      myStatus: myStatusRow,
      myNumber: myNumber,           // <--- The App needs this for "Your Ticket"
      nowServing: servingRow,
      servingNumber: servingNumber, // <--- The App needs this for "Now Serving"
      estimatedWaitTime: "10-20 mins",
    });

  } catch (error) {
    console.error("Error fetching queue status:", error);
    res.status(500).json({ message: "Database error fetching queue status" });
  }
});

// Get entire queue (Web Dashboard)
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

    // 2. Sync with Appointment if linked
    const [qItem] = await db.query("SELECT appointment_id FROM walk_in_queue WHERE id = ?", [id]);
    
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