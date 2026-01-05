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
import { usePatients } from "@/hooks/usePatients";
import { useCreateAppointment, useUpdateAppointment, type Appointment } from "@/hooks/useAppointments";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Selecione um paciente"),
  date: z.string(),
  time: z.string(),
  duration: z.string(),
  status: z.string(),
  notes: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  defaultDate: Date;
  appointment?: Appointment | null;
  onSuccess: () => void;
}

export function AppointmentForm({ defaultDate, appointment, onSuccess }: AppointmentFormProps) {
  const { data: patients, isLoading: isLoadingPatients } = usePatients();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const { toast } = useToast();

  const activePatients = (patients || []).filter((p) => p.status === "active");

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: appointment ? {
      patientId: appointment.patientId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration,
      status: appointment.status,
      notes: appointment.notes || "",
    } : {
      patientId: "",
      date: format(defaultDate, "yyyy-MM-dd"),
      time: format(defaultDate, "HH:mm"),
      duration: "30",
      status: "scheduled",
      notes: "",
    },
  });

  const isPending = createAppointment.isPending || updateAppointment.isPending;

  const onSubmit = async (data: AppointmentFormValues) => {
    try {
      if (appointment) {
        await updateAppointment.mutateAsync({
          id: appointment.id,
          data: {
            patientId: data.patientId,
            date: data.date,
            time: data.time,
            duration: data.duration,
            status: data.status,
            notes: data.notes || null,
          }
        });
        toast({ title: "Agendamento atualizado com sucesso!" });
      } else {
        await createAppointment.mutateAsync({
          patientId: data.patientId,
          date: data.date,
          time: data.time,
          duration: data.duration,
          status: data.status,
          notes: data.notes || null,
        });
        toast({ title: "Agendamento realizado com sucesso!" });
      }
      onSuccess();
    } catch (error: any) {
      toast({ 
        title: "Erro ao salvar agendamento", 
        description: error.message,
        variant: "destructive" 
      });
    }
  };

  const isReadOnly = !!appointment;

  if (isLoadingPatients) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="patientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paciente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                <FormControl>
                  <SelectTrigger data-testid="select-patient">
                    <SelectValue placeholder="Selecione um paciente ativo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activePatients.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Nenhum paciente ativo encontrado
                    </div>
                  ) : (
                    activePatients.map((p) => (
                      <SelectItem key={p.id} value={p.id} data-testid={`option-patient-${p.id}`}>
                        {p.name} (CPF: {p.cpf})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!isReadOnly && <FormDescription>Apenas pacientes ativos são listados.</FormDescription>}
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
                  <Input type="date" {...field} readOnly={isReadOnly} data-testid="input-appointment-date" />
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
                  <Input type="time" {...field} readOnly={isReadOnly} data-testid="input-appointment-time" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duração (min)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                  <FormControl>
                    <SelectTrigger data-testid="select-duration">
                      <SelectValue placeholder="Duração" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1h30</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="completed">Realizado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Observações sobre o agendamento (opcional)" 
                  {...field} 
                  data-testid="input-notes"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-2">
          {!isReadOnly && (
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-confirm-appointment">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Agendamento
            </Button>
          )}
          {isReadOnly && (
            <Button type="button" variant="outline" className="w-full" onClick={onSuccess}>
              Fechar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
