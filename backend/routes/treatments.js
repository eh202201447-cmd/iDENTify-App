// const express = require("express");
// const router = express.Router();

// // TODO: Replace this with a database query
// const treatments = [
//   {
//     id: 1,
//     patientId: 1,
//     date: "2025-11-28",
//     procedure: "Cleaning",
//     dentist: "Dr. Hernane Benedicto",
//     notes: "Routine cleaning, no issues.",
//   },
//   {
//     id: 2,
//     patientId: 2,
//     date: "2025-11-28",
//     procedure: "Filling",
//     dentist: "Dr. Hernane Benedicto",
//     notes: "Composite filling on tooth #14.",
//   },
//   {
//     id: 3,
//     patientId: 3,
//     date: "2025-11-27",
//     procedure: "Root Canal",
//     dentist: "Dr. Paul Zaragoza",
//     notes: "Root canal therapy on tooth #30.",
//   },
// ];

// router.get("/", async (req, res) => {
//   res.json(treatments);
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    // Return recent treatments from the timeline
    const [rows] = await db.query(`
      SELECT t.id, t.patient_id as patientId, t.start_time as date, 
             t.procedure_text as procedure, t.provider as dentist, t.notes
      FROM treatment_timeline t
      ORDER BY t.id DESC
      LIMIT 50
    `);
    
    // Map date format if necessary, assuming start_time stores "HH:MM" or full date string
    // This connects the "Treatments" concept to actual data
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;