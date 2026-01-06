import {
  type User,
  type InsertUser,
  type Patient,
  type InsertPatient,
  type Appointment,
  type InsertAppointment,
  type Professional,
  type InsertProfessional,
  type AppointmentType,
  type InsertAppointmentType,
  type ServiceSchedule,
  type InsertServiceSchedule,
  users,
  patients,
  appointments,
  professionals,
  appointmentTypes,
  serviceSchedules,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patient methods
  getAllPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  getPatientByCPF(cpf: string): Promise<Patient | undefined>;
  getPatientByPhone(phone: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  deletePatient(id: string): Promise<boolean>;

  // Appointment methods
  getAllAppointments(): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  getAppointmentsByPatient(patientId: string): Promise<Appointment[]>;
  getAppointmentsByDate(date: string): Promise<Appointment[]>;
  getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<boolean>;

  // Professional methods
  getAllProfessionals(): Promise<Professional[]>;
  getProfessional(id: string): Promise<Professional | undefined>;
  createProfessional(professional: InsertProfessional): Promise<Professional>;
  updateProfessional(id: string, professional: Partial<InsertProfessional>): Promise<Professional | undefined>;
  deleteProfessional(id: string): Promise<boolean>;

  // Appointment Type methods
  getAllAppointmentTypes(): Promise<AppointmentType[]>;
  getAppointmentType(id: string): Promise<AppointmentType | undefined>;
  getAppointmentTypeBySlug(slug: string): Promise<AppointmentType | undefined>;
  createAppointmentType(type: InsertAppointmentType): Promise<AppointmentType>;
  updateAppointmentType(id: string, type: Partial<InsertAppointmentType>): Promise<AppointmentType | undefined>;
  deleteAppointmentType(id: string): Promise<boolean>;

  // Service Schedule methods
  getAllServiceSchedules(): Promise<ServiceSchedule[]>;
  getSchedulesByProfessional(professionalId: string): Promise<ServiceSchedule[]>;
  createServiceSchedule(schedule: InsertServiceSchedule): Promise<ServiceSchedule>;
  updateServiceSchedule(id: string, schedule: Partial<InsertServiceSchedule>): Promise<ServiceSchedule | undefined>;
  deleteServiceSchedule(id: string): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Patient methods
  async getAllPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
    return result[0];
  }

  async getPatientByCPF(cpf: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.cpf, cpf)).limit(1);
    return result[0];
  }

  async getPatientByPhone(phone: string): Promise<Patient | undefined> {
    const result = await db.select().from(patients).where(eq(patients.phone, phone)).limit(1);
    return result[0];
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const result = await db.insert(patients).values(insertPatient).returning();
    return result[0];
  }

  async updatePatient(id: string, patient: Partial<InsertPatient>): Promise<Patient | undefined> {
    const result = await db
      .update(patients)
      .set({ ...patient, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return result[0];
  }

  async deletePatient(id: string): Promise<boolean> {
    const result = await db.delete(patients).where(eq(patients.id, id)).returning();
    return result.length > 0;
  }

  // Appointment methods
  async getAllAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments).orderBy(appointments.date, appointments.time);
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const result = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
    return result[0];
  }

  async getAppointmentsByPatient(patientId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.date), desc(appointments.time));
  }

  async getAppointmentsByDate(date: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.date, date))
      .orderBy(appointments.time);
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(and(gte(appointments.date, startDate), lte(appointments.date, endDate)))
      .orderBy(appointments.date, appointments.time);
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const result = await db.insert(appointments).values(insertAppointment).returning();
    return result[0];
  }

  async updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const result = await db
      .update(appointments)
      .set({ ...appointment, updatedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return result[0];
  }

  async updateAppointmentStatuses(): Promise<void> {
    const now = new Date();
    const currentDate = format(now, "yyyy-MM-dd");
    const currentTime = format(now, "HH:mm:ss");

    // 1. "Scheduled" -> "In Progress"
    // If appointment date is today AND time is <= now AND status is "scheduled"
    await db
      .update(appointments)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(
        and(
          eq(appointments.date, currentDate),
          lte(appointments.time, currentTime),
          eq(appointments.status, "scheduled")
        )
      );

    // 2. "In Progress" -> "Attended"
    // We need to know the duration to calculate end time.
    // For simplicity, we'll fetch them and check.
    const inProgress = await db
      .select()
      .from(appointments)
      .where(eq(appointments.status, "in_progress"));

    const types = await this.getAllAppointmentTypes();
    const typeMap = new Map(types.map(t => [t.name, t.durationMinutes]));

    for (const apt of inProgress) {
      const duration = typeMap.get(apt.type) || 30;
      const [hours, minutes] = apt.time.split(":").map(Number);
      const startTime = new Date(now);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime.getTime() + duration * 60000);
      
      if (now >= endTime) {
        await this.updateAppointment(apt.id, { status: "attended" });
      }
    }
  }

  async deleteAppointment(id: string): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id)).returning();
    return result.length > 0;
  }

  // Professional methods
  async getAllProfessionals(): Promise<Professional[]> {
    return await db.select().from(professionals).orderBy(professionals.name);
  }

  async getProfessional(id: string): Promise<Professional | undefined> {
    const result = await db.select().from(professionals).where(eq(professionals.id, id)).limit(1);
    return result[0];
  }

  async createProfessional(insertProfessional: InsertProfessional): Promise<Professional> {
    const result = await db.insert(professionals).values(insertProfessional).returning();
    return result[0];
  }

  async updateProfessional(id: string, professional: Partial<InsertProfessional>): Promise<Professional | undefined> {
    const result = await db
      .update(professionals)
      .set({ ...professional, updatedAt: new Date() })
      .where(eq(professionals.id, id))
      .returning();
    return result[0];
  }

  async deleteProfessional(id: string): Promise<boolean> {
    const result = await db.delete(professionals).where(eq(professionals.id, id)).returning();
    return result.length > 0;
  }

  // Appointment Type methods
  async getAllAppointmentTypes(): Promise<AppointmentType[]> {
    return await db.select().from(appointmentTypes).orderBy(appointmentTypes.name);
  }

  async getAppointmentType(id: string): Promise<AppointmentType | undefined> {
    const result = await db.select().from(appointmentTypes).where(eq(appointmentTypes.id, id)).limit(1);
    return result[0];
  }

  async getAppointmentTypeBySlug(slug: string): Promise<AppointmentType | undefined> {
    const result = await db.select().from(appointmentTypes).where(eq(appointmentTypes.slug, slug)).limit(1);
    return result[0];
  }

  async createAppointmentType(insertType: InsertAppointmentType): Promise<AppointmentType> {
    const result = await db.insert(appointmentTypes).values(insertType).returning();
    return result[0];
  }

  async updateAppointmentType(id: string, type: Partial<InsertAppointmentType>): Promise<AppointmentType | undefined> {
    const result = await db
      .update(appointmentTypes)
      .set({ ...type, updatedAt: new Date() })
      .where(eq(appointmentTypes.id, id))
      .returning();
    return result[0];
  }

  async deleteAppointmentType(id: string): Promise<boolean> {
    const result = await db.delete(appointmentTypes).where(eq(appointmentTypes.id, id)).returning();
    return result.length > 0;
  }

  // Service Schedule methods
  async getAllServiceSchedules(): Promise<ServiceSchedule[]> {
    return await db.select().from(serviceSchedules).orderBy(serviceSchedules.weekday, serviceSchedules.startTime);
  }

  async getServiceSchedule(id: string): Promise<ServiceSchedule | undefined> {
    const result = await db.select().from(serviceSchedules).where(eq(serviceSchedules.id, id)).limit(1);
    return result[0];
  }

  async getSchedulesByProfessional(professionalId: string): Promise<ServiceSchedule[]> {
    return await db
      .select()
      .from(serviceSchedules)
      .where(eq(serviceSchedules.professionalId, professionalId))
      .orderBy(serviceSchedules.weekday, serviceSchedules.startTime);
  }

  async createServiceSchedule(insertSchedule: InsertServiceSchedule): Promise<ServiceSchedule> {
    const result = await db.insert(serviceSchedules).values(insertSchedule).returning();
    return result[0];
  }

  async updateServiceSchedule(id: string, schedule: Partial<InsertServiceSchedule>): Promise<ServiceSchedule | undefined> {
    const result = await db
      .update(serviceSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(serviceSchedules.id, id))
      .returning();
    return result[0];
  }

  async deleteServiceSchedule(id: string): Promise<boolean> {
    const result = await db.delete(serviceSchedules).where(eq(serviceSchedules.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new PostgresStorage();
