import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type PatientAddress = {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
};

export type Patient = {
  id: string;
  name: string;
  cpf: string;
  rg?: string | null;
  phone: string;
  email?: string | null;
  status: string;
  planStartDate?: string | null;
  planEndDate?: string | null;
  address?: PatientAddress | null;
  createdAt: Date;
  updatedAt: Date;
};

export type InsertPatient = Omit<Patient, "id" | "createdAt" | "updatedAt">;

export function usePatients() {
  return useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const response = await fetch("/api/patients", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch patients");
      }
      return response.json();
    },
  });
}

export function usePatient(id: string) {
  return useQuery<Patient>({
    queryKey: ["/api/patients", "single", id],
    queryFn: async () => {
      const response = await fetch(`/api/patients/${id}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to fetch patient");
      }
      return response.json();
    },
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
