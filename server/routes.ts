import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertAppointmentSchema, insertProfessionalSchema, insertAppointmentTypeSchema, insertServiceScheduleSchema } from "@shared/schema";
import passport from "passport";
import { requireAuth } from "./auth";
import { getAvailableSlots, getAppointmentsByPerson } from "./services/agendaService";
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

  // Professional routes
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

  app.post("/api/professionals", requireAuth, async (req, res, next) => {
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

  app.patch("/api/professionals/:id", requireAuth, async (req, res, next) => {
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

  app.delete("/api/professionals/:id", requireAuth, async (req, res, next) => {
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

  app.post("/api/appointment-types", requireAuth, async (req, res, next) => {
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

  app.patch("/api/appointment-types/:id", requireAuth, async (req, res, next) => {
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

  app.delete("/api/appointment-types/:id", requireAuth, async (req, res, next) => {
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

  app.post("/api/schedules", requireAuth, async (req, res, next) => {
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

  app.patch("/api/schedules/:id", requireAuth, async (req, res, next) => {
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

  app.delete("/api/schedules/:id", requireAuth, async (req, res, next) => {
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

  // API 4 - Webhook WhatsApp para criar agendamentos
  app.post("/api/agenda/webhook-whatsapp", async (req, res, next) => {
    try {
      // Log for debugging
      console.log("Receiving WhatsApp Webhook:", req.body);

      const { cpf, telefone, data, hora, tipoId, profissionalId, notas, nome } = req.body;

      if (!cpf && !telefone) {
        return res.status(400).json({ message: "Informe CPF ou telefone do paciente" });
      }
      if (!data || !hora) {
        return res.status(400).json({ message: "Data e hora são obrigatórios" });
      }

      // 1. Localizar ou validar paciente, ou criar pré-cadastro
      let patient;
      if (cpf) {
        patient = await storage.getPatientByCPF(cpf);
      }
      if (!patient && telefone) {
        patient = await storage.getPatientByPhone(telefone);
      }

      if (!patient) {
        // Criar pré-cadastro automático
        const { nome } = req.body;
        patient = await storage.createPatient({
          name: nome || "Paciente Pré-cadastrado (WhatsApp)",
          cpf: cpf || `TMP-${Date.now()}`, // Fallback se não tiver CPF (o schema exige cpf único)
          phone: telefone || "0000000000",
          status: "active",
          address: {
            cep: "",
            state: "",
            city: "",
            neighborhood: "",
            street: "",
            number: ""
          }
        });
      }

      // 2. Validar tipo de agendamento se fornecido, ou usar padrão
      let typeName = "Consulta";
      if (tipoId) {
        const type = await storage.getAppointmentType(tipoId);
        if (type) typeName = type.name;
      }

      // 3. Validar profissional se fornecido, ou usar padrão
      let profName = "Dr. Roberto Santos";
      if (profissionalId) {
        const prof = await storage.getProfessional(profissionalId);
        if (prof) profName = prof.name;
      }

      // 4. Criar o agendamento
      const appointment = await storage.createAppointment({
        patientId: patient.id,
        type: typeName,
        date: data, // Formato YYYY-MM-DD
        time: hora, // Formato HH:mm
        professional: profName,
        status: "scheduled",
        notes: notas || "Agendado via WhatsApp",
      });

      res.status(201).json({
        message: "Agendamento criado com sucesso",
        agendamento: appointment
      });
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}
