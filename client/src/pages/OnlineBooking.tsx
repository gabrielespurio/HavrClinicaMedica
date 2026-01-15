import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Check, ChevronLeft, User, Clock, CalendarDays } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface AvailabilityResult {
  data: string;
  horariosDisponiveis: string[];
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

  const { data: availability, isLoading: isLoadingSlots } = useQuery<AvailabilityResult[]>({
    queryKey: ["/api/agenda/disponibilidade", format(watchDate, "yyyy-MM-dd")],
    enabled: !!watchDate && step === 2,
  });

  const validateCpfMutation = useMutation({
    mutationFn: async (cpf: string) => {
      const res = await apiRequest("GET", `/api/pacientes/validar?cpf=${cpf}`);
      const data = await res.json();
      if (!data.existe) throw new Error("Paciente não encontrado. Por favor, entre em contato com a clínica.");
      
      const patientRes = await apiRequest("GET", `/api/patients`); // This is a bit hacky as we need full patient data
      const patients = await patientRes.json();
      const found = patients.find((p: any) => p.cpf === cpf);
      if (!found) throw new Error("Erro ao identificar paciente.");
      return found;
    },
    onSuccess: (data) => {
      setPatient(data);
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

  const onCpfSubmit = (values: z.infer<typeof cpfSchema>) => {
    validateCpfMutation.mutate(values.cpf);
  };

  const onBookingSubmit = (values: z.infer<typeof bookingSchema>) => {
    bookMutation.mutate(values);
  };

  const availableSlots = availability?.[0]?.horariosDisponiveis || [];

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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={bookingForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Aplicação</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                  date < addDays(new Date(), -1) || date.getDay() === 0 || date.getDay() === 6
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
                  </div>

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
                            ) : availableSlots.length > 0 ? (
                              availableSlots.map((slot: string) => (
                                <Button
                                  key={slot}
                                  type="button"
                                  variant={field.value === slot ? "default" : "outline"}
                                  className={cn(
                                    "h-10 text-sm font-medium",
                                    field.value === slot && "bg-primary text-white"
                                  )}
                                  onClick={() => field.onChange(slot)}
                                  data-testid={`button-slot-${slot}`}
                                >
                                  {slot}
                                </Button>
                              ))
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
                      disabled={bookMutation.isPending || !bookingForm.formState.isValid}
                      data-testid="button-confirm-booking"
                    >
                      {bookMutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
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
                <h2 className="text-2xl font-bold text-neutral-800">Agendamento Confirmado!</h2>
                <p className="text-neutral-600 max-w-sm mx-auto">
                  Sua consulta foi agendada com sucesso. Você receberá uma confirmação em breve.
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
    </div>
  );
}
