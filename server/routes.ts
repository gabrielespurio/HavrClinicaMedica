import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertAppointmentSchema, insertProfessionalSchema, insertAppointmentTypeSchema, insertServiceScheduleSchema, insertUserSchema, updateUserSchema } from "@shared/schema";
import passport from "passport";
import { requireAuth, requireAdmin } from "./auth";
import { getAvailableSlots, getAppointmentsByPerson, type AvailabilityResult } from "./services/agendaService";
import { validatePatient } from "./services/patientService";

// Business hours validation helper
function validateBusinessHours(weekday: number, startTime: string, endTime: string): { valid: boolean; message?: string } {
  // Weekend days are not allowed (0 = Sunday, 6 = Saturday)
  if (weekday === 0 || weekday === 6) {
    return { valid: false, message: "Não é permitido agendar nos finais de semana" };
  }

  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + (minutes || 0);
  };

  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);

  // Friday: 9:00 - 13:00
  if (weekday === 5) {
    if (startMinutes < parseTime("09:00") || endMinutes > parseTime("13:00")) {
      return { valid: false, message: "Sexta-feira: horário permitido é 09:00 - 13:00" };
    }
  } else {
    // Monday-Thursday: 9:00 - 18:00
    if (startMinutes < parseTime("09:00") || endMinutes > parseTime("18:00")) {
      return { valid: false, message: "Segunda a Quinta: horário permitido é 09:00 - 18:00" };
    }
  }

  if (startMinutes >= endMinutes) {
    return { valid: false, message: "Horário de início deve ser anterior ao horário de término" };
  }

  return { valid: true };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Falha na autenticação" });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/user", requireAuth, (req, res) => {
    const user = req.user as any;
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // User management routes (admin only)
  app.get("/api/users", requireAdmin, async (req, res, next) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithoutAdmin = allUsers
        .filter(u => u.username !== "admin")
        .map(({ password, ...rest }) => rest);
      res.json(usersWithoutAdmin);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users", requireAdmin, async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      const existingUser = await storage.getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Login já existe" });
      }

      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(result.data.password, 10);

      const user = await storage.createUser({
        ...result.data,
        password: hashedPassword,
      });

      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res, next) => {
    try {
      const result = updateUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      let updateData = { ...result.data };

      if (updateData.password) {
        const bcrypt = await import("bcryptjs");
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await storage.updateUser(req.params.id, updateData);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res, next) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (user.username === "admin") {
        return res.status(403).json({ message: "Não é permitido excluir o usuário admin" });
      }

      const success = await storage.deleteUser(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json({ message: "Usuário removido com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // Public Agenda routes
  app.get("/api/agenda/disponibilidade", async (req, res, next) => {
    try {
      const { dataInicio, dataFim, tipo } = req.query;
      if (!dataInicio) {
        return res.status(400).json({ message: "Data de início é obrigatória" });
      }
      const slots = await getAvailableSlots(
        dataInicio as string, 
        dataFim as string,
        tipo as string
      );
      res.json(slots);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/agenda/disponibilidade/:date", async (req, res, next) => {
    try {
      const { date } = req.params;
      const { tipo } = req.query;
      const slots = await getAvailableSlots(date, undefined, tipo as string);
      res.json(slots);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/agenda/agendamentos-por-pessoa", async (req, res, next) => {
    try {
      const { cpf, telefone } = req.query;
      const appointments = await getAppointmentsByPerson(cpf as string, telefone as string);
      res.json(appointments);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/pacientes/validar", async (req, res, next) => {
    try {
      const { cpf, telefone } = req.query;
      const result = await validatePatient(cpf as string, telefone as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Rota pública para buscar paciente e agendamentos pelo CPF (para agendamento online)
  app.get("/api/agenda/paciente-por-cpf", async (req, res, next) => {
    try {
      const { cpf } = req.query;
      if (!cpf) {
        return res.status(400).json({ message: "CPF é obrigatório" });
      }

      const patient = await storage.getPatientByCPF(cpf as string);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      const allAppointments = await storage.getAllAppointments();
      const patientAppointments = allAppointments.filter(
        (a: any) => a.patientId === patient.id && a.status === "scheduled"
      );

      res.json({
        patient: {
          id: patient.id,
          name: patient.name,
          cpf: patient.cpf,
        },
        appointments: patientAppointments.map((a: any) => ({
          id: a.id,
          date: a.date,
          time: a.time,
          type: a.type,
          status: a.status,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  // Rota pública para cancelar agendamento pelo id (para reagendamento online)
  app.patch("/api/agenda/cancelar-agendamento/:id", async (req, res, next) => {
    try {
      const { id } = req.params;
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const updated = await storage.updateAppointment(id, { status: "cancelled" });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/agenda/agendamento-online", async (req, res, next) => {
    try {
      const { cpf, date, time, type } = req.body;
      
      if (!cpf || !date || !time || !type) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      const patient = await storage.getPatientByCPF(cpf);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }

      const allProfessionals = await storage.getAllProfessionals();
      const nurse = allProfessionals.find(p => p.role.toLowerCase() === "nurse" || p.name.toLowerCase().includes("enfermeira"));
      
      if (!nurse) {
        return res.status(500).json({ message: "Agenda da enfermeira não configurada" });
      }

      const appointmentData = {
        patientId: patient.id,
        date,
        time,
        type,
        professional: nurse.name,
        status: "scheduled",
        notes: "Agendamento realizado via portal online"
      };

      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      next(error);
    }
  });

  // Patient routes
  app.get("/api/patients", requireAuth, async (req, res, next) => {
    try {
      const patients = await storage.getAllPatients();
      res.json(patients);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/patients/:id", requireAuth, async (req, res, next) => {
    try {
      const patient = await storage.getPatient(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      res.json(patient);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/patients", requireAuth, async (req, res, next) => {
    try {
      const result = insertPatientSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      const existingPatient = await storage.getPatientByCPF(result.data.cpf);
      if (existingPatient) {
        return res.status(400).json({ message: "CPF já cadastrado" });
      }

      const patient = await storage.createPatient(result.data);
      res.status(201).json(patient);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/patients/:id", requireAuth, async (req, res, next) => {
    try {
      const result = insertPatientSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      const patient = await storage.updatePatient(req.params.id, result.data);
      if (!patient) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      res.json(patient);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/patients/:id", requireAuth, async (req, res, next) => {
    try {
      const success = await storage.deletePatient(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Paciente não encontrado" });
      }
      res.json({ message: "Paciente removido com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // Appointment routes
  app.get("/api/appointments", requireAuth, async (req, res, next) => {
    try {
      const { date, startDate, endDate, patientId } = req.query;

      let appointments;
      if (patientId) {
        appointments = await storage.getAppointmentsByPatient(patientId as string);
      } else if (date) {
        appointments = await storage.getAppointmentsByDate(date as string);
      } else if (startDate && endDate) {
        appointments = await storage.getAppointmentsByDateRange(startDate as string, endDate as string);
      } else {
        appointments = await storage.getAllAppointments();
      }

      res.json(appointments);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/appointments/:id", requireAuth, async (req, res, next) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      res.json(appointment);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/appointments", requireAuth, async (req, res, next) => {
    try {
      const result = insertAppointmentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      const patient = await storage.getPatient(result.data.patientId);
      if (!patient) {
        return res.status(400).json({ message: "Paciente não encontrado" });
      }

      // Validate professional exists by name
      const allProfessionals = await storage.getAllProfessionals();
      const professional = allProfessionals.find(p => p.name === result.data.professional);
      if (!professional) {
        return res.status(400).json({ message: "Profissional não encontrado" });
      }

      // Validate scale conflict for manual booking
      const [year, month, day] = result.data.date.split("-").map(Number);
      const bookingDate = new Date(year, month - 1, day);
      const weekday = bookingDate.getDay();
      const allSchedules = await storage.getAllServiceSchedules();
      const profSchedules = allSchedules.filter(s => 
        s.professionalId === professional.id && 
        s.weekday === weekday
      );
      
      const activeProfSchedules = profSchedules.filter(s => s.isActive);

      if (profSchedules.length === 0) {
        return res.status(400).json({ message: "O profissional não atende neste dia da semana" });
      }

      if (activeProfSchedules.length === 0) {
        return res.status(400).json({ message: "A escala do profissional para este dia está inativa" });
      }

      const parseTime = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      const bookingMinutes = parseTime(result.data.time);
      const isWithinScale = activeProfSchedules.some(s => {
        const start = parseTime(s.startTime);
        const end = parseTime(s.endTime);
        return bookingMinutes >= start && bookingMinutes < end;
      });

      if (!isWithinScale) {
        return res.status(400).json({ message: "Horário fora da escala do profissional" });
      }

      // Validate time conflicts considering duration
      const allAppointments = await storage.getAllAppointments();
      const sameDayAppointments = allAppointments.filter((a: any) => a.date === result.data.date && a.status !== "cancelled");
      const allAppointmentTypes = await storage.getAllAppointmentTypes();

      const isMedicalType = (t: string) => ["consulta", "retorno", "Consulta", "Retorno"].includes(t.toLowerCase());
      const isNursingType = (t: string) => ["aplicacao", "tirzepatida", "aplicação", "aplicação tirzepatida"].includes(t.toLowerCase());

      const getTypeDuration = (typeSlug: string): number => {
        const typeConfig = allAppointmentTypes.find(t => t.slug.toLowerCase() === typeSlug.toLowerCase() || t.name.toLowerCase() === typeSlug.toLowerCase());
        return typeConfig?.durationMinutes || 30;
      };

      const newStartMinutes = parseTime(result.data.time);
      const newDuration = getTypeDuration(result.data.type);
      const newEndMinutes = newStartMinutes + newDuration;

      const hasConflict = sameDayAppointments.some((a: any) => {
        const existingStartMinutes = parseTime(a.time.slice(0, 5));
        const existingDuration = getTypeDuration(a.type);
        const existingEndMinutes = existingStartMinutes + existingDuration;

        const overlaps = newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes;
        if (!overlaps) return false;

        if (isMedicalType(result.data.type)) {
          return isMedicalType(a.type);
        }

        if (isNursingType(result.data.type)) {
          return isNursingType(a.type);
        }

        return false;
      });

      if (hasConflict) {
        const formatMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        return res.status(409).json({
          message: `Conflito de horário: O agendamento de ${result.data.time} até ${formatMinutes(newEndMinutes)} (${newDuration} min) sobrepõe outro agendamento existente.`
        });
      }

      const appointment = await storage.createAppointment(result.data);
      res.status(201).json(appointment);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/appointments/:id", requireAuth, async (req, res, next) => {
    try {
      const result = insertAppointmentSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      const appointment = await storage.updateAppointment(req.params.id, result.data);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      res.json(appointment);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/appointments/:id/cancel", requireAuth, async (req, res, next) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const updated = await storage.updateAppointment(req.params.id, { status: "cancelled" });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  // Removed authenticated reschedule route to avoid duplication with public version

  app.delete("/api/appointments/:id", requireAuth, async (req, res, next) => {
    try {
      const success = await storage.deleteAppointment(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      res.json({ message: "Agendamento removido com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // Professional routes (admin only for write operations)
  app.get("/api/professionals", requireAuth, async (req, res, next) => {
    try {
      const professionals = await storage.getAllProfessionals();
      res.json(professionals);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/professionals/:id", requireAuth, async (req, res, next) => {
    try {
      const professional = await storage.getProfessional(req.params.id);
      if (!professional) {
        return res.status(404).json({ message: "Profissional não encontrado" });
      }
      res.json(professional);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/professionals", requireAdmin, async (req, res, next) => {
    try {
      const result = insertProfessionalSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      const professional = await storage.createProfessional(result.data);
      res.status(201).json(professional);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/professionals/:id", requireAdmin, async (req, res, next) => {
    try {
      const result = insertProfessionalSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      const professional = await storage.updateProfessional(req.params.id, result.data);
      if (!professional) {
        return res.status(404).json({ message: "Profissional não encontrado" });
      }
      res.json(professional);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/professionals/:id", requireAdmin, async (req, res, next) => {
    try {
      const success = await storage.deleteProfessional(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Profissional não encontrado" });
      }
      res.json({ message: "Profissional removido com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // Appointment Type routes
  app.get("/api/appointment-types", requireAuth, async (req, res, next) => {
    try {
      const types = await storage.getAllAppointmentTypes();
      res.json(types);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/appointment-types/:id", requireAuth, async (req, res, next) => {
    try {
      const type = await storage.getAppointmentType(req.params.id);
      if (!type) {
        return res.status(404).json({ message: "Tipo de atendimento não encontrado" });
      }
      res.json(type);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/appointment-types", requireAdmin, async (req, res, next) => {
    try {
      const result = insertAppointmentTypeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      // Validate default professional exists if provided
      if (result.data.defaultProfessionalId) {
        const professional = await storage.getProfessional(result.data.defaultProfessionalId);
        if (!professional) {
          return res.status(400).json({ message: "Profissional padrão não encontrado" });
        }
      }

      const type = await storage.createAppointmentType(result.data);
      res.status(201).json(type);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/appointment-types/:id", requireAdmin, async (req, res, next) => {
    try {
      const result = insertAppointmentTypeSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      // Validate default professional exists if being updated
      if (result.data.defaultProfessionalId) {
        const professional = await storage.getProfessional(result.data.defaultProfessionalId);
        if (!professional) {
          return res.status(400).json({ message: "Profissional padrão não encontrado" });
        }
      }

      const type = await storage.updateAppointmentType(req.params.id, result.data);
      if (!type) {
        return res.status(404).json({ message: "Tipo de atendimento não encontrado" });
      }
      res.json(type);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/appointment-types/:id", requireAdmin, async (req, res, next) => {
    try {
      const success = await storage.deleteAppointmentType(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Tipo de atendimento não encontrado" });
      }
      res.json({ message: "Tipo de atendimento removido com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // Service Schedule routes
  app.get("/api/schedules", requireAuth, async (req, res, next) => {
    try {
      const { professionalId } = req.query;
      let schedules;
      if (professionalId) {
        schedules = await storage.getSchedulesByProfessional(professionalId as string);
      } else {
        schedules = await storage.getAllServiceSchedules();
      }
      res.json(schedules);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/schedules", requireAdmin, async (req, res, next) => {
    try {
      const result = insertServiceScheduleSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      // Validate business hours
      const validation = validateBusinessHours(result.data.weekday, result.data.startTime, result.data.endTime);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }

      // Validate professional exists
      const professional = await storage.getProfessional(result.data.professionalId);
      if (!professional) {
        return res.status(400).json({ message: "Profissional não encontrado" });
      }

      const schedule = await storage.createServiceSchedule(result.data);
      res.status(201).json(schedule);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/schedules/:id", requireAdmin, async (req, res, next) => {
    try {
      const result = insertServiceScheduleSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.issues });
      }

      // Get existing schedule to merge with updates for validation
      const existing = await storage.getServiceSchedule(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Horário não encontrado" });
      }

      // Validate professional exists if being changed
      if (result.data.professionalId) {
        const professional = await storage.getProfessional(result.data.professionalId);
        if (!professional) {
          return res.status(400).json({ message: "Profissional não encontrado" });
        }
      }

      const weekday = result.data.weekday ?? existing.weekday;
      const startTime = result.data.startTime ?? existing.startTime;
      const endTime = result.data.endTime ?? existing.endTime;

      // Validate business hours
      const validation = validateBusinessHours(weekday, startTime, endTime);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }

      const schedule = await storage.updateServiceSchedule(req.params.id, result.data);
      res.json(schedule);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/schedules/:id", requireAdmin, async (req, res, next) => {
    try {
      const success = await storage.deleteServiceSchedule(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Horário não encontrado" });
      }
      res.json({ message: "Horário removido com sucesso" });
    } catch (error) {
      next(error);
    }
  });

  // ========================================
  // APIs Públicas (sem autenticação)
  // ========================================

  // API 1 - Consultar horários disponíveis
  app.get("/api/agenda/disponibilidade", async (req, res, next) => {
    try {
      const { dataInicio, dataFim } = req.query;

      if (!dataInicio || typeof dataInicio !== "string") {
        return res.status(400).json({ message: "Parâmetro dataInicio é obrigatório" });
      }

      const results = await getAvailableSlots(
        dataInicio,
        typeof dataFim === "string" ? dataFim : undefined
      );

      // Se apenas uma data, retorna objeto simples; se período, retorna array
      if (!dataFim || dataInicio === dataFim) {
        return res.json(results[0] || { data: dataInicio, horariosDisponiveis: [] });
      }

      res.json(results);
    } catch (error: any) {
      if (error.message?.includes("inválida")) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  });

  // API 2 - Consultar agendamentos de uma pessoa
  app.get("/api/agenda/agendamentos-por-pessoa", async (req, res, next) => {
    try {
      const { cpf, telefone } = req.query;

      if (!cpf && !telefone) {
        return res.status(400).json({ message: "Informe CPF ou telefone" });
      }

      const results = await getAppointmentsByPerson(
        typeof cpf === "string" ? cpf : undefined,
        typeof telefone === "string" ? telefone : undefined
      );

      res.json(results);
    } catch (error: any) {
      next(error);
    }
  });

  // API 3 - Validar se paciente existe e está ativo
  app.get("/api/pacientes/validar", async (req, res, next) => {
    try {
      const { cpf, telefone } = req.query;

      if (!cpf && !telefone) {
        return res.status(400).json({ message: "Informe CPF ou telefone" });
      }

      const result = await validatePatient(
        typeof cpf === "string" ? cpf : undefined,
        typeof telefone === "string" ? telefone : undefined
      );

      res.json(result);
    } catch (error: any) {
      next(error);
    }
  });

  // API 4 - Criar agendamentos (webhook ou integração)
  app.post("/api/agenda/criar-agendamento", async (req, res, next) => {
    try {
      const { telefone, nome, data, hora, tipo } = req.body;

      if (!telefone || !nome || !data || !hora || !tipo) {
        return res.status(400).json({ 
          success: false, 
          message: "Telefone, nome, data, hora e tipo são obrigatórios" 
        });
      }

      // 1. Identificar se é paciente ativo ou não
      const patient = await storage.getPatientByPhone(telefone);
      const isActive = patient && patient.status === "active";
      const normalizedType = tipo.toLowerCase();

      // 2. Regras de Negócio por Status do Paciente
      if (!isActive && normalizedType !== "consulta") {
        return res.status(403).json({
          success: false,
          message: "Pacientes novos ou inativos só podem agendar 'consulta'."
        });
      }

      const allowedTypes = ["aplicacao", "tirzepatida", "consulta", "retorno"];
      if (isActive && !allowedTypes.includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          message: "Tipo de agendamento não permitido. Tipos válidos: aplicacao, tirzepatida, consulta, retorno."
        });
      }

      // 3. Atribuição de Profissional
      let profName = "Dr. Roberto Santos";
      if (normalizedType === "aplicacao" || normalizedType === "tirzepatida") {
        profName = "Enf. Ana Paula";
      }

      // 4. Mapeamento de Nome do Tipo para o Banco
      const typeMap: Record<string, string> = {
        "consulta": "Consulta",
        "retorno": "Retorno",
        "aplicacao": "Aplicação",
        "tirzepatida": "Aplicação Tirzepatida"
      };
      const dbTypeName = typeMap[normalizedType] || tipo;

      // 5. Garantir existência do paciente (ou criar pré-cadastro se novo)
      let targetPatient = patient;
      if (!targetPatient) {
        const tempCpf = `WA-${Date.now().toString().slice(-11)}`; 
        
        targetPatient = await storage.createPatient({
          name: nome, // Usando o nome obrigatório enviado na API
          cpf: tempCpf,
          phone: telefone,
          status: "active", 
          address: { cep: "", state: "", city: "", neighborhood: "", street: "", number: "" }
        });
      }

      // 6. Verificar escala do profissional
      const [year, month, day] = data.split("-").map(Number);
      const bookingDate = new Date(year, month - 1, day);
      const weekday = bookingDate.getDay(); // 0 (Sun) to 6 (Sat)
      
      const allSchedules = await storage.getAllServiceSchedules();
      const allProfs = await storage.getAllProfessionals();
      const currentProf = allProfs.find(p => p.name === profName);
      
      if (currentProf) {
        const profSchedules = allSchedules.filter(s => s.professionalId === currentProf.id && s.weekday === weekday && s.isActive);
        
        if (profSchedules.length > 0) {
          const parseTime = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
          };
          
          const bookingMinutes = parseTime(hora);
          const isWithinScale = profSchedules.some(s => {
            const start = parseTime(s.startTime);
            const end = parseTime(s.endTime);
            return bookingMinutes >= start && bookingMinutes < end;
          });
          
          if (!isWithinScale) {
            return res.status(400).json({
              success: false,
              message: `O profissional ${profName} não possui escala configurada para este horário (${hora}) neste dia da semana.`
            });
          }
        } else {
           return res.status(400).json({
            success: false,
            message: `O profissional ${profName} não atende neste dia da semana.`
          });
        }
      }

      // 7. Verificar conflitos de horário considerando duração
      const allAppointments = await storage.getAllAppointments();
      const sameDayAppointments = allAppointments.filter((a: any) => a.date === data && a.status !== "cancelled");
      const allAppointmentTypes = await storage.getAllAppointmentTypes();

      const isMedicalType = (t: string) => ["consulta", "retorno"].includes(t.toLowerCase());
      const isNursingType = (t: string) => ["aplicacao", "tirzepatida", "aplicação", "aplicação tirzepatida"].includes(t.toLowerCase());

      const parseTimePublic = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + (m || 0);
      };

      const getTypeDuration = (typeSlug: string): number => {
        const typeConfig = allAppointmentTypes.find(t => t.slug.toLowerCase() === typeSlug.toLowerCase() || t.name.toLowerCase() === typeSlug.toLowerCase());
        return typeConfig?.durationMinutes || 30;
      };

      const newStartMinutes = parseTimePublic(hora);
      const newDuration = getTypeDuration(dbTypeName);
      const newEndMinutes = newStartMinutes + newDuration;

      const hasConflict = sameDayAppointments.some((a: any) => {
        const existingStartMinutes = parseTimePublic(a.time.slice(0, 5));
        const existingDuration = getTypeDuration(a.type);
        const existingEndMinutes = existingStartMinutes + existingDuration;

        const overlaps = newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes;
        if (!overlaps) return false;

        if (isMedicalType(dbTypeName)) {
          return isMedicalType(a.type);
        }

        if (isNursingType(dbTypeName)) {
          return isNursingType(a.type);
        }

        return false;
      });

      if (hasConflict) {
        const formatMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        return res.status(409).json({
          success: false,
          message: `Conflito de horário: O agendamento de ${hora} até ${formatMinutes(newEndMinutes)} (${newDuration} min) sobrepõe outro agendamento existente.`
        });
      }

      // 7. Criar o agendamento
      const appointment = await storage.createAppointment({
        patientId: targetPatient.id,
        type: dbTypeName,
        date: data,
        time: hora,
        professional: profName,
        status: "scheduled",
        notes: "Agendado via API pública",
      });

      res.status(201).json({
        success: true,
        message: "Agendamento criado com sucesso",
        agendamento: {
          id: appointment.id,
          paciente: targetPatient.name,
          profissional: profName,
          tipo: dbTypeName,
          data: appointment.date,
          hora: appointment.time
        }
      });
    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      res.status(500).json({
        success: false,
        message: "Erro interno ao processar o agendamento",
        error: error.message
      });
    }
  });

  // API 5 - Alterar horário de agendamento
  app.patch("/api/agenda/alterar-agendamento", async (req, res, next) => {
    try {
      const { id, data, hora } = req.query;
      if (!id || !data || !hora) {
        return res.status(400).json({ message: "ID, data e hora são obrigatórios (via parâmetros da URL)" });
      }

      const appointment = await storage.getAppointment(id as string);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      const updated = await storage.updateAppointment(id as string, { 
        date: data as string, 
        time: hora as string,
        status: "scheduled"
      });
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}
