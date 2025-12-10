import React, { useState, useEffect, useMemo } from "react";
import "../styles/pages/Dashboard.css";
import WeeklyBarChart from "../components/WeeklyBarChart.jsx";
import AddWalkInModal from "../components/AddWalkInModal";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();
  const api = useApi();
  const queue = useAppStore((s) => s.queue);
  const appointments = useAppStore((s) => s.appointments);
  const dentists = useAppStore((s) => s.dentists);
  const patients = useAppStore((s) => s.patients);
  const [isAddWalkInOpen, setIsAddWalkInOpen] = useState(false);

  useEffect(() => {
    // Ensure we have the latest status from the DB
    const loadAll = async () => {
      try {
        await Promise.all([
          api.loadDentists(),
          api.loadQueue(),
          api.loadAppointments()
        ]);
      } catch (e) {
        console.error("Dashboard load error", e);
      }
    };
    loadAll();
  }, []);

  const inTreatmentStatuses = ["On Chair", "In Treatment", "Treatment", "With patient"];

  // 1. CALCULATE DENTIST STATUS
  const dentistsWithStatus = useMemo(() => {
    return dentists.map((dentist) => {
      // Check DB Manual Status Override first
      if (dentist.status && dentist.status !== "Available") {
        return { ...dentist, computedStatus: dentist.status };
      }

      // Check Queue for live status
      const byQueueName = queue.filter(
        (q) => (q.dentist_id === dentist.id) || (q.assignedDentist === dentist.name)
      );
      const hasInTreatment = byQueueName.some((q) => inTreatmentStatuses.includes(q.status));
      const hasWaiting = byQueueName.some((q) => q.status === "Waiting" || q.status === "Checked-In");

      let status = "Available";
      if (hasInTreatment) status = "With Patient";
      else if (hasWaiting) status = "Waiting for Patient";

      return { ...dentist, computedStatus: status };
    });
  }, [dentists, queue]);

  // 2. TODAY'S APPOINTMENTS LIST
  function toMinutes(timeString) {
    if (!timeString) return 0;
    const [time, meridiem] = timeString.split(" ");
    const [hourStr, minuteStr] = time.split(":");
    let hour = Number(hourStr);
    const minute = Number(minuteStr);
    if (meridiem === "PM" && hour !== 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  const todayAppointmentsDerived = useMemo(() => {
    // Get today's YYYY-MM-DD in local time
    const todayKey = new Date().toLocaleDateString('en-CA');

    return [...appointments]
      .filter(a => {
        // Filter for TODAY only
        if (!a.appointment_datetime) return false;
        const aDate = new Date(a.appointment_datetime).toLocaleDateString('en-CA');
        return aDate === todayKey;
      })
      .sort((a, b) => toMinutes(a.timeStart) - toMinutes(b.timeStart))
      .map((a) => ({
        time: a.timeStart,
        name: patients.find((p) => p.id === a.patient_id)?.name || a.patient,
        desc: a.procedure || a.reason,
        status: a.status
      }));
  }, [appointments, patients]);

  // 3. STATS CALCULATIONS
  const completedAppointments = appointments.filter((a) => a.status === "Done").length;
  const totalAppointments = appointments.length;
  const clinicLoad = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

  // New Stats
  const nextPatient = queue.find(q => q.status === 'Waiting' || q.status === 'Checked-In');
  const patientsInBilling = queue.filter(q => q.status === 'Payment / Billing').length;
  const cancelledCount = appointments.filter(a => a.status === 'Cancelled' || a.status === 'No-Show').length;
  const cancellationRate = totalAppointments > 0 ? Math.round((cancelledCount / totalAppointments) * 100) : 0;

  // 4. CHART DATA LOGIC (FIXED)
  const chartData = useMemo(() => {
    const today = new Date();
    const labels = [];
    const walkinsData = [];
    const appointmentsData = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayKey = d.toLocaleDateString('en-CA'); // YYYY-MM-DD Local
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));

      // Count Scheduled Appointments for this day
      const countAppts = appointments.filter(a => {
        if (!a.appointment_datetime) return false;
        const aDate = new Date(a.appointment_datetime).toLocaleDateString('en-CA');
        return aDate === dayKey;
      }).length;
      appointmentsData.push(countAppts);

      // Count Walk-ins from Queue History
      const countWalkins = queue.filter(q => {
        if (q.source !== 'walk-in') return false;
        // Use time_added or checkedInTime
        const t = q.time_added || q.checkedInTime;
        if (!t) return false;
        const qDate = new Date(t).toLocaleDateString('en-CA');
        return qDate === dayKey;
      }).length;
      walkinsData.push(countWalkins);
    }

    return {
      labels,
      checkups: walkinsData, // Maps to "Dataset 1" in WeeklyBarChart (Blue)
      appointments: appointmentsData // Maps to "Dataset 2" in WeeklyBarChart (Dark)
    };
  }, [appointments, queue]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Dashboard</h2>
        <div className="top-row">
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

        {/* SECTION 1: LIVE STATUS */}
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
              <span className="stat-value" style={{ color: '#d97706' }}>{patientsInBilling}</span>
              <span className="stat-label">Billing</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: ALERTS & LOAD */}
        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Clinic Pulse</h3>

          {/* Next Up Card */}
          <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', borderLeft: '4px solid #0ea5e9' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Up Next</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a', margin: '4px 0' }}>
              {nextPatient ? nextPatient.name || nextPatient.full_name : "No patients waiting"}
            </div>
            {nextPatient && <div style={{ fontSize: '0.9rem', color: '#0ea5e9' }}>For: {nextPatient.assignedDentist || "Any Dentist"}</div>}
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar"
              style={{ width: `${clinicLoad}%` }}
            ></div>
          </div>
          <p className="progress-label">{`${Math.round(clinicLoad)}% of daily tasks completed`}</p>

          <div style={{ marginTop: 'auto', paddingTop: '1rem', fontSize: '0.9rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Cancellation Rate:</span>
            <span style={{ fontWeight: 'bold', color: cancellationRate > 20 ? '#ef4444' : '#22c55e' }}>{cancellationRate}%</span>
          </div>
        </div>

        {/* SECTION 3: DENTIST STATUS */}
        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Dentist Utilization</h3>
          <ul className="dentist-utilization-list">
            {dentistsWithStatus.map((dentist) => (
              <li key={dentist.id} className="dentist-utilization-item">
                <span
                  className={`status-dot ${dentist.computedStatus
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                ></span>
                <span>{dentist.name}</span>
                <span className="dentist-status">{dentist.computedStatus}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* SECTION 4: ACTIONS */}
        <div className="dashboard-section">
          <h3 className="dashboard-subtitle">Quick Actions</h3>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => setIsAddWalkInOpen(true)}>Add Walk-In Patient</button>
            <button className="quick-action-btn" onClick={() => navigate('/app/appointments')}>Add Appointment</button>
            <button className="quick-action-btn" onClick={() => navigate('/app/queue')}>Open Queue</button>
            <button className="quick-action-btn" onClick={() => navigate('/app/reports')}>View Summary</button>
          </div>
          <AddWalkInModal
            isOpen={isAddWalkInOpen}
            onClose={() => setIsAddWalkInOpen(false)}
            onAddPatient={async (patientData) => {
              try {
                const patientPayload = {
                  full_name: patientData.full_name,
                  sex: patientData.sex,
                  contact: patientData.contact,
                  vitals: { age: patientData.age },
                  medicalAlerts: []
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
                    dentist_id: patientData.assignedDentistId
                  });
                  await api.loadQueue();
                }
                setIsAddWalkInOpen(false);
                navigate('/app/queue');
              } catch (err) {
                console.error('Failed to add walk-in', err);
              }
            }}
          />
        </div>

        {/* SECTION 5: TODAY'S SCHEDULE */}
        <div className="dashboard-section full-width">
          <h3 className="dashboard-subtitle">Today's Appointments</h3>
          <ul className="dashboard-appointments-list">
            {todayAppointmentsDerived.length === 0 ? (
              <li className="dashboard-appointment-item muted-text">No appointments scheduled for today.</li>
            ) : (
              todayAppointmentsDerived.map((appt, i) => (
                <li key={i} className="dashboard-appointment-item">
                  <span className="dashboard-appointment-time">{appt.time}</span>
                  <span className="dashboard-appointment-name">{appt.name}</span>
                  <span className="dashboard-appointment-desc">{appt.desc}</span>
                  {/* Status Pill */}
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: appt.status === 'Done' ? '#dcfce7' : '#f1f5f9',
                    color: appt.status === 'Done' ? '#166534' : '#475569'
                  }}>
                    {appt.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* SECTION 6: CHART */}
        <div className="dashboard-section full-width">
          <h3 className="dashboard-subtitle">Last 7 Days Activity</h3>
          <WeeklyBarChart chartData={chartData} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;