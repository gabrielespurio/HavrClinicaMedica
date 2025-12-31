import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addDays, addHours, startOfToday } from "date-fns";

export type PatientStatus = "active" | "inactive";

export type Patient = {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  phone: string;
  email: string;
  status: PatientStatus;
  planStartDate: string;
  planEndDate: string;
  address: {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    number: string;
  };
};

export type AppointmentType = "consulta" | "retorno" | "tirzepatida" | "aplicacao";

export type Appointment = {
  id: string;
  patientId: string;
  type: AppointmentType;
  date: string; // ISO string
  professional: string; // "Médico Dr. Silva" or "Enf. Maria"
};

interface AppState {
  patients: Patient[];
  appointments: Appointment[];
  
  addPatient: (patient: Patient) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void;
  
  getPatient: (id: string) => Patient | undefined;
}

// Initial Mock Data
const today = startOfToday();

const initialPatients: Patient[] = [
  {
    id: "1",
    name: "Ana Silva",
    cpf: "123.456.789-00",
    rg: "12.345.678-9",
    phone: "(11) 99999-9999",
    email: "ana.silva@email.com",
    status: "active",
    planStartDate: "2024-01-01",
    planEndDate: "2025-01-01",
    address: {
      cep: "01001-000",
      state: "SP",
      city: "São Paulo",
      neighborhood: "Sé",
      street: "Praça da Sé",
      number: "100"
    }
  },
  {
    id: "2",
    name: "Carlos Oliveira",
    cpf: "987.654.321-00",
    rg: "98.765.432-1",
    phone: "(11) 98888-8888",
    email: "carlos.o@email.com",
    status: "active",
    planStartDate: "2024-06-01",
    planEndDate: "2025-06-01",
    address: {
      cep: "20040-002",
      state: "RJ",
      city: "Rio de Janeiro",
      neighborhood: "Centro",
      street: "Rua Rio Branco",
      number: "50"
    }
  },
  {
    id: "3",
    name: "Mariana Souza",
    cpf: "456.789.123-00",
    rg: "45.678.912-3",
    phone: "(21) 97777-7777",
    email: "mari.souza@email.com",
    status: "inactive",
    planStartDate: "2023-01-01",
    planEndDate: "2023-12-31",
    address: {
      cep: "30140-071",
      state: "MG",
      city: "Belo Horizonte",
      neighborhood: "Savassi",
      street: "Rua da Bahia",
      number: "1200"
    }
  }
];

const initialAppointments: Appointment[] = [
  {
    id: "101",
    patientId: "1",
    type: "consulta",
    date: addHours(today, 9).toISOString(),
    professional: "Dr. Roberto Santos"
  },
  {
    id: "102",
    patientId: "2",
    type: "aplicacao",
    date: addHours(today, 10).toISOString(),
    professional: "Enf. Juliana Costa"
  },
  {
    id: "103",
    patientId: "1",
    type: "retorno",
    date: addDays(addHours(today, 14), 2).toISOString(),
    professional: "Dr. Roberto Santos"
  }
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      patients: initialPatients,
      appointments: initialAppointments,
      
      addPatient: (patient) => set((state) => ({ 
        patients: [...state.patients, { ...patient, id: crypto.randomUUID() }] 
      })),
      
      updatePatient: (id, updatedPatient) => set((state) => ({
        patients: state.patients.map(p => p.id === id ? { ...p, ...updatedPatient } : p)
      })),
      
      addAppointment: (appointment) => set((state) => ({
        appointments: [...state.appointments, { ...appointment, id: crypto.randomUUID() }]
      })),
      
      updateAppointment: (id, updatedAppointment) => set((state) => ({
        appointments: state.appointments.map(a => a.id === id ? { ...a, ...updatedAppointment } : a)
      })),
      
      getPatient: (id) => get().patients.find(p => p.id === id),
    }),
    {
      name: 'mediagenda-storage',
    }
  )
);
