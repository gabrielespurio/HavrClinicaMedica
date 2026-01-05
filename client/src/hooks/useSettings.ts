import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type Professional = {
  id: string;
  name: string;
  role: string;
  specialty: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertProfessional = Omit<Professional, "id" | "createdAt" | "updatedAt">;

export type AppointmentTypeConfig = {
  id: string;
  name: string;
  slug: string;
  durationMinutes: number;
  defaultProfessionalId: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertAppointmentType = Omit<AppointmentTypeConfig, "id" | "createdAt" | "updatedAt">;

export type ServiceSchedule = {
  id: string;
  professionalId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertServiceSchedule = Omit<ServiceSchedule, "id" | "createdAt" | "updatedAt">;

export function useProfessionals() {
  return useQuery<Professional[]>({
    queryKey: ["/api/professionals"],
  });
}

export function useCreateProfessional() {
  return useMutation({
    mutationFn: async (data: InsertProfessional) => {
      const response = await apiRequest("POST", "/api/professionals", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
    },
  });
}

export function useUpdateProfessional() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertProfessional> }) => {
      const response = await apiRequest("PATCH", `/api/professionals/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
    },
  });
}

export function useDeleteProfessional() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/professionals/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professionals"] });
    },
  });
}

export function useAppointmentTypes() {
  return useQuery<AppointmentTypeConfig[]>({
    queryKey: ["/api/appointment-types"],
  });
}

export function useCreateAppointmentType() {
  return useMutation({
    mutationFn: async (data: InsertAppointmentType) => {
      const response = await apiRequest("POST", "/api/appointment-types", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointment-types"] });
    },
  });
}

export function useUpdateAppointmentType() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAppointmentType> }) => {
      const response = await apiRequest("PATCH", `/api/appointment-types/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointment-types"] });
    },
  });
}

export function useDeleteAppointmentType() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/appointment-types/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointment-types"] });
    },
  });
}

export function useServiceSchedules(professionalId?: string) {
  const queryString = professionalId ? `?professionalId=${professionalId}` : "";
  
  return useQuery<ServiceSchedule[]>({
    queryKey: ["/api/schedules", professionalId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/schedules${queryString}`);
      return response.json();
    },
  });
}

export function useCreateServiceSchedule() {
  return useMutation({
    mutationFn: async (data: InsertServiceSchedule) => {
      const response = await apiRequest("POST", "/api/schedules", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    },
  });
}

export function useUpdateServiceSchedule() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertServiceSchedule> }) => {
      const response = await apiRequest("PATCH", `/api/schedules/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    },
  });
}

export function useDeleteServiceSchedule() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/schedules/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    },
  });
}
