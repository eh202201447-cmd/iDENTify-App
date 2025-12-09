const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all patients (OPTIMIZED: Does NOT fetch xrays to prevent crash)
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;
    let query = "SELECT id, full_name, birthdate, gender, address, contact_number, email, medical_alerts, vitals, parent_id FROM patients";
    let params = [];

    if (email) {
      query += " WHERE email = ?";
      params.push(email);
    } else {
      query += " ORDER BY id DESC";
    }

    const [rows] = await db.query(query, params);
    
    const results = rows.map(p => ({
      ...p,
      medical_alerts: p.medical_alerts ? p.medical_alerts.split(',') : [],
      vitals: typeof p.vitals === 'string' ? JSON.parse(p.vitals) : (p.vitals || {}),
      xrays: [] // Return empty array for list view to save bandwidth
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
    contact_number, contact, email, medicalAlerts, vitals, age, dentist_id,
    parent_id, xrays 
  } = req.body;
  
  const dbGender = gender || sex;
  const dbContact = contact_number || contact;
  const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
  let dbVitals = vitals || {};
  if (age && !dbVitals.age) dbVitals.age = age;
  if (dentist_id) dbVitals.dentist_id = dentist_id;
  
  const dbVitalsString = JSON.stringify(dbVitals);
  const dbXraysString = JSON.stringify(xrays || []);

  try {
    const [result] = await db.query(
      `INSERT INTO patients (full_name, birthdate, gender, address, contact_number, email, medical_alerts, vitals, xrays, parent_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [full_name, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, dbVitalsString, dbXraysString, parent_id || null]
    );

    const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [result.insertId]);
    const newPatient = rows[0];
    newPatient.xrays = newPatient.xrays ? JSON.parse(newPatient.xrays) : [];
    newPatient.vitals = typeof newPatient.vitals === 'string' ? JSON.parse(newPatient.vitals) : (newPatient.vitals || {});
    
    res.status(201).json(newPatient);
  } catch (error) {
    console.error("Error creating patient:", error);
    res.status(500).json({ message: "Database error while creating patient" });
  }
});

// Get single patient (INCLUDES XRAYS)
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
    
    // Parse X-rays safely
    try {
        patient.xrays = patient.xrays ? JSON.parse(patient.xrays) : [];
    } catch (e) {
        console.error("Error parsing xrays JSON:", e);
        patient.xrays = [];
    }
    
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
    contact_number, contact, email, medicalAlerts, vitals, age, dentist_id, xrays 
  } = req.body;
  
  const dbName = full_name || name;
  const dbGender = gender || sex;
  const dbContact = contact_number || contact;
  const dbMedicalAlerts = Array.isArray(medicalAlerts) ? medicalAlerts.join(',') : (medicalAlerts || null);
  
  let dbVitals = vitals || {};
  if (age) dbVitals.age = age;
  if (dentist_id) dbVitals.dentist_id = dentist_id;
  
  const dbVitalsString = JSON.stringify(dbVitals);
  
  // LOGIC: Only update xrays if it's sent in the body. If undefined, keep existing.
  let dbXraysString = null;
  if (xrays !== undefined) {
      dbXraysString = JSON.stringify(xrays);
      console.log(`[Update Patient] Updating X-rays for ID ${id}. Count: ${xrays.length}`);
  }

  try {
    // If xrays is provided, we update it. If not, we don't touch the column to avoid overwriting with null.
    if (dbXraysString !== null) {
        await db.query(
            `UPDATE patients 
             SET full_name=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=?, vitals=?, xrays=?
             WHERE id=?`,
            [dbName, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, dbVitalsString, dbXraysString, id]
        );
    } else {
        await db.query(
            `UPDATE patients 
             SET full_name=?, birthdate=?, gender=?, address=?, contact_number=?, email=?, medical_alerts=?, vitals=?
             WHERE id=?`,
            [dbName, birthdate || null, dbGender, address, dbContact, email, dbMedicalAlerts, dbVitalsString, id]
        );
    }

    const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
    const updatedPatient = rows[0];
    updatedPatient.xrays = updatedPatient.xrays ? JSON.parse(updatedPatient.xrays) : [];
    updatedPatient.vitals = typeof updatedPatient.vitals === 'string' ? JSON.parse(updatedPatient.vitals) : (updatedPatient.vitals || {});
    
    res.json(updatedPatient);
  } catch (error) {
    console.error("Error updating patient:", error);
    res.status(500).json({ message: "Database error while updating patient" });
  }
});

module.exports = router;