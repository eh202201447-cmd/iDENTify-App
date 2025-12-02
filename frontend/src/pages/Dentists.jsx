// src/pages/Dentists.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/pages/Dentists.css";

import { dentists } from "../data/dentists";

const getInitialStatusMap = () => {
  const stored = localStorage.getItem("dentistStatus");
  return stored ? JSON.parse(stored) : {};
};

function Dentists() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dentistData, setDentistData] = useState(dentists);
  const [statusMap, setStatusMap] = useState(getInitialStatusMap);
  const [filters, setFilters] = useState({
    specialization: "All",
    availability: "All",
    assigned: "All",
  });
  const [breakDrafts, setBreakDrafts] = useState({});
  const [leaveDrafts, setLeaveDrafts] = useState({});

  const dayIndex = selectedDate.getDay();
  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  const syncStatusFromStorage = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem("dentistStatus") || "{}");
    setStatusMap(stored);
  }, []);

  useEffect(() => {
    window.addEventListener("storage", syncStatusFromStorage);
    return () => {
      window.removeEventListener("storage", syncStatusFromStorage);
    };
  }, [syncStatusFromStorage]);

  const updateOperatingHours = (shortName, field, value) => {
    setDentistData((prev) =>
      prev.map((d) =>
        d.shortName === shortName
          ? { ...d, operatingHours: { ...d.operatingHours, [field]: value } }
          : d
      )
    );
  };

  const updateLunch = (shortName, field, value) => {
    setDentistData((prev) =>
      prev.map((d) =>
        d.shortName === shortName
          ? { ...d, lunch: { ...d.lunch, [field]: value } }
          : d
      )
    );
  };

  const handleBreakDraftChange = (shortName, field, value) => {
    setBreakDrafts((prev) => ({
      ...prev,
      [shortName]: { ...prev[shortName], [field]: value },
    }));
  };

  const addBreakSlot = (shortName) => {
    const draft = breakDrafts[shortName];
    if (!draft?.start || !draft?.end) return;
    setDentistData((prev) =>
      prev.map((d) =>
        d.shortName === shortName
          ? {
              ...d,
              breaks: [
                ...d.breaks,
                { label: "Added break", start: draft.start, end: draft.end },
              ],
            }
          : d
      )
    );
    setBreakDrafts((prev) => ({ ...prev, [shortName]: { start: "", end: "" } }));
  };

  const handleLeaveDraftChange = (shortName, value) => {
    setLeaveDrafts((prev) => ({ ...prev, [shortName]: value }));
  };

  const addLeaveDay = (shortName) => {
    const draft = leaveDrafts[shortName];
    if (!draft) return;
    setDentistData((prev) =>
      prev.map((d) =>
        d.shortName === shortName && !d.leaveDays.includes(draft)
          ? { ...d, leaveDays: [...d.leaveDays, draft] }
          : d
      )
    );
    setLeaveDrafts((prev) => ({ ...prev, [shortName]: "" }));
  };

  const markAvailable = (shortName) => {
    const stored = JSON.parse(localStorage.getItem("dentistStatus") || "{}");
    stored[shortName] = { status: "Available" };
    localStorage.setItem("dentistStatus", JSON.stringify(stored));
    syncStatusFromStorage();
  };

  const availabilityStatus = useCallback(
    (dentist) => {
      const isLeaveDay = dentist.leaveDays.includes(selectedDateStr);
      const worksToday = dentist.days.includes(dayIndex);
      const stored = statusMap[dentist.shortName];

      if (stored?.status === "Busy") return "Busy";
      if (!worksToday || isLeaveDay) return "Off";
      return "Available";
    },
    [selectedDateStr, dayIndex]
  );

  const filteredDentists = useMemo(
    () =>
      dentistData.filter((d) => {
        const status = availabilityStatus(d);
        const assignedCount = d.assignedPatientsToday.length;
        const specializationMatch =
          filters.specialization === "All" ||
          filters.specialization === d.specialization;
        const availabilityMatch =
          filters.availability === "All" || filters.availability === status;
        const assignedMatch =
          filters.assigned === "All" ||
          (filters.assigned === "With" && assignedCount > 0) ||
          (filters.assigned === "None" && assignedCount === 0);
        return specializationMatch && availabilityMatch && assignedMatch;
      }),
    [dentistData, filters, availabilityStatus]
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
            <option value="Orthodontics">Orthodontics</option>
            <option value="Endodontics">Endodontics</option>
            <option value="General Dentistry">General Dentistry</option>
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
            <option value="Off">Off / on leave</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Assigned patients today</label>
          <select
            value={filters.assigned}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, assigned: e.target.value }))
            }
          >
            <option value="All">Show all</option>
            <option value="With">Has assignments</option>
            <option value="None">No assignments</option>
          </select>
        </div>
      </div>

      <div className="dentist-grid">
        {filteredDentists.map((d) => {
          const status = availabilityStatus(d);
          const stored = statusMap[d.shortName];
          return (
            <div className="dentist-card" key={d.shortName}>
              <div className="dentist-card__header">
                <div>
                  <div className="dentist-specialization">{d.specialization}</div>
                  <h3>{d.name}</h3>
                  <p className="muted-text">
                    Assigned patients today: {d.assignedPatientsToday.length}
                  </p>
                </div>
                <div className={`status-pill status-${status.toLowerCase()}`}>
                  {status}
                </div>
              </div>

              {stored?.patient && (
                <div className="busy-banner">
                  <div>
                    <p className="small-label">Currently with patient</p>
                    <strong>{stored.patient}</strong>
                    {stored.startedAt && (
                      <span className="muted-text">
                        Started{" "}
                        {new Date(stored.startedAt).toLocaleTimeString([], {
                          timeStyle: "short",
                        })}
                      </span>
                    )}
                  </div>
                  <button
                    className="small-btn secondary"
                    onClick={() => markAvailable(d.shortName)}
                  >
                    Mark available
                  </button>
                </div>
              )}

              <div className="schedule-grid">
                <div>
                  <p className="small-label">Operating hours</p>
                  <div className="schedule-row">
                    <input
                      type="time"
                      value={d.operatingHours.start}
                      onChange={(e) =>
                        updateOperatingHours(
                          d.shortName,
                          "start",
                          e.target.value
                        )
                      }
                    />
                    <span className="time-separator">to</span>
                    <input
                      type="time"
                      value={d.operatingHours.end}
                      onChange={(e) =>
                        updateOperatingHours(d.shortName, "end", e.target.value)
                      }
                    />
                  </div>
                  <p className="small-label">Lunch</p>
                  <div className="schedule-row">
                    <input
                      type="time"
                      value={d.lunch.start}
                      onChange={(e) =>
                        updateLunch(d.shortName, "start", e.target.value)
                      }
                    />
                    <span className="time-separator">to</span>
                    <input
                      type="time"
                      value={d.lunch.end}
                      onChange={(e) =>
                        updateLunch(d.shortName, "end", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div>
                  <p className="small-label">Breaks</p>
                  <div className="break-list">
                    {d.breaks.map((b, idx) => (
                      <div className="break-chip" key={`${b.start}-${idx}`}>
                        <strong>{b.label}</strong>
                        <span>
                          {b.start} - {b.end}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="schedule-row">
                    <input
                      type="time"
                      placeholder="Start"
                      value={breakDrafts[d.shortName]?.start || ""}
                      onChange={(e) =>
                        handleBreakDraftChange(
                          d.shortName,
                          "start",
                          e.target.value
                        )
                      }
                    />
                    <input
                      type="time"
                      placeholder="End"
                      value={breakDrafts[d.shortName]?.end || ""}
                      onChange={(e) =>
                        handleBreakDraftChange(
                          d.shortName,
                          "end",
                          e.target.value
                        )
                      }
                    />
                    <button
                      className="pill-btn"
                      type="button"
                      onClick={() => addBreakSlot(d.shortName)}
                    >
                      Add break
                    </button>
                  </div>
                </div>

                <div>
                  <p className="small-label">Leave days</p>
                  <div className="leave-list">
                    {d.leaveDays.length ? (
                      d.leaveDays.map((day) => (
                        <span className="leave-chip" key={day}>
                          {day}
                        </span>
                      ))
                    ) : (
                      <span className="muted-text">None scheduled</span>
                    )}
                  </div>
                  <div className="schedule-row">
                    <input
                      type="date"
                      value={leaveDrafts[d.shortName] || ""}
                      onChange={(e) =>
                        handleLeaveDraftChange(d.shortName, e.target.value)
                      }
                    />
                    <button
                      className="pill-btn"
                      type="button"
                      onClick={() => addLeaveDay(d.shortName)}
                    >
                      Add leave
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