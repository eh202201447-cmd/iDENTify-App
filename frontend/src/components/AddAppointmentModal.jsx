import React, { useState, useMemo, useEffect } from "react";
import toast from "react-hot-toast";
import "../styles/components/EditAppointmentModal.css"; // Ensure this CSS file exists
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

// --- COMPONENT ---

function AddAppointmentModal({ isOpen, onClose, dentists = [], onSave }) {
  // 1. PATIENT TOGGLE & FORM STATE
  const [patientType, setPatientType] = useState("new"); // "new" or "old"
  const [existingPatients, setExistingPatients] = useState([]);

  const [form, setForm] = useState({
    // Split Name Fields
    first_name: "",
    last_name: "",
    middle_name: "",
    patient_name: "", // Legacy/Display

    contact_number: "",
    birthdate: "",
    age: "",
    sex: "",
    dentist_id: "",
    appointmentDate: getLocalToday(),
    timeStart: "", // Selected time (HH:MM)
    notes: "",
    status: "Scheduled",
  });

  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 2. AVAILABILITY & SLOTS STATE
  const [availability, setAvailability] = useState({ count: 0, limit: 5, isFull: false, checked: false });
  const [appointments, setAppointments] = useState([]); // Appointments for the selected dentist
  const [generatedSlots, setGeneratedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Load existing patients for "Old Patient" mode
  useEffect(() => {
    if (patientType === "old") {
      api.getPatients().then(setExistingPatients).catch(console.error);
    }
  }, [patientType]);

  const selectedDentist = useMemo(() => {
    return dentists.find(d => String(d.id) === String(form.dentist_id));
  }, [dentists, form.dentist_id]);

  // Dynamic Age Calculation
  useEffect(() => {
    if (form.birthdate) {
      const today = new Date();
      const dob = new Date(form.birthdate);
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      setForm(prev => ({ ...prev, age: age.toString() }));
    }
  }, [form.birthdate]);

  // 3. FETCH APPOINTMENTS WHEN DENTIST/DATE CHANGES (For Slot Calculation)
  useEffect(() => {
    if (!form.dentist_id) return;

    const loadScheduleData = async () => {
      setSlotsLoading(true);
      try {
        // Fetch all appointments (or filter by dentist via API if supported)
        const allAppts = await api.getAppointments();
        const dentistAppts = allAppts.filter(a =>
          String(a.dentist_id) === String(form.dentist_id) &&
          a.status !== 'Cancelled'
        );
        setAppointments(dentistAppts);

        // Also check daily limit
        if (form.appointmentDate) {
          const res = await api.checkAppointmentLimit(form.dentist_id, form.appointmentDate);
          setAvailability({ ...res, checked: true });
        }
      } catch (err) {
        console.error("Error loading schedule", err);
      } finally {
        setSlotsLoading(false);
      }
    };

    loadScheduleData();
  }, [form.dentist_id, form.appointmentDate]);

  // 4. GENERATE TIME SLOTS LOGIC (Ported from select-datetime.jsx)
  useEffect(() => {
    if (!selectedDentist || !form.appointmentDate) {
      setGeneratedSlots([]);
      return;
    }

    const slots = [];
    const operatingStart = selectedDentist.operatingHours?.start || "09:00";
    const operatingEnd = selectedDentist.operatingHours?.end || "17:00";

    const startMin = toMinutes24(operatingStart);
    const endMin = toMinutes24(operatingEnd);

    // Is it a working day?
    const dateObj = new Date(form.appointmentDate);
    const dayIndex = dateObj.getDay(); // 0 = Sun
    const worksToday = selectedDentist.days?.includes(dayIndex);
    const isOnLeave = selectedDentist.leaveDays?.includes(form.appointmentDate);
    const isOff = selectedDentist.status === 'Off';

    if (!worksToday || isOnLeave || isOff) {
      setGeneratedSlots([]); // Closed
      return;
    }

    // Prepare Date Comparisons
    const now = new Date();
    const isToday = form.appointmentDate === getLocalToday();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Filter appointments for THIS selected date
    const dayAppts = appointments.filter(a => {
      if (!a.appointment_datetime) return false;
      // Handle "2023-01-01T10:00:00" or "2023-01-01 10:00:00"
      const aDate = a.appointment_datetime.includes("T")
        ? a.appointment_datetime.split("T")[0]
        : a.appointment_datetime.split(" ")[0];
      return aDate === form.appointmentDate;
    }).map(a => {
      // Extract time part
      let timePart = "";
      if (a.appointment_datetime.includes("T")) timePart = a.appointment_datetime.split("T")[1];
      else timePart = a.appointment_datetime.split(" ")[1];

      if (!timePart) return { start: -1, end: -1 };

      // Assume 30 min duration for collision check if end time missing, or calculate
      const [h, m] = timePart.split(':').map(Number);
      const startMins = h * 60 + m;
      return { start: startMins, end: startMins + 30 };
    });

    // Loop through minutes
    for (let time = startMin; time < endMin; time += 30) {
      const h = Math.floor(time / 60);
      const m = time % 60;
      const slotEnd = time + 30;

      let type = 'open'; // 'open', 'lunch', 'break', 'past', 'booked'
      const timeStr24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const label = formatTime12Hour(timeStr24);

      // Check Lunch
      if (selectedDentist.lunch) {
        const lStart = toMinutes24(selectedDentist.lunch.start);
        const lEnd = toMinutes24(selectedDentist.lunch.end);
        if (time < lEnd && slotEnd > lStart) {
          type = 'lunch';
        }
      }

      // Check Breaks
      if (type === 'open' && selectedDentist.breaks) {
        for (let b of selectedDentist.breaks) {
          const bStart = toMinutes24(b.start);
          const bEnd = toMinutes24(b.end);
          if (time < bEnd && slotEnd > bStart) {
            type = 'break';
            break;
          }
        }
      }

      // Check Past
      if (type === 'open' && isToday && time <= currentMinutes) {
        type = 'past';
      }

      // Check Booked
      if (type === 'open') {
        for (let appt of dayAppts) {
          if (time < appt.end && slotEnd > appt.start) {
            type = 'booked';
            break;
          }
        }
      }

      slots.push({ value: timeStr24, label, type });
    }

    setGeneratedSlots(slots);

  }, [selectedDentist, form.appointmentDate, appointments]);


  // HANDLERS
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePatientSelect = (e) => {
    const pId = e.target.value;
    const p = existingPatients.find(ep => String(ep.id) === String(pId));
    if (p) {
      setForm(prev => ({
        ...prev,
        patient_name: p.full_name,
        contact_number: p.contact_number,
        sex: p.gender,
        birthdate: p.birthdate ? p.birthdate.split('T')[0] : "",
        age: p.vitals?.age || "",
        notes: `Existing Patient ID: ${p.id}`
      }));
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (availability.isFull) return toast.error("Daily limit reached.");

    // Validate Name
    let finalName = form.patient_name;
    if (patientType === "new") {
      if (!form.first_name || !form.last_name) return toast.error("First and Last name are required.");
      finalName = `${form.first_name} ${form.middle_name ? form.middle_name + ' ' : ''}${form.last_name}`.trim();
    } else {
      if (!form.patient_name) return toast.error("Please select an existing patient.");
    }

    if (!form.dentist_id) return toast.error("Please select a dentist.");
    if (!form.appointmentDate) return toast.error("Please select a date.");
    if (!form.timeStart) return toast.error("Please select a time slot.");
    if (selectedServices.length === 0) return toast.error("Please select at least one procedure/service.");

    setIsSaving(true);
    try {
      const fullTimeStart = `${form.appointmentDate} ${formatTime12Hour(form.timeStart)}`;
      const procedureString = selectedServices.join(", ");

      await onSave({
        ...form,
        patient_name: finalName,
        procedure: procedureString,
        dentist_id: Number(form.dentist_id),
        timeStart: fullTimeStart,
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
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <h2>Add Appointment</h2>

        {/* PATIENT TOGGLE */}
        <div className="form-group full-width" style={{ marginBottom: '10px' }}>
          <label>Patient Type</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setPatientType("new")}
              style={{
                padding: '6px 12px',
                background: patientType === "new" ? '#0ea5e9' : '#f1f5f9',
                color: patientType === "new" ? 'white' : '#64748b',
                border: 'none', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              New Patient
            </button>
            <button
              type="button"
              onClick={() => setPatientType("old")}
              style={{
                padding: '6px 12px',
                background: patientType === "old" ? '#0ea5e9' : '#f1f5f9',
                color: patientType === "old" ? 'white' : '#64748b',
                border: 'none', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              Existing Record
            </button>
          </div>
        </div>

        <div className="form-grid">
          {/* NAME INPUTS */}
          {patientType === "old" ? (
            <div className="form-group full-width">
              <label>Search Patient</label>
              <select onChange={handlePatientSelect} defaultValue="">
                <option value="" disabled>Select Patient...</option>
                {existingPatients.map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>First Name</label>
                <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="First Name" />
              </div>
              <div className="form-group">
                <label>Middle Name</label>
                <input name="middle_name" value={form.middle_name} onChange={handleChange} placeholder="Middle Name" />
              </div>
              <div className="form-group full-width">
                <label>Last Name</label>
                <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Last Name" />
              </div>
            </>
          )}

          {/* DYNAMIC AGE & SEX */}
          <div className="form-group">
            <label htmlFor="birthdate">Date of Birth</label>
            <input id="birthdate" name="birthdate" type="date" value={form.birthdate} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="age">Age (Auto)</label>
            <input id="age" name="age" type="number" value={form.age} readOnly placeholder="Auto" style={{ backgroundColor: '#f8fafc', color: '#64748b' }} />
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
            <input id="contact_number" name="contact_number" type="text" value={form.contact_number} onChange={handleChange} placeholder="e.g. 0917..." />
          </div>

          {/* DENTIST SELECTION */}
          <div className="form-group full-width">
            <label htmlFor="dentist_id">Dentist</label>
            <select id="dentist_id" name="dentist_id" value={form.dentist_id} onChange={handleChange}>
              <option value="">Select dentist</option>
              {dentists.map((d) => (
                <option key={d.id} value={d.id} disabled={d.status === "Off"}>
                  {d.name} {d.status === "Off" ? "(Off)" : d.status === "Busy" ? "(Busy)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group full-width">
            <label htmlFor="appointmentDate">Date</label>
            <input type="date" id="appointmentDate" name="appointmentDate" value={form.appointmentDate} onChange={handleChange} />
          </div>

          {/* --- NEW TIME SLOT GRID --- */}
          <div className="form-group full-width">
            <label>Available Slots</label>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '15px', fontSize: '0.8rem', marginBottom: '8px', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: 'white', border: '1px solid #ccc', borderRadius: '50%' }}></div> Open</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: '#e0f2fe', borderRadius: '50%' }}></div> Selected</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, background: '#f1f5f9', borderRadius: '50%' }}></div> Booked/Past</span>
            </div>

            {slotsLoading ? (
              <div style={{ textAlign: 'center', padding: '10px', color: '#64748b' }}>Loading schedule...</div>
            ) : availability.isFull ? (
              <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', textAlign: 'center' }}>
                ⚠️ Daily Limit Reached. Cannot book online slots.
              </div>
            ) : generatedSlots.length === 0 ? (
              <div style={{ padding: '10px', background: '#f8fafc', color: '#64748b', borderRadius: '6px', textAlign: 'center' }}>
                No slots available (Dentist off or date passed).
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '10px', maxHeight: '200px', overflowY: 'auto', padding: '4px' }}>
                {generatedSlots.map((slot) => {
                  const isDisabled = slot.type !== 'open';
                  const isSelected = form.timeStart === slot.value;

                  // Styles
                  let bg = 'white';
                  let color = '#334155';
                  let border = '1px solid #e2e8f0';
                  let cursor = 'pointer';

                  if (isSelected) {
                    bg = '#0ea5e9'; color = 'white'; border = '1px solid #0284c7';
                  } else if (isDisabled) {
                    bg = '#f1f5f9'; color = '#cbd5e1'; cursor = 'not-allowed';
                    if (slot.type === 'lunch' || slot.type === 'break') {
                      color = '#d97706'; bg = '#fffbeb'; border = '1px solid #fcd34d'; // Yellowish for breaks
                    }
                  }

                  return (
                    <button
                      key={slot.value}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setForm(prev => ({ ...prev, timeStart: slot.value }))}
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
                      {isDisabled && slot.type !== 'booked' && slot.type !== 'past' && (
                        <span style={{ fontSize: '0.65rem', marginTop: '2px', textTransform: 'uppercase' }}>{slot.type}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="form-group full-width">
            <label htmlFor="service-select">Procedures / Services</label>
            <div className="service-input-group">
              <select id="service-select" value={currentService} onChange={(e) => setCurrentService(e.target.value)}>
                <option value="">Select a service to add...</option>
                {dentalServices.map((service, index) => (
                  <option key={index} value={service.name}>
                    {service.name} ({service.price})
                  </option>
                ))}
              </select>
              <button type="button" className="add-service-btn" onClick={handleAddService}>+</button>
            </div>
            <div className="selected-services-container">
              {selectedServices.map((service) => (
                <span key={service} className="service-chip">
                  {service}
                  <button type="button" className="remove-service-btn" onClick={() => handleRemoveService(service)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={4} />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || availability.isFull || !form.timeStart}
            style={(availability.isFull || !form.timeStart) ? { backgroundColor: '#9ca3af', cursor: 'not-allowed' } : {}}
          >
            {isSaving ? "Adding..." : availability.isFull ? "Limit Reached" : "Add Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddAppointmentModal;