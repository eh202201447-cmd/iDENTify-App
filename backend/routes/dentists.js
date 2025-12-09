const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all dentists
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM dentists");
    
    // Transform DB rows to match Frontend expectation
    const enhancedRows = rows.map(d => {
        // Parse the JSON schedule column
        const schedule = typeof d.schedule === 'string' ? JSON.parse(d.schedule) : (d.schedule || {});
        
        return {
            id: d.id,
            name: d.name,
            shortName: d.name, // Frontend uses shortName as key sometimes
            specialization: d.specialty, // Map 'specialty' column to 'specialization' prop
            status: d.status || 'Available',
            // Default schedule structure if null
            days: schedule.days || [1, 2, 3, 4, 5], 
            operatingHours: schedule.operatingHours || { start: "09:00", end: "17:00" },
            lunch: schedule.lunch || { start: "12:00", end: "13:00" },
            breaks: schedule.breaks || [],
            leaveDays: schedule.leaveDays || [],
            assignedPatientsToday: [] // This requires complex join, leaving empty for now
        };
    });
    res.json(enhancedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update dentist (Status, Schedule, Leave, etc.)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { status, days, operatingHours, lunch, breaks, leaveDays } = req.body;

  // Construct the schedule JSON object
  const scheduleObj = {
    days,
    operatingHours,
    lunch,
    breaks,
    leaveDays
  };

  const scheduleJson = JSON.stringify(scheduleObj);

  try {
    await db.query(
      "UPDATE dentists SET status = ?, schedule = ? WHERE id = ?",
      [status, scheduleJson, id]
    );

    // Return the data so frontend store can update
    res.json({ id: Number(id), ...req.body });
  } catch (error) {
    console.error("Error updating dentist:", error);
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;