import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css";
import { dentalServices } from "../data/services";
import api from "../api/apiClient";

// --- HELPERS ---
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

function getLocalToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function EditAppointmentModal({ appointment, initialContact, initialAge, initialSex, onSave, onCancel, dentists = [] }) {
  if (!appointment) return null;

  // --- INITIALIZE STATE ---
  // Helper to split full name if specific fields aren't available
  const splitName = (fullName) => {
    const parts = fullName ? fullName.split(" ") : ["", ""];
    if (parts.length === 1) return { first: parts[0], last: "" };
    const last = parts.pop();
    const first = parts.join(" ");
    return { first, last };
  };

  const initialNameParts = splitName(appointment.patient_name || appointment.patient || "");

  const getInitialDate = () => {
    if (appointment.appointment_datetime) {
      return appointment.appointment_datetime.split('T')[0].split(' ')[0];
    }
    return getLocalToday();
  };

  const getInitialTime = () => {
    if (appointment.timeStart && appointment.timeStart.includes(" ")) {
      const dateObj = new Date(appointment.timeStart.includes("T") || appointment.timeStart.includes("-") ? appointment.timeStart : `2000-01-01 ${appointment.timeStart}`);
      if (!isNaN(dateObj)) {
        const h = String(dateObj.getHours()).padStart(2, '0');
        const m = String(dateObj.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      }
    }
    return "";
  };

  const [formData, setFormData] = useState({
    first_name: initialNameParts.first,
    last_name: initialNameParts.last,
    middle_name: "",

    patient_name: appointment.patient_name || appointment.patient || "",
    appointmentDate: getInitialDate(),
    timeStart: getInitialTime(),
    dentist_id: appointment.dentist_id || "",
    dentist: appointment.dentist || "",
    notes: appointment.notes || "",
    contact_number: initialContact || "",
    birthdate: "",
    age: initialAge || "",
    sex: initialSex || "",
    status: appointment.status || "Scheduled"
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Availability State
  const [availability, setAvailability] = useState({ count: 0, limit: 5, isFull: false, checked: false });
  const [dentistAppts, setDentistAppts] = useState([]);
  const [generatedSlots, setGeneratedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Load Initial Procedures
  useEffect(() => {
    const existingProcedure = appointment.procedure || appointment.reason || "";
    if (existingProcedure) {
      const items = existingProcedure.split(',').map(s => s.trim()).filter(Boolean);
      setSelectedServices(items);
    }
  }, [appointment]);

  const selectedDentist = useMemo(() => {
    return dentists.find(d => String(d.id) === String(formData.dentist_id));
  }, [dentists, formData.dentist_id]);

  // --- DYNAMIC AGE ---
  useEffect(() => {
    if (formData.birthdate) {
      const today = new Date();
      const dob = new Date(formData.birthdate);
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  }, [formData.birthdate]);

  // --- FETCH SCHEDULE DATA ---
  useEffect(() => {
    if (!formData.dentist_id) return;

    const loadSchedule = async () => {
      setSlotsLoading(true);
      try {
        const allAppts = await api.getAppointments();
        const filtered = allAppts.filter(a =>
          String(a.dentist_id) === String(formData.dentist_id) &&
          a.status !== 'Cancelled'
        );
        setDentistAppts(filtered);

        if (formData.appointmentDate) {
          const res = await api.checkAppointmentLimit(formData.dentist_id, formData.appointmentDate);
          setAvailability({ ...res, checked: true });
        }
      } catch (e) {
        console.error("Error loading schedule", e);
      } finally {
        setSlotsLoading(false);
      }
    };
    loadSchedule();
  }, [formData.dentist_id, formData.appointmentDate]);

  // --- GENERATE SLOTS ---
  useEffect(() => {
    if (!selectedDentist || !formData.appointmentDate) {
      setGeneratedSlots([]);
      return;
    }

    const slots = [];
    const operatingStart = selectedDentist.operatingHours?.start || "09:00";
    const operatingEnd = selectedDentist.operatingHours?.end || "17:00";
    const startMin = toMinutes24(operatingStart);
    const endMin = toMinutes24(operatingEnd);

    const dateObj = new Date(formData.appointmentDate);
    const dayIndex = dateObj.getDay();
    const worksToday = selectedDentist.days?.includes(dayIndex);
    const isOnLeave = selectedDentist.leaveDays?.includes(formData.appointmentDate);
    const isOff = selectedDentist.status === 'Off';

    if (!worksToday || isOnLeave || isOff) {
      setGeneratedSlots([]);
      return;
    }

    const now = new Date();
    const isToday = formData.appointmentDate === getLocalToday();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const dayAppts = dentistAppts.filter(a => {
      if (!a.appointment_datetime) return false;
      if (String(a.id) === String(appointment.id)) return false;

      const aDate = a.appointment_datetime.includes("T")
        ? a.appointment_datetime.split("T")[0]
        : a.appointment_datetime.split(" ")[0];
      return aDate === formData.appointmentDate;
    }).map(a => {
      let timePart = a.appointment_datetime.includes("T") ? a.appointment_datetime.split("T")[1] : a.appointment_datetime.split(" ")[1];
      if (!timePart) return { start: -1, end: -1 };
      const [h, m] = timePart.split(':').map(Number);
      const startMins = h * 60 + m;
      return { start: startMins, end: startMins + 30 };
    });

    for (let time = startMin; time < endMin; time += 30) {
      const h = Math.floor(time / 60);
      const m = time % 60;
      const slotEnd = time + 30;

      let type = 'open';
      const timeStr24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const label = formatTime12Hour(timeStr24);

      if (selectedDentist.lunch) {
        const lStart = toMinutes24(selectedDentist.lunch.start);
        const lEnd = toMinutes24(selectedDentist.lunch.end);
        if (time < lEnd && slotEnd > lStart) type = 'lunch';
      }

      if (type === 'open' && selectedDentist.breaks) {
        for (let b of selectedDentist.breaks) {
          const bStart = toMinutes24(b.start);
          const bEnd = toMinutes24(b.end);
          if (time < bEnd && slotEnd > bStart) { type = 'break'; break; }
        }
      }

      if (type === 'open' && isToday && time <= currentMinutes) type = 'past';

      if (type === 'open') {
        for (let appt of dayAppts) {
          if (time < appt.end && slotEnd > appt.start) { type = 'booked'; break; }
        }
      }

      slots.push({ value: timeStr24, label, type });
    }
    setGeneratedSlots(slots);
  }, [selectedDentist, formData.appointmentDate, dentistAppts, appointment.id]);

  // --- HANDLERS ---
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
    const fullPatientName = `${formData.first_name} ${formData.middle_name ? formData.middle_name + ' ' : ''}${formData.last_name}`.trim() || formData.patient_name;

    if (!fullPatientName.trim()) return toast.error("Patient name cannot be empty.");
    if (!formData.appointmentDate) return toast.error("Date cannot be empty.");
    if (!formData.timeStart) return toast.error("Start time cannot be empty.");
    if (selectedServices.length === 0) return toast.error("Please select at least one procedure.");

    setIsLoading(true);

    const fullTimeStart = `${formData.appointmentDate} ${formatTime12Hour(formData.timeStart)}`;
    const dentistNameFromId = dentists.find((d) => d.id === Number(formData.dentist_id))?.name;
    const procedureString = selectedServices.join(", ");

    const updatedData = {
      ...appointment,
      ...formData,
      patient_name: fullPatientName,
      dentist_id: Number(formData.dentist_id),
      dentist: dentistNameFromId || formData.dentist,
      procedure: procedureString,
      timeStart: fullTimeStart,
    };

    onSave(updatedData);
    setIsLoading(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <h2>Edit Appointment</h2>
        <div className="form-grid">

          {/* SPLIT NAMES */}
          <div className="form-group">
            <label>First Name</label>
            <input name="first_name" value={formData.first_name} onChange={handleChange} placeholder="First Name" />
          </div>
          <div className="form-group">
            <label>Middle Name</label>
            <input name="middle_name" value={formData.middle_name} onChange={handleChange} placeholder="Middle Name" />
          </div>
          <div className="form-group full-width">
            <label>Last Name</label>
            <input name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Last Name" />
          </div>

          <div className="form-group">
            <label htmlFor="birthdate">Date of Birth</label>
            <input type="date" id="birthdate" name="birthdate" value={formData.birthdate} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="age">Age (Auto)</label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              readOnly
              placeholder="e.g. 25"
              style={{ backgroundColor: '#f8fafc', color: '#64748b' }}
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

          <div className="form-group full-width">
            <label htmlFor="dentist">Dentist</label>
            <select
              id="dentist_id"
              name="dentist_id"
              value={formData.dentist_id}
              onChange={handleChange}
            >
              <option value="">Select Dentist</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.status === "Off" ? "(Off)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group full-width">
            <label htmlFor="appointmentDate">Date</label>
            <input
              type="date"
              id="appointmentDate"
              name="appointmentDate"
              value={formData.appointmentDate}
              onChange={handleChange}
            />
          </div>

          {/* TIME SLOT GRID */}
          <div className="form-group full-width">
            <label>Time Slot</label>
            <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', marginBottom: '8px', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: 'white', border: '1px solid #ccc', borderRadius: '50%' }}></div> Open</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: '#0ea5e9', borderRadius: '50%' }}></div> Selected</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: '#f1f5f9', borderRadius: '50%' }}></div> Booked</span>
            </div>

            {slotsLoading ? (
              <div style={{ textAlign: 'center', padding: '10px', color: '#64748b' }}>Loading schedule...</div>
            ) : generatedSlots.length === 0 ? (
              <div style={{ padding: '10px', background: '#f8fafc', color: '#64748b', borderRadius: '6px', textAlign: 'center' }}>
                No slots available (Dentist off or date passed).
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                {generatedSlots.map((slot) => {
                  const isDisabled = slot.type !== 'open';
                  const isSelected = formData.timeStart === slot.value;

                  let bg = 'white';
                  let color = '#334155';
                  let border = '1px solid #e2e8f0';
                  let cursor = 'pointer';

                  if (isSelected) {
                    bg = '#0ea5e9'; color = 'white'; border = '1px solid #0284c7';
                  } else if (isDisabled) {
                    bg = '#f1f5f9'; color = '#cbd5e1'; cursor = 'not-allowed';
                    if (slot.type === 'lunch' || slot.type === 'break') {
                      color = '#d97706'; bg = '#fffbeb'; border = '1px solid #fcd34d';
                    }
                  }

                  return (
                    <button
                      key={slot.value}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setFormData(prev => ({ ...prev, timeStart: slot.value }))}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '6px',
                        backgroundColor: bg,
                        color: color,
                        border: border,
                        cursor: cursor,
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <span>{slot.label.split(' ')[0]}</span>
                      <span style={{ fontSize: '0.7rem' }}>{slot.label.split(' ')[1]}</span>
                    </button>
                  );
                })}
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
                {/* UPDATED: Map to display name and price */}
                {dentalServices.map((service, index) => (
                  <option key={index} value={service.name}>
                    {service.name} ({service.price})
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
          <button type="button" onClick={handleSave} disabled={isLoading || (availability.isFull && !appointment.id)}>
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditAppointmentModal;