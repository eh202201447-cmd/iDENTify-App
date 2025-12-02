import React, { useState } from "react";
import "../styles/components/PatientHistorySidebar.css";

const CollapsibleSection = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="collapsible-section">
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

function PatientHistorySidebar({ patient }) {
  // Dummy data for now - will be replaced with real data from the patient object
  const patientHistory = {
    lastVisit: "2025-10-15",
    previousProcedures: ["Cleaning", "Filling on #30"],
    allergies: ["Penicillin"],
    medicalHistory: ["Hypertension"],
    ongoingTreatments: ["Ortho braces"],
  };

  if (!patient) {
    return (
      <aside className="patient-history-sidebar">
        <h3 className="sidebar-title">Patient History</h3>
        <p>No patient selected.</p>
      </aside>
    );
  }

  return (
    <aside className="patient-history-sidebar">
      <h3 className="sidebar-title">Patient History for {patient.full_name}</h3>

      <CollapsibleSection title="Last Visit">
        <p>{patientHistory.lastVisit}</p>
      </CollapsibleSection>

      <CollapsibleSection title="Previous Procedures">
        <ul>
          {patientHistory.previousProcedures.map((proc, idx) => (
            <li key={idx}>{proc}</li>
          ))}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection title="Allergies">
        <ul>
          {patientHistory.allergies.map((allergy, idx) => (
            <li key={idx}>{allergy}</li>
          ))}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection title="Medical History">
        <ul>
          {patientHistory.medicalHistory.map((history, idx) => (
            <li key={idx}>{history}</li>
          ))}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection title="Ongoing Treatments">
        <ul>
          {patientHistory.ongoingTreatments.map((treatment, idx) => (
            <li key={idx}>{treatment}</li>
          ))}
        </ul>
      </CollapsibleSection>
    </aside>
  );
}

export default PatientHistorySidebar;
