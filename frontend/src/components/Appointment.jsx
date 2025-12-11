import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/pages/Appointments.css";
import EditAppointmentModal from "../components/EditAppointmentModal";
import AddAppointmentModal from "../components/AddAppointmentModal";
import StatusBadge from "../components/StatusBadge";
import ConfirmationModal from "../components/ConfirmationModal";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";

function toMinutes(timeString) {
  if (!timeString) return 0;
  const [time, meridiem] = timeString.split(" ");
  if (!time || !meridiem) return 0;
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function Appointments() {
  const navigate = useNavigate();
  const api = useApi();

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([api.loadAppointments(), api.loadPatients(), api.loadDentists(), api.loadQueue()]);
      } catch (err) {
        console.error("Error loading appointment data", err);
      }
    };
    loadData();
  }, []);

  const appointments = useAppStore((state) => state.appointments);
  const patients = useAppStore((state) => state.patients);
  const dentists = useAppStore((state) => state.dentists);
  const queue = useAppStore((state) => state.queue);

  const [search, setSearch] = useState("");
  const [activeContactId, setActiveContactId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [filters, setFilters] = useState({
    dentist: "all",
    status: "Scheduled",
    procedure: "all",
    time: "all",
  });

  const procedures = useMemo(
    () => Array.from(new Set(appointments.map((a) => a.procedure || a.reason).filter(Boolean))),
    [appointments]
  );

  // --- FIXED START HANDLER ---
  const handleStartAppointment = async (appointment) => {
    let patientId = appointment.patient_id;
    let fullPatientData = null;

    // 1. Try to find patient in local store
    if (patientId) {
      fullPatientData = patients.find((p) => String(p.id) === String(patientId));
    }

    // 2. [FIX] If not found locally (e.g. newly created on mobile), FETCH IT
    if (!fullPatientData && patientId) {
      const loadingToast = toast.loading("Fetching patient details...");
      try {
        // Fetch fresh data from server
        fullPatientData = await api.getPatientById(patientId);
        toast.dismiss(loadingToast);
      } catch (error) {
        toast.dismiss(loadingToast);
        console.error("Patient fetch error", error);
        toast.error("Error: Could not load patient details. Check internet.");
        return;
      }
    }

    if (!fullPatientData) {
      toast.error("Error: Patient data not found.");
      return;
    }

    // 3. Check Queue Conflict
    const isAlreadyInQueue = queue.some((q) =>
      String(q.patient_id) === String(patientId) &&
      q.status !== 'Done' &&
      q.status !== 'Cancelled'
    );

    if (isAlreadyInQueue && appointment.status !== 'Checked-In') {
      toast.error(`Cannot Start: Patient is already in Queue.`);
      return;
    }

    try {
      await api.updateAppointment(appointment.id, { status: 'Checked-In' });

      if (!isAlreadyInQueue) {
        await api.addQueue({
          patient_id: patientId,
          dentist_id: appointment.dentist_id || dentists.find((d) => d.name === appointment.dentist)?.id,
          appointment_id: appointment.id,
          source: "appointment",
          status: "Checked-In",
          notes: appointment.procedure || appointment.reason,
          checkedInTime: new Date().toISOString(),
        });
        toast.success("Patient added to queue.");
      }

      navigate(`/app/patient/${patientId}`, {
        state: {
          patientData: fullPatientData,
          dentistId: appointment.dentist_id,
          appointment: appointment // Triggers auto-fill in Patient Form
        }
      });

    } catch (err) {
      console.error('Failed to start appointment', err);
      toast.error('Failed to start appointment. Check console.');
    }
  };

  const conflicts = useMemo(() => {
    const dentistMap = new Map();
    appointments.forEach((appt) => {
      if (!appt.timeStart) return;
      const status = (appt.status || "").toLowerCase().trim();
      if (["done", "cancelled", "no-show"].includes(status)) return;

      const start = toMinutes(appt.timeStart);
      const end = start + 30;

      const dentistName = dentists.find(d => d.id === appt.dentist_id)?.name || appt.dentist || "Unassigned";
      const existing = dentistMap.get(dentistName) || [];
      existing.push({ ...appt, start, end, dentistName });
      dentistMap.set(dentistName, existing);
    });

    const conflictMessages = [];
    dentistMap.forEach((list) => {
      list.sort((a, b) => a.start - b.start);
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const first = list[i];
          const second = list[j];
          if (second.start < first.end && second.end > first.start) {
            const p1 = patients.find(p => p.id === first.patient_id)?.name || first.patient;
            const p2 = patients.find(p => p.id === second.patient_id)?.name || second.patient;
            conflictMessages.push({
              id: `${first.id}-${second.id}`,
              message: `${first.dentistName}: ${p1} overlaps with ${p2}`,
            });
          }
        }
      }
    });
    return conflictMessages;
  }, [appointments, dentists, patients]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const dentistName = dentists.find((d) => d.id === appt.dentist_id)?.name || appt.dentist || "";
      const patientName = patients.find((p) => p.id === appt.patient_id)?.name || appt.patient || "";
      const proc = appt.procedure || appt.reason || "";

      const searchMatch = [patientName, dentistName, appt.status, proc, appt.notes].join(" ").toLowerCase().includes(search.toLowerCase());
      const dentistMatch = filters.dentist === "all" || dentistName === filters.dentist;
      const statusMatch = filters.status === "all" ? true : appt.status === filters.status;
      const procedureMatch = filters.procedure === "all" || proc === filters.procedure;

      let timeMatch = true;
      const startMinutes = toMinutes(appt.timeStart);
      if (filters.time === "morning") timeMatch = startMinutes < 12 * 60;
      if (filters.time === "afternoon") timeMatch = startMinutes >= 12 * 60 && startMinutes < 17 * 60;
      if (filters.time === "evening") timeMatch = startMinutes >= 17 * 60;

      return searchMatch && dentistMatch && statusMatch && procedureMatch && timeMatch;
    });
  }, [appointments, dentists, patients, filters, search]);

  const handleFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const handleEdit = (appointment) => { setSelectedAppointment(appointment); setIsEditModalOpen(true); };
  const handleDelete = (appointment) => { setSelectedAppointment(appointment); setIsDeleteModalOpen(true); };
  const handleCloseModal = () => { setSelectedAppointment(null); setIsEditModalOpen(false); setIsDeleteModalOpen(false); };

  const handleSaveAppointment = async (updatedAppointment) => {
    if (!updatedAppointment) return;
    try {
      const updates = {};
      const pid = updatedAppointment.patient_id;

      const existingPatient = patients.find(p => p.id === pid);

      if (updatedAppointment.patient_name) updates.full_name = updatedAppointment.patient_name;
      if (updatedAppointment.contact_number) updates.contact_number = updatedAppointment.contact_number;
      if (updatedAppointment.sex) updates.gender = updatedAppointment.sex;
      if (updatedAppointment.age) {
        updates.age = updatedAppointment.age;
        const existingVitals = existingPatient?.vitals || {};
        updates.vitals = { ...existingVitals, age: updatedAppointment.age };
      }

      if (pid && Object.keys(updates).length > 0) {
        await api.updatePatient(pid, updates);
      }

      await api.updateAppointment(updatedAppointment.id, updatedAppointment);

      toast.success("Appointment & Patient info updated");
      handleCloseModal();

      api.loadPatients();
    } catch (err) {
      console.error('Could not update appointment', err);
      toast.error('Failed to update. Check console.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAppointment) return;
    try {
      await api.removeAppointment(selectedAppointment.id);
      toast.success("Appointment deleted");
      handleCloseModal();
    } catch (err) {
      toast.error('Failed to delete appointment');
    }
  };

  const handleAddAppointment = async (appointmentData) => {
    try {
      const newPatient = await api.createPatient({
        full_name: appointmentData.patient_name,
        contact_number: appointmentData.contact_number,
        gender: appointmentData.sex,
        age: appointmentData.age,
        vitals: { age: appointmentData.age }
      });

      const appointmentToCreate = {
        ...appointmentData,
        patient_id: newPatient.id,
      };

      await api.createAppointment(appointmentToCreate);
      toast.success("Appointment added");
      setIsAddModalOpen(false);
    } catch (err) {
      toast.error('Failed to add appointment');
    }
  };

  const getSelectedPatientData = (field) => {
    if (!selectedAppointment) return "";
    const p = patients.find((p) => p.id === selectedAppointment.patient_id);
    if (!p) return "";
    if (field === 'contact') return p.contact || "";
    if (field === 'age') return p.age || p.vitals?.age || "";
    if (field === 'sex') return p.sex || p.gender || "";
    return "";
  };

  return (
    <div className="appointments-page">
      <div className="appointments-header">
        <h2 className="appointments-title">Appointments</h2>
        <div className="appointments-search">
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="appointments-actions">
          <button className="quick-action-btn" onClick={() => setIsAddModalOpen(true)}>Add Appointment</button>
        </div>
      </div>

      <div className="appointments-filters">
        <div className="filter-group"><label htmlFor="dentist-select">Dentist</label><select id="dentist-select" value={filters.dentist} onChange={(e) => handleFilterChange("dentist", e.target.value)}><option value="all">All</option>{dentists.map((d) => (<option key={d.id} value={d.name}>{d.name}</option>))}</select></div>
        <div className="filter-group"><label htmlFor="status-select">Status</label><select id="status-select" value={filters.status} onChange={(e) => handleFilterChange("status", e.target.value)}><option value="all">All</option><option value="Scheduled">Scheduled</option><option value="Checked-In">Checked-In</option><option value="Done">Done</option><option value="Cancelled">Cancelled</option></select></div>
        <div className="filter-group"><label htmlFor="procedure-select">Procedure</label><select id="procedure-select" value={filters.procedure} onChange={(e) => handleFilterChange("procedure", e.target.value)}><option value="all">All</option>{procedures.map((p) => (<option key={p} value={p}>{p}</option>))}</select></div>
        <div className="filter-group"><label htmlFor="time-select">Time</label><select id="time-select" value={filters.time} onChange={(e) => handleFilterChange("time", e.target.value)}><option value="all">All</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select></div>
      </div>

      <div className="appointments-legend">
        <StatusBadge status="Scheduled" /><StatusBadge status="Checked-In" /><StatusBadge status="Done" /><StatusBadge status="Cancelled" />
      </div>

      {conflicts.length > 0 && (
        <div className="conflict-alert">
          <div className="conflict-icon">⚠️</div>
          <div style={{ flex: 1 }}>
            <p className="conflict-title">Overlapping appointments detected:</p>
            <ul style={{ paddingLeft: '1rem', marginTop: '0.5rem' }}>
              {conflicts.map((conflict) => (
                <li key={conflict.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>{conflict.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="appointments-table-container">
        <table className="appointments-table">
          <thead><tr><th>Time</th><th>Patient</th><th>Dentist</th><th>Procedure</th><th>Status</th><th>Notes</th><th>Contact</th><th>Actions</th></tr></thead>
          <tbody>
            {filteredAppointments.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: "center", padding: "2rem" }}>No appointments found.</td></tr>
            ) : (
              filteredAppointments.map((a) => {
                const s = (a.status || "").toLowerCase().trim();
                const canStart = s === "scheduled" || s === "checked-in";

                return (
                  <tr key={a.id}>
                    <td className="time-cell">
                      {/* FIX: Only show Time Start */}
                      <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{a.timeStart}</div>
                    </td>
                    <td>{patients.find((p) => p.id === a.patient_id)?.name || a.patient}</td>
                    <td>{dentists.find((d) => d.id === a.dentist_id)?.name || a.dentist}</td>
                    <td><span className="badge badge-neutral">{a.procedure || a.reason}</span></td>
                    <td><StatusBadge status={a.status} /></td>
                    <td><div className="notes-pill">{a.notes}</div></td>
                    <td className="contact-cell">
                      <button type="button" className="contact-button" onClick={() => setActiveContactId((prev) => prev === a.id ? null : a.id)}>📇</button>
                      {activeContactId === a.id && (
                        <div className="contact-popover">
                          <p><strong>Phone:</strong> {patients.find((p) => p.id === a.patient_id)?.contact || a.contact?.phone || ''}</p>
                          <p><strong>Email:</strong> {patients.find((p) => p.id === a.patient_id)?.email || a.contact?.email || ''}</p>
                        </div>
                      )}
                    </td>
                    <td>
                      <button className="edit-btn" onClick={() => handleEdit(a)}>Edit</button>
                      {/* Button stays enabled but logic handles errors */}
                      <button
                        className="start-btn"
                        onClick={() => handleStartAppointment(a)}
                        title={!canStart ? "Status must be Scheduled or Checked-In" : "Start Appointment"}
                        style={!canStart ? { backgroundColor: '#adb5bd', cursor: 'not-allowed' } : {}}
                      >Start</button>
                      <button className="delete-btn" onClick={() => handleDelete(a)}>Delete</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {isEditModalOpen && (
        <EditAppointmentModal
          appointment={selectedAppointment}
          initialContact={getSelectedPatientData('contact')}
          initialAge={getSelectedPatientData('age')}
          initialSex={getSelectedPatientData('sex')}
          onSave={handleSaveAppointment}
          onCancel={handleCloseModal}
          dentists={dentists}
        />
      )}
      {isAddModalOpen && <AddAppointmentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} dentists={dentists} onSave={handleAddAppointment} />}
      {isDeleteModalOpen && <ConfirmationModal isOpen={isDeleteModalOpen} onClose={handleCloseModal} onConfirm={handleConfirmDelete} message="Delete appointment?" />}
    </div>
  );
}

export default Appointments;