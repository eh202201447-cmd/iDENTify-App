const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all patients
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM patients ORDER BY id DESC");
    const results = rows.map(p => ({
      ...p,
      medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : [],
      // Safely parse vitals if it's a string, otherwise use object or empty
      vitals: typeof p.vitals === 'string' ? JSON.parse(p.vitals) : (p.vitals || {})
    }));
    res.json(results);
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Server error fetching patients" });
  }
});

// Create patient
router.post("/", async (req, res) => {
  const { 
    full_name, birthdate, gender, sex, address, 
    contact_number, contact, email, medicalAlerts, vitals, age, dentist_id 
  } = req.body;
  
  const dbGender = gender || sex;
  const dbContact = contact_number || contact;
  const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
  // LOGIC CHANGE: Store dentist_id inside vitals since we don't have a column for it
  let dbVitals = vitals || {};
  if (age && !dbVitals.age) dbVitals.age = age;
  if (dentist_id) dbVitals.dentist_id = dentist_id; // Store dentist here
  
  const dbVitalsString = JSON.stringify(dbVitals);

  try {
    const [result] = await db.query(
      `INSERT INTO patients (full_name, birthdate, gender, address, contact_number, email, medical_alerts, vitals)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, dbVitalsString]
    );

    const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [result.insertId]);
    const newPatient = rows[0];
    newPatient.medical_alerts = newPatient.medical_alerts ? newPatient.medical_alerts.split(',') : [];
    newPatient.vitals = typeof newPatient.vitals === 'string' ? JSON.parse(newPatient.vitals) : (newPatient.vitals || {});
    
    res.status(201).json(newPatient);
  } catch (error) {
    console.error("Error creating patient:", error);
    res.status(500).json({ message: "Database error while creating patient" });
  }
});

// Get single patient
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Patient not found" });
    }
    const patient = rows[0];
    patient.medical_alerts = patient.medical_alerts ? patient.medical_alerts.split(',') : [];
    patient.vitals = typeof patient.vitals === 'string' ? JSON.parse(patient.vitals) : (patient.vitals || {});
    res.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update patient
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { 
    full_name, name, birthdate, gender, sex, address, 
    contact_number, contact, email, medicalAlerts, vitals, age, dentist_id 
  } = req.body;
  
  const dbName = full_name || name;
  const dbGender = gender || sex;
  const dbContact = contact_number || contact;
  const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
  // LOGIC CHANGE: Merge dentist_id into vitals
  let dbVitals = vitals || {};
  if (age) dbVitals.age = age;
  if (dentist_id) dbVitals.dentist_id = dentist_id;
  
  const dbVitalsString = JSON.stringify(dbVitals);

  try {
    await db.query(
      `UPDATE patients 
       SET full_name=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=?, vitals=?
       WHERE id=?`,
      [dbName, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, dbVitalsString, id]
    );

    const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
    const updatedPatient = rows[0];
    updatedPatient.medical_alerts = updatedPatient.medical_alerts ? updatedPatient.medical_alerts.split(',') : [];
    updatedPatient.vitals = typeof updatedPatient.vitals === 'string' ? JSON.parse(updatedPatient.vitals) : (updatedPatient.vitals || {});
    
    res.json(updatedPatient);
  } catch (error) {
    console.error("Error updating patient:", error);
    res.status(500).json({ message: "Database error while updating patient" });
  }
});

// Delete patient
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM patients WHERE id = ?", [id]);
    res.json({ message: "Patient deleted" });
  } catch (error) {
    console.error("Error deleting patient:", error);
    res.status(500).json({ message: "Database error" });
  }
});

module.exports = router;

// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// // Get all patients
// router.get("/", async (req, res) => {
//   try {
//     const [rows] = await db.query("SELECT * FROM patients ORDER BY id DESC");
//     const results = rows.map(p => ({
//       ...p,
//       medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : [],
//       vitals: typeof p.vitals === 'string' ? JSON.parse(p.vitals) : (p.vitals || {})
//     }));
//     res.json(results);
//   } catch (error) {
//     console.error("Error fetching patients:", error);
//     res.status(500).json({ message: "Server error fetching patients" });
//   }
// });

// // Create patient
// router.post("/", async (req, res) => {
//   const { 
//     full_name, birthdate, gender, sex, address, 
//     contact_number, contact, email, medicalAlerts, vitals, age, dentist_id 
//   } = req.body;
  
//   const dbGender = gender || sex;
//   const dbContact = contact_number || contact;
//   const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
//   // Save dentist_id in vitals since we don't have a column for it
//   let dbVitals = vitals || {};
//   if (dentist_id) {
//     dbVitals.dentist_id = dentist_id;
//   }
  
//   const dbVitalsString = JSON.stringify(dbVitals);

//   try {
//     // UPDATED: Now inserting 'age' into its own column
//     const [result] = await db.query(
//       `INSERT INTO patients (full_name, age, birthdate, gender, address, contact_number, email, medical_alerts, vitals)
//        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [full_name, age || null, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, dbVitalsString]
//     );

//     const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [result.insertId]);
//     const newPatient = rows[0];
//     newPatient.medical_alerts = newPatient.medical_alerts ? newPatient.medical_alerts.split(',') : [];
//     newPatient.vitals = typeof newPatient.vitals === 'string' ? JSON.parse(newPatient.vitals) : (newPatient.vitals || {});
    
//     res.status(201).json(newPatient);
//   } catch (error) {
//     console.error("Error creating patient:", error);
//     res.status(500).json({ message: "Database error while creating patient" });
//   }
// });

// // Get single patient
// router.get("/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
//     if (rows.length === 0) {
//       return res.status(404).json({ message: "Patient not found" });
//     }
//     const patient = rows[0];
//     patient.medical_alerts = patient.medical_alerts ? patient.medical_alerts.split(',') : [];
//     patient.vitals = typeof patient.vitals === 'string' ? JSON.parse(patient.vitals) : (patient.vitals || {});
//     res.json(patient);
//   } catch (error) {
//     console.error("Error fetching patient:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Update patient
// router.put("/:id", async (req, res) => {
//   const { id } = req.params;
//   const { 
//     full_name, name, birthdate, gender, sex, address, 
//     contact_number, contact, email, medicalAlerts, vitals, age, dentist_id 
//   } = req.body;
  
//   const dbName = full_name || name;
//   const dbGender = gender || sex;
//   const dbContact = contact_number || contact;
//   const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
//   let dbVitals = vitals || {};
//   if (dentist_id) dbVitals.dentist_id = dentist_id;
  
//   const dbVitalsString = JSON.stringify(dbVitals);

//   try {
//     // UPDATED: Now updating 'age' column
//     await db.query(
//       `UPDATE patients 
//        SET full_name=?, age=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=?, vitals=?
//        WHERE id=?`,
//       [dbName, age || null, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, dbVitalsString, id]
//     );

//     const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
//     const updatedPatient = rows[0];
//     updatedPatient.medical_alerts = updatedPatient.medical_alerts ? updatedPatient.medical_alerts.split(',') : [];
//     updatedPatient.vitals = typeof updatedPatient.vitals === 'string' ? JSON.parse(updatedPatient.vitals) : (updatedPatient.vitals || {});
    
//     res.json(updatedPatient);
//   } catch (error) {
//     console.error("Error updating patient:", error);
//     res.status(500).json({ message: "Database error while updating patient" });
//   }
// });

// // Delete patient
// router.delete("/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     await db.query("DELETE FROM patients WHERE id = ?", [id]);
//     res.json({ message: "Patient deleted" });
//   } catch (error) {
//     console.error("Error deleting patient:", error);
//     res.status(500).json({ message: "Database error" });
//   }
// });

// module.exports = router;