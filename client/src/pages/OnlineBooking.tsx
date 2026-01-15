import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, User, Clock, CalendarDays, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AvailabilityResult {
  data: string;
  horariosDisponiveis: string[];
}

interface ExistingAppointment {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
}

const cpfSchema = z.object({
  cpf: z.string().min(11, "CPF inválido").max(14, "CPF inválido"),
});

const bookingSchema = z.object({
  date: z.date({ required_error: "Selecione a data" }),
  time: z.string({ required_error: "Selecione o horário" }),
  type: z.string({ required_error: "Selecione o tipo de aplicação" }),
});

export default function OnlineBooking() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState<any>(null);
  const [existingAppointment, setExistingAppointment] = useState<ExistingAppointment | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<z.infer<typeof bookingSchema> | null>(null);

  const cpfForm = useForm<z.infer<typeof cpfSchema>>({
    resolver: zodResolver(cpfSchema),
    defaultValues: { cpf: "" },
  });

  const bookingForm = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: new Date(),
      time: "",
      type: "",
    },
  });

  const watchDate = bookingForm.watch("date");
  const watchType = bookingForm.watch("type");

  const { data: availability, isLoading: isLoadingSlots } = useQuery<AvailabilityResult[]>({
    queryKey: [`/api/agenda/disponibilidade?dataInicio=${format(watchDate, "yyyy-MM-dd")}&tipo=${watchType}`],
    enabled: !!watchDate && !!watchType && step === 2,
  });

  const validateCpfMutation = useMutation({
    mutationFn: async (cpf: string) => {
      const normalizedCpf = cpf.replace(/\D/g, "");
      const res = await apiRequest("GET", `/api/agenda/paciente-por-cpf?cpf=${normalizedCpf}`);
      const data = await res.json();
      
      const activeAppointment = data.appointments.find((a: any) => 
        a.status === "scheduled" && 
        (a.type.toLowerCase() === "aplicacao" || a.type.toLowerCase() === "tirzepatida" || 
         a.type.toLowerCase() === "aplicação" || a.type.toLowerCase() === "aplicação tirzepatida")
      );
      
      return { patient: data.patient, existingAppointment: activeAppointment || null };
    },
    onSuccess: (data) => {
      setPatient(data.patient);
      setExistingAppointment(data.existingAppointment);
      
      // Não pré-selecionar o tipo - deixar o usuário escolher primeiro
      // O aviso de reagendamento só aparece quando o tipo coincide
      bookingForm.setValue("type", "");
      bookingForm.setValue("date", new Date());
      bookingForm.setValue("time", "");
      
      setStep(2);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bookMutation = useMutation({
    mutationFn: async (values: z.infer<typeof bookingSchema>) => {
      return apiRequest("POST", "/api/agenda/agendamento-online", {
        cpf: patient.cpf,
        date: format(values.date, "yyyy-MM-dd"),
        time: values.time,
        type: values.type,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Seu agendamento foi realizado com sucesso.",
      });
      setStep(3);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no agendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async (values: z.infer<typeof bookingSchema>) => {
      if (!existingAppointment) throw new Error("Agendamento não encontrado");
      
      await apiRequest("PATCH", `/api/agenda/cancelar-agendamento/${existingAppointment.id}`);
      
      return apiRequest("POST", "/api/agenda/agendamento-online", {
        cpf: patient.cpf,
        date: format(values.date, "yyyy-MM-dd"),
        time: values.time,
        type: values.type,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Seu agendamento foi reagendado com sucesso.",
      });
      setStep(3);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no reagendamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onCpfSubmit = (values: z.infer<typeof cpfSchema>) => {
    validateCpfMutation.mutate(values.cpf);
  };

  const onBookingSubmit = (values: z.infer<typeof bookingSchema>) => {
    // Verifica se o tipo selecionado é o mesmo do agendamento existente
    const existingType = existingAppointment?.type?.toLowerCase() || "";
    const isSameTypeCategory = existingAppointment && (
      (existingType.includes("tirzepatida") && values.type === "tirzepatida") ||
      (!existingType.includes("tirzepatida") && values.type === "aplicacao")
    );
    
    if (isSameTypeCategory) {
      const existingDate = existingAppointment.date;
      const existingTime = existingAppointment.time.slice(0, 5);
      const newDate = format(values.date, "yyyy-MM-dd");
      const newTime = values.time;
      
      if (existingDate === newDate && existingTime === newTime) {
        toast({
          title: "Mesmo horário",
          description: "Você selecionou o mesmo horário do seu agendamento atual.",
        });
        return;
      }
      
      setPendingBooking(values);
      setShowRescheduleDialog(true);
    } else {
      // Tipo diferente - é um novo agendamento
      bookMutation.mutate(values);
    }
  };

  const confirmReschedule = () => {
    if (pendingBooking) {
      rescheduleMutation.mutate(pendingBooking);
    }
    setShowRescheduleDialog(false);
  };

  const availableSlots = availability?.[0]?.horariosDisponiveis || [];
  
  const allSlots = [...availableSlots];
  if (existingAppointment && watchType) {
    const existingTime = existingAppointment.time.slice(0, 5);
    const existingType = existingAppointment.type.toLowerCase();
    const currentType = watchType.toLowerCase();
    const existingDate = existingAppointment.date;
    const selectedDate = format(watchDate, "yyyy-MM-dd");
    
    const isSameTypeCategory = 
      (existingType.includes("tirzepatida") && currentType === "tirzepatida") ||
      (!existingType.includes("tirzepatida") && currentType === "aplicacao");
    
    if (isSameTypeCategory && existingDate === selectedDate && !allSlots.includes(existingTime)) {
      allSlots.push(existingTime);
      allSlots.sort();
    }
  }

  const formatTypeLabel = (type: string) => {
    if (type.toLowerCase().includes("tirzepatida")) return "Aplicação Tirzepatida";
    return "Aplicação";
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-none">
        <CardHeader className="text-center pb-8 border-b">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <CalendarDays className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-neutral-800">MediAgenda</CardTitle>
          <CardDescription className="text-lg">Portal de Agendamento Online</CardDescription>
        </CardHeader>

        <CardContent className="pt-8">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Identificação do Paciente</h2>
                <p className="text-neutral-500">Informe seu CPF para iniciar o agendamento</p>
              </div>

              <Form {...cpfForm}>
                <form onSubmit={cpfForm.handleSubmit(onCpfSubmit)} className="space-y-4">
                  <FormField
                    control={cpfForm.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="000.000.000-00" 
                            {...field} 
                            className="text-lg h-12"
                            data-testid="input-cpf"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-medium hover-elevate"
                    disabled={validateCpfMutation.isPending}
                    data-testid="button-validate-cpf"
                  >
                    {validateCpfMutation.isPending ? "Validando..." : "Continuar"}
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {step === 2 && patient && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-neutral-500">Paciente</p>
                    <p className="font-semibold text-neutral-800">{patient.name}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep(1)}
                  className="text-primary hover:bg-primary/10"
                >
                  Alterar
                </Button>
              </div>

              <Form {...bookingForm}>
                <form onSubmit={bookingForm.handleSubmit(onBookingSubmit)} className="space-y-8">
                  <FormField
                    control={bookingForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Aplicação</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Limpa horário ao trocar tipo
                            bookingForm.setValue("time", "");
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="aplicacao">Aplicação</SelectItem>
                            <SelectItem value="tirzepatida">Aplicação Tirzepatida</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchType && existingAppointment && (() => {
                    const existingType = existingAppointment.type.toLowerCase();
                    const isSameType = 
                      (existingType.includes("tirzepatida") && watchType === "tirzepatida") ||
                      (!existingType.includes("tirzepatida") && watchType === "aplicacao");
                    
                    if (!isSameType) return null;
                    
                    return (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-amber-800">Você já possui um agendamento deste tipo</p>
                            <p className="text-sm text-amber-700 mt-1">
                              {formatTypeLabel(existingAppointment.type)} em{" "}
                              <span className="font-semibold">
                                {format(parseISO(existingAppointment.date), "dd/MM/yyyy", { locale: ptBR })}
                              </span>{" "}
                              às{" "}
                              <span className="font-semibold">{existingAppointment.time.slice(0, 5)}</span>
                            </p>
                            <p className="text-sm text-amber-600 mt-2">
                              Selecione uma nova data/horário abaixo para reagendar.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {watchType && (
                    <>
                      <FormField
                        control={bookingForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data da Consulta</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full h-11 pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: ptBR })
                                    ) : (
                                      <span>Selecione uma data</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date(new Date().setHours(0, 0, 0, 0)) || date.getDay() === 0 || date.getDay() === 6
                                  }
                                  initialFocus
                                  locale={ptBR}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                  <FormField
                    control={bookingForm.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Horários Disponíveis</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                            {isLoadingSlots ? (
                              Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="h-10 bg-neutral-100 animate-pulse rounded-md" />
                              ))
                            ) : allSlots.length > 0 ? (
                              allSlots.map((slot: string) => {
                                const isCurrentAppointment = existingAppointment && 
                                  existingAppointment.time.slice(0, 5) === slot &&
                                  existingAppointment.date === format(watchDate, "yyyy-MM-dd");
                                
                                return (
                                  <Button
                                    key={slot}
                                    type="button"
                                    variant={field.value === slot ? "default" : "outline"}
                                    className={cn(
                                      "h-10 text-sm font-medium relative",
                                      field.value === slot && "bg-primary text-white",
                                      isCurrentAppointment && field.value !== slot && "border-amber-400 bg-amber-50 text-amber-700"
                                    )}
                                    onClick={() => field.onChange(slot)}
                                    data-testid={`button-slot-${slot}`}
                                  >
                                    {slot}
                                    {isCurrentAppointment && (
                                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                                    )}
                                  </Button>
                                );
                              })
                            ) : (
                              <div className="col-span-full py-8 text-center bg-neutral-50 rounded-lg border border-dashed">
                                <Clock className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                                <p className="text-neutral-500">Nenhum horário disponível para esta data.</p>
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    </>
                  )}

                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-12"
                      onClick={() => setStep(1)}
                      type="button"
                    >
                      Voltar
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-[2] h-12 text-lg font-medium hover-elevate"
                      disabled={bookMutation.isPending || rescheduleMutation.isPending || !bookingForm.formState.isValid}
                      data-testid="button-confirm-booking"
                    >
                      {bookMutation.isPending || rescheduleMutation.isPending 
                        ? "Processando..." 
                        : (() => {
                            const existingType = existingAppointment?.type?.toLowerCase() || "";
                            const isReschedule = existingAppointment && (
                              (existingType.includes("tirzepatida") && watchType === "tirzepatida") ||
                              (!existingType.includes("tirzepatida") && watchType === "aplicacao")
                            );
                            return isReschedule ? "Reagendar" : "Confirmar Agendamento";
                          })()}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {step === 3 && (
            <div className="py-12 text-center space-y-6 animate-in zoom-in-95">
              <div className="flex justify-center">
                <div className="bg-green-100 p-4 rounded-full">
                  <Check className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-neutral-800">
                  {existingAppointment ? "Reagendamento Confirmado!" : "Agendamento Confirmado!"}
                </h2>
                <p className="text-neutral-600 max-w-sm mx-auto">
                  {existingAppointment 
                    ? "Sua consulta foi reagendada com sucesso. Você receberá uma confirmação em breve."
                    : "Sua consulta foi agendada com sucesso. Você receberá uma confirmação em breve."}
                </p>
              </div>
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setLocation("/")}
                  className="px-8"
                >
                  Voltar para o Início
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reagendamento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Você está alterando seu agendamento:</p>
                
                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                  <p className="text-sm text-red-700">
                    <span className="font-medium">De:</span>{" "}
                    {existingAppointment && format(parseISO(existingAppointment.date), "dd/MM/yyyy", { locale: ptBR })} às{" "}
                    {existingAppointment?.time.slice(0, 5)}
                  </p>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Para:</span>{" "}
                    {pendingBooking && format(pendingBooking.date, "dd/MM/yyyy", { locale: ptBR })} às{" "}
                    {pendingBooking?.time}
                  </p>
                </div>
                
                <p className="text-sm text-neutral-600">Deseja confirmar esta alteração?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReschedule}>
              Confirmar Reagendamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
