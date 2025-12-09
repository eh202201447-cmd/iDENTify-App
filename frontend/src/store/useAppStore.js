import { create } from 'zustand';
const useAppStore = create((set, get) => ({
  patients: [],
  appointments: [],
  queue: [],
  dentists: [],
  treatments: [],
  reports: {},

  addPatient: (patient) =>
    set((state) => ({
      patients: [...state.patients, patient],
    })),
  updatePatient: (patientId, updates) =>
    set((state) => ({
      patients: state.patients.map((p) => (p.id === patientId ? { ...p, ...updates } : p)),
    })),

  addQueueItem: (item) =>
    set((state) => {
      const already = state.queue.some(
        (q) => q.appointment_id && item.appointment_id && q.appointment_id === item.appointment_id
      );
      if (already) return state;
      return {
        queue: [...state.queue, item],
      };
    }),

  updateAppointmentStatus: (appointmentId, status) =>
    set((state) => {
      const appt = state.appointments.find((a) => a.id === appointmentId);
      if (!appt || appt.status === status) return state;
      return {
        appointments: state.appointments.map((appt) =>
          appt.id === appointmentId ? { ...appt, status } : appt
        ),
      };
    }),
  updateAppointment: (updatedAppointment) =>
    set((state) => ({
      appointments: state.appointments.map((a) => (a.id === updatedAppointment.id ? updatedAppointment : a)),
    })),
  addAppointment: (appointment) =>
    set((state) => ({
      appointments: [...state.appointments, appointment],
    })),
  deleteAppointment: (appointmentId) =>
    set((state) => ({
      appointments: state.appointments.filter((a) => a.id !== appointmentId),
    })),

  addTreatment: (treatment) =>
    set((state) => ({
      treatments: [...state.treatments, { ...treatment, id: Date.now() + Math.random() }],
    })),
  
  updateQueueStatus: (queueId, status) =>
    set((state) => {
      const q = state.queue.find((i) => i.id === queueId);
      if (!q || q.status === status) return state;
      return {
        queue: state.queue.map((item) =>
          item.id === queueId ? { ...item, status } : item
        ),
      };
    }),

  // ADDED: Update dentist status/schedule in store
  updateDentist: (updatedDentist) =>
    set((state) => ({
      dentists: state.dentists.map((d) => (d.id === updatedDentist.id ? updatedDentist : d)),
    })),

  // set* helpers for syncing remote data
  setPatients: (patients) => set({ patients }),
  setAppointments: (appointments) => set({ appointments }),
  setQueue: (queue) => set({ queue }),
  setDentists: (dentists) => set({ dentists }),
  setTreatments: (treatments) => set({ treatments }),
  setReports: (reports) => set({ reports }),
}));

export default useAppStore;