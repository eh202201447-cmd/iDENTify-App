import React from "react";
import "../styles/components/MedicalAlertBanner.css";

function MedicalAlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="medical-alert-banner">
      <strong>Medical Alerts:</strong> {alerts.join(", ")}
    </div>
  );
}

export default MedicalAlertBanner;
