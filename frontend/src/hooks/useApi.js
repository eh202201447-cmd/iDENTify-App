import { useCallback, useState } from 'react';
import api from '../api/apiClient';
import useAppStore from '../store/useAppStore';

/**
 * Simple API wrapper hook that automatically syncs server results to the zustand store.
 * Functions return promises so callers can await and handle success/errors.
 */
export default function useApi() {
  const setPatients = useAppStore((s) => s.setPatients);
  const setAppointments = useAppStore((s) => s.setAppointments);
  const setQueue = useAppStore((s) => s.setQueue);
  const addPatient = useAppStore((s) => s.addPatient);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const addQueueItem = useAppStore((s) => s.addQueueItem);
  const updatePatientStore = useAppStore((s) => s.updatePatient);
  const updateAppointmentStore = useAppStore((s) => s.updateAppointment);
  const deleteAppointmentStore = useAppStore((s) => s.deleteAppointment);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getPatients();
      // Transform backend patient objects into frontend-friendly shape used across the app
      const transformed = list.map((p) => {
        const birthdate = p.birthdate || p.birthday || null;
        const age = birthdate ? (() => {
          const b = new Date(birthdate);
          const now = new Date();
          let a = now.getFullYear() - b.getFullYear();
          const m = now.getMonth() - b.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a -= 1;
          return a;
        })() : null;
        const gender = (p.gender || p.sex || "").toString();
        const normalizedGender = gender.toLowerCase();
        let mappedSex = gender;
        if (normalizedGender === 'm' || normalizedGender === 'male') mappedSex = 'Male';
        else if (normalizedGender === 'f' || normalizedGender === 'female') mappedSex = 'Female';
        return {
          id: p.id,
          name: p.full_name || p.name || "",
          age: age || p.age || null,
          sex: mappedSex || p.sex || "",
          contact: p.contact_number || p.contact || p.phone || "",
          email: p.email || "",
          address: p.address || "",
          birthday: birthdate,
          medicalAlerts: p.medical_alerts || p.medicalAlerts || [],
        };
      });
      setPatients(transformed);
      return transformed;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setPatients]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getAppointments();
      const transformedList = list.map(appt => {
        const apptDate = new Date(appt.appointment_datetime);
        const timeStart = apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        
        // Placeholder for timeEnd, assumes 1-hour duration
        const endDate = new Date(apptDate.getTime() + 60 * 60 * 1000);
        const timeEnd = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        return {
          ...appt,
          timeStart,
          timeEnd,
          patient: appt.full_name, // Ensure patient name is consistent
        };
      });
      setAppointments(transformedList);
      return transformedList;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setAppointments]);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getQueue();
      setQueue(list);
      return list;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setQueue]);

  // CRUD helpers that sync to store automatically
  const createPatient = useCallback(async (payload) => {
    const created = await api.createPatient(payload);
    const mapServerToFrontend = (p) => {
      const birthdate = p.birthdate || p.birthday || null;
      const age = birthdate ? (() => {
        const b = new Date(birthdate);
        const now = new Date();
        let a = now.getFullYear() - b.getFullYear();
        const m = now.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a -= 1;
        return a;
      })() : null;
      const gender = (p.gender || p.sex || "").toString();
      const normalizedGender = gender.toLowerCase();
      let mappedSex = gender;
      if (normalizedGender === 'm' || normalizedGender === 'male') mappedSex = 'Male';
      else if (normalizedGender === 'f' || normalizedGender === 'female') mappedSex = 'Female';
      return {
        id: p.id,
        name: p.full_name || p.name || "",
        age: age || p.age || null,
        sex: mappedSex || p.sex || "",
        contact: p.contact_number || p.contact || p.phone || "",
        email: p.email || "",
        address: p.address || "",
        birthday: birthdate,
        medicalAlerts: p.medical_alerts || p.medicalAlerts || [],
      };
    };
    // If backend returns created object, use it; otherwise append backendless payload
    if (created?.id) addPatient(mapServerToFrontend(created));
    else addPatient(payload);
    return created;
  }, [addPatient]);

  const updatePatient = useCallback(async (id, updates) => {
    const updated = await api.updatePatient(id, updates);
    const mapServerToFrontend = (p) => ({
      id: p.id,
      name: p.full_name || p.name || "",
      age: p.age || null,
      sex: (() => {
        const g = (p.gender || p.sex || '').toString().toLowerCase();
        if (g === 'm' || g === 'male') return 'Male';
        if (g === 'f' || g === 'female') return 'Female';
        return p.sex || p.gender || '';
      })(),
      contact: p.contact_number || p.contact || p.phone || "",
      email: p.email || "",
      address: p.address || "",
      birthday: p.birthdate || p.birthday || null,
      medicalAlerts: p.medical_alerts || p.medicalAlerts || [],
    });
    // backend returns updated object OR we update by id
    if (updated && updated.id) updatePatientStore(updated.id, mapServerToFrontend(updated));
    else updatePatientStore(id, updates);
    return updated;
  }, [updatePatientStore]);

  const createAppointment = useCallback(async (payload) => {
    const created = await api.createAppointment(payload);
    if (created?.id) {
      const apptDate = new Date(created.appointment_datetime);
      const timeStart = apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const endDate = new Date(apptDate.getTime() + 60 * 60 * 1000);
      const timeEnd = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const transformed = {
        ...created,
        timeStart,
        timeEnd,
        patient: created.full_name,
      };
      addAppointment(transformed);
    }
    return created;
  }, [addAppointment]);

  const updateAppointment = useCallback(async (id, updates) => {
    const updated = await api.updateAppointment(id, updates);
    if (updated && updated.id) {
      const apptDate = new Date(updated.appointment_datetime);
      const timeStart = apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const endDate = new Date(apptDate.getTime() + 60 * 60 * 1000);
      const timeEnd = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const transformed = {
        ...updated,
        timeStart,
        timeEnd,
        patient: updated.full_name,
      };
      updateAppointmentStore(transformed);
    }
    return updated;
  }, [updateAppointmentStore]);

  const removeAppointment = useCallback(async (id) => {
    await api.deleteAppointment(id);
    deleteAppointmentStore(id);
    return id;
  }, [deleteAppointmentStore]);

  const addQueue = useCallback(async (payload) => {
    const created = await api.addQueueItem(payload);
    if (created?.id) addQueueItem(created);
    else addQueueItem(payload);
    return created;
  }, [addQueueItem]);

  const updateQueue = useCallback(async (id, updates) => {
    const updated = await api.updateQueueItem(id, updates);
    // We currently don't have an updateQueue action; store's updateQueueStatus exists for status changes.
    // If status is provided, call updateQueueStatus
    if (updates?.status) {
      useAppStore.getState().updateQueueStatus(id, updates.status);
    }
    return updated;
  }, []);

  const deleteQueue = useCallback(async (id) => {
    await api.deleteQueueItem(id);
    useAppStore.setState((state) => ({ queue: state.queue.filter((q) => q.id !== id) }));
    return id;
  }, []);

  const getPatientById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const patient = await api.getPatientById(id);
      return patient;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getToothConditions = useCallback(async (patientId) => {
    return api.getToothConditions(patientId);
  }, []);

  const upsertToothCondition = useCallback(async (payload) => {
    return api.upsertToothCondition(payload);
  }, []);

  const getTreatmentTimeline = useCallback(async (patientId) => {
    return api.getTreatmentTimeline(patientId);
  }, []);

  const addTreatmentTimelineEntry = useCallback(async (payload) => {
    return api.addTreatmentTimelineEntry(payload);
  }, []);

  const deleteTreatmentTimelineEntry = useCallback(async (id) => {
    return api.deleteTreatmentTimelineEntry(id);
  }, []);

  const getMedications = useCallback(async (patientId) => {
    return api.getMedications(patientId);
  }, []);

  const addMedication = useCallback(async (payload) => {
    return api.addMedication(payload);
  }, []);

  const deleteMedication = useCallback(async (id) => {
    return api.deleteMedication(id);
  }, []);

  return {
    loading,
    error,
    loadPatients,
    loadAppointments,
    loadQueue,
    createPatient,
    updatePatient,
    getPatientById,
    createAppointment,
    updateAppointment,
    removeAppointment,
    addQueue,
    updateQueue,
    deleteQueue,
    getToothConditions,
    upsertToothCondition,
    getTreatmentTimeline,
    addTreatmentTimelineEntry,
    deleteTreatmentTimelineEntry,
    getMedications,
    addMedication,
    deleteMedication,
  };
}
