import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreatePatient, useUpdatePatient, type Patient } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { maskCPF, maskRG, maskPhone, maskCEP } from "@/lib/masks";

const patientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().min(14, "CPF inválido"),
  birthDate: z.string().min(1, "Data de nascimento obrigatória"),
  phone: z.string().min(14, "Telefone inválido"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  address: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientFormProps {
  patient?: Patient | null;
  onSuccess: () => void;
}

export function PatientForm({ patient, onSuccess }: PatientFormProps) {
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const { toast } = useToast();
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient ? {
      name: patient.name,
      cpf: patient.cpf,
      birthDate: patient.birthDate,
      phone: patient.phone,
      email: patient.email || "",
      address: patient.address || "",
    } : {
      name: "",
      cpf: "",
      birthDate: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  const isPending = createPatient.isPending || updatePatient.isPending;

  const onSubmit = async (data: PatientFormValues) => {
    try {
      if (patient) {
        await updatePatient.mutateAsync({ 
          id: patient.id, 
          data: {
            ...data,
            email: data.email || null,
            address: data.address || null,
          }
        });
        toast({ title: "Paciente atualizado com sucesso!" });
      } else {
        await createPatient.mutateAsync({
          ...data,
          email: data.email || null,
          address: data.address || null,
        });
        toast({ title: "Paciente cadastrado com sucesso!" });
      }
      onSuccess();
    } catch (error: any) {
      toast({ 
        title: "Erro ao salvar paciente", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: João da Silva" 
                    {...field} 
                    data-testid="input-patient-name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="000.000.000-00" 
                    {...field}
                    onChange={(e) => field.onChange(maskCPF(e.target.value))}
                    maxLength={14}
                    data-testid="input-patient-cpf"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Nascimento</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field}
                    data-testid="input-patient-birthdate"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="email@exemplo.com" 
                    {...field}
                    data-testid="input-patient-email"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="(00) 00000-0000" 
                    {...field}
                    onChange={(e) => field.onChange(maskPhone(e.target.value))}
                    maxLength={15}
                    data-testid="input-patient-phone"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Rua, número, bairro, cidade - UF" 
                    {...field}
                    data-testid="input-patient-address"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" type="button" onClick={onSuccess} data-testid="button-cancel">
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending} data-testid="button-save-patient">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </form>
    </Form>
  );
}
