import React, { useState } from 'react';
import toast from 'react-hot-toast';
import useAppStore from '../store/useAppStore';
import '../styles/components/AddWalkInModal.css';
import { dentalServices } from "../data/services";

const AddWalkInModal = ({ isOpen, onClose, onAddPatient }) => {
  const dentists = useAppStore((state) => state.dentists);
  const [full_name, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [contact, setContact] = useState('');
  const [dentistName, setDentistName] = useState('');
  const [dentistId, setDentistId] = useState('');

  // Multi-select state
  const [selectedServices, setSelectedServices] = useState([]);
  const [currentService, setCurrentService] = useState("");

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
    if (!full_name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (selectedServices.length === 0) {
      toast.error('Please select at least one Reason for Visit.');
      return;
    }

    const reasonString = selectedServices.join(", ");

    onAddPatient({
      full_name,
      age,
      sex,
      contact,
      notes: reasonString, // Storing multiple services in notes/reason field
      assignedDentist: dentistName,
      assignedDentistId: dentistId,
      source: 'walk-in',
      status: 'Checked-In',
      time: new Date().toLocaleTimeString(),
    });

    setFullName('');
    setAge('');
    setSex('');
    setContact('');
    setSelectedServices([]);
    setDentistName('');
    setDentistId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Add Walk-In Patient</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input type="text" value={full_name} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Sex</label>
            <select value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label>Contact</label>
            <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>

          {/* MULTI-SELECT REASON */}
          <div className="form-group">
            <label>Reason for Visit (Service) *</label>
            <div className="service-input-group">
              <select
                value={currentService}
                onChange={(e) => setCurrentService(e.target.value)}
              >
                <option value="">Select a service...</option>
                {dentalServices.map((service, index) => (
                  <option key={index} value={service.name}>
                    {service.name} ({service.price})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="add-service-btn"
                onClick={handleAddService}
              >
                +
              </button>
            </div>
            <div className="selected-services-container">
              {selectedServices.length === 0 && <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>No services selected</span>}
              {selectedServices.map((service, index) => (
                <span key={`${service}-${index}`} className="service-chip">
                  {service}
                  <button
                    type="button"
                    className="remove-service-btn"
                    onClick={() => handleRemoveService(service)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Assigned Dentist</label>
            <select
              value={dentistId}
              onChange={handleDentistChange}
            >
              <option value="">Select Dentist</option>
              {dentists.map((d) => {
                const isUnavailable = d.status === "Off" || d.status === "Busy";
                return (
                  <option key={d.id} value={d.id} disabled={d.status === "Off"}>
                    {d.name} {isUnavailable ? `(${d.status})` : ""}
                  </option>
                );
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