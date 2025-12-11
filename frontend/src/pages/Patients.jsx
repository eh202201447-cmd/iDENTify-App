import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";
import "../styles/pages/Patients.css";

function Patients() {
  const navigate = useNavigate();
  const { patients, appointments, queue } = useAppStore((state) => state);
  const { loadPatients, loadAppointments, loadQueue, loading, error } = useApi();

  // Independent search states for the two sections
  const [todaySearch, setTodaySearch] = useState("");
  const [allSearch, setAllSearch] = useState("");

  useEffect(() => {
    // Load all data needed to calculate "Patients Today" and "Last Procedure"
    Promise.all([loadPatients(), loadAppointments(), loadQueue()]).catch((err) => {
      console.error("Failed to load patient data", err);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- HELPER: Get Last Procedure ---
  const getLastProcedure = (patientId) => {
    const patientAppts = appointments
      .filter((a) => a.patient_id === patientId && a.status === "Done")
      // Sort by date descending (newest first)
      .sort((a, b) => new Date(b.appointment_datetime) - new Date(a.appointment_datetime));

    if (patientAppts.length > 0) {
      return patientAppts[0].procedure || patientAppts[0].reason || "Check-up";
    }
    return "New Patient";
  };

  // --- FILTER 1: Patients Today ---
  const patientsToday = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Identify IDs from Appointments Today
    const apptIds = appointments
      .filter((a) => a.appointment_datetime && a.appointment_datetime.startsWith(todayStr))
      .map((a) => a.patient_id);

    // 2. Identify IDs from Queue Today (Walk-ins)
    const queueIds = queue
      .filter((q) => {
        const t = q.time_added || q.checkedInTime;
        return t && t.startsWith(todayStr);
      })
      .map((q) => q.patient_id);

    const todaySet = new Set([...apptIds, ...queueIds]);
    let list = patients.filter((p) => todaySet.has(p.id));

    // Apply Search Filter
    if (todaySearch.trim()) {
      const lower = todaySearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(lower));
    }
    return list;
  }, [patients, appointments, queue, todaySearch]);

  // --- FILTER 2: All Patients ---
  const allPatientsList = useMemo(() => {
    let list = patients;
    if (allSearch.trim()) {
      const lower = allSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(lower));
    }
    return list;
  }, [patients, allSearch]);

  // --- RENDER TABLE COMPONENT ---
  const PatientTable = ({ data, emptyMessage }) => (
    <div className="patients-table-container">
      <table className="patients-table">
        <thead>
          <tr>
            <th style={{ width: '25%' }}>Name</th>
            <th style={{ width: '10%' }}>Age</th>
            <th style={{ width: '25%' }}>Last Procedure</th>
            <th style={{ width: '25%' }}>Notes</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((p) => (
              <tr key={p.id}>
                <td>
                  <span style={{ fontWeight: 500, color: "#333" }}>{p.name}</span>
                </td>
                <td>{p.age || "--"}</td>
                <td style={{ color: "#666" }}>{getLastProcedure(p.id)}</td>
                <td style={{ color: "#666", fontSize: '0.9rem' }}>
                  {(() => {
                    // FIX: Filter out "Relation:" tags so they don't look like diseases
                    const realAlerts = (p.medicalAlerts || []).filter(a => !a.includes("Relation:"));

                    if (realAlerts.length > 0) {
                      return (
                        <span style={{ color: "#d32f2f", backgroundColor: "#ffebee", padding: "2px 6px", borderRadius: "4px" }}>
                          {realAlerts[0]}
                        </span>
                      );
                    }
                    return "--";
                  })()}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => navigate(`/app/patient/${p.id}`, { state: { patientData: p } })}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2f9e44",
                      fontWeight: "bold",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      fontSize: "0.85rem"
                    }}
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#888" }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="patients-page">
      <h2 className="patients-title">Patient Records</h2>

      {loading && <div style={{ marginBottom: "1rem", color: "#666" }}>Loading records...</div>}
      {error && <div className="error-message">Failed to load patients.</div>}

      <div style={{ marginBottom: "3rem" }}>
        <div className="patients-header">
          <h3 style={{ fontSize: "1.5rem", margin: 0, color: "#444" }}>Patients Today</h3>
          <div className="search-group">
            <input
              type="text"
              placeholder="Search patients..."
              value={todaySearch}
              onChange={(e) => setTodaySearch(e.target.value)}
              style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid #ddd", width: "250px" }}
            />
          </div>
        </div>
        <PatientTable data={patientsToday} emptyMessage="No patients scheduled for today." />
      </div>

      <div>
        <div className="patients-header">
          <h3 style={{ fontSize: "1.5rem", margin: 0, color: "#444" }}>All Patients</h3>
          <div className="search-group">
            <input
              type="text"
              placeholder="Search patients..."
              value={allSearch}
              onChange={(e) => setAllSearch(e.target.value)}
              style={{ padding: "0.6rem", borderRadius: "8px", border: "1px solid #ddd", width: "250px" }}
            />
          </div>
        </div>
        <PatientTable data={allPatientsList} emptyMessage="No patients found." />
      </div>
    </div>
  );
}

export default Patients;