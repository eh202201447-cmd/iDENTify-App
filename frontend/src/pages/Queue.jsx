import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "../styles/pages/Queue.css";
import AddWalkInModal from "../components/AddWalkInModal";
import StatusBadge from "../components/StatusBadge";
import ConfirmationModal from "../components/ConfirmationModal";
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
  const api = useApi();
  const queue = useAppStore((state) => state.queue);
  const patients = useAppStore((state) => state.patients);
  const dentists = useAppStore((state) => state.dentists);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  // NEW: State for "Show Completed" toggle
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          api.loadQueue(),
          api.loadDentists(),
          api.loadPatients()
        ]);
      } catch (e) {
        console.error("Failed to load queue data", e);
      }
    };
    loadData();
  }, []);

  const handleAddWalkIn = async (patientData) => {
    try {
      const patientPayload = {
        full_name: patientData.full_name,
        gender: patientData.sex,
        contact_number: patientData.contact,
        medicalAlerts: [],
        vitals: { age: patientData.age }
      };

      const createdPatient = await api.createPatient(patientPayload);
      const patientId = createdPatient?.id;

      if (!patientId) throw new Error("Failed to create patient ID");

      const dentistObj = dentists.find(d => d.name === patientData.assignedDentist);

      await api.addQueue({
        patient_id: patientId,
        dentist_id: dentistObj?.id,
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

  const calculateWaitingTime = (index, dentistName) => {
    const availabilityOffset = dentistAvailabilityMinutes[dentistName] || 0;
    const minutes = index * averageTreatmentMinutes + availabilityOffset;
    return minutes <= 0 ? "Now" : `${minutes} min`;
  };

  const handleAction = (queueItem) => {
    const fullPatientData = patients.find(p => p.id === queueItem.patient_id);

    navigate(`/app/patient/${queueItem.patient_id}/`, {
      state: {
        dentistId: queueItem.dentist_id,
        status: queueItem.status,
        patientData: fullPatientData
      }
    });
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.updateQueue(id, { status });
      // Notify user if patient disappears from list
      if (status === "Done" && !showCompleted) {
        toast.success("Patient marked as Done (hidden from queue).");
      }
    } catch (err) {
      console.error('Failed to update queue status', err);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.deleteQueue(itemToDelete.id);
      toast.success("Removed from queue");
    } catch (err) {
      console.error("Failed to delete queue item", err);
      toast.error("Failed to delete");
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDragStart = (id) => setDraggingId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = () => { };

  const calculateWaitingTimeSince = (checkedInTime) => {
    if (!checkedInTime) return "--";
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
        .filter((item) => {
          // FIX: If 'showCompleted' is true, show everyone. Otherwise hide 'Done'.
          if (showCompleted) return true;
          return item.status !== "Done";
        })
        .map((item, index) => {
          const patient = patients.find((p) => p.id === item.patient_id);
          const patientName = patient ? (patient.name || patient.full_name) : (item.full_name || "Unknown");

          const dentist = dentists.find((d) => d.id === item.dentist_id);
          const dentistName = dentist ? dentist.name : (item.dentist_name || "Unassigned");

          return {
            ...item,
            number: index + 1,
            name: patientName,
            assignedDentist: dentistName,
            waitingTime: calculateWaitingTime(index, dentistName),
          };
        }),
    [queue, patients, dentists, showCompleted]
  );

  return (
    <div className="queue-page">
      <div className="queue-header">
        <h2 className="queue-title">Queue List</h2>
        <div className="queue-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

          {/* NEW TOGGLE for showing history */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            Show Completed
          </label>

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

      <AddWalkInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddPatient={handleAddWalkIn}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        message={`Are you sure you want to remove ${itemToDelete?.name || 'this patient'} from the queue?`}
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
            {queueWithDetails.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No patients in queue.</td></tr>
            ) : (
              queueWithDetails.map((q) => (
                <tr
                  key={q.id}
                  className={`queue-row ${draggingId === q.id ? "is-dragging" : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(q.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(q.id)}
                  style={{ opacity: q.status === 'Done' ? 0.6 : 1 }}
                >
                  <td className="drag-handle">⋮⋮</td>
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
                  <td>{q.assignedDentist}</td>
                  <td><span className="wait-chip">{q.waitingTime}</span></td>
                  <td>Checked in: {calculateWaitingTimeSince(q.time_added || q.checkedInTime)}</td>
                  <td>
                    <div className="staff-note">{q.notes || '-'}</div>
                  </td>
                  <td>
                    {/* MODIFIED START BUTTON: Disabled if Cancelled */}
                    <button
                      className="action-btn"
                      onClick={() => handleAction(q)}
                      disabled={q.status === "Cancelled"}
                      style={q.status === "Cancelled" ? { backgroundColor: '#9ca3af', cursor: 'not-allowed' } : {}}
                      title={q.status === "Cancelled" ? "Cannot start cancelled appointment" : "Start Treatment"}
                    >
                      Start
                    </button>
                    <button
                      className="action-btn"
                      style={{ marginLeft: '0.5rem', backgroundColor: '#dc3545' }}
                      onClick={() => handleDeleteClick(q)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Queue;