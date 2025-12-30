import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useStore, type Appointment, type AppointmentType } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { addDays, format, parseISO, isBefore, subDays } from "date-fns";
import { useEffect } from "react";

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Selecione um paciente"),
  type: z.enum(["consulta", "retorno", "tirzepatida", "aplicacao"]),
  date: z.string(),
  time: z.string(),
  professional: z.string(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  defaultDate: Date;
  onSuccess: () => void;
}

export function AppointmentForm({ defaultDate, onSuccess }: AppointmentFormProps) {
  const { patients, addAppointment, appointments } = useStore();
  const { toast } = useToast();

  // Active patients only
  const activePatients = patients.filter((p) => p.status === "active");

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      patientId: "",
      type: "consulta",
      date: format(defaultDate, "yyyy-MM-dd"),
      time: format(defaultDate, "HH:mm"),
      professional: "Dr. Roberto Santos", // Default init
    },
  });

  const selectedType = form.watch("type");

  // Business Logic: Auto-assign professional
  useEffect(() => {
    if (selectedType === "consulta" || selectedType === "retorno") {
      form.setValue("professional", "Dr. Roberto Santos");
    } else {
      form.setValue("professional", "Enf. Juliana Costa");
    }
  }, [selectedType, form.setValue]);

  const onSubmit = (data: AppointmentFormValues) => {
    const patient = patients.find((p) => p.id === data.patientId);

    if (!patient) return;

    // Validate Plan Validity
    const appointmentDate = new Date(`${data.date}T${data.time}`);
    const planEnd = new Date(patient.planEndDate);

    if (isBefore(planEnd, appointmentDate)) {
        toast({
            title: "Plano Vencido",
            description: `O plano deste paciente vence em ${format(planEnd, "dd/MM/yyyy")}.`,
            variant: "destructive"
        });
        return;
    }

    // Business Logic: Check interval (Mock logic: just ensure not same day for simplicity, or 7 days)
    // Real logic would check last appointment of this patient
    const lastAppointment = appointments
        .filter(a => a.patientId === patient.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (lastAppointment) {
        // Example rule: At least 1 day between appointments
        const minDate = addDays(parseISO(lastAppointment.date), 1);
        if (isBefore(appointmentDate, minDate)) {
             toast({
                title: "Intervalo muito curto",
                description: "O paciente deve aguardar o intervalo mínimo entre atendimentos.",
                variant: "destructive"
            });
            // Allowing bypass for prototype ease, but warning shown.
            // return; 
        }
    }

    addAppointment({
        id: crypto.randomUUID(),
        patientId: data.patientId,
        type: data.type,
        date: appointmentDate.toISOString(),
        professional: data.professional
    });
    
    toast({ title: "Agendamento realizado com sucesso!" });
    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="patientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paciente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um paciente ativo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activePatients.length === 0 ? (
                     <SelectItem value="none" disabled>Nenhum paciente ativo</SelectItem>
                  ) : (
                    activePatients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                        {p.name} (CPF: {p.cpf})
                        </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>Apenas pacientes ativos são listados.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Agendamento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="consulta">Consulta</SelectItem>
                  <SelectItem value="retorno">Retorno</SelectItem>
                  <SelectItem value="tirzepatida">Aplicação de Tirzepatida</SelectItem>
                  <SelectItem value="aplicacao">Aplicação (Outros)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                    <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Horário</FormLabel>
                <FormControl>
                    <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>

        <FormField
          control={form.control}
          name="professional"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profissional Responsável</FormLabel>
              <FormControl>
                <Input {...field} readOnly className="bg-muted/50 font-medium text-primary" />
              </FormControl>
              <FormDescription>
                Atribuído automaticamente pelo sistema.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-2">
          <Button type="submit" className="w-full">Confirmar Agendamento</Button>
        </div>
      </form>
    </Form>
  );
}
