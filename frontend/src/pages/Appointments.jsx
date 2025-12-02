import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/pages/Appointments.css";
import EditAppointmentModal from "../components/EditAppointmentModal.clean";
import AddAppointmentModal from "../components/AddAppointmentModal";
import StatusBadge from "../components/StatusBadge";
import ConfirmationModal from "../components/ConfirmationModal";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";

function toMinutes(timeString) {
  const [time, meridiem] = timeString.split(" ");
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function Appointments() {
  const navigate = useNavigate();
  const appointments = useAppStore((state) => state.appointments);
  const patients = useAppStore((state) => state.patients);
  const dentists = useAppStore((state) => state.dentists);
  // appointment status updates now use API calls to ensure backend sync
  // note: appointment updates are handled via useApi to sync with backend
  // deletes performed via API; store will be synced by the useApi hook
  const queue = useAppStore((state) => state.queue);
  const api = useApi();
  const [search, setSearch] = useState("");
  const [activeContactId, setActiveContactId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [filters, setFilters] = useState({
    dentist: "all",
    status: "all",
    procedure: "all",
    time: "all",
  });

  const procedures = useMemo(
    () => Array.from(new Set(appointments.map((a) => a.procedure))),
    [appointments]
  );

  const handleStartAppointment = async (appointment) => {
    const isInQueue = appointment.patient_id
      ? queue.some((p) => p.patient_id === appointment.patient_id)
      : queue.some((p) => p.full_name === appointment.patient);

    if (isInQueue) {
      toast.error("Patient is already in the queue.");
      return;
    }

    let patientId = appointment.patient_id;
    if (!patientId) {
      const patient = patients.find((p) => p.full_name === appointment.patient);
      patientId = patient ? patient.id : null;
    }

    if (!patientId) {
      toast.error("Could not find patient ID.");
      return;
    }

    // update appointment status on server & store
    try {
      await api.updateAppointment(appointment.id, { status: 'Checked-In' });
    } catch (err) {
      console.error('Failed to update appointment status', err);
      toast.error('Failed to update appointment status');
      return;
    }
    // Add to queue on server & store
    try {
      await api.addQueue({
      patient_id: patientId,
      dentist_id:
        appointment.dentist_id || dentists.find((d) => d.name === appointment.dentist)?.id,
      appointment_id: appointment.id,
      source: "appointment",
      status: "Checked-In",
      notes: appointment.procedure,
      checkedInTime: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to add to queue', err);
      toast.error('Failed to add patient to queue');
      return;
    }

    toast.success("Patient added to queue.");
    navigate(`/app/patient/${patientId}`);
  };

  const conflicts = useMemo(() => {
    const dentistMap = new Map();

    appointments.forEach((appt) => {
      const start = toMinutes(appt.timeStart);
      const end = toMinutes(appt.timeEnd);
      const existing = dentistMap.get(appt.dentist) || [];
      existing.push({ ...appt, start, end });
      dentistMap.set(appt.dentist, existing);
    });

    const conflictMessages = [];
    dentistMap.forEach((list) => {
      list.sort((a, b) => a.start - b.start);
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const first = list[i];
          const second = list[j];
          if (second.start < first.end && second.end > first.start) {
            conflictMessages.push({
              id: `${first.id}-${second.id}`,
              message: `${first.dentist}: ${first.patient} (${first.timeStart}-${first.timeEnd}) overlaps with ${second.patient} (${second.timeStart}-${second.timeEnd})`,
            });
          }
        }
      }
    });

    return conflictMessages;
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const searchMatch = [
        appt.patient,
        appt.dentist,
        appt.status,
        appt.procedure,
        appt.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const dentistMatch =
        filters.dentist === "all" || appt.dentist === filters.dentist;
      const statusMatch =
        filters.status === "all" || appt.status === filters.status;
      const procedureMatch =
        filters.procedure === "all" || appt.procedure === filters.procedure;

      let timeMatch = true;
      const startMinutes = toMinutes(appt.timeStart);
      if (filters.time === "morning") timeMatch = startMinutes < 12 * 60;
      if (filters.time === "afternoon")
        timeMatch = startMinutes >= 12 * 60 && startMinutes < 17 * 60;
      if (filters.time === "evening") timeMatch = startMinutes >= 17 * 60;

      return (
        searchMatch &&
        dentistMatch &&
        statusMatch &&
        procedureMatch &&
        timeMatch
      );
    });
  }, [
    appointments,
    filters.dentist,
    filters.procedure,
    filters.status,
    filters.time,
    search,
  ]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleEdit = (appointment) => {
    setSelectedAppointment(appointment);
    setIsEditModalOpen(true);
  };

  const handleDelete = (appointment) => {
    setSelectedAppointment(appointment);
    setIsDeleteModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedAppointment(null);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
  };

  const handleSaveAppointment = async (updatedAppointment) => {
    if (!updatedAppointment) return;
    try {
      await api.updateAppointment(updatedAppointment.id, updatedAppointment);
      toast.success("Appointment updated");
      handleCloseModal();
    } catch (err) {
      console.error('Could not update appointment', err);
      toast.error('Failed to update appointment');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAppointment) return;
    try {
      await api.removeAppointment(selectedAppointment.id);
      toast.success("Appointment deleted");
      handleCloseModal();
    } catch (err) {
      console.error('Failed to delete appointment', err);
      toast.error('Failed to delete appointment');
    }
  };

  const handleAddAppointment = async (appointmentData) => {
    try {
      let patientId;
      const existingPatient = patients.find(p => p.full_name === appointmentData.patient_name);

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const newPatient = await api.createPatient({ full_name: appointmentData.patient_name });
        patientId = newPatient.id;
      }

      const appointmentToCreate = {
        ...appointmentData,
        patient_id: patientId,
      };
      delete appointmentToCreate.patient_name; 

      await api.createAppointment(appointmentToCreate);
      toast.success("Appointment added");
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to create appointment', err);
      toast.error('Failed to add appointment');
    }
  };

  const handleReschedule = () => {
    navigate("/app/appointments");
  };

  return (
    <div className="appointments-page">
      <div className="appointments-header">
        <h2 className="appointments-title">Appointments</h2>
        <div className="appointments-search">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="appointments-actions">
          <button className="quick-action-btn" onClick={() => setIsAddModalOpen(true)}>
            Add Appointment
          </button>
        </div>
      </div>
      <div className="appointments-filters">
        <div className="filter-group">
          <label htmlFor="dentist-select">Dentist</label>
          <select
            id="dentist-select"
            value={filters.dentist}
            onChange={(e) => handleFilterChange("dentist", e.target.value)}
          >
            <option value="all">All</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-select">Status</label>
          <select
            id="status-select"
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
          >
            <option value="all">All</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Checked-In">Checked-In</option>
            <option value="Done">Done</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="procedure-select">Procedure</label>
          <select
            id="procedure-select"
            value={filters.procedure}
            onChange={(e) => handleFilterChange("procedure", e.target.value)}
          >
            <option value="all">All</option>
            {procedures.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="time-select">Time</label>
          <select
            id="time-select"
            value={filters.time}
            onChange={(e) => handleFilterChange("time", e.target.value)}
          >
            <option value="all">All</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </select>
        </div>
      </div>

      <div className="appointments-legend">
        <StatusBadge status="Scheduled" />
        <StatusBadge status="Checked-In" />
        <StatusBadge status="Done" />
        <StatusBadge status="Cancelled" />
      </div>

      {conflicts.length > 0 && (
        <div className="conflict-alert">
          <div className="conflict-icon">⚠️</div>
          <div>
            <p className="conflict-title">Overlapping appointments detected:</p>
            <ul>
              {conflicts.map((conflict) => (
                <li key={conflict.id}>
                  {conflict.message}
                  <button
                    onClick={handleReschedule}
                    className="reschedule-btn"
                  >
                    Reschedule
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="appointments-table-container">
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Patient</th>
              <th>Dentist</th>
              <th>Procedure</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((a) => (
              <tr key={a.id}>
                <td className="time-cell">
                  <div>{a.timeStart}</div>
                  <span className="time-end">{a.timeEnd}</span>
                </td>
                <td>{patients.find((p) => p.id === a.patient_id)?.full_name || a.patient}</td>
                <td>{dentists.find((d) => d.id === a.dentist_id)?.name || a.dentist}</td>
                <td>
                  <span className="badge badge-neutral">{a.procedure}</span>
                </td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                <td>
                  <div className="notes-pill">{a.notes}</div>
                </td>
                <td className="contact-cell">
                  <button
                    type="button"
                    className="contact-button"
                    aria-label={`View contact for ${a.patient}`}
                    onClick={() =>
                      setActiveContactId((prev) =>
                        prev === a.id ? null : a.id
                      )
                    }
                  >
                    📇
                  </button>
                  {activeContactId === a.id && (
                    <div className="contact-popover">
                      <p>
                        <strong>Phone:</strong> {patients.find((p) => p.id === a.patient_id)?.contact || a.contact?.phone || ''}
                      </p>
                      <p>
                        <strong>Email:</strong> {patients.find((p) => p.id === a.patient_id)?.email || a.contact?.email || ''}
                      </p>
                      <p>
                        <strong>Birthday:</strong> {patients.find((p) => p.id === a.patient_id)?.birthday || a.contact?.birthday || ''}
                      </p>
                      <p>
                        <strong>Address:</strong> {patients.find((p) => p.id === a.patient_id)?.address || a.contact?.address || ''}
                      </p>
                    </div>
                  )}
                </td>
                <td>
                  <button className="edit-btn" onClick={() => handleEdit(a)}>Edit</button>
                  <button
                    className="start-btn"
                    onClick={() => handleStartAppointment(a)}
                    disabled={a.status !== "Scheduled"}
                  >
                    Start
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(a)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isEditModalOpen && (
        <EditAppointmentModal
          appointment={selectedAppointment}
          onSave={handleSaveAppointment}
          onCancel={handleCloseModal}
          dentists={dentists}
        />
      )}
      {isAddModalOpen && (
        <AddAppointmentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          patients={patients}
          dentists={dentists}
          onSave={handleAddAppointment}
        />
      )}
      {isDeleteModalOpen && (
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={handleCloseModal}
          onConfirm={handleConfirmDelete}
          message="Are you sure you want to delete this appointment?"
        />
      )}
    </div>
  );
}

export default Appointments;
