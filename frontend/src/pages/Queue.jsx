import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/pages/Queue.css";
import AddWalkInModal from "../components/AddWalkInModal";
import StatusBadge from "../components/StatusBadge";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";

const averageTreatmentMinutes = 30;
const dentistAvailabilityMinutes = {
  "Dr. Paul Zaragoza": 0,
  "Dr. Erica Aquino": 10,
  "Dr. Hernane Benedicto": 5,
};

function Queue() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queue = useAppStore((state) => state.queue);
  const patients = useAppStore((state) => state.patients);
  const dentists = useAppStore((state) => state.dentists);
  // patients are created via the API hook; store gets updated automatically
  // queue status changes are performed through API to keep backend in sync
  const api = useApi();

  const [draggingId, setDraggingId] = useState(null);

  const handleAddWalkIn = async (patientData) => {
    try {
      const created = await api.createPatient({
        ...patientData,
        medicalAlerts: [],
      });
      const patientId = created?.id;

      console.log('Created patient', patientId);
      const dentist = dentists.find(d => d.name === patientData.assignedDentist);
      await api.addQueue({
        patient_id: patientId,
        dentist_id: dentist?.id,
        source: "walk-in",
        status: "Checked-In",
        notes: patientData.notes,
        checkedInTime: new Date().toISOString(),
      });
      toast.success("Walk-in patient added to queue.");
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to add walk-in', err);
      toast.error('Failed to add walk-in');
    }
  };

  const calculateWaitingTime = (index, dentist) => {
    const availabilityOffset = dentistAvailabilityMinutes[dentist] || 0;
    const minutes = index * averageTreatmentMinutes + availabilityOffset;
    return minutes <= 0 ? "Now" : `${minutes} min`;
  };

  const handleAction = (patientId) => {
    navigate(`/app/patient/${patientId}/`);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.updateQueue(id, { status });
    } catch (err) {
      console.error('Failed to update queue status', err);
      toast.error('Failed to update status');
    }
  };

  const handleDragStart = (id) => setDraggingId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = () => {
    // This is a presentational feature and does not need to be connected to the global store
  };

  const calculateWaitingTimeSince = (checkedInTime) => {
    const now = new Date();
    const checkedIn = new Date(checkedInTime);
    const diff = now - checkedIn;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    return `${minutes} min ago`;
  };

  const queueWithDetails = useMemo(
    () =>
      queue
        .filter((item) => item.status !== "Done")
          .map((item, index) => {
          const patient = patients.find((p) => p.id === item.patient_id);
          const dentist = dentists.find((d) => d.id === item.dentist_id);
          return {
            ...item,
            number: index + 1,
            name: patient ? (patient.name || patient.full_name) : "Unknown",
            assignedDentist: dentist ? dentist.name : "Unassigned",
            waitingTime: calculateWaitingTime(index, dentist ? dentist.name : ""),
          };
        }),
    [queue, patients, dentists]
  );

  return (
    <div className="queue-page">
      <div className="queue-header">
        <h2 className="queue-title">Queue List</h2>
        <div className="queue-actions">
          <button className="add-walk-in-btn" onClick={() => setIsModalOpen(true)}>
            Add Walk-In Patient
          </button>
        </div>
      </div>
      <div className="queue-legend">
        <StatusBadge status="Checked-In" />
        <StatusBadge status="Waiting" />
        <StatusBadge status="On Chair" />
        <StatusBadge status="Treatment" />
        <StatusBadge status="Payment / Billing" />
        <StatusBadge status="Done" />
        <StatusBadge status="No-Show" />
        <StatusBadge status="Cancelled" />
      </div>
      <p className="queue-subtitle">
        Drag to reprioritize emergencies, assign a dentist, and track wait
        estimates.
      </p>

      <AddWalkInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddPatient={handleAddWalkIn}
      />

      <div className="queue-table-container">
        <table className="queue-table">
          <thead>
            <tr>
              <th></th>
              <th>#</th>
              <th>Patient</th>
              <th>Status</th>
              <th>Assigned Dentist</th>
              <th>Est. Wait</th>
              <th>Waiting Info</th>
              <th>Notes (staff)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {queueWithDetails.map((q) => (
              <tr
                key={q.id}
                className={`queue-row ${
                  draggingId === q.id ? "is-dragging" : ""
                }`}
                draggable
                onDragStart={() => handleDragStart(q.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(q.id)}
              >
                <td
                  className="drag-handle"
                  draggable
                  onDragStart={() => handleDragStart(q.id)}
                >
                  ⋮⋮
                </td>
                <td>{q.number.toString().padStart(2, "0")}</td>
                <td>{q.name}</td>
                <td>
                  <select
                    className="status-select"
                    value={q.status}
                    onChange={(e) => handleStatusChange(q.id, e.target.value)}
                  >
                    <option value="Checked-In">Checked-In</option>
                    <option value="Waiting">Waiting</option>
                    <option value="On Chair">On Chair</option>
                    <option value="Treatment">Treatment</option>
                    <option value="Payment / Billing">Payment / Billing</option>
                    <option value="Done">Done</option>
                    <option value="No-Show">No-Show</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
                <td>
                  <select
                    className="queue-dentist-select"
                    value={q.assignedDentist}
                    disabled
                  >
                    <option value="">Assign Dentist</option>
                    {dentists.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className="wait-chip">{q.waitingTime}</span>
                </td>
                <td>
                  <div>Checked in: {calculateWaitingTimeSince(q.checkedInTime || q.checkin_time)}</div>
                </td>
                <td>
                  <textarea
                    className="staff-note-input"
                    placeholder="Add staff notes..."
                    // ensure value is never null (React warns) — fall back to empty string
                    value={q.notes ?? ""}
                    readOnly
                  />
                </td>
                <td>
                  <button
                    className="action-btn"
                    onClick={() => handleAction(q.patient_id)}
                  >
                    Start
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Queue;