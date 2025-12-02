import React, { useState } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css";

function toMinutes(timeString) {
  const [time, meridiem] = timeString.split(" ");
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function EditAppointmentModal({ appointment, onSave, onCancel, dentists = [] }) {
  const [formData, setFormData] = useState({
    timeStart: appointment.timeStart,
    timeEnd: appointment.timeEnd,
    dentist_id:
      appointment.dentist_id || dentists.find((d) => d.name === appointment.dentist)?.id,
    dentist:
      appointment.dentist || dentists.find((d) => d.id === appointment.dentist_id)?.name,
    procedure: appointment.procedure,
    notes: appointment.notes,
    addReminder: false,
    isPriority: false,
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
    if (toMinutes(formData.timeEnd) < toMinutes(formData.timeStart)) {
      toast.error("End time cannot be before start time.");
      return;
    }
    if (!formData.procedure.trim() || !formData.notes.trim()) {
      toast.error("Procedure and notes cannot be empty.");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const dentistNameFromId = dentists.find((d) => d.id === formData.dentist_id)?.name;
      onSave({ ...appointment, ...formData, dentist: dentistNameFromId || formData.dentist });
      setIsLoading(false);
      toast.success("Appointment saved successfully.");
    }, 1000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Appointment</h2>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="timeStart">Time Start</label>
            <input
              type="text"
              id="timeStart"
              name="timeStart"
              value={formData.timeStart}
              onChange={handleChange}
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
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="addReminder"
              name="addReminder"
              checked={formData.addReminder}
              onChange={handleChange}
            />
            <label htmlFor="addReminder">Add reminder</label>
          </div>
          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="isPriority"
              name="isPriority"
              checked={formData.isPriority}
              onChange={handleChange}
            />
            <label htmlFor="isPriority">Mark priority</label>
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