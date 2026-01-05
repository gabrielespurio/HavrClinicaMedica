import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type Patient = {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertPatient = Omit<Patient, "id" | "createdAt" | "updatedAt">;

export function usePatients() {
  return useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });
}

export function usePatient(id: string) {
  return useQuery<Patient>({
    queryKey: ["/api/patients", id],
    enabled: !!id,
  });
}

export function useCreatePatient() {
  return useMutation({
    mutationFn: async (data: InsertPatient) => {
      const response = await apiRequest("POST", "/api/patients", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });
}

export function useUpdatePatient() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPatient> }) => {
      const response = await apiRequest("PATCH", `/api/patients/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });
}

export function useDeletePatient() {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/patients/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
    },
  });
}
