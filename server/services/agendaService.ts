import dayjs from "dayjs";
import { storage } from "../storage";
import type { Appointment } from "@shared/schema";

// Horário comercial com regras específicas
const BUSINESS_START_HOUR = 9;
const SLOT_INTERVAL_MINUTES = 30;

// Status que bloqueiam horários (agendamentos ativos)
// Inclui variações em português e inglês usadas no sistema
const BLOCKING_STATUSES = ["scheduled", "confirmed", "completed", "pending", "agendado", "confirmado", "concluido", "pendente"];

// Mapeamento de tipos para buscar configuração
const TYPE_SLUG_MAP: Record<string, string> = {
  "aplicacao": "aplicacao",
  "tirzepatida": "tirzepatida",
  "aplicacao_tirzepatida": "tirzepatida",
  "consulta": "consulta",
  "retorno": "retorno"
};

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
 * Converte horário HH:mm para minutos do dia
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem
 */
function intervalsOverlap(
  start1: number, end1: number,
  start2: number, end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

interface OccupiedInterval {
  date: string;
  startMinutes: number;
  endMinutes: number;
}

/**
 * Retorna os intervalos ocupados de uma lista de agendamentos
 * Considera a duração de cada tipo de atendimento
 */
async function getOccupiedIntervals(appointments: Appointment[]): Promise<OccupiedInterval[]> {
  const intervals: OccupiedInterval[] = [];
  const appointmentTypes = await storage.getAllAppointmentTypes();
  const typeMap = new Map(appointmentTypes.map(t => [t.name.toLowerCase(), t.durationMinutes]));
  
  for (const apt of appointments) {
    // Ignora agendamentos cancelados ou no-show
    if (!BLOCKING_STATUSES.includes(apt.status.toLowerCase())) {
      continue;
    }
    
    const startMinutes = timeToMinutes(apt.time.slice(0, 5));
    const typeKey = TYPE_SLUG_MAP[apt.type.toLowerCase()] || apt.type.toLowerCase();
    const duration = typeMap.get(typeKey) || typeMap.get(apt.type.toLowerCase()) || 30;
    const endMinutes = startMinutes + duration;
    
    intervals.push({
      date: apt.date,
      startMinutes,
      endMinutes
    });
  }
  
  return intervals;
}

export interface AvailabilityResult {
  data: string;
  horariosDisponiveis: string[];
}

/**
 * Consulta horários disponíveis em um período
 * Se apenas dataInicio for informada, retorna horários desse dia
 * @param dataInicio - Data inicial (YYYY-MM-DD)
 * @param dataFim - Data final opcional (YYYY-MM-DD)
 * @param tipo - Tipo de atendimento para calcular duração
 */
export async function getAvailableSlots(
  dataInicio: string,
  dataFim?: string,
  tipo?: string
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

  // Obtém intervalos ocupados considerando duração de cada tipo
  const occupiedIntervals = await getOccupiedIntervals(appointments);
  
  // Obtém a duração do tipo de atendimento solicitado
  let requestedDuration = 30;
  if (tipo) {
    const typeSlug = TYPE_SLUG_MAP[tipo.toLowerCase()] || tipo.toLowerCase();
    const appointmentTypes = await storage.getAllAppointmentTypes();
    const typeConfig = appointmentTypes.find(t => t.name.toLowerCase() === typeSlug);
    requestedDuration = typeConfig?.durationMinutes || 30;
  }

  const results: AvailabilityResult[] = [];
  const now = dayjs();

  // Itera por cada dia no período
  let currentDate = startDate;
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, "day")) {
    const weekday = currentDate.day();
    
    // Ignora finais de semana
    if (isWeekday(currentDate)) {
      const dateStr = currentDate.format("YYYY-MM-DD");
      
      // Gera slots baseados no dia da semana (sexta tem horário diferente)
      const dayTimeSlots = generateTimeSlotsForDay(weekday);
      const isToday = currentDate.isSame(now, "day");
      const currentMinutesNow = now.hour() * 60 + now.minute();
      
      // Filtra horários livres, futuros e sem conflitos
      const availableSlots = dayTimeSlots.filter((slot) => {
        const slotStartMinutes = timeToMinutes(slot);
        const slotEndMinutes = slotStartMinutes + requestedDuration;
        
        // Se for hoje, exclui horários que já passaram
        if (isToday && slotStartMinutes <= currentMinutesNow) {
          return false;
        }
        
        // Verifica se há conflito com algum intervalo ocupado
        const dayIntervals = occupiedIntervals.filter(i => i.date === dateStr);
        const hasConflict = dayIntervals.some(interval => 
          intervalsOverlap(slotStartMinutes, slotEndMinutes, interval.startMinutes, interval.endMinutes)
        );
        
        return !hasConflict;
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
    "tirzepatida": "Aplicação Tirzepatida",
    "tizerpatida": "Aplicação Tirzepatida",
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
