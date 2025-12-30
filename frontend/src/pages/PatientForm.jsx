import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import "../styles/pages/PatientForm.css";
import PatientHistorySidebar from "../components/PatientHistorySidebar";
import XrayViewer from "../components/XrayViewer";
import MedicalAlertBanner from "../components/MedicalAlertBanner";
import useApi from "../hooks/useApi";
import useAppStore from "../store/useAppStore";
import toast from "react-hot-toast";
import { dentalServices } from "../data/services";

// --- CONSTANTS: COMMON MEDICINES ---
const COMMON_MEDICINES = [
	"Amoxicillin 500mg",
	"Amoxicillin 250mg",
	"Mefenamic Acid 500mg",
	"Paracetamol 500mg",
	"Ibuprofen 400mg",
	"Tranexamic Acid 500mg",
	"Erythromycin 500mg",
	"Clindamycin 300mg",
	"Co-Amoxiclav 625mg",
	"Celecoxib 200mg",
	"Keterolac 10mg",
	"Chlorhexidine Mouthwash",
	"Benzydamine Hcl (Difflam)"
];

// --- COMPONENT: SEARCHABLE INPUT ---
const SearchableInput = ({ options, value, onChange, placeholder, disabled, renderOption }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [search, setSearch] = useState(value || "");
	const wrapperRef = useRef(null);

	useEffect(() => {
		setSearch(value || "");
	}, [value]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleSelect = (item) => {
		const val = typeof item === 'object' ? item.name : item;
		setSearch(val);
		onChange(val);
		setIsOpen(false);
	};

	const handleChange = (e) => {
		const val = e.target.value;
		setSearch(val);
		onChange(val);
		setIsOpen(true);
	};

	const filteredOptions = options.filter(item => {
		const text = typeof item === 'object' ? item.name : item;
		return text.toLowerCase().includes(search.toLowerCase());
	});

	return (
		<div className="searchable-input-wrapper" ref={wrapperRef}>
			<input
				className="pill-input-input"
				value={search}
				onChange={handleChange}
				onFocus={() => setIsOpen(true)}
				placeholder={placeholder}
				disabled={disabled}
			/>
			{isOpen && filteredOptions.length > 0 && (
				<ul className="searchable-input-dropdown">
					{filteredOptions.map((item, index) => (
						<li key={index} onClick={() => handleSelect(item)}>
							{renderOption ? renderOption(item) : item}
						</li>
					))}
				</ul>
			)}
		</div>
	);
};

// --- COMPONENT: 5-SURFACE TOOTH (SVG) ---
const Tooth5Surface = ({ toothNumber, segments, onSegmentClick }) => {
	const getColor = (status) => {
		switch (status) {
			case "issue": return "#e03131";
			case "planned": return "#1a4e9c";
			case "completed": return "#2f9e44";
			default: return "transparent";
		}
	};
	const handleClick = (e, part) => {
		e.stopPropagation();
		onSegmentClick(part);
	};
	return (
		<div className="tc-circle-unit">
			<div className="tc-circle-wrapper">
				<svg viewBox="0 0 100 100" className="tc-tooth-svg">
					<path d="M 0,0 L 100,0 L 50,50 Z" fill={getColor(segments?.top)} className="tooth-poly" onClick={(e) => handleClick(e, 'top')} />
					<path d="M 100,0 L 100,100 L 50,50 Z" fill={getColor(segments?.right)} className="tooth-poly" onClick={(e) => handleClick(e, 'right')} />
					<path d="M 100,100 L 0,100 L 50,50 Z" fill={getColor(segments?.bottom)} className="tooth-poly" onClick={(e) => handleClick(e, 'bottom')} />
					<path d="M 0,100 L 0,0 L 50,50 Z" fill={getColor(segments?.left)} className="tooth-poly" onClick={(e) => handleClick(e, 'left')} />
					<circle cx="50" cy="50" r="25" fill={getColor(segments?.center) || "white"} stroke="#000" strokeWidth="2" className="tooth-poly" onClick={(e) => handleClick(e, 'center')} />
				</svg>
			</div>
			<span className="tc-number">{toothNumber}</span>
		</div>
	);
};

function PatientForm() {
	const navigate = useNavigate();
	const { id } = useParams();
	const location = useLocation();
	const api = useApi();

	const queue = useAppStore((state) => state.queue);
	const allAppointments = useAppStore((state) => state.appointments);

	// --- GLOBAL PATIENT STATE ---
	const [patient, setPatient] = useState(null);
	const [dentists, setDentists] = useState([]);
	const [selectedDentistId, setSelectedDentistId] = useState("");

	// --- ANNUAL RECORD STATE ---
	const [yearsList, setYearsList] = useState([1, 2, 3, 4, 5]); // CHANGED: State for dynamic years
	const [selectedYear, setSelectedYear] = useState(1);
	const [isYearDone, setIsYearDone] = useState(false); // Controls Read-Only for the specific year

	// Year-Specific Data
	const [boxMarks, setBoxMarks] = useState(Array(64).fill(""));
	const [toothSegments, setToothSegments] = useState({});
	const [toothStatuses, setToothStatuses] = useState({});
	const [timelineEntries, setTimelineEntries] = useState([]);
	const [medications, setMedications] = useState([]);
	const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "" });
	const [dentalHistory, setDentalHistory] = useState("");
	const [uploadedFiles, setUploadedFiles] = useState([]);

	const [patientAppointments, setPatientAppointments] = useState([]);

	// UI State
	const [selected, setSelected] = useState({ kind: null, index: null, boxKind: null, cellKey: null });
	const [isPanelOpen, setIsPanelOpen] = useState(false);
	const [activeStatus, setActiveStatus] = useState("planned");
	const [contextMenu, setContextMenu] = useState(null);
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const [selectedXray, setSelectedXray] = useState(null);
	const [isXrayViewerOpen, setIsXrayViewerOpen] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	// Medical Alert Input State
	const [alertInput, setAlertInput] = useState("");
	const [tempUnit, setTempUnit] = useState("C");

	// Forms
	const [timelineForm, setTimelineForm] = useState({
		start_time: "",
		end_time: "",
		provider: "",
		notes: "",
		image: null,
	});
	const [selectedTimelineServices, setSelectedTimelineServices] = useState([]);
	const [currentTimelineService, setCurrentTimelineService] = useState("");
	const [medicationForm, setMedicationForm] = useState({ medicine: "", dosage: "", frequency: "", notes: "" });

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

	// NEW: Handler to add a new year dynamically
	const handleAddYear = () => {
		const maxYear = Math.max(...yearsList);
		const newYear = maxYear + 1;
		setYearsList([...yearsList, newYear]);
		setSelectedYear(newYear); // Switch to the new year immediately
		toast.success(`Started Year ${newYear}`);
	};

	// --- 1. INITIAL LOAD (Patient Info & Dentists) ---
	useEffect(() => {
		const loadGlobalData = async () => {
			if (!id) return;
			try {
				const dentistsData = await api.loadDentists();
				setDentists(dentistsData);

				const patientData = await api.getPatientById(id);
				let alerts = [];
				let relationshipLabel = "";

				if (patientData.medical_alerts) {
					const rawAlerts = typeof patientData.medical_alerts === "string"
						? patientData.medical_alerts.split(",")
						: patientData.medical_alerts;

					alerts = rawAlerts.filter(a => !a.trim().startsWith("Relation:"));
					const relTag = rawAlerts.find(a => a.trim().startsWith("Relation:"));
					if (relTag) {
						relationshipLabel = relTag.replace("Relation:", "").trim();
					}
				}

				setPatient({
					...patientData,
					medicalAlerts: alerts,
					relationship: relationshipLabel,
					displayAge: getDisplayAge(patientData)
				});

				// Set initial dentist selection
				const linkedAppt = location.state?.appointment;
				if (linkedAppt?.dentist_id) setSelectedDentistId(linkedAppt.dentist_id);
				else if (patientData.vitals?.dentist_id) setSelectedDentistId(patientData.vitals.dentist_id);

				const patientAppts = allAppointments.filter(a => String(a.patient_id) === String(id));
				setPatientAppointments(patientAppts);

			} catch (err) {
				console.error("Failed to load global data", err);
			}
		};
		loadGlobalData();
	}, [id, allAppointments]);

	// --- 2. LOAD ANNUAL DATA WHEN YEAR CHANGES ---
	useEffect(() => {
		const loadAnnualData = async () => {
			if (!id) return;

			// Reset State for the new year
			setBoxMarks(Array(64).fill(""));
			setToothSegments({});
			setToothStatuses({});
			setTimelineEntries([]);
			setMedications([]);
			setVitals({ bp: "", pulse: "", temp: "" });
			setDentalHistory("");
			setUploadedFiles([]);
			setTempUnit("C"); // Reset temp unit to C by default on new load

			try {
				// A. Load Annual Record Metadata (Vitals, Xrays, Status, History)
				const annualRecord = await api.getAnnualRecord(id, selectedYear);

				if (annualRecord) {
					setVitals(annualRecord.vitals || { bp: "", pulse: "", temp: "" });
					setDentalHistory(annualRecord.dental_history || "");
					setUploadedFiles(annualRecord.xrays || []);
					setIsYearDone(annualRecord.status === "Done");

					if (annualRecord.vitals?.temp && annualRecord.vitals.temp.includes("F")) {
						setTempUnit("F");
					} else {
						setTempUnit("C");
					}
				} else {
					// No record yet for this year
					setIsYearDone(false);
					setTempUnit("C");
				}

				// B. Load Tooth Conditions for Selected Year
				const conditions = await api.getToothConditions(id, selectedYear);
				const newBoxMarks = Array(64).fill("");
				const newToothSegments = {};
				const newToothStatuses = {};

				conditions.forEach(c => {
					const [type, indexStr] = c.cell_key.split("-");
					const index = parseInt(indexStr, 10);
					if (!isNaN(index)) {
						if (type === "box") {
							newBoxMarks[index] = c.condition_code || "";
							newToothStatuses[c.cell_key] = c.status;
						}
						if (type === "circle") {
							if (c.segments) {
								newToothSegments[c.cell_key] = typeof c.segments === 'string' ? JSON.parse(c.segments) : c.segments;
							}
						}
					}
				});

				setBoxMarks(newBoxMarks);
				setToothSegments(newToothSegments);
				setToothStatuses(newToothStatuses);

				// C. Load Timeline for Selected Year
				const timeline = await api.getTreatmentTimeline(id, selectedYear);
				setTimelineEntries(timeline);

				// D. Load Medications for Selected Year
				const meds = await api.getMedications(id, selectedYear);
				setMedications(meds);

				// E. Autofill from Appointment (ONLY FOR YEAR 1 and if empty)
				if (selectedYear === 1) {
					// Only check linked appointment if timeline is empty
					if (timeline.length === 0) {
						const linkedAppointment = location.state?.appointment;

						if (linkedAppointment) {
							if (linkedAppointment.procedure) {
								const procedures = linkedAppointment.procedure.split(',').map(s => s.trim()).filter(Boolean);
								setSelectedTimelineServices(procedures);
							}
							const providerName = linkedAppointment.dentist_name || linkedAppointment.dentist || "";
							let formattedStart = "";

							// Try to format date from appointment
							if (linkedAppointment.appointment_datetime) {
								const dateObj = new Date(linkedAppointment.appointment_datetime);
								formattedStart = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
							} else if (linkedAppointment.timeStart) {
								// **Specific requested logic: Use timeStart + today's date if appt date missing**
								formattedStart = `${new Date().toLocaleDateString()} ${linkedAppointment.timeStart}`;
							} else {
								// Fallback to current time
								formattedStart = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
							}

							setTimelineForm(prev => ({
								...prev,
								provider: providerName,
								start_time: formattedStart
							}));
						}
					}
				} else if (selectedYear > 1) {
					// **RESET LOGIC FOR YEAR 2+**
					// If we switch to Year 2, ensure the form inputs are clean
					setTimelineForm({
						start_time: "",
						end_time: "",
						provider: "",
						notes: "",
						image: null
					});
					setSelectedTimelineServices([]);
				}

			} catch (err) {
				console.error("Failed to load annual data", err);
			}
		};
		loadAnnualData();
	}, [id, selectedYear, location.state]);

	// Shortcut for Read-Only mode
	const isReadOnly = isYearDone;

	// --- RECOMMENDATION LOGIC ---
	const getRecommendations = () => {
		const issues = [];
		boxMarks.forEach((code, idx) => {
			if (!code) return;

			let treatments = [];
			let conditionName = "";

			if (code === 'D') {
				conditionName = "Decayed";
				treatments = ["Dental Filling (Composite)", "Root Canal Therapy", "Tooth Extraction"];
			} else if (code === 'M') {
				conditionName = "Missing";
				treatments = ["Dental Bridge", "Dental Implant", "Dentures (Complete/Partial)"];
			} else if (code === 'UN') {
				conditionName = "Unerupted";
				treatments = ["Surgical Extraction", "X-ray / Radiograph"];
			} else if (code === 'P') {
				conditionName = "Pontic";
				treatments = ["Check Pontic Integrity"];
			} else if (code === 'DX') {
				conditionName = "For Extraction";
				treatments = ["Tooth Extraction", "Surgical Extraction"];
			}

			if (treatments.length > 0) {
				issues.push({
					tooth: `Tooth Area ${idx + 1}`,
					condition: conditionName,
					treatments: treatments
				});
			}
		});

		Object.entries(toothSegments).forEach(([key, segs]) => {
			const hasIssue = Object.values(segs).some(status => status === 'issue');
			if (hasIssue) {
				issues.push({
					tooth: `Tooth (Marked on Chart)`,
					condition: "Visual Issue",
					treatments: ["General Consultation", "X-ray / Radiograph", "Dental Filling (Composite)"]
				});
			}
		});
		return issues.slice(0, 5);
	};
	const recommendations = getRecommendations();

	const handleApplyRecommendation = (treatmentName) => {
		if (isReadOnly) return; // Respect read-only mode
		if (!selectedTimelineServices.includes(treatmentName)) {
			setSelectedTimelineServices([...selectedTimelineServices, treatmentName]);
			toast.success(`Added ${treatmentName} to Plan`);
			const timelineSection = document.querySelector('.timeline-section');
			if (timelineSection) timelineSection.scrollIntoView({ behavior: 'smooth' });
		} else {
			toast.error("Service already in plan");
		}
	};

	// --- HANDLERS ---

	const handleSaveAll = async () => {
		if (!patient) return;
		setIsSaving(true);
		try {
			// 1. Save Patient Global Info (Alerts, Contact)
			let finalAlerts = [...(patient.medicalAlerts || [])];
			if (patient.relationship) {
				finalAlerts.push(`Relation:${patient.relationship}`);
			}

			const patientPayload = {
				...patient,
				medicalAlerts: finalAlerts,
				contact_number: patient.contact_number,
				contact: patient.contact_number
			};
			await api.updatePatient(patient.id, patientPayload);

			// 2. Save Annual Record (Vitals, History, Xrays, Status)
			const annualPayload = {
				patient_id: id,
				record_year: selectedYear,
				vitals: { ...vitals, dentist_id: selectedDentistId },
				dental_history: dentalHistory,
				xrays: uploadedFiles,
				status: isYearDone ? "Done" : "Active"
			};
			await api.saveAnnualRecord(annualPayload);

			toast.success(`Records for Year ${selectedYear} saved!`);
		} catch (error) {
			console.error(error);
			toast.error("Failed to save.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDone = async () => {
		if (!patient) return;
		setIsYearDone(true); // Optimistic UI update
		try {
			await handleSaveAll(); // This will save with status="Done" because isYearDone is now true (or passed explicitly)

			// Explicitly ensure status is saved as Done
			const annualPayload = {
				patient_id: id,
				record_year: selectedYear,
				vitals: { ...vitals, dentist_id: selectedDentistId },
				dental_history: dentalHistory,
				xrays: uploadedFiles,
				status: "Done"
			};
			await api.saveAnnualRecord(annualPayload);

			// If Year 1, also update Queue/Appointment status
			if (selectedYear === 1) {
				const queueItem = queue.find(q => String(q.patient_id) === String(id) && q.status !== "Done");
				if (queueItem) await api.updateQueue(queueItem.id, { status: "Done" });
				const appointment = allAppointments.find(a => String(a.patient_id) === String(id) && a.status !== "Done");
				if (appointment) await api.updateAppointment(appointment.id, { status: "Done" });
			}

			navigate("/app/queue");
			toast.success(`Year ${selectedYear} marked as Completed.`);
		} catch (error) {
			console.error(error);
			setIsYearDone(false); // Revert on error
			toast.error("Error completing visit.");
		}
	};

	const handleSegmentClick = async (cellKey, part) => {
		if (isReadOnly) return;
		const currentSegments = toothSegments[cellKey] || {};
		const newStatus = currentSegments[part] === activeStatus ? null : activeStatus;
		const updatedSegments = { ...currentSegments, [part]: newStatus };
		setToothSegments(prev => ({ ...prev, [cellKey]: updatedSegments }));
		try {
			await api.upsertToothCondition({
				patient_id: id,
				cell_key: cellKey,
				condition_code: null,
				status: "mixed",
				is_shaded: false,
				segments: updatedSegments,
				record_year: selectedYear // Pass Year
			});
		} catch (error) {
			console.error(error);
		}
	};

	const updateVitals = (field, value) => setVitals(prev => ({ ...prev, [field]: value }));

	const handleTempNumberChange = (val) => {
		updateVitals("temp", val ? `${val} °${tempUnit}` : "");
	};

	const handleUnitToggle = (newUnit) => {
		const currentValStr = vitals.temp || "";
		const match = currentValStr.match(/[\d.]+/);
		if (!match) { setTempUnit(newUnit); return; }
		let val = parseFloat(match[0]);
		if (isNaN(val)) { setTempUnit(newUnit); return; }
		if (tempUnit === "C" && newUnit === "F") { val = (val * 9 / 5) + 32; }
		else if (tempUnit === "F" && newUnit === "C") { val = (val - 32) * 5 / 9; }
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
			toast.success("Image attached");
		} catch (e) {
			toast.error("Failed to process image");
		}
	};

	const handleUpload = async (event) => {
		if (isReadOnly) return;
		const files = Array.from(event.target.files || []);
		const newFiles = [];
		for (const file of files) {
			try {
				const base64 = await convertToBase64(file);
				newFiles.push({ name: file.name, url: base64 });
			} catch (e) {
				console.error(e);
			}
		}
		setUploadedFiles((prev) => [...prev, ...newFiles]);
	};

	const handleAddAlert = () => {
		if (!alertInput.trim()) return;
		const currentAlerts = patient.medicalAlerts || [];
		if (currentAlerts.includes(alertInput.trim())) return;

		const updatedAlerts = [...currentAlerts, alertInput.trim()];
		setPatient(prev => ({ ...prev, medicalAlerts: updatedAlerts }));
		setAlertInput("");
	};

	const handleRemoveAlert = (alertToRemove) => {
		const updatedAlerts = patient.medicalAlerts.filter(a => a !== alertToRemove);
		setPatient(prev => ({ ...prev, medicalAlerts: updatedAlerts }));
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
			image_url: timelineForm.image,
			record_year: selectedYear // Pass Year
		};
		try {
			const newEntry = await api.addTreatmentTimelineEntry(payload);
			setTimelineEntries(prev => [...prev, newEntry]);

			setTimelineForm(prev => ({
				...prev,
				notes: "",
				image: null
			}));

			setSelectedTimelineServices([]);
			const fileInput = document.getElementById("timeline-file-input");
			if (fileInput) fileInput.value = "";
		} catch (error) {
			console.error(error);
			toast.error("Failed to add entry");
		}
	};

	const deleteTimelineEntry = async (entryId) => {
		if (isReadOnly) return;
		try { await api.deleteTreatmentTimelineEntry(entryId); setTimelineEntries(prev => prev.filter(entry => entry.id !== entryId)); } catch (error) { console.error(error); }
	};
	const updateMedicationForm = (field, value) => setMedicationForm((prev) => ({ ...prev, [field]: value }));
	const addMedication = async () => {
		if (!medicationForm.medicine) return;
		try {
			const newMed = await api.addMedication({
				patient_id: id,
				...medicationForm,
				record_year: selectedYear // Pass Year
			});
			setMedications(prev => [...prev, newMed]);
			setMedicationForm({ medicine: "", dosage: "", frequency: "", notes: "" });
		} catch (error) { console.error(error); }
	};
	const deleteMedication = async (medId) => {
		if (isReadOnly) return;
		try { await api.deleteMedication(medId); setMedications(prev => prev.filter(m => m.id !== medId)); } catch (error) { console.error(error); }
	};

	const handleBoxClick = (idx) => {
		if (isReadOnly) return;
		const row = Math.floor(idx / 16);
		let boxKind = "condition";
		if (row === 0 || row === 3) boxKind = "treatment";
		setSelected({ kind: "box", index: idx, boxKind, cellKey: `box-${idx}` });
		setIsPanelOpen(true);
	};

	const closePanel = () => { setIsPanelOpen(false); setSelected({ kind: null, index: null, boxKind: null, cellKey: null }); };
	const handleContextMenu = (e, cellKey, boxKind) => { e.preventDefault(); if (isReadOnly) return; setContextMenu({ x: e.pageX, y: e.pageY, cellKey, boxKind }); setIsContextMenuOpen(true); };
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
				record_year: selectedYear // Pass Year
			});
			const newStatus = { ...toothStatuses, [selected.cellKey]: activeStatus };
			setToothStatuses(newStatus);
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
						<button key={idx} className={`tc-box-cell${mark ? " tc-has-mark" : ""}${isSelected ? " tc-selected" : ""}${statusClass}`} onClick={() => handleBoxClick(idx)} onContextMenu={(e) => handleContextMenu(e, cellKey, rowIndex === 0 || rowIndex === 3 ? "treatment" : "condition")} onDoubleClick={() => { if (!isReadOnly) { setSelected({ kind: "box", index: idx, boxKind: "condition", cellKey }); applyCode("D"); } }} disabled={isReadOnly}>{mark}</button>
					);
				})}
			</div>
		);
	};

	const renderCircleGroup = (rows, startIndex) => {
		let runningIndex = startIndex;
		return rows.map((rowNumbers, rowIdx) => {
			const isDeciduous = rowNumbers.length === 10;
			const rowClass = isDeciduous ? "tc-circle-row tc-deciduous-row" : "tc-circle-row";
			return (
				<div className={rowClass} key={rowIdx}>
					{rowNumbers.map((num) => {
						const idx = runningIndex;
						runningIndex += 1;
						const cellKey = `circle-${idx}`;
						const segments = toothSegments[cellKey] || {};
						return <Tooth5Surface key={num} toothNumber={num} segments={segments} onSegmentClick={(part) => handleSegmentClick(cellKey, part)} />;
					})}
				</div>
			)
		});
	};

	const treatmentOptions = [{ code: "FV", label: "Fluoride Varnish" }, { code: "FG", label: "Fluoride Gel" }, { code: "PFS", label: "Pit and Fissure Sealant" }, { code: "PF", label: "Permanent Filling" }, { code: "TF", label: "Temporary Filling" }, { code: "X", label: "Extraction" }, { code: "O", label: "Others" }, { code: "", label: "Clear" }];
	const conditionOptions = [{ code: "S", label: "Sealed" }, { code: "UN", label: "Unerupted" }, { code: "D", label: "Decayed" }, { code: "F", label: "Filled" }, { code: "M", label: "Missing" }, { code: "JC", label: "Jacket Crown" }, { code: "P", label: "Pontic" }, { code: "DX", label: "For Extraction" }, { code: "", label: "Clear" }];
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
					<div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
						<button onClick={() => navigate(-1)} style={{ padding: '5px 10px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>&larr; Back</button>
						<h2 className="patients-header">Patient Chart: {patient.full_name}</h2>
					</div>
				</div>

				<div className="sections-container">
					<section className="patient-info-card">
						<h3 className="section-title">Patient Info</h3>
						<div className="patient-info-fields">
							<p><strong>Name:</strong> {patient.full_name}</p>
							<p><strong>Age:</strong> {patient.displayAge}</p>
							<p><strong>Sex:</strong> {patient.gender}</p>
							<p><strong>#Number:</strong> {patient.contact_number}</p>
							{patient.relationship && <p><strong>Relationship:</strong> <span style={{ color: '#007bff', fontWeight: 'bold' }}>{patient.relationship}</span></p>}
						</div>
					</section>

					<section className="dentist-details-card">
						<div className="dentist-row">
							<div>
								<h3 className="section-title">Dentist</h3>
								<select className="dentist-select" value={selectedDentistId} onChange={(e) => setSelectedDentistId(e.target.value)} disabled={isReadOnly}>
									<option value="">Select a Dentist</option>
									{dentists.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
								</select>
							</div>
							<div className="vital-signs">
								<h3 className="section-title">Vital Signs (Year {selectedYear})</h3>
								<div className="vital-row" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
									<div className="vital-field" style={{ flex: '1 1 120px' }}>
										<label>BP</label>
										<input className="pill-input-input" placeholder="120/80" value={vitals.bp || ""} onChange={(e) => updateVitals("bp", e.target.value)} disabled={isReadOnly} />
									</div>
									<div className="vital-field" style={{ flex: '1 1 120px' }}>
										<label>Pulse</label>
										<input className="pill-input-input" placeholder="72" value={vitals.pulse || ""} onChange={(e) => updateVitals("pulse", e.target.value)} disabled={isReadOnly} />
									</div>
									<div className="vital-field" style={{ flex: '1 1 140px' }}>
										<label>Temp</label>
										<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
											<input type="number" step="0.1" className="pill-input-input" placeholder="36.5" value={getTempNumericValue()} onChange={(e) => handleTempNumberChange(e.target.value)} disabled={isReadOnly} style={{ flex: 1 }} />
											<select className="pill-input-input" style={{ width: '60px', textAlign: 'center' }} value={tempUnit} onChange={(e) => handleUnitToggle(e.target.value)} disabled={isReadOnly}>
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

				<section style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
					<h3 className="section-title">Medical Alerts & Allergies (Global)</h3>
					<div className="medical-alert-input-group">
						<input
							className="pill-input-input"
							placeholder="Type allergy (e.g. Asthma, Penicillin)"
							value={alertInput}
							onChange={(e) => setAlertInput(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleAddAlert()}
						/>
						<button className="small-btn" style={{ background: '#ef4444', minWidth: '60px' }} onClick={handleAddAlert}>+ Add</button>
					</div>
					<div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px' }}>
						{(patient.medicalAlerts && patient.medicalAlerts.length > 0) ? (
							patient.medicalAlerts.map((alert, i) => (
								<span key={i} className="alert-chip">
									{alert}
									<button onClick={() => handleRemoveAlert(alert)}>×</button>
								</span>
							))
						) : (
							<span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>No active alerts.</span>
						)}
					</div>

					<h3 className="section-title">Dental History (Year {selectedYear})</h3>
					<textarea
						className="pill-input-input"
						rows={3}
						value={dentalHistory}
						onChange={(e) => setDentalHistory(e.target.value)}
						placeholder="Enter past dental surgeries, allergies, or other history..."
						disabled={isReadOnly}
						style={{ width: '100%', marginTop: '5px' }}
					/>
				</section>

				{/* AUTOMATED RECOMMENDATIONS (Restored) */}
				{recommendations.length > 0 && (
					<div style={{ marginTop: '20px', padding: '15px', background: '#fff7ed', borderLeft: '4px solid #f97316', borderRadius: '4px' }}>
						<h4 style={{ margin: '0 0 10px 0', color: '#c2410c' }}>Automated Recommendations (Year {selectedYear})</h4>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
							{recommendations.map((rec, i) => (
								<div key={i} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px', background: '#fff', borderRadius: '6px', border: '1px solid #fed7aa' }}>
									<div>
										<strong style={{ color: '#9a3412' }}>{rec.tooth}</strong>: {rec.condition}
										<div style={{ fontSize: '0.9rem', color: '#431407', marginTop: '4px' }}>
											Suggest: {rec.treatments.join(", ")}
										</div>
									</div>
									<div style={{ display: 'flex', gap: '5px' }}>
										{rec.treatments.map((tx, idx) => (
											<button key={idx} className="small-btn" style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#f97316' }} onClick={() => handleApplyRecommendation(tx)} disabled={isReadOnly}>
												+ {tx}
											</button>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				<section className="oral-section">
					<h3 className="section-title">Oral Health Condition</h3>

					{/* YEAR TABS - DYNAMIC */}
					<div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
						{yearsList.map(year => (
							<button
								key={year}
								onClick={() => setSelectedYear(year)}
								style={{
									padding: '8px 16px',
									borderRadius: '20px',
									border: 'none',
									cursor: 'pointer',
									fontWeight: 'bold',
									fontSize: '0.9rem',
									backgroundColor: selectedYear === year ? '#2563eb' : '#e2e8f0',
									color: selectedYear === year ? 'white' : '#475569',
									boxShadow: selectedYear === year ? '0 2px 4px rgba(37,99,235,0.3)' : 'none',
									transition: 'all 0.2s'
								}}
							>
								Year {year}
							</button>
						))}

						{/* ADD YEAR BUTTON */}
						<button
							onClick={handleAddYear}
							style={{
								padding: '8px 12px',
								borderRadius: '20px',
								border: '2px dashed #cbd5e1',
								cursor: 'pointer',
								fontWeight: 'bold',
								fontSize: '1rem',
								backgroundColor: 'transparent',
								color: '#64748b',
								transition: 'all 0.2s',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center'
							}}
							title="Add Next Year"
						>
							+
						</button>
					</div>

					<div className="status-palette">
						{["issue", "planned", "completed"].map((status) => (
							<button key={status} className={`status-pill${activeStatus === status ? " active" : ""}`} onClick={() => setActiveStatus(status)}>
								<span className={`status-dot ${status}`}></span>
								{status === "issue" ? "Issue (red)" : status === "planned" ? "Planned (blue)" : "Completed (green)"}
							</button>
						))}
					</div>
					<div className="tooth-chart-container">
						<div className="tooth-inner-panel">
							<div className="tc-group">
								<div className="tc-row-header">Top Layer (Treatment / Condition)</div>
								{renderBoxRow(0)}{renderBoxRow(1)}
							</div>
							<div className="tc-group">
								<div className="tc-row-header"></div>
								{renderCircleGroup(upperConditionRows, 0)}
								{renderCircleGroup(lowerConditionRows, 26)}
							</div>
							<div className="tc-group">
								<div className="tc-row-header">Bottom Layer (Condition / Treatment)</div>
								{renderBoxRow(2)}{renderBoxRow(3)}
							</div>
						</div>
					</div>
				</section>

				<section className="timeline-section">
					<h3 className="section-title">
						Treatment Timeline (Year {selectedYear})
					</h3>

					{!isReadOnly && (
						<div className="timeline-form">
							<input
								className="pill-input-input"
								placeholder="Start Date & Time"
								value={timelineForm.start_time}
								onChange={(e) =>
									updateTimelineForm("start_time", e.target.value)
								}
							/>

							<input
								className="pill-input-input"
								placeholder="Provider"
								value={timelineForm.provider}
								onChange={(e) =>
									updateTimelineForm("provider", e.target.value)
								}
							/>

							<div
								style={{
									gridColumn: "1 / -1",
									display: "flex",
									flexDirection: "column",
									gap: "8px"
								}}
							>
								{/* SEARCHABLE PROCEDURE INPUT */}
								<div style={{ display: "flex", gap: "8px" }}>
									<div style={{ flex: 1 }}>
										<SearchableInput
											options={dentalServices}
											value={currentTimelineService}
											onChange={(val) =>
												setCurrentTimelineService(val)
											}
											placeholder="Search Procedure..."
											renderOption={(item) => (
												<div
													style={{
														display: "flex",
														justifyContent: "space-between"
													}}
												>
													<span>{item.name}</span>
													<span
														style={{
															fontSize: "0.8rem",
															color: "#64748b"
														}}
													>
														{item.price}
													</span>
												</div>
											)}
										/>
									</div>

									<button
										onClick={handleAddTimelineService}
										className="small-btn"
										style={{ width: "auto", height: "40px" }}
									>
										+ Add
									</button>
								</div>

								{/* SELECTED PROCEDURES */}
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										gap: "5px"
									}}
								>
									{selectedTimelineServices.map((svc) => (
										<span
											key={svc}
											style={{
												background: "#e0f2fe",
												color: "#0369a1",
												padding: "4px 8px",
												borderRadius: "12px",
												fontSize: "0.85rem",
												display: "inline-flex",
												alignItems: "center",
												gap: "5px"
											}}
										>
											{svc}
											<button
												onClick={() =>
													handleRemoveTimelineService(svc)
												}
												style={{
													border: "none",
													background: "none",
													cursor: "pointer",
													fontWeight: "bold",
													color: "inherit"
												}}
											>
												×
											</button>
										</span>
									))}
								</div>
							</div>

							<textarea
								className="pill-input-input"
								placeholder="Notes"
								value={timelineForm.notes}
								onChange={(e) =>
									updateTimelineForm("notes", e.target.value)
								}
								rows={3}
								style={{ gridColumn: "1 / -1" }}
							/>

							{/* IMAGE ATTACHMENT */}
							<div
								style={{
									gridColumn: "1 / -1",
									marginTop: "8px",
									padding: "10px",
									background: "#f8fafc",
									borderRadius: "8px",
									border: "1px solid #e2e8f0"
								}}
							>
								<label
									style={{
										display: "block",
										marginBottom: "6px",
										fontSize: "13px",
										fontWeight: "bold",
										color: "#475569"
									}}
								>
									Attach X-ray / Image
								</label>

								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "10px"
									}}
								>
									<input
										type="file"
										accept="image/*"
										onChange={handleTimelineImageUpload}
										style={{ fontSize: "13px" }}
									/>

									{timelineForm.image && (
										<span
											style={{
												fontSize: "12px",
												color: "#166534",
												fontWeight: "bold",
												background: "#dcfce7",
												padding: "2px 8px",
												borderRadius: "4px"
											}}
										>
											✓ Attached
										</span>
									)}
								</div>
							</div>

							<button className="small-btn" onClick={addTimelineEntry}>
								Add Entry
							</button>
						</div>
					)}

					{/* TIMELINE LIST */}
					<div className="timeline-list">
						{timelineEntries.map((entry) => (
							<div key={entry.id} className="timeline-entry">
								<div className="timeline-meta">
									<span>{entry.start_time}</span>
									<span>{entry.provider || "Unassigned"}</span>
								</div>

								{/* PROCEDURES + PRICES (ONE PER LINE) */}
								<div className="timeline-procedures">
									{entry.procedure_text
										.split(", ")
										.map((proc, index) => {
											const service = dentalServices.find(
												(s) => s.name === proc
											);

											return (
												<div
													key={index}
													style={{
														display: "flex",
														justifyContent: "space-between",
														fontSize: "0.95rem"
													}}
												>
													<strong>{proc}</strong>

													{service && (
														<span
															style={{
																color: "#166534",
																fontWeight: "bold",
																fontSize: "0.85rem"
															}}
														>
															{service.price}
														</span>
													)}
												</div>
											);
										})}
								</div>

								<div
									style={{
										fontSize: "0.9rem",
										color: "#64748b",
										marginTop: "4px"
									}}
								>
									{entry.notes}
								</div>

								{entry.image_url && (
									<div
										style={{
											fontSize: "12px",
											color: "#0ea5e9",
											marginTop: "4px"
										}}
									>
										📎 Has attached image
									</div>
								)}

								{!isReadOnly && (
									<div className="timeline-entry-actions">
										<button
											className="small-btn danger"
											onClick={() =>
												deleteTimelineEntry(entry.id)
											}
										>
											Delete
										</button>
									</div>
								)}
							</div>
						))}
					</div>
				</section>


				<section className="medication-section">
					<h3 className="section-title">Medication (Year {selectedYear})</h3>
					{!isReadOnly && (
						<div className="medication-form">
							{/* SEARCHABLE INPUT FOR MEDICINE */}
							<div style={{ position: 'relative' }}>
								<SearchableInput
									options={COMMON_MEDICINES}
									value={medicationForm.medicine}
									onChange={(val) => updateMedicationForm("medicine", val)}
									placeholder="Medicine (e.g. Amoxicillin)"
								/>
							</div>

							<input className="pill-input-input" placeholder="Dosage" value={medicationForm.dosage} onChange={(e) => updateMedicationForm("dosage", e.target.value)} />
							<input className="pill-input-input" placeholder="Frequency" value={medicationForm.frequency} onChange={(e) => updateMedicationForm("frequency", e.target.value)} />
							<input className="pill-input-input" placeholder="Notes" value={medicationForm.notes} onChange={(e) => updateMedicationForm("notes", e.target.value)} />
							<div className="medication-actions"><button className="small-btn" onClick={addMedication}>Add</button></div>
						</div>
					)}
					<div className="medication-list">
						{medications.map((m) => (
							<div key={m.id} className="medication-entry">
								<strong>{m.medicine}</strong> — {m.dosage || ""} — {m.frequency || ""}
								<div className="muted-text">{m.notes}</div>
								{!isReadOnly && <div className="medication-entry-actions"><button className="small-btn danger" onClick={() => deleteMedication(m.id)}>Delete</button></div>}
							</div>
						))}
					</div>
				</section>

				<section className="upload-section">
					<h3 className="section-title">Patient X-ray Gallery (Year {selectedYear})</h3>
					{!isReadOnly && <input type="file" multiple accept="image/*" onChange={handleUpload} />}
					<div className="thumbnail-grid">
						{uploadedFiles.length === 0 ? <div className="muted-text">No files uploaded yet.</div> : uploadedFiles.map((file, index) => (
							<div key={index} className="thumbnail-item"><button onClick={() => openXrayViewer(file)}><img src={file.url} alt={file.name} /></button></div>
						))}
					</div>
				</section>

				<div className="form-actions-bottom" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e9ecef', paddingTop: '1rem' }}>
					{!isReadOnly ? (
						<>
							<button className="done-btn secondary" onClick={handleSaveAll} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
							<button className="done-btn" onClick={handleDone} disabled={isSaving}>{isSaving ? "Saving..." : `Complete Year ${selectedYear}`}</button>
						</>
					) : (
						<div style={{ color: 'green', fontWeight: 'bold' }}>Year {selectedYear} is Completed (Read-Only)</div>
					)}
				</div>

				<div className={`side-panel-backdrop${isPanelOpen ? " side-panel-open" : ""}`} onClick={closePanel}>
					<div className="side-panel" onClick={(e) => e.stopPropagation()}>
						<h3 className="section-title">{panelTitle}</h3>
						<div className="side-panel-content">
							{panelOptions.length === 0 ? <p>Select a box to see options.</p> : <div className="options-grid">{panelOptions.map((option) => (<button key={option.code} className="option-pill" onClick={() => applyCode(option.code)}><strong>{option.code || "Clear"}</strong><span>{option.label}</span></button>))}</div>}
						</div>
					</div>
				</div>
			</div>

			<PatientHistorySidebar
				patient={patient}
				timeline={timelineEntries}
				appointments={patientAppointments}
			/>

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