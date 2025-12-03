// const express = require("express");
// const router = express.Router();

// // TODO: Replace this with a database query
// const dentists = [
//   { id: 1, name: "Dr. Paul Zaragoza" },
//   { id: 2, name: "Dr. Erica Aquino" },
//   { id: 3, name: "Dr. Hernane Benedicto" },
// ];

// router.get("/", async (req, res) => {
//   res.json(dentists);
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM dentists");
    // Merge with static configuration if you want to keep schedule logic in backend,
    // otherwise just returning rows is fine for basic data.
    // The frontend currently expects specific fields like 'days', 'operatingHours' which aren't in the DB.
    // We will attach default structure so the frontend doesn't break.
    const enhancedRows = rows.map(d => ({
        ...d,
        shortName: d.name,
        days: [1, 2, 3, 4, 5], // Default M-F
        operatingHours: { start: "09:00", end: "17:00" },
        lunch: { start: "12:00", end: "13:00" },
        breaks: [],
        leaveDays: [],
        assignedPatientsToday: [] // This would need a complex join, leaving empty for now
    }));
    res.json(enhancedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;