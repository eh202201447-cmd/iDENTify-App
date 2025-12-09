import React, { useState } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css";

function toMinutes(timeString) {
  if (!timeString) return 0;
  const parts = timeString.split(" ");
  if (parts.length < 2) return 0;
  const [time, meridiem] = parts;
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function EditAppointmentModal({ appointment, initialContact, onSave, onCancel, dentists = [] }) {
  if (!appointment) return null;

  // 1. UPDATED STATE: Added patient_name here so it doesn't get lost
  const [formData, setFormData] = useState({
    patient_name: appointment.patient_name || appointment.name || "", // Tries both keys just in case
    timeStart: appointment.timeStart || "",
    timeEnd: appointment.timeEnd || "",
    dentist_id:
      appointment.dentist_id || dentists.find((d) => d.name === appointment.dentist)?.id || "",
    dentist:
      appointment.dentist || dentists.find((d) => d.id === appointment.dentist_id)?.name || "",
    procedure: appointment.procedure || appointment.reason || "",
    notes: appointment.notes || "",
    contact_number: initialContact || "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    // Basic validation for name
    if (!formData.patient_name.trim()) {
      toast.error("Patient name cannot be empty.");
      return;
    }

    if (formData.timeStart && formData.timeEnd) {
      if (toMinutes(formData.timeEnd) <= toMinutes(formData.timeStart)) {
        toast.error("End time cannot be before or equal to start time.");
        return;
      }
    }

    const proc = formData.procedure || "";
    if (!proc.trim()) {
      toast.error("Procedure cannot be empty.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const dentistNameFromId = dentists.find((d) => d.id === Number(formData.dentist_id))?.name;

      onSave({
        ...appointment,
        ...formData, // Now includes patient_name, so it won't be empty
        dentist_id: Number(formData.dentist_id),
        dentist: dentistNameFromId || formData.dentist
      });
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Appointment</h2>
        <div className="form-grid">

          {/* 2. ADDED FIELD: Patient Name Input */}
          <div className="form-group full-width">
            <label htmlFor="patient_name">Patient Name</label>
            <input
              type="text"
              id="patient_name"
              name="patient_name"
              value={formData.patient_name}
              onChange={handleChange}
              placeholder="Enter patient name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="timeStart">Time Start</label>
            <input
              type="text"
              id="timeStart"
              name="timeStart"
              value={formData.timeStart}
              onChange={handleChange}
              placeholder="e.g. 09:00 AM"
            />
          </div>
          <div className="form-group">
            <label htmlFor="timeEnd">Time End</label>
            <input
              type="text"
              id="timeEnd"
              name="timeEnd"
              value={formData.timeEnd}
              onChange={handleChange}
              placeholder="e.g. 09:30 AM"
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="contact_number">Contact Number</label>
            <input
              type="text"
              id="contact_number"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleChange}
              placeholder="e.g. 0917..."
            />
          </div>

          <div className="form-group full-width">
            <label htmlFor="dentist">Dentist</label>
            <select
              id="dentist_id"
              name="dentist_id"
              value={formData.dentist_id}
              onChange={(e) => {
                const dentistId = Number(e.target.value);
                const dentistObj = dentists.find((d) => d.id === dentistId);
                setFormData((prev) => ({
                  ...prev,
                  dentist_id: dentistId,
                  dentist: dentistObj?.name || prev.dentist,
                }));
              }}
            >
              <option value="">Select Dentist</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group full-width">
            <label htmlFor="procedure">Procedure</label>
            <input
              type="text"
              id="procedure"
              name="procedure"
              value={formData.procedure}
              onChange={handleChange}
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
            ></textarea>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditAppointmentModal;