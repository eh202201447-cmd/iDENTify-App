import React, { useState, useEffect } from "react";
import "../styles/pages/Dashboard.css";
import WeeklyBarChart from "../components/WeeklyBarChart.jsx";
import AddWalkInModal from "../components/AddWalkInModal";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  // Add through API; the hook updates store accordingly
  const api = useApi();
  const queue = useAppStore((s) => s.queue);
  const appointments = useAppStore((s) => s.appointments);
  const dentists = useAppStore((s) => s.dentists);
  const patients = useAppStore((s) => s.patients);
  const [isAddWalkInOpen, setIsAddWalkInOpen] = useState(false);
  // Note: Today appointments derived from store `appointments` — dynamic list is computed below.

  useEffect(() => {
    api.loadDentists();
  }, []);

  const inTreatmentStatuses = ["On Chair", "In Treatment", "Treatment", "With patient"];
  const dentistsWithStatus = dentists.map((dentist) => {
    const byQueueName = queue.filter(
      (q) => q.assignedDentist === dentist.name || q.dentist_id === dentist.id
    );
    const hasInTreatment = byQueueName.some((q) => inTreatmentStatuses.includes(q.status));
    const hasWaiting = byQueueName.some((q) => q.status === "Waiting" || q.status === "Checked-In");
    let status = "Available";
    if (hasInTreatment) status = "With patient";
    else if (hasWaiting) status = "Waiting";
    return { ...dentist, status };
  });

  function toMinutes(timeString) {
    const [time, meridiem] = timeString.split(" ");
    const [hourStr, minuteStr] = time.split(":");
    let hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  const sortedAppointments = [...appointments].sort(
    (a, b) => toMinutes(a.timeStart) - toMinutes(b.timeStart)
  );
  const todayAppointmentsDerived = sortedAppointments.map((a) => ({
    time: a.timeStart,
    name: patients.find((p) => p.id === a.patient_id)?.name || a.patient,
    desc: a.procedure,
  }));

  const completedAppointments = appointments.filter((a) => a.status === "Done").length;
  const totalAppointments = appointments.length;
  const clinicLoad = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
        <div className="top-row">
          {/* <p className="dashboard-date">Tuesday, December 2, 2025</p> */}
          <div className="dashboard-search-box">
            <span className="dashboard-search-icon">🔍</span>
            <input
              className="dashboard-search-input"
              type="text"
              placeholder="Search"
            />
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Patients Currently in Clinic</h3>
          <div className="clinic-stats">
            <div className="stat-item">
                <span className="stat-value">{queue.filter(q => q.status === 'Checked-In').length}</span>
              <span className="stat-label">Checked-in</span>
            </div>
            <div className="stat-item">
                <span className="stat-value">{queue.filter(q => q.status === 'Waiting').length}</span>
              <span className="stat-label">Waiting</span>
            </div>
            <div className="stat-item">
                <span className="stat-value">{queue.filter(q => inTreatmentStatuses.includes(q.status)).length}</span>
              <span className="stat-label">In Treatment</span>
            </div>
            <div className="stat-item">
                <span className="stat-value">{Math.max(queue.filter(q => q.status === 'Completed').length, appointments.filter(a => a.status === 'Done').length)}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Clinic Load</h3>
          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${clinicLoad}%` }}
            ></div>
            
          </div>
          <p className="progress-label">{`${Math.round(
            clinicLoad
          )}% of appointments processed`}</p>
        </div>

        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Dentist Utilization</h3>
          <ul className="dentist-utilization-list">
            {dentistsWithStatus.map((dentist) => (
              <li key={dentist.name} className="dentist-utilization-item">
                <span
                  className={`status-dot ${dentist.status
                    .toLowerCase()
                    .replace(" ", "-")}`}
                ></span>
                <span>{dentist.name}</span>
                <span className="dentist-status">{dentist.status}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Quick Actions</h3>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => setIsAddWalkInOpen(true)}>Add Walk-In Patient</button>
            <button className="quick-action-btn" onClick={() => navigate('/app/appointments')}>Add Appointment</button>
            <button className="quick-action-btn" onClick={() => navigate('/app/queue')}>Open Queue</button>
            <button className="quick-action-btn" onClick={() => navigate('/app/reports')}>View Today’s Summary</button>
          </div>
            <AddWalkInModal
            isOpen={isAddWalkInOpen}
            onClose={() => setIsAddWalkInOpen(false)}
              onAddPatient={async (patientData) => {
                try {
                  // FIX: Prepare payload to match backend expectations
                  const patientPayload = {
                    full_name: patientData.full_name,
                    sex: patientData.sex,
                    contact: patientData.contact,
                    // Store age in vitals since there is no 'age' column in DB
                    vitals: { age: patientData.age },
                    medicalAlerts: [] // Default empty
                  };

                  const created = await api.createPatient(patientPayload);
                  const id = created?.id;
                  
                  if (id) {
                    await api.addQueue({
                      patient_id: id,
                      source: 'walk-in',
                      status: 'Checked-In',
                      notes: patientData.notes || '',
                      checkedInTime: new Date().toISOString(),
                    });
                    // Refresh queue to show it immediately
                    await api.loadQueue(); 
                  }
                  setIsAddWalkInOpen(false);
                } catch (err) {
                  console.error('Failed to add walk-in', err);
                }
              }}
          />
        </div>

        <div className="dashboard-section full-width">
          <h3 className="dashboard-subtitle">Today's Appointments</h3>
          <ul className="dashboard-appointments-list">
            {todayAppointmentsDerived.map((appt, i) => (
              <li key={i} className="dashboard-appointment-item">
                <span className="dashboard-appointment-time">{appt.time}</span>
                <span className="dashboard-appointment-name">{appt.name}</span>
                <span className="dashboard-appointment-desc">{appt.desc}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="dashboard-section full-width">
          <h3 className="dashboard-subtitle">Last 7 Days</h3>
          <WeeklyBarChart chartData={(() => {
            const now = new Date();
            const labels = [];
            const checkups = [];
            const appointmentsData = [];
            for (let i = 6; i >= 0; i -= 1) {
              const d = new Date(now);
              d.setDate(now.getDate() - i);
              const dayKey = d.toISOString().split("T")[0];
              labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
              const dayQueue = queue.filter((q) => {
                if (!q.checkedInTime) return false;
                const qDate = new Date(q.checkedInTime).toISOString().split("T")[0];
                return qDate === dayKey;
              });
              checkups.push(dayQueue.filter((q) => q.source === 'walk-in').length);
              appointmentsData.push(dayQueue.filter((q) => q.source === 'appointment').length);
            }
            return { labels, checkups, appointments: appointmentsData };
          })()} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;