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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatePatient, useUpdatePatient, type Patient } from "@/hooks/usePatients";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { maskCPF, maskRG, maskPhone, maskCEP } from "@/lib/masks";

const patientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().min(14, "CPF inválido"),
  rg: z.string().min(12, "RG inválido"),
  phone: z.string().min(14, "Telefone inválido"),
  email: z.string().email("E-mail inválido"),
  status: z.enum(["active", "inactive"]),
  planStartDate: z.string(),
  planEndDate: z.string(),
  address: z.object({
    cep: z.string().min(9, "CEP inválido"),
    state: z.string().min(2, "Estado obrigatório"),
    city: z.string().min(2, "Cidade obrigatória"),
    neighborhood: z.string().min(2, "Bairro obrigatório"),
    street: z.string().min(2, "Rua obrigatória"),
    number: z.string().min(1, "Número obrigatório"),
  }),
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
      rg: patient.rg || "",
      phone: patient.phone,
      email: patient.email || "",
      status: patient.status as "active" | "inactive",
      planStartDate: patient.planStartDate || new Date().toISOString().split("T")[0],
      planEndDate: patient.planEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
      address: patient.address || {
        cep: "",
        state: "",
        city: "",
        neighborhood: "",
        street: "",
        number: "",
      },
    } : {
      name: "",
      cpf: "",
      rg: "",
      phone: "",
      email: "",
      status: "active",
      planStartDate: new Date().toISOString().split("T")[0],
      planEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        .toISOString()
        .split("T")[0],
      address: {
        cep: "",
        state: "",
        city: "",
        neighborhood: "",
        street: "",
        number: "",
      },
    },
  });

  const isPending = createPatient.isPending || updatePatient.isPending;

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");
    if (cep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          variant: "destructive",
        });
        return;
      }

      form.setValue("address.street", data.logradouro);
      form.setValue("address.neighborhood", data.bairro);
      form.setValue("address.city", data.localidade);
      form.setValue("address.state", data.uf);
      form.setFocus("address.number");
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Verifique sua conexão.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const onSubmit = async (data: PatientFormValues) => {
    try {
      if (patient) {
        await updatePatient.mutateAsync({ id: patient.id, data });
        toast({ title: "Paciente atualizado com sucesso!" });
      } else {
        await createPatient.mutateAsync(data);
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
            name="rg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RG</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="00.000.000-0" 
                    {...field}
                    onChange={(e) => field.onChange(maskRG(e.target.value))}
                    maxLength={12}
                    data-testid="input-patient-rg"
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-patient-status">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Período do Plano</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="planStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Início</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-plan-start" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="planEndDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fim</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-plan-end" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Endereço</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address.cep"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="00000-000"
                        {...field}
                        onChange={(e) => field.onChange(maskCEP(e.target.value))}
                        onBlur={handleCepBlur}
                        maxLength={9}
                        data-testid="input-address-cep"
                      />
                      {isLoadingCep && (
                        <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address.state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <Input placeholder="UF" {...field} maxLength={2} data-testid="input-address-state" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address.city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="Cidade" {...field} data-testid="input-address-city" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address.neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input placeholder="Bairro" {...field} data-testid="input-address-neighborhood" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rua</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua" {...field} data-testid="input-address-street" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address.number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input placeholder="Nº" {...field} data-testid="input-address-number" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
