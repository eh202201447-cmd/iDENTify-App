import React, { useState, useMemo } from "react";
import "../styles/components/PatientHistorySidebar.css";

const CollapsibleSection = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={`collapsible-section ${isOpen ? "open" : ""}`}>
      <button
        className="section-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="section-title">{title}</span>
        <span className="section-toggle">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <div className="section-content">{children}</div>}
    </div>
  );
};

function PatientHistorySidebar({ patient, timeline = [], appointments = [] }) {

  // 1. Calculate Last Visit
  const lastVisit = useMemo(() => {
    if (!appointments || appointments.length === 0) return "No previous visits";

    // Filter for past appointments or "Done" status
    const pastAppts = appointments.filter(a =>
      a.status === 'Done' || new Date(a.appointment_datetime) < new Date()
    );

    if (pastAppts.length === 0) return "No previous visits";

    // Sort descending
    pastAppts.sort((a, b) => new Date(b.appointment_datetime) - new Date(a.appointment_datetime));

    const last = pastAppts[0];
    const dateObj = new Date(last.appointment_datetime);

    // Safety check if date is invalid
    if (isNaN(dateObj.getTime())) return last.appointment_datetime || "Unknown Date";

    return dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [appointments]);

  // 2. Extract Procedures from Timeline
  const previousProcedures = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];

    // Sort timeline by ID desc or date if available (assuming new entries are appended)
    const sortedTimeline = [...timeline].reverse();

    return sortedTimeline.map(t => {
      const rawDate = t.start_time || t.created_at;
      let displayDate = "N/A";

      if (rawDate) {
        const d = new Date(rawDate);
        // If valid date object, format it. If "Invalid Date" (e.g. just time string "10:00 AM"), keep original string.
        displayDate = !isNaN(d.getTime()) ? d.toLocaleDateString() : rawDate;
      }

      return {
        date: displayDate,
        text: t.procedure_text
      };
    }).slice(0, 10); // Show last 10
  }, [timeline]);

  // 3. Alerts & History from Patient Data
  const medicalAlerts = patient?.medicalAlerts || [];
  const dentalHistory = patient?.dental_history || "No dental history recorded.";

  if (!patient) {
    return (
      <aside className="patient-history-sidebar">
        <h3 className="sidebar-title">Patient History</h3>
        <p className="muted-text">No patient selected.</p>
      </aside>
    );
  }

  return (
    <aside className="patient-history-sidebar">
      <div className="sidebar-header-group">
        <div className="sidebar-avatar-placeholder">
          {patient.first_name?.[0]}{patient.last_name?.[0]}
        </div>
        <div>
          <h3 className="sidebar-title">{patient.first_name} {patient.last_name}</h3>
          <span className="sidebar-subtitle">ID: {patient.id}</span>
        </div>
      </div>

      <CollapsibleSection title="Last Visit">
        <p className="highlight-text">{lastVisit}</p>
      </CollapsibleSection>

      <CollapsibleSection title="Medical Alerts">
        {medicalAlerts.length > 0 ? (
          <ul className="alert-list">
            {medicalAlerts.map((alert, idx) => (
              <li key={idx} className="alert-item">{alert}</li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">No alerts recorded.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Dental History">
        <p className="history-text">{dentalHistory}</p>
      </CollapsibleSection>

      <CollapsibleSection title="Procedure Log">
        {previousProcedures.length > 0 ? (
          <ul className="procedure-list">
            {previousProcedures.map((proc, idx) => (
              <li key={idx} className="procedure-item">
                <div className="procedure-date">{proc.date}</div>
                <div className="procedure-text">{proc.text}</div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">No procedures recorded yet.</p>
        )}
      </CollapsibleSection>
    </aside>
  );
}

export default PatientHistorySidebar;