import React, { useEffect, useMemo, useState, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/pages/Dentists.css";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";
import toast from "react-hot-toast";

function Dentists() {
  const api = useApi();
  const dentists = useAppStore((state) => state.dentists);
  const appointments = useAppStore((state) => state.appointments);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filters, setFilters] = useState({
    specialization: "All",
    availability: "All",
    assigned: "All",
  });

  // Local state for inputs before saving
  const [breakDrafts, setBreakDrafts] = useState({});
  const [leaveDrafts, setLeaveDrafts] = useState({});

  const dayIndex = selectedDate.getDay();
  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  useEffect(() => {
    api.loadDentists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to save changes to DB
  const saveDentistChanges = async (dentist) => {
    try {
      await api.updateDentist(dentist.id, dentist);
      toast.success("Schedule updated");
    } catch (error) {
      console.error("Failed to update dentist", error);
      toast.error("Failed to save changes");
    }
  };

  const updateOperatingHours = (dentist, field, value) => {
    const updated = {
      ...dentist,
      operatingHours: { ...dentist.operatingHours, [field]: value }
    };
    saveDentistChanges(updated);
  };

  const updateLunch = (dentist, field, value) => {
    const updated = {
      ...dentist,
      lunch: { ...dentist.lunch, [field]: value }
    };
    saveDentistChanges(updated);
  };

  const handleBreakDraftChange = (dentistId, field, value) => {
    setBreakDrafts((prev) => ({
      ...prev,
      [dentistId]: { ...prev[dentistId], [field]: value },
    }));
  };

  const addBreakSlot = (dentist) => {
    const draft = breakDrafts[dentist.id];
    if (!draft?.start || !draft?.end) return;

    const updated = {
      ...dentist,
      breaks: [...(dentist.breaks || []), { label: "Break", start: draft.start, end: draft.end }]
    };

    saveDentistChanges(updated);
    setBreakDrafts((prev) => ({ ...prev, [dentist.id]: { start: "", end: "" } }));
  };

  const removeBreakSlot = (dentist, index) => {
    const newBreaks = [...(dentist.breaks || [])];
    newBreaks.splice(index, 1);
    const updated = { ...dentist, breaks: newBreaks };
    saveDentistChanges(updated);
  };

  const handleLeaveDraftChange = (dentistId, value) => {
    setLeaveDrafts((prev) => ({ ...prev, [dentistId]: value }));
  };

  const addLeaveDay = (dentist) => {
    const draft = leaveDrafts[dentist.id];
    if (!draft) return;

    const currentLeaves = dentist.leaveDays || [];
    if (currentLeaves.includes(draft)) return;

    const updated = {
      ...dentist,
      leaveDays: [...currentLeaves, draft]
    };

    saveDentistChanges(updated);
    setLeaveDrafts((prev) => ({ ...prev, [dentist.id]: "" }));
  };

  const removeLeaveDay = (dentist, dayToRemove) => {
    const updated = {
      ...dentist,
      leaveDays: (dentist.leaveDays || []).filter(d => d !== dayToRemove)
    };
    saveDentistChanges(updated);
  }

  const toggleStatus = (dentist) => {
    // Simple toggle logic: Available -> Off -> Busy -> Available
    const modes = ["Available", "Off", "Busy"];
    const currentIdx = modes.indexOf(dentist.status || "Available");
    const nextStatus = modes[(currentIdx + 1) % modes.length];

    const updated = { ...dentist, status: nextStatus };
    saveDentistChanges(updated);
  };

  const calculateAvailability = (dentist) => {
    // 1. Check DB Status Override
    if (dentist.status === "Busy") return "Busy";
    if (dentist.status === "Off") return "Off";

    // 2. Check Leave Days
    if ((dentist.leaveDays || []).includes(selectedDateStr)) return "Off (Leave)";

    // 3. Check Schedule Days (e.g. Mon-Fri)
    if (dentist.days && !dentist.days.includes(dayIndex)) return "Off (Sched)";

    return "Available";
  };

  const getAssignedCount = (dentistId) => {
    // Count appointments for this dentist on the selected date
    return appointments.filter(a => {
      if (a.dentist_id !== dentistId) return false;
      // Check date match
      // Assuming a.timeStart or a.appointment_datetime contains the date
      // Simplistic check string matching:
      return (a.timeStart && a.timeStart.includes(selectedDateStr))
        || (a.appointment_datetime && a.appointment_datetime.startsWith(selectedDateStr));
    }).length;
  };

  const filteredDentists = useMemo(
    () =>
      dentists.filter((d) => {
        const computedStatus = calculateAvailability(d);
        const assignedCount = getAssignedCount(d.id);

        const specializationMatch =
          filters.specialization === "All" ||
          filters.specialization === d.specialization;

        // Looser match for status to account for "Off (Leave)" etc
        const availabilityMatch =
          filters.availability === "All" ||
          computedStatus.includes(filters.availability);

        const assignedMatch =
          filters.assigned === "All" ||
          (filters.assigned === "With" && assignedCount > 0) ||
          (filters.assigned === "None" && assignedCount === 0);

        return specializationMatch && availabilityMatch && assignedMatch;
      }),
    [dentists, filters, selectedDateStr, appointments]
  );

  return (
    <div className="dentists-page">
      <div className="dentists-header">
        <h2 className="dentists-title">Dentist Availability</h2>
        <div className="dentist-calendar-row">
          <div>
            <p className="small-label">Schedule date</p>
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              className="datepicker-input"
            />
          </div>
        </div>
      </div>

      <div className="dentist-filter-bar">
        <div className="filter-group">
          <label>Specialization</label>
          <select
            value={filters.specialization}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                specialization: e.target.value,
              }))
            }
          >
            <option value="All">All</option>
            {/* Unique specializations */}
            {Array.from(new Set(dentists.map(d => d.specialization))).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Availability</label>
          <select
            value={filters.availability}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, availability: e.target.value }))
            }
          >
            <option value="All">All</option>
            <option value="Available">Available</option>
            <option value="Busy">Busy</option>
            <option value="Off">Off</option>
          </select>
        </div>
      </div>

      <div className="dentist-grid">
        {filteredDentists.map((d) => {
          const statusDisplay = calculateAvailability(d);
          const assignedCount = getAssignedCount(d.id);
          const isOff = statusDisplay.includes("Off");
          const isBusy = statusDisplay === "Busy";

          return (
            <div className="dentist-card" key={d.id}>
              <div className="dentist-card__header">
                <div>
                  <div className="dentist-specialization">{d.specialization}</div>
                  <h3>{d.name}</h3>
                  <p className="muted-text">
                    Assigned patients today: {assignedCount}
                  </p>
                </div>
                <button
                  className={`status-pill status-${isOff ? 'off' : isBusy ? 'busy' : 'available'}`}
                  onClick={() => toggleStatus(d)}
                  title="Click to toggle status (Available -> Off -> Busy)"
                >
                  {statusDisplay}
                </button>
              </div>

              <div className="schedule-grid">
                <div>
                  <p className="small-label">Operating hours</p>
                  <div className="schedule-row">
                    <input
                      type="time"
                      value={d.operatingHours?.start || ""}
                      onChange={(e) => updateOperatingHours(d, "start", e.target.value)}
                    />
                    <span className="time-separator">to</span>
                    <input
                      type="time"
                      value={d.operatingHours?.end || ""}
                      onChange={(e) => updateOperatingHours(d, "end", e.target.value)}
                    />
                  </div>
                  <p className="small-label">Lunch</p>
                  <div className="schedule-row">
                    <input
                      type="time"
                      value={d.lunch?.start || ""}
                      onChange={(e) => updateLunch(d, "start", e.target.value)}
                    />
                    <span className="time-separator">to</span>
                    <input
                      type="time"
                      value={d.lunch?.end || ""}
                      onChange={(e) => updateLunch(d, "end", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <p className="small-label">Breaks</p>
                  <div className="break-list">
                    {(d.breaks || []).map((b, idx) => (
                      <div className="break-chip" key={`${b.start}-${idx}`}>
                        <span>{b.start} - {b.end}</span>
                        <button
                          className="chip-remove-btn"
                          onClick={() => removeBreakSlot(d, idx)}
                          style={{ marginLeft: '6px', border: 'none', background: 'transparent', color: '#888', cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="schedule-row">
                    <input
                      type="time"
                      style={{ width: '80px' }}
                      value={breakDrafts[d.id]?.start || ""}
                      onChange={(e) => handleBreakDraftChange(d.id, "start", e.target.value)}
                    />
                    <input
                      type="time"
                      style={{ width: '80px' }}
                      value={breakDrafts[d.id]?.end || ""}
                      onChange={(e) => handleBreakDraftChange(d.id, "end", e.target.value)}
                    />
                    <button
                      className="pill-btn"
                      type="button"
                      onClick={() => addBreakSlot(d)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <p className="small-label">Leave days</p>
                  <div className="leave-list">
                    {(d.leaveDays || []).length ? (
                      (d.leaveDays).map((day) => (
                        <span className="leave-chip" key={day}>
                          {day}
                          <button
                            onClick={() => removeLeaveDay(d, day)}
                            style={{ marginLeft: '6px', border: 'none', background: 'transparent', color: '#888', cursor: 'pointer' }}
                          >×</button>
                        </span>
                      ))
                    ) : (
                      <span className="muted-text">None</span>
                    )}
                  </div>
                  <div className="schedule-row">
                    <input
                      type="date"
                      value={leaveDrafts[d.id] || ""}
                      onChange={(e) => handleLeaveDraftChange(d.id, e.target.value)}
                    />
                    <button
                      className="pill-btn"
                      type="button"
                      onClick={() => addLeaveDay(d)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Dentists;