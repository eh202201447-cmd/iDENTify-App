import React, { useState } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css";

function toMinutes(timeString) {
  if (!timeString) return 0;
  const [time, meridiem] = timeString.split(" ");
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function EditAppointmentModal({
  appointment,
  onSave,
  onCancel,
  dentists = [],
}) {
  const [formData, setFormData] = useState({
    timeStart: appointment.timeStart,
    timeEnd: appointment.timeEnd,
    dentist_id: appointment.dentist_id,
    procedure: appointment.procedure,
    notes: appointment.notes,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (toMinutes(formData.timeEnd) < toMinutes(formData.timeStart)) {
      toast.error("End time cannot be before start time.");
      return;
    }
    if (!formData.procedure?.trim()) {
      toast.error("Procedure cannot be empty.");
      return;
    }
    setIsLoading(true);
    try {
      await onSave({ 
        ...appointment, 
        ...formData,
        dentist_id: Number(formData.dentist_id) 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
            <label htmlFor="dentist_id">Dentist</label>
            <select
              id="dentist_id"
              name="dentist_id"
              value={formData.dentist_id}
              onChange={handleChange}
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
              value={formData.notes || ''}
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
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
        </div>
      </div>
    </div>
  );
}

export default EditAppointmentModal;