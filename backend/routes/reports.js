// const express = require("express");
// const router = express.Router();
// const pool = require("../db");

// // @route   GET /api/reports
// // @desc    Get reports data (daily summary and dentist performance)
// // @access  Private
// router.get("/", async (req, res) => {
//   try {
//     // --- Daily Summary ---
//     const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

//     const patientsSeenRes = await pool.query(
//       "SELECT COUNT(DISTINCT patient_id) as count FROM appointments WHERE DATE(appointment_datetime) = ?",
//       [today]
//     );
//     const patientsSeen = patientsSeenRes[0][0].count;

//     const proceduresDoneRes = await pool.query(
//       "SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_datetime) = ? AND status = 'Done'",
//       [today]
//     );
//     const proceduresDone = proceduresDoneRes[0][0].count;

//     // Cannot calculate new patients without a creation timestamp column on the patients table.
//     const newPatients = "N/A";
    
//     // --- Dentist Performance ---
//     const dentistPerformanceRes = await pool.query(`
//       SELECT
//         d.id,
//         d.name,
//         COUNT(a.id) AS patientsHandled,
//         AVG(TIMESTAMPDIFF(MINUTE, a.appointment_datetime, a.end_datetime)) as avgTimePerPatient
//       FROM dentists d
//       LEFT JOIN appointments a ON d.id = a.dentist_id AND DATE(a.appointment_datetime) = ?
//       GROUP BY d.id, d.name
//     `, [today]);

//     const dentistPerformance = dentistPerformanceRes[0];

//     // --- Treatment Distribution per Dentist ---
//     for (const dentist of dentistPerformance) {
//       const distributionRes = await pool.query(`
//         SELECT
//           t.name as treatment,
//           COUNT(a.id) as count
//         FROM appointments a
//         JOIN treatments t ON a.treatment_id = t.id
//         WHERE a.dentist_id = ? AND DATE(a.appointment_datetime) = ?
//         GROUP BY t.name
//       `, [dentist.id, today]);
      
//       dentist.treatmentDistribution = distributionRes[0].reduce((acc, row) => {
//         acc[row.treatment] = row.count;
//         return acc;
//       }, {});
//     }

//     res.json({
//       dailySummary: {
//         patientsSeen,
//         proceduresDone,
//         newPatients,
//         avgTreatmentDuration: "N/A", // This is harder to calculate accurately without more schema info
//       },
//       dentistPerformance,
//     });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send("Server Error");
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); 

    // --- Daily Summary ---
    const [patientsSeenRes] = await pool.query(
      "SELECT COUNT(DISTINCT patient_id) as count FROM appointments WHERE DATE(appointment_datetime) = ?",
      [today]
    );
    
    const [proceduresRes] = await pool.query(
      "SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_datetime) = ? AND status = 'Done'",
      [today]
    );

    const [durationRes] = await pool.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, appointment_datetime, end_datetime)) as avg_min 
       FROM appointments 
       WHERE DATE(appointment_datetime) = ? AND status = 'Done' AND end_datetime IS NOT NULL`,
      [today]
    );

    // --- Dentist Performance (only for 'Done' appointments) ---
    const [dentistPerformance] = await pool.query(`
      SELECT
        d.id,
        d.name,
        COUNT(a.id) AS patientsHandled,
        COALESCE(AVG(TIMESTAMPDIFF(MINUTE, a.appointment_datetime, a.end_datetime)), 0) as avgTimePerPatient
      FROM dentists d
      LEFT JOIN appointments a ON d.id = a.dentist_id AND DATE(a.appointment_datetime) = ? AND a.status = 'Done'
      GROUP BY d.id, d.name
    `, [today]);

    // --- Treatment Distribution (for all appointments today, not just 'Done') ---
    const [distributionRes] = await pool.query(`
      SELECT
        dentist_id,
        reason as treatment,
        COUNT(id) as count
      FROM appointments
      WHERE DATE(appointment_datetime) = ? AND dentist_id IS NOT NULL
      GROUP BY dentist_id, reason
    `, [today]);
    
    // Map the distribution results to the dentists
    const distributionMap = distributionRes.reduce((acc, row) => {
        if (!acc[row.dentist_id]) {
            acc[row.dentist_id] = {};
        }
        acc[row.dentist_id][row.treatment || 'Unspecified'] = row.count;
        return acc;
    }, {});

    dentistPerformance.forEach(dentist => {
        dentist.treatmentDistribution = distributionMap[dentist.id] || {};
    });

    res.json({
      dailySummary: {
        patientsSeen: patientsSeenRes[0].count || 0,
        proceduresDone: proceduresRes[0].count || 0,
        newPatients: 0, // Requires 'created_at' on patients table to calculate accurately
        avgTreatmentDuration: durationRes[0].avg_min ? `${Math.round(durationRes[0].avg_min)} min` : "0 min",
      },
      dentistPerformance,
    });
  } catch (err) {
    console.error("Reports API Error:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;