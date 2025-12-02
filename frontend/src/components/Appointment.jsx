/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from "react";
import "./Appointment.css";

// Reusable appointment component with inline edit and status actions.
// Works standalone (local state) and also calls parent callbacks when provided:
// - onUpdate(updatedAppointment)
// - onStatusChange(nextStatus, updatedAppointment)
export default function Appointment({ appointment = {}, onUpdate, onStatusChange, extraAction, showDefaultActions = true }) {
  const [local, setLocal] = useState({
    id: appointment.id,
    time: appointment.time || "",
    name: appointment.name || "",
    desc: appointment.desc || "",
    status: appointment.status || "scheduled",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ time: local.time, name: local.name, desc: local.desc });

  useEffect(() => {
    const nextLocal = {
      id: appointment.id,
      time: appointment.time || "",
      name: appointment.name || "",
      desc: appointment.desc || "",
      status: appointment.status || "scheduled",
    };

    if (
      nextLocal.id !== local.id ||
      nextLocal.time !== local.time ||
      nextLocal.name !== local.name ||
      nextLocal.desc !== local.desc ||
      nextLocal.status !== local.status
    ) {
      setLocal(nextLocal);
      setForm({ time: nextLocal.time, name: nextLocal.name, desc: nextLocal.desc });
    }
  }, [appointment]);

  function startEdit() {
    setForm({ time: local.time || "", name: local.name || "", desc: local.desc || "" });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  function saveEdit() {
    const updated = { ...local, ...form };
    setLocal(updated);
    setIsEditing(false);
    if (typeof onUpdate === "function") onUpdate(updated);
  }

  function changeStatus(nextStatus) {
    if (nextStatus === "completed") {
      if (!window.confirm("Mark this appointment as completed?")) return;
    }
    const updated = { ...local, status: nextStatus };
    setLocal(updated);
    if (typeof onStatusChange === "function") onStatusChange(nextStatus, updated);
  }

  return (
    <div className={`appointment-card ${local.status}`}>
      {isEditing ? (
        <div className="appointment-form">
          <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
          <div className="form-actions">
            <button onClick={saveEdit}>Save</button>
            <button onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="appointment-details">
          <div className="appointment-info">
            <span className="time">{local.time}</span>
            <span className="name">{local.name}</span>
            <span className="desc">{local.desc}</span>
            <span className="status">{local.status}</span>
          </div>
          <div className="appointment-actions">
            {showDefaultActions && (
              <>
                <button onClick={() => changeStatus("noshow")}>No Show</button>
                <button onClick={() => changeStatus("completed")}>Complete</button>
                <button onClick={startEdit}>Edit</button>
              </>
            )}
            {extraAction && <button onClick={() => extraAction(local)}>{extraAction.label}</button>}
          </div>
        </div>
      )}
    </div>
  );
}
