import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "../styles/pages/PatientForm.css";
import PatientHistorySidebar from "../components/PatientHistorySidebar";
import XrayViewer from "../components/XrayViewer";
import MedicalAlertBanner from "../components/MedicalAlertBanner";
import useApi from "../hooks/useApi";
import useAppStore from "../store/useAppStore";
import toast from "react-hot-toast";
import { dentalServices } from "../data/services";

function PatientForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const api = useApi();

  const queue = useAppStore((state) => state.queue);
  const appointments = useAppStore((state) => state.appointments);

  // 1. RETRIEVE PASSED APPOINTMENT DATA (New Booking)
  const linkedAppointment = location.state?.appointment || null;

  // Helper to safely calculate age
  const getDisplayAge = (p) => {
    if (!p) return "N/A";
    if (p.vitals && p.vitals.age) return p.vitals.age;
    if (p.birthdate) {
      const today = new Date();
      const dob = new Date(p.birthdate);
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      return age;
    }
    if (p.age !== undefined && p.age !== null) return p.age;
    return "N/A";
  };

  const mapInitialData = (data) => {
    if (!data) return null;
    return {
      ...data,
      full_name: data.full_name || data.name,
      gender: data.gender || data.sex,
      contact_number: data.contact_number || data.contact,
      medicalAlerts: data.medicalAlerts || [],
      vitals: data.vitals || {},
      xrays: data.xrays || [],
      displayAge: getDisplayAge(data)
    };
  };

  const [patient, setPatient] = useState(mapInitialData(location.state?.patientData) || null);
  const [dentists, setDentists] = useState([]);
  const [selectedDentistId, setSelectedDentistId] = useState(location.state?.dentistId || "");

  // Chart & List States
  const [boxMarks, setBoxMarks] = useState(Array(64).fill(""));
  const [circleShades, setCircleShades] = useState(Array(52).fill(false));
  const [toothStatuses, setToothStatuses] = useState({});
  const [timelineEntries, setTimelineEntries] = useState([]);
  const [medications, setMedications] = useState([]);

  // UI States
  const [selected, setSelected] = useState({ kind: null, index: null, boxKind: null, cellKey: null });
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeStatus, setActiveStatus] = useState("planned");
  const [contextMenu, setContextMenu] = useState(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [selectedXray, setSelectedXray] = useState(null);
  const [isXrayViewerOpen, setIsXrayViewerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form States - Timeline
  const [timelineForm, setTimelineForm] = useState({ start_time: "", end_time: "", provider: "", notes: "", image: null });

  // Multi-Select for Timeline Procedure
  const [selectedTimelineServices, setSelectedTimelineServices] = useState([]);
  const [currentTimelineService, setCurrentTimelineService] = useState("");

  const [medicationForm, setMedicationForm] = useState({ medicine: "", dosage: "", frequency: "", notes: "" });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "" });

  const [tempUnit, setTempUnit] = useState("C");

  // 2. NEW EFFECT: AUTO-FILL FROM APPOINTMENT
  useEffect(() => {
    if (linkedAppointment) {
      // Auto-fill Procedures
      if (linkedAppointment.procedure) {
        const procedures = linkedAppointment.procedure.split(',').map(s => s.trim()).filter(Boolean);
        setSelectedTimelineServices(procedures);
      }

      // Auto-fill Provider
      const providerName = linkedAppointment.dentist_name || linkedAppointment.dentist || "";

      // Auto-fill Start Date & Time
      let formattedStart = "";
      if (linkedAppointment.appointment_datetime) {
        const dateObj = new Date(linkedAppointment.appointment_datetime);
        const datePart = dateObj.toLocaleDateString();
        const timePart = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        formattedStart = `${datePart} ${timePart}`;
      } else if (linkedAppointment.timeStart) {
        formattedStart = `${new Date().toLocaleDateString()} ${linkedAppointment.timeStart}`;
      }

      setTimelineForm(prev => ({
        ...prev,
        provider: providerName,
        start_time: formattedStart
      }));
    }
  }, [linkedAppointment]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        const dentistsData = await api.loadDentists();
        setDentists(dentistsData);

        const patientData = await api.getPatientById(id);

        // --- FIX: SEPARATE ALERTS FROM RELATIONSHIP ---
        let alerts = [];
        let relationshipLabel = "";

        if (patientData.medical_alerts) {
          const rawAlerts = typeof patientData.medical_alerts === "string"
            ? patientData.medical_alerts.split(",")
            : patientData.medical_alerts;

          // Filter real alerts
          alerts = rawAlerts.filter(a => !a.trim().startsWith("Relation:"));

          // Find relationship tag
          const relTag = rawAlerts.find(a => a.trim().startsWith("Relation:"));
          if (relTag) {
            relationshipLabel = relTag.replace("Relation:", "").trim();
          }
        }

        const fullPatientData = {
          ...patientData,
          medicalAlerts: alerts,
          relationship: relationshipLabel, // Stored separately for display
          vitals: patientData.vitals || {},
          xrays: patientData.xrays || []
        };

        fullPatientData.displayAge = getDisplayAge(fullPatientData);
        setPatient(fullPatientData);

        if (fullPatientData.xrays && Array.isArray(fullPatientData.xrays)) {
          setUploadedFiles(fullPatientData.xrays);
        }

        // Only load old vitals if we are NOT starting a new appointment.
        if (!linkedAppointment && fullPatientData.vitals) {
          setVitals(prev => ({ ...prev, ...fullPatientData.vitals }));
          if (fullPatientData.vitals.temp && fullPatientData.vitals.temp.includes("F")) {
            setTempUnit("F");
          } else {
            setTempUnit("C");
          }
        }

        // Set Dentist ID
        setSelectedDentistId(prevId => {
          if (prevId) return prevId;
          if (!linkedAppointment && fullPatientData.vitals?.dentist_id) return fullPatientData.vitals.dentist_id;
          if (linkedAppointment?.dentist_id) return linkedAppointment.dentist_id;
          return "";
        });

        // Load Persistent Tooth Chart
        const conditions = await api.getToothConditions(id);
        const newBoxMarks = Array(64).fill("");
        const newCircleShades = Array(52).fill(false);
        const newToothStatuses = {};

        conditions.forEach(c => {
          const [type, indexStr] = c.cell_key.split("-");
          const index = parseInt(indexStr, 10);
          if (!isNaN(index)) {
            if (type === "box") newBoxMarks[index] = c.condition_code || "";
            if (type === "circle") newCircleShades[index] = Boolean(c.is_shaded);
            newToothStatuses[c.cell_key] = c.status;
          }
        });

        setBoxMarks(newBoxMarks);
        setCircleShades(newCircleShades);
        setToothStatuses(newToothStatuses);

        // Load History Lists
        const timeline = await api.getTreatmentTimeline(id);
        setTimelineEntries(timeline);

        const meds = await api.getMedications(id);
        setMedications(meds);

      } catch (err) {
        console.error("Failed to load patient data", err);
      }
    };

    loadData();
  }, [id, linkedAppointment]);

  const updateVitals = (field, value) => setVitals(prev => ({ ...prev, [field]: value }));

  const handleTempNumberChange = (val) => {
    updateVitals("temp", val ? `${val} °${tempUnit}` : "");
  };

  const handleUnitToggle = (newUnit) => {
    const currentValStr = vitals.temp || "";
    const match = currentValStr.match(/[\d.]+/);

    if (!match) {
      setTempUnit(newUnit);
      return;
    }

    let val = parseFloat(match[0]);
    if (isNaN(val)) {
      setTempUnit(newUnit);
      return;
    }

    if (tempUnit === "C" && newUnit === "F") {
      val = (val * 9 / 5) + 32;
    } else if (tempUnit === "F" && newUnit === "C") {
      val = (val - 32) * 5 / 9;
    }

    val = Math.round(val * 10) / 10;

    setTempUnit(newUnit);
    updateVitals("temp", `${val} °${newUnit}`);
  };

  const getTempNumericValue = () => {
    const match = (vitals.temp || "").toString().match(/[\d.]+/);
    return match ? match[0] : "";
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleTimelineImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const base64 = await convertToBase64(file);
      setTimelineForm(prev => ({ ...prev, image: base64 }));
      toast.success("Image attached to timeline entry");
    } catch (e) {
      toast.error("Failed to process image");
    }
  };

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    const newFiles = [];

    for (const file of files) {
      try {
        const base64 = await convertToBase64(file);
        newFiles.push({
          name: file.name,
          url: base64,
        });
      } catch (e) {
        console.error("Error converting file:", file.name, e);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleSaveAll = async () => {
    if (!patient) return;
    setIsSaving(true);
    try {
      const payload = {
        ...patient,
        vitals: {
          ...vitals,
          dentist_id: selectedDentistId
        },
        xrays: uploadedFiles,
        contact_number: patient.contact_number,
        contact: patient.contact_number
      };

      await api.updatePatient(patient.id, payload);
      toast.success("Patient details, vitals, and images saved!");
    } catch (error) {
      console.error("Error saving patient:", error);
      if (error.message && error.message.includes("413")) {
        toast.error("Error: Images are too large. Please upload smaller images.");
      } else {
        toast.error("Failed to save changes.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDone = async () => {
    if (!patient) return;
    await handleSaveAll();

    try {
      const queueItem = queue.find(q => String(q.patient_id) === String(id) && q.status !== "Done");
      if (queueItem) {
        await api.updateQueue(queueItem.id, { status: "Done" });
        toast.success("Visit marked as Done");
      }

      const appointment = appointments.find(a => String(a.patient_id) === String(id) && a.status !== "Done");
      if (appointment) {
        await api.updateAppointment(appointment.id, { status: "Done" });
      }

    } catch (error) {
      console.error("Error closing visit:", error);
      toast.error("Saved patient, but failed to update status to Done.");
    }

    navigate("/app/queue");
  };

  const setCellStatus = (cellKey) => {
    if (!cellKey) return;
    const newStatus = { ...toothStatuses, [cellKey]: activeStatus };
    setToothStatuses(newStatus);
    const [type, indexStr] = cellKey.split("-");
    const index = parseInt(indexStr, 10);
    api.upsertToothCondition({
      patient_id: id,
      cell_key: cellKey,
      condition_code: type === 'box' ? boxMarks[index] : null,
      status: activeStatus,
      is_shaded: type === 'circle' ? circleShades[index] : false,
    });
  };

  const updateTimelineForm = (field, value) => setTimelineForm((prev) => ({ ...prev, [field]: value }));

  const handleAddTimelineService = () => {
    if (!currentTimelineService) return;
    if (selectedTimelineServices.includes(currentTimelineService)) return;
    setSelectedTimelineServices([...selectedTimelineServices, currentTimelineService]);
    setCurrentTimelineService("");
  };

  const handleRemoveTimelineService = (svc) => {
    setSelectedTimelineServices(selectedTimelineServices.filter(s => s !== svc));
  };

  const addTimelineEntry = async () => {
    if (selectedTimelineServices.length === 0) {
      toast.error("Please add at least one procedure.");
      return;
    }

    let providerName = timelineForm.provider;
    if (!providerName && selectedDentistId) {
      const d = dentists.find(dentist => dentist.id === Number(selectedDentistId));
      if (d) providerName = d.name;
    }

    const procedureString = selectedTimelineServices.join(", ");

    const payload = {
      ...timelineForm,
      procedure_text: procedureString,
      patient_id: id,
      provider: providerName,
      start_time: timelineForm.start_time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image_url: timelineForm.image
    };

    try {
      const newEntry = await api.addTreatmentTimelineEntry(payload);
      setTimelineEntries(prev => [...prev, newEntry]);
      setTimelineForm({ start_time: "", end_time: "", provider: "", notes: "", image: null });
      setSelectedTimelineServices([]);
      document.getElementById("timeline-file-input").value = "";
    } catch (error) {
      console.error("Failed to add timeline entry", error);
      toast.error("Failed to add timeline entry. Image might be too large.");
    }
  };

  const deleteTimelineEntry = async (entryId) => {
    try { await api.deleteTreatmentTimelineEntry(entryId); setTimelineEntries(prev => prev.filter(entry => entry.id !== entryId)); } catch (error) { console.error("Failed to delete timeline entry", error); }
  };
  const updateMedicationForm = (field, value) => setMedicationForm((prev) => ({ ...prev, [field]: value }));
  const addMedication = async () => {
    if (!medicationForm.medicine) return;
    try { const newMed = await api.addMedication({ patient_id: id, ...medicationForm }); setMedications(prev => [...prev, newMed]); setMedicationForm({ medicine: "", dosage: "", frequency: "", notes: "" }); } catch (error) { console.error("Failed to add medication", error); }
  };
  const deleteMedication = async (medId) => {
    try { await api.deleteMedication(medId); setMedications(prev => prev.filter(m => m.id !== medId)); } catch (error) { console.error("Failed to delete medication", error); }
  };

  const getBoxKind = (idx) => {
    const row = Math.floor(idx / 16);
    if (row === 0 || row === 3) return "treatment";
    return "condition";
  };
  const handleBoxClick = (idx) => {
    const boxKind = getBoxKind(idx);
    setSelected({ kind: "box", index: idx, boxKind, cellKey: `box-${idx}` });
    setIsPanelOpen(true);
  };
  const toggleCircleShade = (idx) => {
    const cellKey = `circle-${idx}`;
    const newCircleShades = circleShades.map((v, i) => (i === idx ? !v : v));
    setCircleShades(newCircleShades);
    const [type, indexStr] = cellKey.split("-");
    const index = parseInt(indexStr, 10);
    api.upsertToothCondition({
      patient_id: id,
      cell_key: cellKey,
      condition_code: null,
      status: activeStatus,
      is_shaded: !circleShades[index],
    });
  };
  const closePanel = () => { setIsPanelOpen(false); setSelected({ kind: null, index: null, boxKind: null, cellKey: null }); };
  const handleContextMenu = (e, cellKey, boxKind) => { e.preventDefault(); setContextMenu({ x: e.pageX, y: e.pageY, cellKey, boxKind }); setIsContextMenuOpen(true); };
  const closeContextMenu = () => { setIsContextMenuOpen(false); setContextMenu(null); };
  const openXrayViewer = (file) => { setSelectedXray(file); setIsXrayViewerOpen(true); };
  const closeXrayViewer = () => { setSelectedXray(null); setIsXrayViewerOpen(false); };

  const applyCode = (code) => {
    if (selected.kind === "box" && selected.index != null) {
      const newBoxMarks = boxMarks.map((v, i) => (i === selected.index ? code : v));
      setBoxMarks(newBoxMarks);
      api.upsertToothCondition({
        patient_id: id,
        cell_key: selected.cellKey,
        condition_code: code,
        status: activeStatus,
        is_shaded: false,
      });
      setCellStatus(selected.cellKey);
    }
    closePanel();
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
            <button key={idx} className={`tc-box-cell${mark ? " tc-has-mark" : ""}${isSelected ? " tc-selected" : ""}${statusClass}`} onClick={() => handleBoxClick(idx)} onContextMenu={(e) => handleContextMenu(e, cellKey, getBoxKind(idx))} onDoubleClick={() => { setSelected({ kind: "box", index: idx, boxKind: getBoxKind(idx), cellKey }); applyCode("D"); }}>{mark}</button>
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
            <button key={num} className={`tc-circle-unit${shaded ? " tc-has-mark" : ""}${statusClass}`} onClick={() => toggleCircleShade(idx)} onContextMenu={(e) => handleContextMenu(e, cellKey, "condition")} onDoubleClick={() => { toggleCircleShade(idx); }}><div className="tc-circle"></div><span className="tc-number">{num}</span></button>
          );
        })}
      </div>
    ));
  };

  // FULL OPTIONS LISTS (Restored)
  const treatmentOptions = [
    { code: "FV", label: "Fluoride Varnish" },
    { code: "FG", label: "Fluoride Gel" },
    { code: "PFS", label: "Pit and Fissure Sealant" },
    { code: "PF", label: "Permanent Filling" },
    { code: "TF", label: "Temporary Filling" },
    { code: "X", label: "Extraction" },
    { code: "O", label: "Others" },
    { code: "", label: "Clear (no mark)" }
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
    { code: "", label: "Clear (no mark)" }
  ];

  const upperConditionRows = [["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"], ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"]];
  const lowerConditionRows = [["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"], ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"]];

  const panelTitle = selected.boxKind === "treatment" ? "Treatment" : selected.boxKind === "condition" ? "Condition" : "Legend";

  const panelOptions = selected.boxKind === "treatment" ? treatmentOptions : selected.boxKind === "condition" ? conditionOptions : [];

  if (!patient) return <div>Loading...</div>;

  return (
    <div className="patient-form-layout">
      <div className="content-card patient-form-card">
        <MedicalAlertBanner alerts={patient.medicalAlerts || []} />

        <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="patients-header">Patient Chart: {patient.full_name}</h2>
        </div>

        <div className="sections-container">
          <section className="patient-info-card">
            <h3 className="section-title">Patient Info</h3>
            <div className="patient-info-fields">
              <p><strong>Name:</strong> {patient.full_name}</p>
              <p><strong>Age:</strong> {patient.displayAge}</p>
              <p><strong>Sex:</strong> {patient.gender}</p>
              <p><strong>#Number:</strong> {patient.contact_number}</p>

              {/* NEW: Relationship Label */}
              {patient.relationship && (
                <p><strong>Relationship:</strong> <span style={{ color: '#007bff', fontWeight: 'bold' }}>{patient.relationship}</span></p>
              )}
            </div>
          </section>

          <section className="dentist-details-card">
            <div className="dentist-row">
              <div>
                <h3 className="section-title">Dentist</h3>
                <select className="dentist-select" value={selectedDentistId} onChange={(e) => setSelectedDentistId(e.target.value)}>
                  <option value="">Select a Dentist</option>
                  {dentists.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>
              <div className="vital-signs">
                <h3 className="section-title">Vital Signs</h3>
                <div className="vital-row">
                  <div className="vital-field"><label>Blood Pressure</label><input className="pill-input-input" placeholder="120/80" value={vitals.bp || ""} onChange={(e) => updateVitals("bp", e.target.value)} /></div>
                  <div className="vital-field"><label>Pulse Rate</label><input className="pill-input-input" placeholder="72 bpm" value={vitals.pulse || ""} onChange={(e) => updateVitals("pulse", e.target.value)} /></div>
                </div>

                <div className="vital-row">
                  <div className="vital-field">
                    <label>Temperature</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        step="0.1"
                        className="pill-input-input"
                        placeholder="36.5"
                        value={getTempNumericValue()}
                        onChange={(e) => handleTempNumberChange(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <select
                        className="pill-input-input"
                        style={{ width: '70px', textAlign: 'center' }}
                        value={tempUnit}
                        onChange={(e) => handleUnitToggle(e.target.value)}
                      >
                        <option value="C">°C</option>
                        <option value="F">°F</option>
                      </select>
                    </div>
                  </div>
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

          {/* MULTI-SELECT TIMELINE ENTRY */}
          <div className="timeline-form">
            <input className="pill-input-input" placeholder="Start Date & Time" value={timelineForm.start_time} onChange={(e) => updateTimelineForm("start_time", e.target.value)} />
            <input className="pill-input-input" placeholder="Provider" value={timelineForm.provider} onChange={(e) => updateTimelineForm("provider", e.target.value)} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  className="pill-input-input"
                  value={currentTimelineService}
                  onChange={(e) => setCurrentTimelineService(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">Select Procedure...</option>
                  {dentalServices.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={handleAddTimelineService} className="small-btn" style={{ width: 'auto' }}>+ Add</button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {selectedTimelineServices.map(svc => (
                  <span key={svc} style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    {svc}
                    <button onClick={() => handleRemoveTimelineService(svc)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 'bold' }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <input className="pill-input-input" placeholder="Notes" value={timelineForm.notes} onChange={(e) => updateTimelineForm("notes", e.target.value)} />

            {/* ATTACH X-RAY */}
            <div style={{ gridColumn: '1 / -1', marginTop: '8px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>
                Attach X-ray/Image for Mobile App
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="file"
                  id="timeline-file-input"
                  accept="image/*"
                  onChange={handleTimelineImageUpload}
                  style={{ fontSize: '13px' }}
                />
                {timelineForm.image && (
                  <span style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                    ✓ Image Attached
                  </span>
                )}
              </div>
            </div>

            <button className="small-btn" onClick={addTimelineEntry}>Add Entry</button>
          </div>

          <div className="timeline-list">
            {timelineEntries.map((entry) => (
              <div key={entry.id} className="timeline-entry">
                <div className="timeline-meta"><span>{entry.start_time}</span><span>{entry.provider || "Unassigned"}</span></div>
                <div>{entry.procedure_text}</div>
                {entry.image_url && <div style={{ fontSize: '12px', color: '#0ea5e9', marginTop: '4px' }}>📎 Has attached image</div>}
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
          <h3 className="section-title">Patient X-ray Gallery</h3>
          <p className="muted-text" style={{ fontSize: '13px', marginBottom: '8px' }}>
            Images uploaded here are stored in the patient's general gallery. To show an image in the mobile app's records, use the uploader inside "Treatment Timeline" above.
          </p>
          <input type="file" multiple accept="image/*" onChange={handleUpload} />
          <div className="thumbnail-grid">
            {uploadedFiles.length === 0 ? <div className="muted-text">No files uploaded yet.</div> : uploadedFiles.map((file, index) => (
              <div key={index} className="thumbnail-item"><button onClick={() => openXrayViewer(file)}><img src={file.url} alt={file.name} /></button></div>
            ))}
          </div>
        </section>

        <div className="form-actions-bottom" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e9ecef', paddingTop: '1rem' }}>
          <button className="done-btn secondary" onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button className="done-btn" onClick={handleDone} disabled={isSaving}>
            {isSaving ? "Saving..." : "Done"}
          </button>
        </div>

        <div className={`side-panel-backdrop${isPanelOpen ? " side-panel-open" : ""}`} onClick={closePanel}>
          <div className="side-panel" onClick={(e) => e.stopPropagation()}>
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