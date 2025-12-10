import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css";
import { dentalServices } from "../data/services";

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

function combineDateAndTime(originalDateStr, timeStr) {
  if (!originalDateStr || !timeStr) return timeStr;
  const dateObj = new Date(originalDateStr);
  if (isNaN(dateObj.getTime())) return timeStr;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day} ${timeStr}`;
}

function EditAppointmentModal({ appointment, initialContact, initialAge, initialSex, onSave, onCancel, dentists = [] }) {
  if (!appointment) return null;

  const [formData, setFormData] = useState({
    patient_name: appointment.patient || appointment.patient_name || appointment.name || "",
    timeStart: appointment.timeStart || "",
    timeEnd: appointment.timeEnd || "",
    dentist_id: appointment.dentist_id || dentists.find((d) => d.name === appointment.dentist)?.id || "",
    dentist: appointment.dentist || dentists.find((d) => d.id === appointment.dentist_id)?.name || "",
    notes: appointment.notes || "",
    contact_number: initialContact || "",
    age: initialAge || "",
    sex: initialSex || "",
    status: appointment.status || "Scheduled"
  });

  // MULTI-SELECT STATE
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize selected services from existing appointment data
  useEffect(() => {
    const existingProcedure = appointment.procedure || appointment.reason || "";
    if (existingProcedure) {
      // Split by comma and trim whitespace to create array
      const items = existingProcedure.split(',').map(s => s.trim()).filter(Boolean);
      setSelectedServices(items);
    }
  }, [appointment]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddService = () => {
    if (!currentService) return;
    if (selectedServices.includes(currentService)) {
      toast.error("Service already selected");
      return;
    }
    setSelectedServices([...selectedServices, currentService]);
    setCurrentService("");
  };

  const handleRemoveService = (serviceToRemove) => {
    setSelectedServices(selectedServices.filter(s => s !== serviceToRemove));
  };

  const handleSave = () => {
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

    if (selectedServices.length === 0) {
      toast.error("Please select at least one procedure.");
      return;
    }

    setIsLoading(true);

    const originalDate = appointment.appointment_datetime || new Date().toISOString();
    const fullTimeStart = combineDateAndTime(originalDate, formData.timeStart);
    const fullTimeEnd = combineDateAndTime(originalDate, formData.timeEnd);
    const dentistNameFromId = dentists.find((d) => d.id === Number(formData.dentist_id))?.name;

    const procedureString = selectedServices.join(", ");

    const updatedData = {
      ...appointment,
      ...formData,
      dentist_id: Number(formData.dentist_id),
      dentist: dentistNameFromId || formData.dentist,
      procedure: procedureString,
      timeStart: fullTimeStart,
      timeEnd: fullTimeEnd
    };

    onSave(updatedData);
    setIsLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit Appointment</h2>
        <div className="form-grid">

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
            <label htmlFor="age">Age</label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="e.g. 25"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sex">Sex</label>
            <select
              id="sex"
              name="sex"
              value={formData.sex}
              onChange={handleChange}
            >
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
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
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Scheduled">Scheduled</option>
              <option value="Checked-In">Checked-In</option>
              <option value="Treatment">Treatment</option>
              <option value="Done">Done</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* MULTI-SELECT PROCEDURE */}
          <div className="form-group full-width">
            <label>Procedures / Services</label>
            <div className="service-input-group">
              <select
                value={currentService}
                onChange={(e) => setCurrentService(e.target.value)}
              >
                <option value="">Select a service to add...</option>
                {dentalServices.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="add-service-btn"
                onClick={handleAddService}
                title="Add Service"
              >
                +
              </button>
            </div>

            <div className="selected-services-container">
              {selectedServices.length === 0 && <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>No services selected</span>}
              {selectedServices.map((service, index) => (
                <span key={`${service}-${index}`} className="service-chip">
                  {service}
                  <button
                    type="button"
                    className="remove-service-btn"
                    onClick={() => handleRemoveService(service)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
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