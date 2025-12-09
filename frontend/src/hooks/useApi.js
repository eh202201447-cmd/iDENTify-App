import { useCallback, useState } from 'react';
import api from '../api/apiClient';
import useAppStore from '../store/useAppStore';

export default function useApi() {
  const setPatients = useAppStore((s) => s.setPatients);
  const setAppointments = useAppStore((s) => s.setAppointments);
  const setQueue = useAppStore((s) => s.setQueue);
  const setDentists = useAppStore((s) => s.setDentists);
  const setTreatments = useAppStore((s) => s.setTreatments);
  const setReports = useAppStore((s) => s.setReports);
  const addPatient = useAppStore((s) => s.addPatient);
  const addAppointment = useAppStore((s) => s.addAppointment);
  const addQueueItem = useAppStore((s) => s.addQueueItem);
  const updatePatientStore = useAppStore((s) => s.updatePatient);
  const updateAppointmentStore = useAppStore((s) => s.updateAppointment);
  const deleteAppointmentStore = useAppStore((s) => s.deleteAppointment);
  const updateDentistStore = useAppStore((s) => s.updateDentist);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getPatients();
      const transformed = list.map((p) => {
        const birthdate = p.birthdate || p.birthday || null;
        const calculatedAge = birthdate ? (() => {
          const b = new Date(birthdate);
          const now = new Date();
          let a = now.getFullYear() - b.getFullYear();
          const m = now.getMonth() - b.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a -= 1;
          return a;
        })() : null;

        const finalAge = calculatedAge !== null ? calculatedAge : (p.vitals?.age || p.age || null);
        const gender = (p.gender || p.sex || "").toString();
        let mappedSex = gender;
        if (gender.toLowerCase() === 'm' || gender.toLowerCase() === 'male') mappedSex = 'Male';
        else if (gender.toLowerCase() === 'f' || gender.toLowerCase() === 'female') mappedSex = 'Female';
        
        return {
          id: p.id,
          name: p.full_name || p.name || "",
          age: finalAge,
          sex: mappedSex || p.sex || "",
          contact: p.contact_number || p.contact || p.phone || "",
          email: p.email || "",
          address: p.address || "",
          birthday: birthdate,
          medicalAlerts: p.medical_alerts || p.medicalAlerts || [],
          vitals: p.vitals || {}, 
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
        const endDate = new Date(apptDate.getTime() + 60 * 60 * 1000);
        const timeEnd = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        return {
          ...appt,
          timeStart,
          timeEnd,
          patient: appt.full_name,
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

  const loadDentists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getDentists();
      setDentists(list);
      return list;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setDentists]);

  const updateDentist = useCallback(async (id, updates) => {
    const updated = await api.updateDentist(id, updates);
    if (updated) {
      updateDentistStore(updated);
    }
    return updated;
  }, [updateDentistStore]);

  const loadTreatments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getTreatments();
      setTreatments(list);
      return list;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setTreatments]);

  // UPDATED: loadReports now accepts a date
  const loadReports = useCallback(async (date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReports(date);
      setReports(data);
      return data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setReports]);

  // CRUD helpers
  const createPatient = useCallback(async (payload) => {
    const created = await api.createPatient(payload);
    const mapServerToFrontend = (p) => {
      const birthdate = p.birthdate || p.birthday || null;
      let age = null;
      if (birthdate) {
         const b = new Date(birthdate);
         const now = new Date();
         let a = now.getFullYear() - b.getFullYear();
         const m = now.getMonth() - b.getMonth();
         if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a -= 1;
         age = a;
      } else {
         age = p.vitals?.age || p.age || null;
      }

      return {
        id: p.id,
        name: p.full_name || p.name || "",
        age: age,
        sex: p.gender || p.sex || "",
        contact: p.contact_number || p.contact || "",
        email: p.email || "",
        address: p.address || "",
        birthday: birthdate,
        medicalAlerts: p.medical_alerts || [],
        vitals: p.vitals || {},
      };
    };

    if (created?.id) addPatient(mapServerToFrontend(created));
    return created;
  }, [addPatient]);

  const updatePatient = useCallback(async (id, updates) => {
    const updated = await api.updatePatient(id, updates);
    if (updated && updated.id) {
       const birthdate = updated.birthdate || updated.birthday || null;
       let age = null;
       if (birthdate) {
          const b = new Date(birthdate);
          const now = new Date();
          age = now.getFullYear() - b.getFullYear();
       } else {
          age = updated.vitals?.age || updated.age || null;
       }
       
       const mapped = {
         id: updated.id,
         name: updated.full_name || updated.name,
         age: age,
         sex: updated.gender || updated.sex,
         contact: updated.contact_number || updated.contact,
         email: updated.email,
         address: updated.address,
         birthday: birthdate,
         medicalAlerts: updated.medical_alerts || [],
         vitals: updated.vitals || {}
       };
       updatePatientStore(updated.id, mapped);
    }
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
    return created;
  }, [addQueueItem]);

  const updateQueue = useCallback(async (id, updates) => {
    const updated = await api.updateQueueItem(id, updates);
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

  const getToothConditions = useCallback(async (patientId) => api.getToothConditions(patientId), []);
  const upsertToothCondition = useCallback(async (payload) => api.upsertToothCondition(payload), []);
  const getTreatmentTimeline = useCallback(async (patientId) => api.getTreatmentTimeline(patientId), []);
  const addTreatmentTimelineEntry = useCallback(async (payload) => api.addTreatmentTimelineEntry(payload), []);
  const deleteTreatmentTimelineEntry = useCallback(async (id) => api.deleteTreatmentTimelineEntry(id), []);
  const getMedications = useCallback(async (patientId) => api.getMedications(patientId), []);
  const addMedication = useCallback(async (payload) => api.addMedication(payload), []);
  const deleteMedication = useCallback(async (id) => api.deleteMedication(id), []);

  return {
    loading,
    error,
    loadPatients,
    loadAppointments,
    loadQueue,
    loadDentists,
    loadTreatments,
    loadReports,
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
    updateDentist,
  };
}