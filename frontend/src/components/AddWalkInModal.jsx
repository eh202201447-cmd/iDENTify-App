import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import useAppStore from '../store/useAppStore';
import '../styles/components/AddWalkInModal.css';
import { dentalServices } from "../data/services";
import api from "../api/apiClient"; // Import API Client

const AddWalkInModal = ({ isOpen, onClose, onAddPatient }) => {
  const dentists = useAppStore((state) => state.dentists);

  // --- TABS: NEW vs OLD ---
  const [activeTab, setActiveTab] = useState("new"); // "new" or "old"

  // --- SEARCH STATE (For Old Patients) ---
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- FORM STATE ---
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');

  const [birthday, setBirthday] = useState('');
  const [calculatedAge, setCalculatedAge] = useState('');

  const [sex, setSex] = useState('');
  const [contact, setContact] = useState('');
  const [dentistName, setDentistName] = useState('');
  const [dentistId, setDentistId] = useState('');

  // Multi-select state
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");

  // --- 1. AUTO-CALCULATE AGE LOGIC ---
  useEffect(() => {
    if (birthday) {
      const dob = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      setCalculatedAge(age >= 0 ? age : 0);
    } else {
      setCalculatedAge('');
    }
  }, [birthday]);

  // --- 2. SEARCH LOGIC (FIXED) ---
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      // Use api.searchPatients instead of direct fetch
      const data = await api.searchPatients(searchQuery);
      setSearchResults(data);
      if (data.length === 0) toast.error("No patient found.");
    } catch (error) {
      console.error(error);
      toast.error("Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOldPatient = (patient) => {
    // Auto-fill form with existing data (Prevent NULLs)
    setFirstName(patient.first_name || patient.full_name || ""); // Fallback to full_name if first_name missing
    setMiddleName(patient.middle_name || "");
    setLastName(patient.last_name || "");

    setBirthday(patient.birthdate ? patient.birthdate.split('T')[0] : "");
    setSex(patient.gender || patient.sex || "");
    setContact(patient.contact_number || patient.contact || "");
    setCalculatedAge((patient.vitals?.age || patient.age || "").toString());

    toast.success("Patient selected!");
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleDentistChange = (e) => {
    const selectedId = e.target.value;
    const selectedDentist = dentists.find(d => String(d.id) === String(selectedId));
    setDentistId(selectedId);
    setDentistName(selectedDentist ? selectedDentist.name : '');
  };

  const handleAddService = () => {
    if (!currentService) return;
    if (selectedServices.includes(currentService)) {
      toast.error("Service already selected");
      return;
    }
    setSelectedServices([...selectedServices, currentService]);
    setCurrentService("");
  };

  const handleRemoveService = (serviceToRemove) => {
    setSelectedServices(selectedServices.filter(s => s !== serviceToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic Validation
    if (!firstName.trim()) {
      toast.error('First Name is required.');
      return;
    }
    if (selectedServices.length === 0) {
      toast.error('Please select at least one Reason for Visit.');
      return;
    }

    const reasonString = selectedServices.join(", ");

    // Construct Full Name for display/compatibility
    const fullNameCombined = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();

    onAddPatient({
      first_name: firstName,
      middle_name: middleName,
      last_name: lastName,
      full_name: fullNameCombined,
      birthdate: birthday,
      age: calculatedAge,
      sex,
      contact,
      notes: reasonString,
      assignedDentist: dentistName,
      assignedDentistId: dentistId,
      source: 'walk-in',
      status: 'Checked-In',
      time: new Date().toLocaleTimeString(),
      isNewPatient: activeTab === "new"
    });

    // Reset Form
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setBirthday('');
    setCalculatedAge('');
    setSex('');
    setContact('');
    setSelectedServices([]);
    setDentistName('');
    setDentistId('');
    setActiveTab("new");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '600px', width: '100%' }}>
        <h2>Add Walk-In Patient</h2>

        {/* --- TOGGLE TABS --- */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === "new" ? '#2563eb' : '#e2e8f0',
              color: activeTab === "new" ? 'white' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            New Patient
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("old")}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === "old" ? '#2563eb' : '#e2e8f0',
              color: activeTab === "old" ? 'white' : '#64748b',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Old Patient
          </button>
        </div>

        {/* --- SEARCH SECTION (Only for OLD) --- */}
        {activeTab === "old" && (
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Search name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <button onClick={handleSearch} disabled={isSearching} style={{ padding: '8px 15px', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {isSearching ? '...' : 'Search'}
              </button>
            </div>
            {searchResults.length > 0 && (
              <ul style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '10px', background: 'white', border: '1px solid #eee', listStyle: 'none', padding: 0 }}>
                {searchResults.map(p => (
                  <li
                    key={p.id}
                    onClick={() => handleSelectOldPatient(p)}
                    style={{ padding: '8px', borderBottom: '1px solid #f1f1f1', cursor: 'pointer', fontSize: '0.9rem' }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                  >
                    <strong>{p.full_name}</strong> <span style={{ color: '#666' }}>(Born: {p.birthdate ? p.birthdate.split('T')[0] : 'N/A'})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* --- SPLIT NAME INPUTS --- */}
          <div className="form-group-row" style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>First Name *</label>
              <input type="text" placeholder="Juan" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Middle Name</label>
              <input type="text" placeholder="Dela" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Last Name *</label>
              <input type="text" placeholder="Cruz" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          {/* --- BIRTHDAY & AUTO-AGE --- */}
          <div className="form-group-row" style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label>Birthday</label>
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Age (Auto)</label>
              <input type="number" value={calculatedAge} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} placeholder="--" />
            </div>
          </div>

          <div className="form-group-row" style={{ display: 'flex', gap: '10px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Sex</label>
              {/* Added fallback to empty string to prevent NULL error */}
              <select value={sex || ""} onChange={(e) => setSex(e.target.value)}>
                <option value="">Select Sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            {/* --- PHONE INPUT WITH PREFIX --- */}
            <div className="form-group" style={{ flex: 1 }}>
              <label>Contact</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ padding: '10px', background: '#e2e8f0', borderRadius: '4px', color: '#64748b', fontSize: '0.9rem' }}>+63</span>
                <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="9123456789" style={{ flex: 1 }} />
              </div>
            </div>
          </div>

          {/* MULTI-SELECT REASON */}
          <div className="form-group">
            <label>Reason for Visit (Service) *</label>
            <div className="service-input-group">
              <select value={currentService} onChange={(e) => setCurrentService(e.target.value)}>
                <option value="">Select a service...</option>
                {dentalServices.map((service, index) => (
                  <option key={index} value={service.name}>{service.name} ({service.price})</option>
                ))}
              </select>
              <button type="button" className="add-service-btn" onClick={handleAddService}>+</button>
            </div>
            <div className="selected-services-container">
              {selectedServices.length === 0 && <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>No services selected</span>}
              {selectedServices.map((service, index) => (
                <span key={`${service}-${index}`} className="service-chip">
                  {service}
                  <button type="button" className="remove-service-btn" onClick={() => handleRemoveService(service)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Assigned Dentist</label>
            {/* Added fallback to empty string */}
            <select value={dentistId || ""} onChange={handleDentistChange}>
              <option value="">Select Dentist</option>
              {dentists.map((d) => {
                const isUnavailable = d.status === "Off" || d.status === "Busy";
                return <option key={d.id} value={d.id} disabled={d.status === "Off"}>{d.name} {isUnavailable ? `(${d.status})` : ""}</option>;
              })}
            </select>
          </div>
          <div className="form-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Add to Queue</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWalkInModal;