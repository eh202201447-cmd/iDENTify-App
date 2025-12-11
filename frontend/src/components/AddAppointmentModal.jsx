import React, { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css";
import { dentalServices } from "../data/services";
import api from "../api/apiClient";

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

// Convert "HH:MM" -> minutes
function toMinutes24(timeString) {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(":").map(Number);
  return hours * 60 + minutes;
}

// [FIX] Helper to get local date string YYYY-MM-DD correctly
function getLocalToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AddAppointmentModal({ isOpen, onClose, dentists = [], onSave }) {
  const [form, setForm] = useState({
    patient_name: "",
    contact_number: "",
    age: "",
    sex: "",
    dentist_id: "",
    appointmentDate: getLocalToday(), // [FIX] Use local date helper
    timeStart: "",
    notes: "",
    status: "Scheduled",
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // State for limit checking
  const [availability, setAvailability] = useState({ count: 0, limit: 5, isFull: false, checked: false });

  const selectedDentist = useMemo(() => {
    return dentists.find(d => String(d.id) === String(form.dentist_id));
  }, [dentists, form.dentist_id]);

  // Check Availability Effect
  useEffect(() => {
    async function check() {
      if (form.dentist_id && form.appointmentDate) {
        try {
          const res = await api.checkAppointmentLimit(form.dentist_id, form.appointmentDate);
          setAvailability({ ...res, checked: true });
        } catch (e) {
          console.error("Failed to check limit", e);
        }
      } else {
        setAvailability({ count: 0, limit: 5, isFull: false, checked: false });
      }
    }
    check();
  }, [form.dentist_id, form.appointmentDate]);

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

  const validateSchedule = () => {
    if (!selectedDentist) return null;

    if (selectedDentist.status === "Off") {
      return `Dr. ${selectedDentist.name} is marked as 'Off'.`;
    }

    const dateObj = new Date(form.appointmentDate);
    const dayIndex = dateObj.getDay();
    const worksToday = selectedDentist.days?.includes(dayIndex);

    if (selectedDentist.days && !worksToday) {
      const workingDays = selectedDentist.days.map(d => DAYS[d]).join(", ");
      return `Dr. ${selectedDentist.name} does not work on this day. Available days: ${workingDays}`;
    }

    if (selectedDentist.leaveDays?.includes(form.appointmentDate)) {
      return `Dr. ${selectedDentist.name} is on leave on ${form.appointmentDate}.`;
    }

    if (form.timeStart) {
      const startMin = toMinutes24(form.timeStart);

      if (selectedDentist.operatingHours) {
        const opStart = toMinutes24(selectedDentist.operatingHours.start);
        const opEnd = toMinutes24(selectedDentist.operatingHours.end);
        // Just checking start time is within bounds
        if (startMin < opStart || startMin > opEnd) {
          return `Time is outside operating hours (${selectedDentist.operatingHours.start} - ${selectedDentist.operatingHours.end}).`;
        }
      }

      // Check Breaks (Overlap logic simplified to point-in-time for single start)
      if (selectedDentist.lunch) {
        const lStart = toMinutes24(selectedDentist.lunch.start);
        const lEnd = toMinutes24(selectedDentist.lunch.end);
        if (startMin >= lStart && startMin < lEnd) {
          return `Time is during lunch break (${selectedDentist.lunch.start} - ${selectedDentist.lunch.end}).`;
        }
      }

      if (selectedDentist.breaks) {
        for (const brk of selectedDentist.breaks) {
          const bStart = toMinutes24(brk.start);
          const bEnd = toMinutes24(brk.end);
          if (startMin >= bStart && startMin < bEnd) {
            return `Time is during a scheduled break (${brk.start} - ${brk.end}).`;
          }
        }
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (availability.isFull) {
      return toast.error("Daily limit reached. Please use Walk-in Queue.");
    }

    if (!form.patient_name.trim()) return toast.error("Please enter a patient name.");
    if (!form.dentist_id) return toast.error("Please select a dentist.");
    if (!form.appointmentDate) return toast.error("Please select a date.");
    if (!form.timeStart) return toast.error("Please select a start time.");

    if (selectedServices.length === 0) return toast.error("Please select at least one procedure/service.");

    const scheduleError = validateSchedule();
    if (scheduleError) {
      toast.error(scheduleError);
      return;
    }

    setIsSaving(true);
    try {
      const fullTimeStart = `${form.appointmentDate} ${formatTime12Hour(form.timeStart)}`;
      const procedureString = selectedServices.join(", ");

      await onSave({
        ...form,
        procedure: procedureString,
        dentist_id: Number(form.dentist_id),
        timeStart: fullTimeStart,
        // Removed timeEnd
      });
      setSelectedServices([]);
    } catch (error) {
      console.error(error);
      const msg = error.body?.message || "Failed to save appointment.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Add Appointment</h2>

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

            {/* DENTIST DETAILS + LIMIT INFO */}
            {selectedDentist && (
              <div style={{ marginTop: '8px', padding: '10px', background: '#f0f9ff', borderRadius: '8px', fontSize: '0.9rem', color: '#0c4a6e', border: '1px solid #bae6fd' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #bae6fd', paddingBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Schedule for {selectedDentist.name}</span>
                  {/* Limit Badge */}
                  <span style={{
                    color: availability.isFull ? '#dc2626' : '#166534',
                    backgroundColor: availability.isFull ? '#fee2e2' : '#dcfce7',
                    padding: '0 6px', borderRadius: '4px', fontSize: '0.8rem'
                  }}>
                    {availability.checked ? `${availability.count}/${availability.limit} Booked` : "..."}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '2px' }}>
                  <div>📅 Days: {selectedDentist.days?.map(d => DAYS[d]).join(", ")}</div>
                  <div>⏰ Hours: {selectedDentist.operatingHours?.start} - {selectedDentist.operatingHours?.end}</div>
                  {selectedDentist.lunch && <div>🍽️ Lunch: {selectedDentist.lunch.start} - {selectedDentist.lunch.end}</div>}
                </div>

                {/* VISIBLE WARNING IF FULL */}
                {availability.isFull && (
                  <div style={{ marginTop: '8px', color: '#dc2626', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    ⚠️ Limit Reached. Cannot book.
                  </div>
                )}
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
              disabled={availability.isFull}
            />
          </div>
          {/* REMOVED TIME END INPUT */}

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
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || availability.isFull}
            style={availability.isFull ? { backgroundColor: '#9ca3af', cursor: 'not-allowed' } : {}}
          >
            {isSaving ? "Adding..." : availability.isFull ? "Limit Reached" : "Add Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddAppointmentModal;