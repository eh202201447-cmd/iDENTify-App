import React, { useState, useMemo } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css";
import { dentalServices } from "../data/services";

function formatTime12Hour(time24) {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":");
  let h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function toMinutes24(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

// Map day index (0-6) to string
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AddAppointmentModal({ isOpen, onClose, dentists = [], onSave }) {
  const [form, setForm] = useState({
    patient_name: "",
    contact_number: "",
    age: "",
    sex: "",
    dentist_id: "",
    appointmentDate: new Date().toISOString().split('T')[0],
    timeStart: "",
    timeEnd: "",
    notes: "",
    status: "Scheduled",
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Find the currently selected dentist object to display their schedule
  const selectedDentist = useMemo(() => {
    return dentists.find(d => String(d.id) === String(form.dentist_id));
  }, [dentists, form.dentist_id]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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

  // --- VALIDATION LOGIC ---
  const validateSchedule = () => {
    if (!selectedDentist) return null;

    // 1. Check Status
    if (selectedDentist.status === "Off") {
      return `Dr. ${selectedDentist.name} is marked as 'Off' and cannot accept appointments.`;
    }

    // 2. Check Working Days
    const dateObj = new Date(form.appointmentDate);
    const dayIndex = dateObj.getDay(); // 0 = Sun
    const worksToday = selectedDentist.days?.includes(dayIndex);

    if (selectedDentist.days && !worksToday) {
      const workingDays = selectedDentist.days.map(d => DAYS[d]).join(", ");
      return `Dr. ${selectedDentist.name} does not work on this day. Available days: ${workingDays}`;
    }

    // 3. Check Leave Days
    if (selectedDentist.leaveDays?.includes(form.appointmentDate)) {
      return `Dr. ${selectedDentist.name} is on leave on ${form.appointmentDate}.`;
    }

    // 4. Check Time Limits (Operating Hours & Lunch)
    if (form.timeStart && form.timeEnd) {
      const startMin = toMinutes24(form.timeStart);
      const endMin = toMinutes24(form.timeEnd);

      // Check Operating Hours
      if (selectedDentist.operatingHours) {
        const opStart = toMinutes24(selectedDentist.operatingHours.start);
        const opEnd = toMinutes24(selectedDentist.operatingHours.end);
        if (startMin < opStart || endMin > opEnd) {
          return `Time is outside operating hours (${selectedDentist.operatingHours.start} - ${selectedDentist.operatingHours.end}).`;
        }
      }

      // Helper to check overlap
      const isOverlapping = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

      // Check Lunch
      if (selectedDentist.lunch) {
        const lStart = toMinutes24(selectedDentist.lunch.start);
        const lEnd = toMinutes24(selectedDentist.lunch.end);
        if (isOverlapping(startMin, endMin, lStart, lEnd)) {
          return `Time overlaps with lunch break (${selectedDentist.lunch.start} - ${selectedDentist.lunch.end}).`;
        }
      }

      // Check Breaks
      if (selectedDentist.breaks) {
        for (const brk of selectedDentist.breaks) {
          const bStart = toMinutes24(brk.start);
          const bEnd = toMinutes24(brk.end);
          if (isOverlapping(startMin, endMin, bStart, bEnd)) {
            return `Time overlaps with a scheduled break (${brk.start} - ${brk.end}).`;
          }
        }
      }
    }

    return null; // Valid
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patient_name.trim()) return toast.error("Please enter a patient name.");
    if (!form.dentist_id) return toast.error("Please select a dentist.");
    if (!form.appointmentDate) return toast.error("Please select a date.");
    if (!form.timeStart || !form.timeEnd) return toast.error("Please select both start and end times.");

    if (selectedServices.length === 0) return toast.error("Please select at least one procedure/service.");
    if (toMinutes24(form.timeEnd) <= toMinutes24(form.timeStart)) return toast.error("End time must be after start time.");

    // Perform Schedule Validation
    const scheduleError = validateSchedule();
    if (scheduleError) {
      toast.error(scheduleError);
      return;
    }

    setIsSaving(true);
    try {
      const fullTimeStart = `${form.appointmentDate} ${formatTime12Hour(form.timeStart)}`;
      const fullTimeEnd = `${form.appointmentDate} ${formatTime12Hour(form.timeEnd)}`;
      const procedureString = selectedServices.join(", ");

      await onSave({
        ...form,
        procedure: procedureString,
        dentist_id: Number(form.dentist_id),
        timeStart: fullTimeStart,
        timeEnd: fullTimeEnd,
      });
      setSelectedServices([]);
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

        {/* FORM CONTENT */}
        <div className="form-grid">
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

          <div className="form-group">
            <label htmlFor="age">Age</label>
            <input
              id="age"
              name="age"
              type="number"
              value={form.age}
              onChange={handleChange}
              placeholder="e.g. 25"
            />
          </div>

          <div className="form-group">
            <label htmlFor="sex">Sex</label>
            <select id="sex" name="sex" value={form.sex} onChange={handleChange}>
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label htmlFor="contact_number">Contact Number</label>
            <input
              id="contact_number"
              name="contact_number"
              type="text"
              value={form.contact_number}
              onChange={handleChange}
              placeholder="e.g. 0917..."
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
                <option key={d.id} value={d.id} disabled={d.status === "Off"}>
                  {d.name} {d.status === "Off" ? "(Off)" : d.status === "Busy" ? "(Busy)" : ""}
                </option>
              ))}
            </select>

            {/* NEW: VISUAL SCHEDULE INFO */}
            {selectedDentist && (
              <div style={{ marginTop: '8px', padding: '10px', background: '#f0f9ff', borderRadius: '8px', fontSize: '0.9rem', color: '#0c4a6e', border: '1px solid #bae6fd' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Schedule for {selectedDentist.name}:</div>
                <div>📅 Days: {selectedDentist.days?.map(d => DAYS[d]).join(", ")}</div>
                <div>⏰ Hours: {selectedDentist.operatingHours?.start} - {selectedDentist.operatingHours?.end}</div>
                {selectedDentist.lunch && <div>🍽️ Lunch: {selectedDentist.lunch.start} - {selectedDentist.lunch.end}</div>}
              </div>
            )}
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
          <div className="form-group"></div>

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
            <label htmlFor="service-select">Procedures / Services</label>
            <div className="service-input-group">
              <select
                id="service-select"
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
              >+</button>
            </div>

            <div className="selected-services-container">
              {selectedServices.length === 0 && <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>No services selected</span>}
              {selectedServices.map((service, index) => (
                <span key={`${service}-${index}`} className="service-chip">
                  {service}
                  <button type="button" className="remove-service-btn" onClick={() => handleRemoveService(service)}>×</button>
                </span>
              ))}
            </div>
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
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Adding..." : "Add Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddAppointmentModal;