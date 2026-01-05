import { storage } from "../storage";

export interface PatientValidationResult {
  existe: boolean;
  ativo: boolean;
}

/**
 * Valida se um paciente existe e está ativo
 * Busca por CPF ou telefone
 */
export async function validatePatient(
  cpf?: string,
  telefone?: string
): Promise<PatientValidationResult> {
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

  // Paciente não encontrado
  if (!patient) {
    return {
      existe: false,
      ativo: false,
    };
  }

  // Paciente encontrado - verifica status
  return {
    existe: true,
    ativo: patient.status === "active",
  };
}
