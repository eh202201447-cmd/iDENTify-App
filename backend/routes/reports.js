const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", async (req, res) => {
  try {
    const { date } = req.query;
    // Default to today if no date is provided
    const reportDate = date || new Date().toISOString().split('T')[0];

    // 1. Daily Summary Queries
    
    // A. Patients Seen (Unique patients with appointments marked 'Done' on the selected date)
    const [patientsSeenRes] = await db.query(
      `SELECT COUNT(DISTINCT patient_id) as count 
       FROM appointments 
       WHERE DATE(appointment_datetime) = ? AND status = 'Done'`,
      [reportDate]
    );

    // B. Procedures Done (Total 'Done' appointments)
    const [proceduresRes] = await db.query(
      `SELECT COUNT(*) as count 
       FROM appointments 
       WHERE DATE(appointment_datetime) = ? AND status = 'Done'`,
      [reportDate]
    );

    // C. New Patients (Patients registered on the selected date)
    let newPatients = 0;
    try {
        const [newPatientsRes] = await db.query(
            `SELECT COUNT(*) as count FROM patients WHERE DATE(created_at) = ?`,
            [reportDate]
        );
        newPatients = newPatientsRes[0].count;
    } catch (e) {
        console.warn("Could not query new patients (missing created_at?)", e);
    }

    // D. Average Treatment Duration (Difference between start and end time for Done appts)
    const [durationRes] = await db.query(
      `SELECT AVG(TIMESTAMPDIFF(MINUTE, appointment_datetime, end_datetime)) as avg_min 
       FROM appointments 
       WHERE DATE(appointment_datetime) = ? AND status = 'Done' AND end_datetime IS NOT NULL`,
      [reportDate]
    );

    // 2. Dentist Performance
    const [dentistPerformance] = await db.query(`
      SELECT
        d.id,
        d.name,
        COUNT(a.id) AS patientsHandled,
        COALESCE(AVG(TIMESTAMPDIFF(MINUTE, a.appointment_datetime, a.end_datetime)), 0) as avgTimePerPatient
      FROM dentists d
      LEFT JOIN appointments a ON d.id = a.dentist_id 
           AND DATE(a.appointment_datetime) = ? 
           AND a.status = 'Done'
      GROUP BY d.id, d.name
    `, [reportDate]);

    // 3. Treatment Distribution
    const [distributionRes] = await db.query(`
      SELECT
        dentist_id,
        reason as treatment,
        COUNT(id) as count
      FROM appointments
      WHERE DATE(appointment_datetime) = ? AND status = 'Done' AND dentist_id IS NOT NULL
      GROUP BY dentist_id, reason
    `, [reportDate]);
    
    const distributionMap = distributionRes.reduce((acc, row) => {
        if (!acc[row.dentist_id]) {
            acc[row.dentist_id] = {};
        }
        const treatmentName = row.treatment || 'Unspecified';
        acc[row.dentist_id][treatmentName] = row.count;
        return acc;
    }, {});

    dentistPerformance.forEach(dentist => {
        dentist.treatmentDistribution = distributionMap[dentist.id] || {};
    });

    res.json({
      date: reportDate,
      dailySummary: {
        patientsSeen: patientsSeenRes[0].count || 0,
        proceduresDone: proceduresRes[0].count || 0,
        newPatients: newPatients,
        avgTreatmentDuration: durationRes[0].avg_min ? `${Math.round(durationRes[0].avg_min)} min` : "0 min",
      },
      dentistPerformance,
    });

  } catch (err) {
    console.error("Reports API Error:", err);
    res.status(500).json({ message: "Failed to load reports" });
  }
});

module.exports = router;