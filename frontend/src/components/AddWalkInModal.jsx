import React, { useState } from 'react';
import toast from 'react-hot-toast';
import '../styles/components/AddWalkInModal.css';

const AddWalkInModal = ({ isOpen, onClose, onAddPatient }) => {
  const [full_name, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [contact, setContact] = useState('');
  const [reason, setReason] = useState('');
  const [dentist, setDentist] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!full_name.trim() || !reason.trim()) {
      toast.error('Name and Reason for Visit are required.');
      return;
    }
    onAddPatient({
      full_name,
      age,
      sex,
      contact,
      notes: reason,
      assignedDentist: dentist,
      source: 'walk-in',
      status: 'Checked-In',
      time: new Date().toLocaleTimeString(),
    });
    setFullName('');
    setAge('');
    setSex('');
    setContact('');
    setReason('');
    setDentist('');
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
            <input type="text" value={sex} onChange={(e) => setSex(e.target.value)} />
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
            <input type="text" value={dentist} onChange={(e) => setDentist(e.target.value)} />
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
