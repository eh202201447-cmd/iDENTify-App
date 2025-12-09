const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4006/api';

async function handleResponse(res) {
  if (!res.ok) {
    let body = null;
    try {
      const text = await res.text();
      try {
        body = JSON.parse(text);
      } catch (e) {
        body = { message: res.statusText || `Server Error (${res.status})` };
      }
    } catch (e) {
      body = null;
    }

    const message = body?.message || res.statusText || 'API Error';
    const error = new Error(message);
    error.status = res.status;
    error.body = body;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

/* Patients */
export async function getPatients() {
  const res = await fetch(`${API_BASE}/patients/`);
  return handleResponse(res);
}
export async function getPatientById(id) {
  const res = await fetch(`${API_BASE}/patients/${id}/`);
  return handleResponse(res);
}
export async function createPatient(patientData) {
  const res = await fetch(`${API_BASE}/patients/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  return handleResponse(res);
}
export async function updatePatient(id, updates) {
  const res = await fetch(`${API_BASE}/patients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}
export async function deletePatient(id) {
  const res = await fetch(`${API_BASE}/patients/${id}/`, { method: 'DELETE' });
  return handleResponse(res);
}

/* Appointments */
export async function getAppointments() {
  const res = await fetch(`${API_BASE}/appointments`);
  return handleResponse(res);
}
export async function getAppointmentById(id) {
  const res = await fetch(`${API_BASE}/appointments/${id}`);
  return handleResponse(res);
}
export async function createAppointment(payload) {
  const res = await fetch(`${API_BASE}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
export async function updateAppointment(id, updates) {
  const res = await fetch(`${API_BASE}/appointments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}
export async function deleteAppointment(id) {
  const res = await fetch(`${API_BASE}/appointments/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

/* Queue */
export async function getQueue() {
  const res = await fetch(`${API_BASE}/queue`);
  return handleResponse(res);
}
export async function addQueueItem(payload) {
  const res = await fetch(`${API_BASE}/queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
export async function updateQueueItem(id, updates) {
  const res = await fetch(`${API_BASE}/queue/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}
export async function deleteQueueItem(id) {
  const res = await fetch(`${API_BASE}/queue/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

/* Dentists */
export async function getDentists() {
  const res = await fetch(`${API_BASE}/dentists`);
  return handleResponse(res);
}
export async function updateDentist(id, updates) {
  const res = await fetch(`${API_BASE}/dentists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

/* Tooth Conditions */
export async function getToothConditions(patientId) {
  const res = await fetch(`${API_BASE}/tooth-conditions/${patientId}`);
  return handleResponse(res);
}
export async function upsertToothCondition(payload) {
  const res = await fetch(`${API_BASE}/tooth-conditions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

/* Treatment Timeline */
export async function getTreatmentTimeline(patientId) {
  const res = await fetch(`${API_BASE}/treatment-timeline/${patientId}`);
  return handleResponse(res);
}
export async function addTreatmentTimelineEntry(payload) {
  const res = await fetch(`${API_BASE}/treatment-timeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
export async function deleteTreatmentTimelineEntry(id) {
  const res = await fetch(`${API_BASE}/treatment-timeline/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

/* Medications */
export async function getMedications(patientId) {
  const res = await fetch(`${API_BASE}/medications/${patientId}`);
  return handleResponse(res);
}
export async function addMedication(payload) {
  const res = await fetch(`${API_BASE}/medications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
export async function deleteMedication(id) {
  const res = await fetch(`${API_BASE}/medications/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

/* Treatments */
export async function getTreatments() {
  const res = await fetch(`${API_BASE}/treatments`);
  return handleResponse(res);
}

/* Reports - UPDATED to accept date */
export async function getReports(date) {
  let url = `${API_BASE}/reports`;
  if (date) {
    url += `?date=${date}`;
  }
  const res = await fetch(url);
  return handleResponse(res);
}

export default {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getQueue,
  addQueueItem,
  updateQueueItem,
  deleteQueueItem,
  getDentists,
  updateDentist,
  getToothConditions,
  upsertToothCondition,
  getTreatmentTimeline,
  addTreatmentTimelineEntry,
  deleteTreatmentTimelineEntry,
  getMedications,
  addMedication,
  deleteMedication,
  getTreatments,
  getReports,
};