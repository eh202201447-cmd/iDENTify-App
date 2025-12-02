import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css"; // reuse modal styles

function toMinutes(timeString) {
  const [time, meridiem] = timeString.split(" ");
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function AddAppointmentModal({ isOpen, onClose, dentists = [], onSave }) {
  const [form, setForm] = useState({
    patient_name: "",
    dentist_id: "",
    timeStart: "",
    timeEnd: "",
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
    if (!form.procedure.trim()) {
      toast.error("Procedure is required.");
      return;
    }
    if (form.timeStart && form.timeEnd && toMinutes(form.timeEnd) < toMinutes(form.timeStart)) {
      toast.error("End time cannot be before start time.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        ...form,
        dentist_id: Number(form.dentist_id),
      });
    } catch (error) {
      // Error is handled by the caller, but we stop the loading state
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
            <label htmlFor="timeStart">Time Start</label>
            <input
              id="timeStart"
              name="timeStart"
              value={form.timeStart}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label htmlFor="timeEnd">Time End</label>
            <input id="timeEnd" name="timeEnd" value={form.timeEnd} onChange={handleChange} />
          </div>
          <div className="form-group full-width">
            <label htmlFor="procedure">Procedure</label>
            <input
              id="procedure"
              name="procedure"
              value={form.procedure}
              onChange={handleChange}
            />
          </div>
          <div className="form-group full-width">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} />
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
