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
import { useAppointmentTypes, useProfessionals } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore, getDay } from "date-fns";
import { useEffect, useMemo } from "react";
import { Loader2, Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const appointmentSchema = z.object({
  patientId: z.string().min(1, "Selecione um paciente"),
  type: z.string().min(1, "Selecione o tipo de agendamento"),
  date: z.string(),
  time: z.string(),
  professional: z.string(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  defaultDate: Date;
  appointment?: Appointment | null;
  onSuccess: () => void;
}

function validateBusinessHours(date: string, time: string): { valid: boolean; message: string } {
  const appointmentDate = new Date(`${date}T${time}`);
  const dayOfWeek = getDay(appointmentDate);
  const [hours, minutes] = time.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;

  if (dayOfWeek === 0) {
    return { valid: false, message: "A clínica não funciona aos domingos." };
  }

  if (dayOfWeek === 6) {
    return { valid: false, message: "A clínica não funciona aos sábados." };
  }

  if (dayOfWeek === 5) {
    const openTime = 9 * 60;
    const closeTime = 13 * 60;
    if (timeInMinutes < openTime || timeInMinutes >= closeTime) {
      return { valid: false, message: "Sexta-feira: horário de funcionamento é das 9h às 13h." };
    }
    return { valid: true, message: "" };
  }

  const openTime = 9 * 60;
  const closeTime = 18 * 60;
  if (timeInMinutes < openTime || timeInMinutes >= closeTime) {
    return { valid: false, message: "Segunda a quinta: horário de funcionamento é das 9h às 18h." };
  }

  return { valid: true, message: "" };
}

function getBusinessHoursForDate(date: string): string {
  const appointmentDate = new Date(`${date}T12:00`);
  const dayOfWeek = getDay(appointmentDate);

  if (dayOfWeek === 0) return "Fechado (Domingo)";
  if (dayOfWeek === 6) return "Fechado (Sábado)";
  if (dayOfWeek === 5) return "09:00 - 13:00";
  return "09:00 - 18:00";
}

export function AppointmentForm({ defaultDate, appointment, onSuccess }: AppointmentFormProps) {
  const { data: patients, isLoading: isLoadingPatients } = usePatients();
  const { data: appointmentTypes, isLoading: isLoadingTypes } = useAppointmentTypes();
  const { data: professionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const { toast } = useToast();

  const activePatients = (patients || []).filter((p) => p.status === "active");
  const activeTypes = (appointmentTypes || []).filter((t) => t.isActive);
  const activeProfessionals = (professionals || []).filter((p) => p.status === "active");

  const professionalMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of activeProfessionals) {
      map.set(p.id, p.name);
    }
    return map;
  }, [activeProfessionals]);

  const defaultType = activeTypes.length > 0 ? activeTypes[0].slug : "consulta";
  const defaultProfessional = activeTypes.length > 0 && activeTypes[0].defaultProfessionalId
    ? professionalMap.get(activeTypes[0].defaultProfessionalId) || activeProfessionals[0]?.name || ""
    : activeProfessionals[0]?.name || "";

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: appointment ? {
      patientId: appointment.patientId,
      type: appointment.type,
      date: appointment.date,
      time: appointment.time.slice(0, 5),
      professional: appointment.professional,
    } : {
      patientId: "",
      type: defaultType,
      date: format(defaultDate, "yyyy-MM-dd"),
      time: format(defaultDate, "HH:mm"),
      professional: defaultProfessional,
    },
  });

  const selectedType = form.watch("type");
  const selectedDate = form.watch("date");
  const selectedTime = form.watch("time");
  const isPending = createAppointment.isPending || updateAppointment.isPending;

  const businessHours = selectedDate ? getBusinessHoursForDate(selectedDate) : "";
  const validation = selectedDate && selectedTime ? validateBusinessHours(selectedDate, selectedTime) : { valid: true, message: "" };

  // Reset form with proper defaults when data loads
  useEffect(() => {
    if (appointment) return;
    if (activeTypes.length === 0 || activeProfessionals.length === 0) return;
    
    const currentType = form.getValues("type");
    const currentProfessional = form.getValues("professional");
    
    // Only reset if values are still at initial/empty state
    if (!currentType || currentType === "consulta" || !currentProfessional) {
      const firstType = activeTypes[0];
      const defaultProfName = firstType.defaultProfessionalId
        ? professionalMap.get(firstType.defaultProfessionalId) || activeProfessionals[0]?.name
        : activeProfessionals[0]?.name;
      
      if (!currentType || !activeTypes.find(t => t.slug === currentType)) {
        form.setValue("type", firstType.slug);
      }
      if (!currentProfessional && defaultProfName) {
        form.setValue("professional", defaultProfName);
      }
    }
  }, [activeTypes, activeProfessionals, professionalMap, form, appointment]);

  // Update professional when type changes
  useEffect(() => {
    if (appointment) return;
    const selectedTypeConfig = activeTypes.find(t => t.slug === selectedType);
    if (selectedTypeConfig) {
      const profName = selectedTypeConfig.defaultProfessionalId
        ? professionalMap.get(selectedTypeConfig.defaultProfessionalId)
        : activeProfessionals[0]?.name;
      if (profName) {
        form.setValue("professional", profName);
      }
    }
  }, [selectedType, form, appointment, activeTypes, professionalMap, activeProfessionals]);

  const onSubmit = async (data: AppointmentFormValues) => {
    const hourValidation = validateBusinessHours(data.date, data.time);
    if (!hourValidation.valid) {
      toast({
        title: "Horário Indisponível",
        description: hourValidation.message,
        variant: "destructive"
      });
      return;
    }

    const patient = (patients || []).find((p) => p.id === data.patientId);

    if (!patient) {
      toast({
        title: "Erro",
        description: "Paciente não encontrado",
        variant: "destructive"
      });
      return;
    }

    if (patient.planEndDate) {
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
    }

    try {
      if (appointment) {
        await updateAppointment.mutateAsync({
          id: appointment.id,
          data: {
            patientId: data.patientId,
            type: data.type,
            date: data.date,
            time: data.time,
            professional: data.professional,
            status: appointment.status,
          }
        });
        toast({ title: "Agendamento atualizado com sucesso!" });
      } else {
        await createAppointment.mutateAsync({
          patientId: data.patientId,
          type: data.type,
          date: data.date,
          time: data.time,
          professional: data.professional,
          status: "scheduled",
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
  const isLoading = isLoadingPatients || isLoadingTypes || isLoadingProfessionals;

  if (isLoading) {
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

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Agendamento</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isReadOnly}>
                <FormControl>
                  <SelectTrigger data-testid="select-appointment-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeTypes.map((type) => (
                    <SelectItem key={type.id} value={type.slug} data-testid={`option-type-${type.slug}`}>
                      {type.name}
                    </SelectItem>
                  ))}
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

        {!isReadOnly && selectedDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-md">
            <Clock className="h-4 w-4" />
            <span>Horário de funcionamento: <strong>{businessHours}</strong></span>
          </div>
        )}

        {!isReadOnly && !validation.valid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validation.message}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="professional"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profissional Responsável</FormLabel>
              <FormControl>
                <Input {...field} readOnly className="bg-muted/50 font-medium text-primary" data-testid="input-professional" />
              </FormControl>
              <FormDescription>
                Atribuído automaticamente pelo sistema.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-2">
          {!isReadOnly && (
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isPending || !validation.valid} 
              data-testid="button-confirm-appointment"
            >
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
