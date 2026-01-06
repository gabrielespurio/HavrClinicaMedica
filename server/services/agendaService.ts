import dayjs from "dayjs";
import { storage } from "../storage";
import type { Appointment } from "@shared/schema";

// Horário comercial com regras específicas
const BUSINESS_START_HOUR = 9;
const SLOT_INTERVAL_MINUTES = 30;

// Status que bloqueiam horários (agendamentos ativos)
// Inclui variações em português e inglês usadas no sistema
const BLOCKING_STATUSES = ["scheduled", "confirmed", "completed", "pending", "agendado", "confirmado", "concluido", "pendente"];

/**
 * Retorna o horário de encerramento baseado no dia da semana
 * Segunda a Quinta: 18:00
 * Sexta: 13:00
 */
function getEndHour(weekday: number): number {
  return weekday === 5 ? 13 : 18;
}

/**
 * Gera todos os horários disponíveis para um dia específico
 */
function generateTimeSlotsForDay(weekday: number): string[] {
  const slots: string[] = [];
  const endHour = getEndHour(weekday);
  let currentMinutes = BUSINESS_START_HOUR * 60;
  const endMinutes = endHour * 60;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`);
    currentMinutes += SLOT_INTERVAL_MINUTES;
  }

  return slots;
}

/**
 * Verifica se uma data é um dia útil (segunda a sexta)
 */
function isWeekday(date: dayjs.Dayjs): boolean {
  const day = date.day();
  return day >= 1 && day <= 5; // 1 = Segunda, 5 = Sexta
}

/**
 * Retorna os horários ocupados de uma lista de agendamentos
 * Apenas considera agendamentos com status ativo (não cancelados)
 */
function getOccupiedSlots(appointments: Appointment[]): Set<string> {
  const occupied = new Set<string>();
  for (const apt of appointments) {
    // Ignora agendamentos cancelados ou no-show
    if (!BLOCKING_STATUSES.includes(apt.status.toLowerCase())) {
      continue;
    }
    // Normaliza o horário para HH:mm
    const time = apt.time.slice(0, 5);
    occupied.add(`${apt.date}_${time}`);
  }
  return occupied;
}

export interface AvailabilityResult {
  data: string;
  horariosDisponiveis: string[];
}

/**
 * Consulta horários disponíveis em um período
 * Se apenas dataInicio for informada, retorna horários desse dia
 */
export async function getAvailableSlots(
  dataInicio: string,
  dataFim?: string
): Promise<AvailabilityResult[]> {
  const startDate = dayjs(dataInicio);
  const endDate = dataFim ? dayjs(dataFim) : startDate;

  // Valida datas
  if (!startDate.isValid()) {
    throw new Error("Data de início inválida");
  }
  if (dataFim && !endDate.isValid()) {
    throw new Error("Data de fim inválida");
  }

  // Busca agendamentos no período
  const appointments = await storage.getAppointmentsByDateRange(
    startDate.format("YYYY-MM-DD"),
    endDate.format("YYYY-MM-DD")
  );

  const occupiedSlots = getOccupiedSlots(appointments);
  const results: AvailabilityResult[] = [];

  // Itera por cada dia no período
  let currentDate = startDate;
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
    const weekday = currentDate.day();
    
    // Ignora finais de semana
    if (isWeekday(currentDate)) {
      const dateStr = currentDate.format("YYYY-MM-DD");
      
      // Gera slots baseados no dia da semana (sexta tem horário diferente)
      const dayTimeSlots = generateTimeSlotsForDay(weekday);
      
      // Filtra horários livres
      const availableSlots = dayTimeSlots.filter((slot) => {
        const key = `${dateStr}_${slot}`;
        return !occupiedSlots.has(key);
      });

      results.push({
        data: dateStr,
        horariosDisponiveis: availableSlots,
      });
    }

    currentDate = currentDate.add(1, "day");
  }

  return results;
}

export interface PersonAppointmentResult {
  id: string | number;
  data: string;
  hora: string;
  status: string;
  tipo: string;
  especialidade: string | null;
}

/**
 * Consulta agendamentos de uma pessoa por CPF ou telefone
 * Retorna apenas agendamentos do dia atual em diante
 */
export async function getAppointmentsByPerson(
  cpf?: string,
  telefone?: string
): Promise<PersonAppointmentResult[]> {
  if (!cpf && !telefone) {
    throw new Error("Informe CPF ou telefone");
  }

  // Busca o paciente pelo CPF ou telefone
  let patient;
  if (cpf) {
    patient = await storage.getPatientByCPF(cpf);
  }
  if (!patient && telefone) {
    patient = await storage.getPatientByPhone(telefone);
  }

  if (!patient) {
    return [];
  }

  // Busca todos os agendamentos do paciente
  const allAppointments = await storage.getAppointmentsByPatient(patient.id);
  const today = dayjs().format("YYYY-MM-DD");

  // Busca todos os profissionais para mapear a especialidade
  const professionals = await storage.getAllProfessionals();
  const profMap = new Map(professionals.map(p => [p.name, p.specialty]));

  // Mapeamento de status para português
  const statusMap: Record<string, string> = {
    "scheduled": "Agendado",
    "attended": "Atendido",
    "in_progress": "Em Atendimento",
    "cancelled": "Cancelado"
  };

  // Mapeamento de tipos para o padrão do sistema
  const typeMap: Record<string, string> = {
    "consulta": "Consulta",
    "retorno": "Retorno",
    "aplicacao": "Aplicação",
    "aplicacao_tirzepatida": "Aplicação Tirzepatida"
  };

  // Filtra agendamentos do dia atual em diante e ordena
  const futureAppointments = allAppointments
    .filter((apt) => apt.date >= today)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

  // Retorna campos relevantes com formatação solicitada
  return futureAppointments.map((apt) => {
    const rawType = apt.type.toLowerCase();
    const formattedType = typeMap[rawType] || apt.type;
    
    return {
      id: apt.id,
      data: apt.date,
      hora: apt.time.slice(0, 5),
      status: statusMap[apt.status] || apt.status,
      tipo: formattedType,
      especialidade: profMap.get(apt.professional) || null,
    };
  });
}
