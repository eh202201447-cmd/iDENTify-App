import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/pages/PatientForm.css";
import PatientHistorySidebar from "../components/PatientHistorySidebar";
import XrayViewer from "../components/XrayViewer";
import MedicalAlertBanner from "../components/MedicalAlertBanner";
import toast from "react-hot-toast";
import useAppStore from "../store/useAppStore";
import useApi from "../hooks/useApi";

function PatientForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // ready for dynamic data later

  const [boxMarks, setBoxMarks] = useState(Array(64).fill(""));
  const patient = useAppStore((s) => s.patients.find((p) => String(p.id) === String(id)));
  const api = useApi();

  // Circles: shade only, no letters
  const [circleShades, setCircleShades] = useState(Array(52).fill(false));

  const [selected, setSelected] = useState({
    kind: null, // "box"
    index: null,
    boxKind: null, // "treatment" | "condition"
    cellKey: null,
  });

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState("planned");
  const [toothStatuses, setToothStatuses] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [selectedXray, setSelectedXray] = useState(null);
  const [isXrayViewerOpen, setIsXrayViewerOpen] = useState(false);

  const [timelineEntries, setTimelineEntries] = useState([
    {
      id: 1,
      start: "09:05",
      end: "09:20",
      provider: "Dr. Paul Zaragoza",
      procedure: "Cleaning",
    },
    {
      id: 2,
      start: "09:25",
      end: "09:45",
      provider: "Dr. Erica Aquino",
      procedure: "X-ray & diagnosis",
    },
  ]);

  const [editingTimelineIndex, setEditingTimelineIndex] = useState(null);

  const [timelineForm, setTimelineForm] = useState({
    start: "",
    end: "",
    provider: "",
    procedure: "",
    notes: "",
    image: null,
  });

  const [medications, setMedications] = useState([
    { medicine: "Ibuprofen", dosage: "400mg", frequency: "q8h", notes: "After meals" },
  ]);

  const [editingMedicationIndex, setEditingMedicationIndex] = useState(null);

  const [medicationForm, setMedicationForm] = useState({
    medicine: "",
    dosage: "",
    frequency: "",
    notes: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    const storedStatuses = JSON.parse(localStorage.getItem("dentistStatus") || "{}");
    const patientId = String(id);
    const dentistStatus = Object.values(storedStatuses).find((status) =>
      String(status.patientId) === patientId
    );

    if (dentistStatus && timelineEntries.length > 0) {
      const updatedTimelineEntries = [...timelineEntries];
      if (dentistStatus?.startedAt) {
        updatedTimelineEntries[0].start = new Date(dentistStatus.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setTimelineEntries(updatedTimelineEntries);
      }
    }
  }, [id]);

  // moved vitals and patientInfo state declarations earlier in the file to fix hook ordering

  // patient info effect moved down after state declarations

  // vital signs
  const [vitals, setVitals] = useState({
    bp: "",
    pulse: "",
    temp: "",
  });

  const [patientInfo, setPatientInfo] = useState({
    name: "",
    age: "",
    sex: "",
    contact: "",
    email: "",
    birthday: "",
    address: "",
    medicalAlerts: [],
  });

  const updateVitals = (field, value) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (patient) {
      setPatientInfo({
        name: patient.name || "",
        age: patient.age || "",
        sex: patient.sex || "",
        contact: patient.contact || "",
        email: patient.email || "",
        birthday: patient.birthday || "",
        address: patient.address || "",
        medicalAlerts: patient.medicalAlerts || [],
      });
      if (patient.vitals) setVitals(patient.vitals);
    }
  }, [patient]);

  const setCellStatus = (cellKey) => {
    if (!cellKey) return;
    setToothStatuses((prev) => ({ ...prev, [cellKey]: activeStatus }));
  };

  const updateTimelineForm = (field, value) => {
    setTimelineForm((prev) => ({ ...prev, [field]: value }));
  };

    const addTimelineEntry = () => {

      if (!timelineForm.procedure) return;

  

      const newEntry = { ...timelineForm };

      if (!newEntry.start) {

        newEntry.start = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      }

  

      if (editingTimelineIndex !== null) {

        setTimelineEntries((prev) =>

          prev.map((entry, idx) =>

            idx === editingTimelineIndex ? { ...newEntry, id: entry.id } : entry

          )

        );

        setEditingTimelineIndex(null);

      } else {

        setTimelineEntries((prev) => [

          ...prev,

          { ...newEntry, id: prev.length > 0 ? Math.max(...prev.map(e => e.id)) + 1 : 1 },

        ]);

      }

      setTimelineForm({ start: "", end: "", provider: "", procedure: "", notes: "", image: null });

    };

  const editTimelineEntry = (index) => {
    const entryToEdit = timelineEntries[index];
    setTimelineForm(entryToEdit);
    setEditingTimelineIndex(index);
  };

  const deleteTimelineEntry = (index) => {
    setTimelineEntries((prev) => prev.filter((_, idx) => idx !== index));
    if (editingTimelineIndex === index) {
      setTimelineForm({ start: "", end: "", provider: "", procedure: "", notes: "", image: null });
      setEditingTimelineIndex(null);
    }
  };

  const updateMedicationForm = (field, value) => {
    setMedicationForm((prev) => ({ ...prev, [field]: value }));
  };

  const addMedication = () => {
    if (!medicationForm.medicine) return;

    if (editingMedicationIndex !== null) {
      setMedications((prev) =>
        prev.map((entry, idx) =>
          idx === editingMedicationIndex ? { ...medicationForm } : entry
        )
      );
      setEditingMedicationIndex(null);
    } else {
      setMedications((prev) => [...prev, medicationForm]);
    }
    setMedicationForm({ medicine: "", dosage: "", frequency: "", notes: "" });
  };

  const editMedication = (index) => {
    const entryToEdit = medications[index];
    setMedicationForm(entryToEdit);
    setEditingMedicationIndex(index);
  };

  const deleteMedication = (index) => {
    setMedications((prev) => prev.filter((_, idx) => idx !== index));
    if (editingMedicationIndex === index) {
      setMedicationForm({ medicine: "", dosage: "", frequency: "", notes: "" });
      setEditingMedicationIndex(null);
    }
  };

  const exportPrescriptions = () => {
    const printWindow = window.open("", "PRINT", "height=600,width=800");
    const listItems = medications
      .map(
        (m) =>
          `<li><strong>${m.medicine}</strong> — ${m.dosage} — ${m.frequency}<br/><em>${m.notes}</em></li>`,
      )
      .join("");
    printWindow.document.write(
      `<html><head><title>Prescriptions</title></head><body><h2>Prescriptions</h2><ol>${listItems}</ol></body></html>`,
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const printPatientForm = () => {
    // Print the whole patient form by opening a new window with the form HTML
    const formHtml = document.getElementById('patient-form')?.outerHTML || '';
    const printWindow = window.open('', 'PRINT', 'height=800,width=1000');
    printWindow.document.write(`
      <html>
        <head>
          <title>Patient Form - ${id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px }
            .patients-header { font-size: 20px; font-weight: bold }
          </style>
        </head>
        <body>
          ${formHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleUpload = (event) => {
    const files = Array.from(event.target.files || []);
    const mapped = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setUploadedFiles((prev) => [...prev, ...mapped]);
  };

  // ---------------- OPTIONS ----------------
  const treatmentOptions = [
    { code: "FV", label: "Fluoride Varnish" },
    { code: "FG", label: "Fluoride Gel" },
    { code: "PFS", label: "Pit and Fissure Sealant" },
    { code: "PF", label: "Permanent Filling" },
    { code: "TF", label: "Temporary Filling" },
    { code: "X", label: "Extraction" },
    { code: "O", label: "Others" },
    { code: "", label: "Clear (no mark)" },
  ];

  const conditionOptions = [
    { code: "S", label: "Sealed" },
    { code: "UN", label: "Unerupted" },
    { code: "D", label: "Decayed" },
    { code: "F", label: "Filled" },
    { code: "M", label: "Missing" },
    { code: "JC", label: "Jacket Crown" },
    { code: "P", label: "Pontic" },
    { code: "DX", label: "For Extraction" },
    { code: "", label: "Clear (no mark)" },
  ];

  // Tooth numbers for the circles
  const upperConditionRows = [
    ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"],
    ["18", "17", "16", "15", "14", "13", "12", "11","21", "22", "23", "24", "25", "26", "27", "28"],
  ]; // 26 total

  // Tooth numbers for the circles
  const lowerConditionRows = [
    ["48", "47", "46", "45", "44", "43", "42", "41","31", "32", "33", "34", "35", "36", "37", "38"],
    ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"],
  ]; // 26 total

  // ---------------- HELPERS ----------------

  // Decide if a box index is TREATMENT or CONDITION
  const getBoxKind = (idx) => {
    const row = Math.floor(idx / 16); // 0..3
    if (row === 0 || row === 3) return "treatment"; // top row & very bottom row
    return "condition"; // middle two rows
  };

  const handleBoxClick = (idx) => {
    const boxKind = getBoxKind(idx);
    setSelected({
      kind: "box",
      index: idx,
      boxKind,
      cellKey: `box-${idx}`,
    });
    setIsPanelOpen(true);
  };

  const toggleCircleShade = (idx) => {
    const cellKey = `circle-${idx}`;
    setCircleShades((prev) =>
      prev.map((v, i) => (i === idx ? !v : v)),
    );
    setCellStatus(cellKey);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelected({
      kind: null,
      index: null,
      boxKind: null,
      cellKey: null,
    });
  };

  const handleContextMenu = (e, cellKey, boxKind) => {
    e.preventDefault();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      cellKey,
      boxKind,
    });
    setIsContextMenuOpen(true);
  };

  const closeContextMenu = () => {
    setIsContextMenuOpen(false);
    setContextMenu(null);
  };

  const openXrayViewer = (file) => {
    setSelectedXray(file);
    setIsXrayViewerOpen(true);
  };

  const closeXrayViewer = () => {
    setSelectedXray(null);
    setIsXrayViewerOpen(false);
  };

  const applyCode = (code) => {
    if (selected.kind === "box" && selected.index != null) {
      setBoxMarks((prev) =>
        prev.map((v, i) => (i === selected.index ? code : v)),
      );
      setCellStatus(selected.cellKey);
    }
    closePanel();
  };

  const handleDone = () => {
    navigate("/app/queue");
  };

  // RENDER a row of 16 boxes
  const renderBoxRow = (rowIndex) => {
    const start = rowIndex * 16; // 0,16,32,48
    return (
      <div className="tc-box-row">
        {Array.from({ length: 16 }).map((_, i) => {
          const idx = start + i;
          const mark = boxMarks[idx];
          const isSelected =
            selected.kind === "box" && selected.index === idx;
          const cellKey = `box-${idx}`;
          const statusClass = toothStatuses[cellKey]
            ? ` tc-status-${toothStatuses[cellKey]}`
            : "";

          return (
            <button
              key={idx}
              className={
                "tc-box-cell" +
                (mark ? " tc-has-mark" : "") +
                (isSelected ? " tc-selected" : "") +
                statusClass
              }
              onClick={() => handleBoxClick(idx)}
              onContextMenu={(e) => handleContextMenu(e, cellKey, getBoxKind(idx))}
              onDoubleClick={() => {
                setSelected({
                  kind: "box",
                  index: idx,
                  boxKind: getBoxKind(idx),
                  cellKey,
                });
                applyCode("D");
              }}
            >
              {mark}
            </button>
          );
        })}
      </div>
    );
  };

  // RENDER circles group (upper or lower arch)
  const renderCircleGroup = (rows, startIndex) => {
    let runningIndex = startIndex;

    return rows.map((rowNumbers, rowIdx) => (
      <div className="tc-circle-row" key={rowIdx}>
        {rowNumbers.map((num) => {
          const idx = runningIndex;
          runningIndex += 1;

          const shaded = circleShades[idx];
          const cellKey = `circle-${idx}`;
          const statusClass = toothStatuses[cellKey]
            ? ` tc-status-${toothStatuses[cellKey]}`
            : "";

          return (
            <button
              key={num}
              className={
                "tc-circle-unit" + (shaded ? " tc-has-mark" : "") + statusClass
              }
              onClick={() => toggleCircleShade(idx)}
              onContextMenu={(e) => handleContextMenu(e, cellKey, "condition")}
              onDoubleClick={() => {
                toggleCircleShade(idx);
                applyCode("D");
              }}
            >
              <div className="tc-circle">{/* no letters, just shade */}</div>
              <span className="tc-number">{num}</span>
            </button>
          );
        })}
      </div>
    ));
  };

  const panelTitle =
    selected.boxKind === "treatment"
      ? "Treatment"
      : selected.boxKind === "condition"
      ? "Condition"
      : "Legend";

  const panelOptions =
    selected.boxKind === "treatment"
      ? treatmentOptions
      : selected.boxKind === "condition"
      ? conditionOptions
      : [];

  return (
    <div className="patient-form-page patient-form-layout">
      <div id="patient-form" className="content-card patient-form-card">
        {patientInfo?.medicalAlerts && patientInfo.medicalAlerts.length > 0 && (
          <MedicalAlertBanner alerts={patientInfo.medicalAlerts} />
        )}
        <div className="form-header">
          <h2 className="patients-header">Patient Chart: {id}</h2>
        </div>

        {/* VITAL SIGNS */}
        <div className="sections-container">
          <section className="patient-info-card">
            <h3 className="section-title">Patient Info</h3>
            <div className="patient-info-fields">
              <div className="patient-details-box">
              <div className="patient-field">
                <label>Name</label>
                <input value={patientInfo.name} onChange={(e) => setPatientInfo((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="patient-field">
                <label>Age</label>
                <input value={patientInfo.age} onChange={(e) => setPatientInfo((prev) => ({ ...prev, age: e.target.value }))} />
              </div>
              <div className="patient-field">
                <label>Sex</label>
                <input value={patientInfo.sex} onChange={(e) => setPatientInfo((prev) => ({ ...prev, sex: e.target.value }))} />
              </div>
              <div className="patient-field">
                <label>Birthdate</label>
                <input type="date" value={patientInfo.birthday} onChange={(e) => setPatientInfo((prev) => ({ ...prev, birthday: e.target.value }))} />
              </div>
              <div className="patient-field">
                <label>Contact</label>
                <input value={patientInfo.contact} onChange={(e) => setPatientInfo((prev) => ({ ...prev, contact: e.target.value }))} />
              </div>
              <div className="patient-field">
                <label>Address</label>
                <input value={patientInfo.address} onChange={(e) => setPatientInfo((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="patient-field">
                <label>Medical Alerts (comma separated)</label>
                <input value={(patientInfo.medicalAlerts || []).join(', ')} onChange={(e) => setPatientInfo((prev) => ({ ...prev, medicalAlerts: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
              </div>
            </div>
              <div className="patient-field">
                <label>Medical Alerts (comma separated)</label>
                <input value={(patientInfo.medicalAlerts || []).join(', ')} onChange={(e) => setPatientInfo((prev) => ({ ...prev, medicalAlerts: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
              </div>
            </div>
          </section>

          {/* Dentist + Vital signs */}
          <section className="dentist-details-card">
            <div className="dentist-row">
              <div>
                <h3 className="section-title">Dentist</h3>
                <select className="dentist-select">
                  <option>Select a Dentist</option>
                  <option>Dr. Paul Zaragoza</option>
                  <option>Dr. Erica Aquino</option>
                  <option>Dr. Hernane Benedicto</option>
                </select>
              </div>

              <div className="vital-signs">
                <h3 className="section-title">Vital Signs</h3>

                <div className="vital-row">
                  <div className="vital-field">
                    <label>Blood Pressure</label>
                    <input
                      className="pill-input-input"
                      placeholder="120/80"
                      value={vitals.bp}
                      onChange={(e) => updateVitals("bp", e.target.value)}
                    />
                  </div>
                  <div className="vital-field">
                    <label>Pulse Rate</label>
                    <input
                      className="pill-input-input"
                      placeholder="72 bpm"
                      value={vitals.pulse}
                      onChange={(e) =>
                        updateVitals("pulse", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="vital-row">
                  <div className="vital-field">
                    <label>Temperature</label>
                    <input
                      className="pill-input-input"
                      placeholder="36.8 °C"
                      value={vitals.temp}
                      onChange={(e) =>
                        updateVitals("temp", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ORAL HEALTH CONDITION */}
        <section className="oral-section">
          <h3 className="section-title">Oral Health Condition</h3>

          <div className="status-palette">
            {["issue", "planned", "completed"].map((status) => (
              <button
                key={status}
                className={
                  "status-pill" + (activeStatus === status ? " active" : "")
                }
                onClick={() => setActiveStatus(status)}
              >
                <span className={`status-dot ${status}`}></span>
                {status === "issue"
                  ? "Issue (red)"
                  : status === "planned"
                  ? "Planned (blue)"
                  : "Completed (green)"}
              </button>
            ))}
          </div>

          <div className="tooth-chart-container">
            <div className="tooth-inner-panel">
              {/* TOP LAYER: Row 0 = TREATMENT, Row 1 = CONDITION */}
              <div className="tc-group">
                <div className="tc-row-header">
                  Top Layer (Treatment / Condition)
                </div>
                {/* Row 0: Treatment */}
                {renderBoxRow(0)}
                {/* Row 1: Condition */}
                {renderBoxRow(1)}
              </div>

              {/* MIDDLE: Circles (shade only) */}
              <div className="tc-group">
                <div className="tc-row-header">Condition (Circles only)</div>
                {/* upper arch circles, indices 0–25 */}
                {renderCircleGroup(upperConditionRows, 0)}
                {/* lower arch circles, indices 26–51 */}
                {renderCircleGroup(lowerConditionRows, 26)}
              </div>

              {/* BOTTOM LAYER: Row 2 = CONDITION, Row 3 = TREATMENT */}
              <div className="tc-group">
                <div className="tc-row-header">
                  Bottom Layer (Condition / Treatment)
                </div>
                {/* Row 2: Condition */}
                {renderBoxRow(2)}
                {/* Row 3: Treatment */}
                {renderBoxRow(3)}
                <div className="tc-small-hint">
                  Click any box to select a code, or click a circle to shade it.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Treatment timeline */}
        <section className="timeline-section">
          <h3 className="section-title">Treatment Timeline</h3>
          <div className="timeline-form">
            <input
              className="pill-input-input"
              placeholder="Start (e.g. 09:00)"
              value={timelineForm.start}
              onChange={(e) => updateTimelineForm("start", e.target.value)}
            />
            <input
              className="pill-input-input"
              placeholder="End (e.g. 09:30)"
              value={timelineForm.end}
              onChange={(e) => updateTimelineForm("end", e.target.value)}
            />
            <input
              className="pill-input-input"
              placeholder="Updated by"
              value={timelineForm.provider}
              onChange={(e) => updateTimelineForm("provider", e.target.value)}
            />
            <input
              className="pill-input-input"
              placeholder="Procedure"
              value={timelineForm.procedure}
              onChange={(e) => updateTimelineForm("procedure", e.target.value)}
            />
            <input
              className="pill-input-input"
              placeholder="Notes"
              value={timelineForm.notes}
              onChange={(e) => updateTimelineForm("notes", e.target.value)}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                updateTimelineForm("image", e.target.files[0])
              }
            />
            <button className="small-btn" onClick={addTimelineEntry}>
              {editingTimelineIndex !== null ? "Save Changes" : "Add Entry"}
            </button>
          </div>
          <div className="timeline-list">
            {timelineEntries.map((entry, idx) => (
              <div key={idx} className="timeline-entry">
                <div className="timeline-meta">
                  <span>{entry.start} - {entry.end || "..."}</span>
                  <span>{entry.provider || "Unassigned"}</span>
                </div>
                <div>{entry.procedure}</div>
                <div className="timeline-entry-actions">
                  <button className="small-btn" onClick={() => editTimelineEntry(idx)}>Edit</button>
                  <button className="small-btn danger" onClick={() => deleteTimelineEntry(idx)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Medication and prescriptions */}
        <section className="medication-section">
          <h3 className="section-title">Medication & Prescriptions</h3>
          <div className="medication-form">
            <input
              className="pill-input-input"
              placeholder="Medicine"
              value={medicationForm.medicine}
              onChange={(e) => updateMedicationForm("medicine", e.target.value)}
            />
            <input
              className="pill-input-input"
              placeholder="Dosage"
              value={medicationForm.dosage}
              onChange={(e) => updateMedicationForm("dosage", e.target.value)}
            />
            <input
              className="pill-input-input"
              placeholder="Frequency"
              value={medicationForm.frequency}
              onChange={(e) => updateMedicationForm("frequency", e.target.value)}
            />
            <input
              className="pill-input-input"
              placeholder="Notes"
              value={medicationForm.notes}
              onChange={(e) => updateMedicationForm("notes", e.target.value)}
            />
            <div className="medication-actions">
              <button className="small-btn" onClick={addMedication}>
                {editingMedicationIndex !== null ? "Save Changes" : "Add Medication"}
              </button>
              <button className="small-btn secondary" onClick={exportPrescriptions}>
                Export as PDF
              </button>
            </div>
          </div>
          <div className="medication-list">
            {medications.map((m, idx) => (
              <div key={idx} className="medication-entry">
                <strong>{m.medicine}</strong> — {m.dosage || ""} — {m.frequency || ""}
                <div className="muted-text">{m.notes}</div>
                <div className="medication-entry-actions">
                  <button className="small-btn" onClick={() => editMedication(idx)}>Edit</button>
                  <button className="small-btn danger" onClick={() => deleteMedication(idx)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Uploads */}
        <section className="upload-section">
          <h3 className="section-title">X-rays & Images</h3>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
          />
          <div className="thumbnail-grid">
            {uploadedFiles.length === 0 ? (
              <div className="muted-text">No files uploaded yet.</div>
            ) : (
              uploadedFiles.map((file) => (
                <div key={file.url} className="thumbnail-item">
                  <button onClick={() => openXrayViewer(file)}>
                    <img src={file.url} alt={file.name} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Done button */}
        <div className="done-row">
          <div>
            <button className="done-btn" onClick={handleDone}>
              Done
            </button>
            <button
              className="done-btn"
              onClick={async () => {
                if (patient) {
                  try {
                    await api.updatePatient(patient.id, { ...patientInfo, vitals });
                    toast.success("Patient info saved.");
                  } catch (err) {
                    console.error('Failed to save patient info', err);
                    toast.error('Failed to save patient info');
                  }
                }
              }}
              style={{ marginLeft: 8 }}
            >
              Save
            </button>
            <button className="done-btn secondary" onClick={printPatientForm} style={{ marginLeft: 8 }}>
              Print Patient Form
            </button>
          </div>
        </div>

        {/* SIDE PANEL: Treatment / Condition legend */}
        <div
          className={
            "side-panel-backdrop" + (isPanelOpen ? " side-panel-open" : "")
          }
          onClick={closePanel}
        >
          <div
            className="side-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="section-title">{panelTitle}</h3>

            <div className="side-panel-content">
              {panelOptions.length === 0 ? (
                <p>Select a box to see treatment or condition options.</p>
              ) : (
                <div className="options-grid">
                  {panelOptions.map((option) => (
                    <button
                      key={option.code}
                      className="option-pill"
                      onClick={() => applyCode(option.code)}
                    >
                      <strong>{option.code || "Clear"}</strong>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <PatientHistorySidebar />

      {isContextMenuOpen && contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={closeContextMenu}
        >
          <div className="options-grid">
            {(contextMenu.boxKind === "treatment"
              ? treatmentOptions
              : conditionOptions
            ).map((option) => (
              <button
                key={option.code}
                className="option-pill"
                onClick={() => applyCode(option.code)}
              >
                <strong>{option.code || "Clear"}</strong>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isXrayViewerOpen && (
        <XrayViewer file={selectedXray} onClose={closeXrayViewer} />
      )}
    </div>
  );
}

export default PatientForm;