import React, { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";
import "../styles/pages/Patients.css";

function Patients() {
  const patients = useAppStore((state) => state.patients);
  const [sexFilter, setSexFilter] = useState("all");
  const [query, setQuery] = useState("");
  // Destructure the stable callbacks we need from the API hook.
  // useApi returns functions wrapped in useCallback so they are stable by identity —
  // depending on loadPatients prevents an infinite loop caused by the wrapper object changing each render.
  const { loadPatients, loading, error } = useApi();

  useEffect(() => {
    // loadPatients is stable (memoized) so this effect runs once on mount.
    loadPatients().catch((err) => {
      // components will handle empty states; log for debugging
      console.error("Failed to load patients", err);
    });
  }, [loadPatients]);

  const filteredPatients = useMemo(() => {
    const lower = query.trim().toLowerCase();
    return patients.filter((p) => {
      if (sexFilter !== "all" && (p.sex || "").toLowerCase() !== sexFilter) return false;
      if (!lower) return true;
      const haystack = [p.name, p.email, p.contact, p.address]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(lower);
    });
  }, [patients, sexFilter, query]);

  return (
    <div className="patients-page">
      <div className="patients-header">
        <h2 className="patients-title">Patients</h2>
        <div className="patients-controls">
          <div className="filter-group">
            <label htmlFor="sex-filter">Show</label>
            <select
              id="sex-filter"
              value={sexFilter}
              onChange={(e) => setSexFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="search-group">
            <input
              type="text"
              placeholder="Search patients..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search patients"
            />
          </div>
        </div>
      </div>

      <div className="patients-table-container">
        {loading && <div className="loading-indicator">Loading patients…</div>}
        {error && (
          <div className="fetch-error" role="alert">
            Failed to load patients — {error.message || String(error)}
          </div>
        )}
        <table className="patients-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Sex</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link to={`/app/patient/${p.id}`}>{p.name}</Link>
                </td>
                <td>{p.age || '--'}</td>
                <td>{p.sex || '--'}</td>
                <td>{p.contact || '--'}</td>
                <td>{p.email || '--'}</td>
                <td>{p.address || '--'}</td>
                <td>
                  <Link className="action-link" to={`/app/patient/${p.id}`}>
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredPatients.length === 0 && !loading && !error && (
          <div className="no-results">No patients found.</div>
        )}
      </div>
    </div>
  );
}

export default Patients;
