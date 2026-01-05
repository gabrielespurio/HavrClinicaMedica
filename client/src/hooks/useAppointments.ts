import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type Appointment = {
  id: string;
  patientId: string;
  type: string;
  date: string;
  time: string;
  professional: string;
  status: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertAppointment = Omit<Appointment, "id" | "createdAt" | "updatedAt">;

export function useAppointments(params?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  patientId?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.date) queryParams.append("date", params.date);
  if (params?.startDate) queryParams.append("startDate", params.startDate);
  if (params?.endDate) queryParams.append("endDate", params.endDate);
  if (params?.patientId) queryParams.append("patientId", params.patientId);

  const queryString = queryParams.toString();
  const url = queryString ? `/api/appointments?${queryString}` : "/api/appointments";

  return useQuery<Appointment[]>({
    queryKey: ["/api/appointments", params?.patientId, params?.date, params?.startDate, params?.endDate],
    queryFn: async () => {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch appointments");
      }
      return response.json();
    },
  });
}

export function useAppointment(id: string) {
  return useQuery<Appointment>({
    queryKey: ["/api/appointments", "single", id],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/${id}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch appointment");
      }
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  return useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const response = await apiRequest("POST", "/api/appointments", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
  });
}

export function useUpdateAppointment() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAppointment> }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
  });
}

export function useDeleteAppointment() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/appointments/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
  });
}
