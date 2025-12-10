import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css";
import { dentalServices } from "../data/services";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- HELPER FUNCTIONS FOR TIME CONVERSION ---

// Convert "01:30 PM" (State format) -> "13:30" (Input format)
function to24Hour(time12h) {
  if (!time12h) return "";
  const [time, modifier] = time12h.split(' ');
  if (!time || !modifier) return time || ""; // Fallback

  let [hours, minutes] = time.split(':');
  if (hours === '12') {
    hours = '00';
  }
  if (modifier === 'PM') {
    hours = parseInt(hours, 10) + 12;
  }
  // Handle 12 PM -> 12:00, 12 AM -> 00:00
  if (modifier === 'PM' && hours === 24) hours = 12;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

// Convert "13:30" (Input format) -> "01:30 PM" (State format)
function to12Hour(time24h) {
  if (!time24h) return "";
  const [hours, minutes] = time24h.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // the hour '0' should be '12'
  return `${String(h).padStart(2, '0')}:${minutes} ${ampm}`;
}

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

// Parse "09:30 AM" -> 570
function toMinutes12(timeString) {
  return toMinutes(timeString);
}

// Parse "09:30" -> 570
function toMinutes24(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
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

  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Selected Dentist Object
  const selectedDentist = useMemo(() => {
    return dentists.find(d => String(d.id) === String(formData.dentist_id));
  }, [dentists, formData.dentist_id]);

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

  // NEW: Specialized handler for Time Inputs
  const handleTimeChange = (e) => {
    const { name, value } = e.target; // value is in 24h format (e.g., "13:30")
    const time12 = to12Hour(value);   // Convert to "01:30 PM"
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

  const validateSchedule = () => {
    if (!selectedDentist) return null;

    const dateStr = appointment.appointment_datetime
      ? new Date(appointment.appointment_datetime).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // 1. Status
    if (selectedDentist.status === "Off") return `Dr. ${selectedDentist.name} is marked as Off.`;

    // 2. Working Days
    const dayOfWeek = new Date(dateStr).getDay();
    const worksToday = selectedDentist.days?.includes(dayOfWeek);
    if (selectedDentist.days && !worksToday) {
      const workingDays = selectedDentist.days.map(d => DAYS[d]).join(", ");
      return `Dr. ${selectedDentist.name} does not work on this day (${DAYS[dayOfWeek]}). Available: ${workingDays}`;
    }

    // 3. Leave
    if (selectedDentist.leaveDays?.includes(dateStr)) return `Dr. ${selectedDentist.name} is on leave on ${dateStr}.`;

    // 4. Time Logic
    // Detect format (AM/PM vs 24h) based on string content
    const is12Hour = formData.timeStart.includes("M"); // AM or PM
    const startMin = is12Hour ? toMinutes12(formData.timeStart) : toMinutes24(formData.timeStart);
    const endMin = is12Hour ? toMinutes12(formData.timeEnd) : toMinutes24(formData.timeEnd);

    if (startMin >= endMin) return "End time must be after start time.";

    // Operating Hours
    if (selectedDentist.operatingHours) {
      const opStart = toMinutes24(selectedDentist.operatingHours.start);
      const opEnd = toMinutes24(selectedDentist.operatingHours.end);
      if (startMin < opStart || endMin > opEnd) {
        return `Time is outside operating hours (${selectedDentist.operatingHours.start} - ${selectedDentist.operatingHours.end}).`;
      }
    }

    const isOverlapping = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

    // Lunch
    if (selectedDentist.lunch) {
      const lStart = toMinutes24(selectedDentist.lunch.start);
      const lEnd = toMinutes24(selectedDentist.lunch.end);
      if (isOverlapping(startMin, endMin, lStart, lEnd)) {
        return `Time overlaps with lunch break (${selectedDentist.lunch.start} - ${selectedDentist.lunch.end}).`;
      }
    }

    // Breaks
    if (selectedDentist.breaks) {
      for (const brk of selectedDentist.breaks) {
        const bStart = toMinutes24(brk.start);
        const bEnd = toMinutes24(brk.end);
        if (isOverlapping(startMin, endMin, bStart, bEnd)) {
          return `Time overlaps with scheduled break (${brk.start} - ${brk.end}).`;
        }
      }
    }

    return null;
  };

  const handleSave = () => {
    if (!formData.patient_name.trim()) return toast.error("Patient name cannot be empty.");

    // Warn if empty, but don't crash validation if user intends to clear it
    if (selectedServices.length === 0) {
      toast.error("Please select at least one procedure.");
      return;
    }

    // Validate Schedule
    const conflictError = validateSchedule();
    if (conflictError) {
      toast.error(conflictError);
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

          <div className="form-group">
            <label htmlFor="timeStart">Time Start</label>
            <input
              type="time" // CHANGED TO TIME
              id="timeStart"
              name="timeStart"
              value={to24Hour(formData.timeStart)} // CONVERT STATE (12H) TO INPUT (24H)
              onChange={handleTimeChange} // USE SPECIAL HANDLER
            />
          </div>
          <div className="form-group">
            <label htmlFor="timeEnd">Time End</label>
            <input
              type="time" // CHANGED TO TIME
              id="timeEnd"
              name="timeEnd"
              value={to24Hour(formData.timeEnd)} // CONVERT STATE (12H) TO INPUT (24H)
              onChange={handleTimeChange} // USE SPECIAL HANDLER
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

            {selectedDentist && (
              <div style={{ marginTop: '8px', padding: '10px', background: '#f0f9ff', borderRadius: '8px', fontSize: '0.9rem', color: '#0c4a6e', border: '1px solid #bae6fd' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Schedule for {selectedDentist.name}:</div>
                <div>📅 Days: {selectedDentist.days?.map(d => DAYS[d]).join(", ")}</div>
                <div>⏰ Hours: {selectedDentist.operatingHours?.start} - {selectedDentist.operatingHours?.end}</div>
                {selectedDentist.lunch && <div>🍽️ Lunch: {selectedDentist.lunch.start} - {selectedDentist.lunch.end}</div>}
              </div>
            )}
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