import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, time, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: varchar("phone", { length: 30 }),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userRoleEnum = z.enum(["admin", "secretaria"]);
export type UserRole = z.infer<typeof userRoleEnum>;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  role: userRoleEnum,
});
export const updateUserSchema = insertUserSchema.partial().extend({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  role: userRoleEnum.optional(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

export const professionals = pgTable("professionals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").notNull().default("doctor"),
  specialty: text("specialty"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProfessionalSchema = createInsertSchema(professionals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Professional = typeof professionals.$inferSelect;

export const appointmentTypes = pgTable("appointment_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  defaultProfessionalId: varchar("default_professional_id").references(() => professionals.id, { onDelete: "set null" }),
  color: text("color").default("blue"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAppointmentTypeSchema = createInsertSchema(appointmentTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAppointmentType = z.infer<typeof insertAppointmentTypeSchema>;
export type AppointmentType = typeof appointmentTypes.$inferSelect;

export const serviceSchedules = pgTable("service_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: varchar("professional_id").notNull().references(() => professionals.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertServiceScheduleSchema = createInsertSchema(serviceSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertServiceSchedule = z.infer<typeof insertServiceScheduleSchema>;
export type ServiceSchedule = typeof serviceSchedules.$inferSelect;

export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cpf: varchar("cpf", { length: 30 }).notNull().unique(),
  rg: varchar("rg", { length: 30 }),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: text("email"),
  status: text("status").notNull().default("active"),
  planStartDate: date("plan_start_date"),
  planEndDate: date("plan_end_date"),
  address: jsonb("address").$type<{
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    number: string;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientId: varchar("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("consulta"),
  date: date("date").notNull(),
  time: time("time").notNull(),
  professional: text("professional").notNull().default("Dr. Roberto Santos"),
  status: text("status").notNull().default("scheduled"), // "scheduled", "attended", "in_progress", "cancelled"
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
