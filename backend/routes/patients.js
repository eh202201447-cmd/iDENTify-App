const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all patients
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;
    let query = "SELECT * FROM patients";
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
      xrays: [] 
    }));
    
    res.json(results);
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ message: "Server error fetching patients" });
  }
});

// NEW: Get Family Members
router.get("/:id/family", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM patients WHERE parent_id = ?", [id]);
    const results = rows.map(p => ({
      ...p,
      vitals: typeof p.vitals === 'string' ? JSON.parse(p.vitals) : (p.vitals || {})
    }));
    res.json(results);
  } catch (error) {
    console.error("Error fetching family:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Single Patient
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Patient not found" });

    const patient = rows[0];
    patient.medical_alerts = patient.medical_alerts ? patient.medical_alerts.split(',') : [];
    patient.vitals = typeof patient.vitals === 'string' ? JSON.parse(patient.vitals) : (patient.vitals || {});
    patient.xrays = patient.xrays ? JSON.parse(patient.xrays) : [];
    
    res.json(patient);
  } catch (error) {
    console.error("Error fetching patient:", error);
    res.status(500).json({ message: "Server error" });
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
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating patient:", error);
    res.status(500).json({ message: "Database error while creating patient" });
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
  
  // Logic: Only update xrays if explicitly provided (to avoid overwriting with null)
  let dbXraysString = null;
  if (xrays !== undefined) {
      dbXraysString = JSON.stringify(xrays);
  }

  try {
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
    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating patient:", error);
    res.status(500).json({ message: "Database error while updating patient" });
  }
});

module.exports = router;f