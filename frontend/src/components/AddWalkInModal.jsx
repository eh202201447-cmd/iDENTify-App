import React, { useState } from 'react';
import toast from 'react-hot-toast';
import useAppStore from '../store/useAppStore';
import '../styles/components/AddWalkInModal.css';

const AddWalkInModal = ({ isOpen, onClose, onAddPatient }) => {
  const dentists = useAppStore((state) => state.dentists);
  const [full_name, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [contact, setContact] = useState('');
  const [reason, setReason] = useState('');
  const [dentistName, setDentistName] = useState('');
  const [dentistId, setDentistId] = useState('');

  const handleDentistChange = (e) => {
    const selectedId = e.target.value;
    const selectedDentist = dentists.find(d => String(d.id) === String(selectedId));
    setDentistId(selectedId);
    setDentistName(selectedDentist ? selectedDentist.name : '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!full_name.trim() || !reason.trim()) {
      toast.error('Name and Reason for Visit are required.');
      return;
    }

    // Pass everything needed
    onAddPatient({
      full_name,
      age,
      sex,
      contact,
      notes: reason,
      assignedDentist: dentistName,
      assignedDentistId: dentistId, // Pass ID for DB linking
      source: 'walk-in',
      status: 'Checked-In',
      time: new Date().toLocaleTimeString(),
    });

    // Reset form
    setFullName('');
    setAge('');
    setSex('');
    setContact('');
    setReason('');
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
            <select value={sex} onChange={(e) => setSex(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc' }}>
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label>Contact</label>
            <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Reason for Visit *</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Assigned Dentist</label>
            <select
              value={dentistId}
              onChange={handleDentistChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                fontSize: 'inherit'
              }}
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