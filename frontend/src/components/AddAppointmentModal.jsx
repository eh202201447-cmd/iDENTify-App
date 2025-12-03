import React, { useState } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css"; // reuse modal styles

// Helper to convert 24h "HH:MM" string to "HH:MM AM/PM" for the backend
function formatTime12Hour(time24) {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":");
  let h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12; // the hour '0' should be '12'
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// Helper for validation comparison
function toMinutes24(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

function AddAppointmentModal({ isOpen, onClose, dentists = [], onSave }) {
  const [form, setForm] = useState({
    patient_name: "",
    dentist_id: "",
    appointmentDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    timeStart: "", // Stores "HH:MM" (24h) for the input
    timeEnd: "",   // Stores "HH:MM" (24h) for the input
    procedure: "",
    notes: "",
    status: "Scheduled",
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_name.trim()) {
      toast.error("Please enter a patient name.");
      return;
    }
    if (!form.dentist_id) {
      toast.error("Please select a dentist.");
      return;
    }
    if (!form.appointmentDate) {
        toast.error("Please select a date.");
        return;
    }
    if (!form.timeStart || !form.timeEnd) {
      toast.error("Please select both start and end times.");
      return;
    }
    
    // Compare times using the raw 24h values from state
    if (toMinutes24(form.timeEnd) <= toMinutes24(form.timeStart)) {
      toast.error("End time must be after start time.");
      return;
    }

    setIsSaving(true);
    try {
      // Construct the full datetime string and format for backend
      const fullTimeStart = `${form.appointmentDate} ${formatTime12Hour(form.timeStart)}`;
      const fullTimeEnd = `${form.appointmentDate} ${formatTime12Hour(form.timeEnd)}`;

      await onSave({
        ...form,
        dentist_id: Number(form.dentist_id),
        timeStart: fullTimeStart,
        timeEnd: fullTimeEnd,
      });
      // Close handled by parent or success actions
    } catch (error) {
      console.error(error);
      toast.error("Failed to save appointment.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Appointment</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group full-width">
            <label htmlFor="patient_name">Patient Name</label>
            <input
              id="patient_name"
              name="patient_name"
              type="text"
              value={form.patient_name}
              onChange={handleChange}
              placeholder="Enter patient name"
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="dentist_id">Dentist</label>
            <select
              id="dentist_id"
              name="dentist_id"
              value={form.dentist_id}
              onChange={handleChange}
            >
              <option value="">Select dentist</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="appointmentDate">Date</label>
            <input
              type="date"
              id="appointmentDate"
              name="appointmentDate"
              value={form.appointmentDate}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            {/* Empty group for layout */}
          </div>
          <div className="form-group">
            <label htmlFor="timeStart">Time Start</label>
            <input
              type="time"
              id="timeStart"
              name="timeStart"
              value={form.timeStart}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="timeEnd">Time End</label>
            <input
              type="time"
              id="timeEnd"
              name="timeEnd"
              value={form.timeEnd}
              onChange={handleChange}
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="procedure">Procedure</label>
            <input
              id="procedure"
              name="procedure"
              value={form.procedure}
              onChange={handleChange}
              placeholder="e.g. Cleaning, Root Canal"
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="notes">Notes</label>
            <textarea 
              id="notes" 
              name="notes" 
              value={form.notes} 
              onChange={handleChange} 
              rows={3}
            />
          </div>
          <div className="modal-actions full-width">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Adding..." : "Add Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddAppointmentModal;