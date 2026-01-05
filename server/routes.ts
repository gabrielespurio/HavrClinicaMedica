import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPatientSchema, insertAppointmentSchema } from "@shared/schema";
import passport from "passport";
import { requireAuth } from "./auth";

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

  return httpServer;
}
