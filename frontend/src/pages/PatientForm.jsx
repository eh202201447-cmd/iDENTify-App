import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/pages/PatientForm.css";
import PatientHistorySidebar from "../components/PatientHistorySidebar";
import XrayViewer from "../components/XrayViewer";
import MedicalAlertBanner from "../components/MedicalAlertBanner";
import useApi from "../hooks/useApi";

function PatientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const api = useApi();
  const [patient, setPatient] = useState(null);

  const [boxMarks, setBoxMarks] = useState(Array(64).fill(""));
  const [circleShades, setCircleShades] = useState(Array(52).fill(false));
  const [toothStatuses, setToothStatuses] = useState({});
  const [timelineEntries, setTimelineEntries] = useState([]);
  const [medications, setMedications] = useState([]);

  const [selected, setSelected] = useState({ kind: null, index: null, boxKind: null, cellKey: null });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState("planned");
  const [contextMenu, setContextMenu] = useState(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [selectedXray, setSelectedXray] = useState(null);
  const [isXrayViewerOpen, setIsXrayViewerOpen] = useState(false);
  const [editingTimelineIndex, setEditingTimelineIndex] = useState(null);
  const [timelineForm, setTimelineForm] = useState({ start_time: "", end_time: "", provider: "", procedure_text: "", notes: "" });
  const [editingMedicationIndex, setEditingMedicationIndex] = useState(null);
  const [medicationForm, setMedicationForm] = useState({ medicine: "", dosage: "", frequency: "", notes: "" });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "" });

  const loadData = useCallback(async () => {
    if (id) {
      try {
        console.log("Patient ID:", id);
        const patientData = await api.getPatientById(id);
        console.log("Patient Data:", patientData);
        setPatient(patientData);

        const conditions = await api.getToothConditions(id);
        const newBoxMarks = Array(64).fill("");
        const newCircleShades = Array(52).fill(false);
        const newToothStatuses = {};
        conditions.forEach(c => {
          const [type, indexStr] = c.cell_key.split("-");
          const index = parseInt(indexStr, 10);
          if (type === 'box') newBoxMarks[index] = c.condition_code;
          if (type === 'circle') newCircleShades[index] = c.is_shaded;
          newToothStatuses[c.cell_key] = c.status;
        });
        setBoxMarks(newBoxMarks);
        setCircleShades(newCircleShades);
        setToothStatuses(newToothStatuses);

        const timeline = await api.getTreatmentTimeline(id);
        setTimelineEntries(timeline);

        const meds = await api.getMedications(id);
        setMedications(meds);

      } catch (err) {
        console.error("Failed to load patient data", err);
      }
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateVitals = (field, value) => setVitals(prev => ({ ...prev, [field]: value }));

  const setCellStatus = (cellKey) => {
    if (!cellKey) return;
    const newStatus = { ...toothStatuses, [cellKey]: activeStatus };
    setToothStatuses(newStatus);
    const [type, indexStr] = cellKey.split("-");
    const index = parseInt(indexStr, 10);
    api.upsertToothCondition({
      patient_id: id,
      cell_key: cellKey,
      condition_code: type === 'box' ? boxMarks[index] : '',
      status: activeStatus,
      is_shaded: type === 'circle' ? circleShades[index] : false,
    });
  };

  const updateTimelineForm = (field, value) => {
    setTimelineForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTimelineEntry = async () => {
    if (!timelineForm.procedure_text) return;
    const payload = { ...timelineForm, patient_id: id };
    if (!payload.start_time) {
      payload.start_time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const newEntry = await api.addTreatmentTimelineEntry(payload);
    setTimelineEntries(prev => [...prev, newEntry]);
    setTimelineForm({ start_time: "", end_time: "", provider: "", procedure_text: "", notes: "" });
  };

  const deleteTimelineEntry = async (entryId) => {
    await api.deleteTreatmentTimelineEntry(entryId);
    setTimelineEntries(prev => prev.filter(entry => entry.id !== entryId));
  };
  
  const updateMedicationForm = (field, value) => {
    setMedicationForm((prev) => ({ ...prev, [field]: value }));
  };

  const addMedication = async () => {
    if (!medicationForm.medicine) return;
    const newMed = await api.addMedication({ patient_id: id, ...medicationForm });
    setMedications(prev => [...prev, newMed]);
    setMedicationForm({ medicine: "", dosage: "", frequency: "", notes: "" });
  };

  const deleteMedication = async (medId) => {
    await api.deleteMedication(medId);
    setMedications(prev => prev.filter(m => m.id !== medId));
  };

  const handleUpload = (event) => {
    const files = Array.from(event.target.files || []);
    const mapped = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setUploadedFiles((prev) => [...prev, ...mapped]);
  };
  
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

  const upperConditionRows = [
    ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"],
    ["18", "17", "16", "15", "14", "13", "12", "11","21", "22", "23", "24", "25", "26", "27", "28"],
  ];

  const lowerConditionRows = [
    ["48", "47", "46", "45", "44", "43", "42", "41","31", "32", "33", "34", "35", "36", "37", "38"],
    ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"],
  ];
  
  const getBoxKind = (idx) => {
    const row = Math.floor(idx / 16);
    if (row === 0 || row === 3) return "treatment";
    return "condition";
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
    const newCircleShades = circleShades.map((v, i) => (i === idx ? !v : v));
    setCircleShades(newCircleShades);
    setCellStatus(cellKey);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    setSelected({ kind: null, index: null, boxKind: null, cellKey: null });
  };
  
  const handleContextMenu = (e, cellKey, boxKind) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, cellKey, boxKind });
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
      const newBoxMarks = boxMarks.map((v, i) => (i === selected.index ? code : v));
      setBoxMarks(newBoxMarks);
      setCellStatus(selected.cellKey);
    }
    closePanel();
  };

  const handleDone = () => {
    navigate("/app/queue");
  };

  const renderBoxRow = (rowIndex) => {
    const start = rowIndex * 16;
    return (
      <div className="tc-box-row">
        {Array.from({ length: 16 }).map((_, i) => {
          const idx = start + i;
          const mark = boxMarks[idx];
          const isSelected = selected.kind === "box" && selected.index === idx;
          const cellKey = `box-${idx}`;
          const statusClass = toothStatuses[cellKey] ? ` tc-status-${toothStatuses[cellKey]}` : "";
          return (
            <button
              key={idx}
              className={`tc-box-cell${mark ? " tc-has-mark" : ""}${isSelected ? " tc-selected" : ""}${statusClass}`}
              onClick={() => handleBoxClick(idx)}
              onContextMenu={(e) => handleContextMenu(e, cellKey, getBoxKind(idx))}
              onDoubleClick={() => {
                setSelected({ kind: "box", index: idx, boxKind: getBoxKind(idx), cellKey });
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

  const renderCircleGroup = (rows, startIndex) => {
    let runningIndex = startIndex;
    return rows.map((rowNumbers, rowIdx) => (
      <div className="tc-circle-row" key={rowIdx}>
        {rowNumbers.map((num) => {
          const idx = runningIndex;
          runningIndex += 1;
          const shaded = circleShades[idx];
          const cellKey = `circle-${idx}`;
          const statusClass = toothStatuses[cellKey] ? ` tc-status-${toothStatuses[cellKey]}` : "";
          return (
            <button
              key={num}
              className={`tc-circle-unit${shaded ? " tc-has-mark" : ""}${statusClass}`}
              onClick={() => toggleCircleShade(idx)}
              onContextMenu={(e) => handleContextMenu(e, cellKey, "condition")}
              onDoubleClick={() => {
                toggleCircleShade(idx);
                applyCode("D");
              }}
            >
              <div className="tc-circle"></div>
              <span className="tc-number">{num}</span>
            </button>
          );
        })}
      </div>
    ));
  };
  
  const panelTitle = selected.boxKind === "treatment" ? "Treatment" : selected.boxKind === "condition" ? "Condition" : "Legend";
  const panelOptions = selected.boxKind === "treatment" ? treatmentOptions : selected.boxKind === "condition" ? conditionOptions : [];

  if (!patient) return <div>Loading...</div>;

  return (
    <div className="patient-form-layout">
      <div className="content-card patient-form-card">
        <MedicalAlertBanner alerts={patient.medicalAlerts || []} />
        <div className="form-header">
          <h2 className="patients-header">Patient Chart: {patient.full_name}</h2>
        </div>

        <div className="sections-container">
          <section className="patient-info-card">
            <h3 className="section-title">Patient Info</h3>
            <div className="patient-info-fields">
              <p><strong>Name:</strong> {patient.full_name}</p>
              <p><strong>Age:</strong> {patient.age || 'N/A'}</p>
              <p><strong>Sex:</strong> {patient.gender}</p>
              <p><strong>Birthdate:</strong> {patient.birthdate ? new Date(patient.birthdate).toLocaleDateString() : 'N/A'}</p>
              <p><strong>#Number:</strong> {patient.contact_number}</p>
              <p><strong>Address:</strong> {patient.address}</p>
            </div>
          </section>

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
                  <div className="vital-field"><label>Blood Pressure</label><input className="pill-input-input" placeholder="120/80" value={vitals.bp} onChange={(e) => updateVitals("bp", e.target.value)} /></div>
                  <div className="vital-field"><label>Pulse Rate</label><input className="pill-input-input" placeholder="72 bpm" value={vitals.pulse} onChange={(e) => updateVitals("pulse", e.target.value)} /></div>
                </div>
                <div className="vital-row">
                  <div className="vital-field"><label>Temperature</label><input className="pill-input-input" placeholder="36.8 °C" value={vitals.temp} onChange={(e) => updateVitals("temp", e.target.value)} /></div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="oral-section">
          <h3 className="section-title">Oral Health Condition</h3>
          <div className="status-palette">{["issue", "planned", "completed"].map((status) => (<button key={status} className={`status-pill${activeStatus === status ? " active" : ""}`} onClick={() => setActiveStatus(status)}><span className={`status-dot ${status}`}></span>{status === "issue" ? "Issue (red)" : status === "planned" ? "Planned (blue)" : "Completed (green)"}</button>))}</div>
          <div className="tooth-chart-container"><div className="tooth-inner-panel"><div className="tc-group"><div className="tc-row-header">Top Layer (Treatment / Condition)</div>{renderBoxRow(0)}{renderBoxRow(1)}</div><div className="tc-group"><div className="tc-row-header">Condition (Circles only)</div>{renderCircleGroup(upperConditionRows, 0)}{renderCircleGroup(lowerConditionRows, 26)}</div><div className="tc-group"><div className="tc-row-header">Bottom Layer (Condition / Treatment)</div>{renderBoxRow(2)}{renderBoxRow(3)}<div className="tc-small-hint">Click any box to select a code, or click a circle to shade it.</div></div></div></div>
        </section>

        <section className="timeline-section">
          <h3 className="section-title">Treatment Timeline</h3>
          <div className="timeline-form">
            <input className="pill-input-input" placeholder="Start (e.g. 09:00)" value={timelineForm.start_time} onChange={(e) => updateTimelineForm("start_time", e.target.value)} />
            <input className="pill-input-input" placeholder="End (e.g. 09:30)" value={timelineForm.end_time} onChange={(e) => updateTimelineForm("end_time", e.target.value)} />
            <input className="pill-input-input" placeholder="Updated by" value={timelineForm.provider} onChange={(e) => updateTimelineForm("provider", e.target.value)} />
            <input className="pill-input-input" placeholder="Procedure" value={timelineForm.procedure_text} onChange={(e) => updateTimelineForm("procedure_text", e.target.value)} />
            <input className="pill-input-input" placeholder="Notes" value={timelineForm.notes} onChange={(e) => updateTimelineForm("notes", e.target.value)} />
            <button className="small-btn" onClick={addTimelineEntry}>Add Entry</button>
          </div>
          <div className="timeline-list">
            {timelineEntries.map((entry) => (
              <div key={entry.id} className="timeline-entry">
                <div className="timeline-meta"><span>{entry.start_time} - {entry.end_time || "..."}</span><span>{entry.provider || "Unassigned"}</span></div>
                <div>{entry.procedure_text}</div>
                <div className="timeline-entry-actions"><button className="small-btn danger" onClick={() => deleteTimelineEntry(entry.id)}>Delete</button></div>
              </div>
            ))}
          </div>
        </section>

        <section className="medication-section">
          <h3 className="section-title">Medication & Prescriptions</h3>
          <div className="medication-form">
            <input className="pill-input-input" placeholder="Medicine" value={medicationForm.medicine} onChange={(e) => updateMedicationForm("medicine", e.target.value)} />
            <input className="pill-input-input" placeholder="Dosage" value={medicationForm.dosage} onChange={(e) => updateMedicationForm("dosage", e.target.value)} />
            <input className="pill-input-input" placeholder="Frequency" value={medicationForm.frequency} onChange={(e) => updateMedicationForm("frequency", e.target.value)} />
            <input className="pill-input-input" placeholder="Notes" value={medicationForm.notes} onChange={(e) => updateMedicationForm("notes", e.target.value)} />
            <div className="medication-actions">
              <button className="small-btn" onClick={addMedication}>Add Medication</button>
            </div>
          </div>
          <div className="medication-list">
            {medications.map((m) => (
              <div key={m.id} className="medication-entry">
                <strong>{m.medicine}</strong> — {m.dosage || ""} — {m.frequency || ""}
                <div className="muted-text">{m.notes}</div>
                <div className="medication-entry-actions"><button className="small-btn danger" onClick={() => deleteMedication(m.id)}>Delete</button></div>
              </div>
            ))}
          </div>
        </section>

        <section className="upload-section">
          <h3 className="section-title">X-rays & Images</h3>
          <input type="file" multiple accept="image/*" onChange={handleUpload} />
          <div className="thumbnail-grid">
            {uploadedFiles.length === 0 ? <div className="muted-text">No files uploaded yet.</div> : uploadedFiles.map((file) => (<div key={file.url} className="thumbnail-item"><button onClick={() => openXrayViewer(file)}><img src={file.url} alt={file.name} /></button></div>))}
          </div>
        </section>

        <div className="done-row"><button className="done-btn" onClick={handleDone}>Done</button></div>

        <div className={`side-panel-backdrop${isPanelOpen ? " side-panel-open" : ""}`} onClick={closePanel}>
          <div className="side-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="section-title">{panelTitle}</h3>
            <div className="side-panel-content">{panelOptions.length === 0 ? <p>Select a box to see treatment or condition options.</p> : <div className="options-grid">{panelOptions.map((option) => (<button key={option.code} className="option-pill" onClick={() => applyCode(option.code)}><strong>{option.code || "Clear"}</strong><span>{option.label}</span></button>))}</div>}</div>
          </div>
        </div>
      </div>
      <PatientHistorySidebar patient={patient} />

      {isContextMenuOpen && contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={closeContextMenu}>
          <div className="options-grid">{(contextMenu.boxKind === "treatment" ? treatmentOptions : conditionOptions).map((option) => (<button key={option.code} className="option-pill" onClick={() => applyCode(option.code)}><strong>{option.code || "Clear"}</strong><span>{option.label}</span></button>))}</div>
        </div>
      )}

      {isXrayViewerOpen && <XrayViewer file={selectedXray} onClose={closeXrayViewer} />}
    </div>
  );
}

export default PatientForm;