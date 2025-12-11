const express = require("express");
const cors = require("cors");
require("dotenv").config();

const patientsRoutes = require("./routes/patients");
const appointmentsRoutes = require("./routes/appointments");
const queueRoutes = require("./routes/queue");
const toothConditionsRoutes = require("./routes/tooth_conditions");
const treatmentTimelineRoutes = require("./routes/treatment_timeline");
const medicationsRoutes = require("./routes/medications");
const dentistsRoutes = require("./routes/dentists");
const treatmentsRoutes = require("./routes/treatments");
const reportsRoutes = require("./routes/reports");

const app = express();

app.use(cors()); 
app.use(express.json({ limit: "5000mb" }));
app.use(express.urlencoded({ limit: "5000mb", extended: true }));

// Routes
app.use("/api/patients", patientsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/tooth-conditions", toothConditionsRoutes);
app.use("/api/treatment-timeline", treatmentTimelineRoutes);
app.use("/api/medications", medicationsRoutes);
app.use("/api/dentists", dentistsRoutes);
app.use("/api/treatments", treatmentsRoutes);
app.use("/api/reports", reportsRoutes);

const PORT = process.env.PORT || 4006;

// UPDATED: Listen on '0.0.0.0' to accept connections from your network (e.g. your phone)
// instead of just 'localhost'.
app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on port ${PORT}`));