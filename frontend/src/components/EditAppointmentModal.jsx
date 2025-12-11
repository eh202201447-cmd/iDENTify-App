import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css";
import { dentalServices } from "../data/services";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function to24Hour(time12h) {
  if (!time12h) return "";
  const [time, modifier] = time12h.split(' ');
  if (!time || !modifier) return time || "";
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function to12Hour(time24h) {
  if (!time24h) return "";
  const [hours, minutes] = time24h.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${String(h).padStart(2, '0')}:${minutes} ${ampm}`;
}

function combineDateAndTime(dateStr, time12h) {
  if (!dateStr || !time12h) return "";
  // time12h format: "09:00 AM"
  // dateStr format: "YYYY-MM-DD"

  // Convert 12h time to 24h parts
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') hours = '00';
  if (modifier === 'PM') hours = parseInt(hours, 10) + 12;

  return `${dateStr} ${String(hours).padStart(2, '0')}:${minutes}:00`;
}

function EditAppointmentModal({ appointment, initialContact, initialAge, initialSex, onSave, onCancel, dentists = [] }) {
  if (!appointment) return null;

  // Extract YYYY-MM-DD from the appointment_datetime
  const getInitialDate = () => {
    if (appointment.appointment_datetime) {
      // Handles "2025-12-11T10:00:00.000Z" or "2025-12-11 10:00:00"
      return appointment.appointment_datetime.split('T')[0].split(' ')[0];
    }
    return new Date().toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    patient_name: appointment.patient || appointment.patient_name || appointment.name || "",
    appointmentDate: getInitialDate(), // NEW: Date State
    timeStart: appointment.timeStart || "",
    dentist_id: appointment.dentist_id || dentists.find((d) => d.name === appointment.dentist)?.id || "",
    dentist: appointment.dentist || dentists.find((d) => d.id === appointment.dentist_id)?.name || "",
    notes: appointment.notes || "",
    contact_number: initialContact || "",
    age: initialAge || "",
    sex: initialSex || "",
    status: appointment.status || "Scheduled"
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const existingProcedure = appointment.procedure || appointment.reason || "";
    if (existingProcedure) {
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

  const handleTimeChange = (e) => {
    const { name, value } = e.target;
    const time12 = to12Hour(value);
    setFormData((prev) => ({
      ...prev,
      [name]: time12,
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
    if (!formData.patient_name.trim()) return toast.error("Patient name cannot be empty.");
    if (!formData.appointmentDate) return toast.error("Date cannot be empty.");
    if (!formData.timeStart) return toast.error("Start time cannot be empty.");

    if (selectedServices.length === 0) {
      toast.error("Please select at least one procedure.");
      return;
    }

    setIsLoading(true);

    // Combine Date + Time
    const fullTimeStart = combineDateAndTime(formData.appointmentDate, formData.timeStart);
    const dentistNameFromId = dentists.find((d) => d.id === Number(formData.dentist_id))?.name;
    const procedureString = selectedServices.join(", ");

    const updatedData = {
      ...appointment,
      ...formData,
      dentist_id: Number(formData.dentist_id),
      dentist: dentistNameFromId || formData.dentist,
      procedure: procedureString,
      timeStart: fullTimeStart, // Save full datetime
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
            <select id="sex" name="sex" value={formData.sex} onChange={handleChange}>
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

          {/* NEW: DATE INPUT */}
          <div className="form-group">
            <label htmlFor="appointmentDate">Date</label>
            <input
              type="date"
              id="appointmentDate"
              name="appointmentDate"
              value={formData.appointmentDate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="timeStart">Time Start</label>
            <input
              type="time"
              id="timeStart"
              name="timeStart"
              value={to24Hour(formData.timeStart)}
              onChange={handleTimeChange}
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