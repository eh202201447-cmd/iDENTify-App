// const express = require("express");
// const router = express.Router();
// const db = require("../db");

// // Get all timeline entries for a patient
// router.get("/:patient_id", async (req, res) => {
//   const { patient_id } = req.params;
//   const [rows] = await db.query(
//     "SELECT * FROM treatment_timeline WHERE patient_id = ?",
//     [patient_id]
//   );
//   res.json(rows);
// });

// // Get a single timeline entry by its own ID
// router.get("/record/:id", async (req, res) => {
//   const { id } = req.params;
//   try {
//     const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [id]);
//     if (rows.length === 0) {
//       return res.status(404).json({ message: "Record not found" });
//     }
//     res.json(rows[0]);
//   } catch (error) {
//     console.error(`Error fetching timeline record ${id}:`, error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Add a timeline entry
// router.post("/", async (req, res) => {
//   const { patient_id, start_time, end_time, provider, procedure_text, notes, image_url } = req.body;
//   const [result] = await db.query(
//     `INSERT INTO treatment_timeline (patient_id, start_time, end_time, provider, procedure_text, notes, image_url)
//      VALUES (?, ?, ?, ?, ?, ?, ?)`,
//     [patient_id, start_time, end_time, provider, procedure_text, notes, image_url]
//   );
//   const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [result.insertId]);
//   res.status(201).json(rows[0]);
// });

// // Delete a timeline entry
// router.delete("/:id", async (req, res) => {
//   const { id } = req.params;
//   await db.query("DELETE FROM treatment_timeline WHERE id = ?", [id]);
//   res.json({ message: "Timeline entry deleted" });
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all timeline entries for a patient
router.get("/:patient_id", async (req, res) => {
  const { patient_id } = req.params;
  const [rows] = await db.query(
    "SELECT * FROM treatment_timeline WHERE patient_id = ?",
    [patient_id]
  );
  res.json(rows);
});

// Get a single timeline entry
router.get("/record/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Record not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(`Error fetching timeline record ${id}:`, error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a timeline entry (REMOVED end_time)
router.post("/", async (req, res) => {
  const { patient_id, start_time, provider, procedure_text, notes, image_url } = req.body;
  const [result] = await db.query(
    `INSERT INTO treatment_timeline (patient_id, start_time, provider, procedure_text, notes, image_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [patient_id, start_time, provider, procedure_text, notes, image_url]
  );
  const [rows] = await db.query("SELECT * FROM treatment_timeline WHERE id = ?", [result.insertId]);
  res.status(201).json(rows[0]);
});

// Delete a timeline entry
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  await db.query("DELETE FROM treatment_timeline WHERE id = ?", [id]);
  res.json({ message: "Timeline entry deleted" });
});

module.exports = router;