import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  useProfessionals,
  useCreateProfessional,
  useUpdateProfessional,
  useDeleteProfessional,
  useAppointmentTypes,
  useUpdateAppointmentType,
  useServiceSchedules,
  useUpdateServiceSchedule,
  type Professional,
  type AppointmentTypeConfig,
  type ServiceSchedule,
} from "@/hooks/useSettings";
import { Loader2, Plus, Pencil, Trash2, User, Calendar, Clock, Stethoscope } from "lucide-react";

const professionalSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  role: z.enum(["doctor", "nurse"]),
  specialty: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
});

type ProfessionalFormValues = z.infer<typeof professionalSchema>;

const weekdays = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
];

export default function Settings() {
  const [isProfessionalDialogOpen, setIsProfessionalDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);

  const { data: professionals, isLoading: isLoadingProfessionals } = useProfessionals();
  const { data: appointmentTypes, isLoading: isLoadingTypes } = useAppointmentTypes();
  const { data: schedules, isLoading: isLoadingSchedules } = useServiceSchedules(selectedProfessionalId || undefined);

  const createProfessional = useCreateProfessional();
  const updateProfessional = useUpdateProfessional();
  const deleteProfessional = useDeleteProfessional();
  const updateAppointmentType = useUpdateAppointmentType();
  const updateSchedule = useUpdateServiceSchedule();
  const { toast } = useToast();

  const professionalForm = useForm<ProfessionalFormValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      name: "",
      role: "doctor",
      specialty: "",
      status: "active",
    },
  });

  const handleOpenProfessionalDialog = (professional?: Professional) => {
    if (professional) {
      setEditingProfessional(professional);
      professionalForm.reset({
        name: professional.name,
        role: professional.role as "doctor" | "nurse",
        specialty: professional.specialty || "",
        status: professional.status as "active" | "inactive",
      });
    } else {
      setEditingProfessional(null);
      professionalForm.reset({
        name: "",
        role: "doctor",
        specialty: "",
        status: "active",
      });
    }
    setIsProfessionalDialogOpen(true);
  };

  const handleProfessionalSubmit = async (data: ProfessionalFormValues) => {
    try {
      const submitData = {
        ...data,
        specialty: data.specialty || null,
      };
      if (editingProfessional) {
        await updateProfessional.mutateAsync({ id: editingProfessional.id, data: submitData });
        toast({ title: "Profissional atualizado com sucesso!" });
      } else {
        await createProfessional.mutateAsync(submitData);
        toast({ title: "Profissional cadastrado com sucesso!" });
      }
      setIsProfessionalDialogOpen(false);
    } catch (error: any) {
      toast({ title: "Erro ao salvar profissional", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProfessional = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este profissional?")) return;
    try {
      await deleteProfessional.mutateAsync(id);
      toast({ title: "Profissional excluído com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro ao excluir profissional", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateDuration = async (type: AppointmentTypeConfig, durationMinutes: number) => {
    try {
      await updateAppointmentType.mutateAsync({ id: type.id, data: { durationMinutes } });
      toast({ title: "Duração atualizada!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateSchedule = async (schedule: ServiceSchedule, startTime: string, endTime: string, isActive?: boolean) => {
    try {
      await updateSchedule.mutateAsync({ 
        id: schedule.id, 
        data: { 
          startTime, 
          endTime,
          isActive: isActive !== undefined ? isActive : schedule.isActive
        } 
      });
      toast({ title: isActive !== undefined ? (isActive ? "Escala ativada!" : "Escala inativada!") : "Horário atualizado!" });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    }
  };

  const getProfessionalName = (id: string | null) => {
    if (!id) return "-";
    const prof = (professionals || []).find(p => p.id === id);
    return prof?.name || "-";
  };

  return (
    <Shell>
      <div className="flex flex-col h-full p-6 gap-6 overflow-auto">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">Configurações</h1>
          <p className="text-muted-foreground">Gerencie profissionais, tipos de atendimento e horários</p>
        </div>

        <Tabs defaultValue="professionals" className="flex-1">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="professionals" data-testid="tab-professionals">Profissionais</TabsTrigger>
          <TabsTrigger value="types" data-testid="tab-types">Tipos</TabsTrigger>
          <TabsTrigger value="schedules" data-testid="tab-schedules">Escalas</TabsTrigger>
        </TabsList>

        <TabsContent value="professionals" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profissionais
                </CardTitle>
                <CardDescription>Cadastre médicos e enfermeiras</CardDescription>
              </div>
              <Button onClick={() => handleOpenProfessionalDialog()} data-testid="button-add-professional">
                <Plus className="h-4 w-4 mr-2" />
                Novo Profissional
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingProfessionals ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(professionals || []).map((prof) => (
                      <TableRow key={prof.id} data-testid={`row-professional-${prof.id}`}>
                        <TableCell className="font-medium">{prof.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {prof.role === "doctor" ? "Médico(a)" : "Enfermeiro(a)"}
                          </Badge>
                        </TableCell>
                        <TableCell>{prof.specialty || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={prof.status === "active" ? "default" : "secondary"}>
                            {prof.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleOpenProfessionalDialog(prof)}
                            data-testid={`button-edit-professional-${prof.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteProfessional(prof.id)}
                            data-testid={`button-delete-professional-${prof.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Tipos de Atendimento
              </CardTitle>
              <CardDescription>Configure duração e profissional responsável</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTypes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Duração (min)</TableHead>
                      <TableHead>Profissional Padrão</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(appointmentTypes || []).map((type) => (
                      <TableRow key={type.id} data-testid={`row-type-${type.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: type.color || "blue" }}
                            />
                            <span className="font-medium">{type.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20"
                            defaultValue={type.durationMinutes}
                            min={5}
                            max={120}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value);
                              if (value && value !== type.durationMinutes) {
                                handleUpdateDuration(type, value);
                              }
                            }}
                            data-testid={`input-duration-${type.id}`}
                          />
                        </TableCell>
                        <TableCell>{getProfessionalName(type.defaultProfessionalId)}</TableCell>
                        <TableCell>
                          <Badge variant={type.isActive ? "default" : "secondary"}>
                            {type.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Escala de Atendimento
              </CardTitle>
              <CardDescription>Configure os horários de trabalho por profissional</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedProfessionalId || ""}
                onValueChange={(value) => setSelectedProfessionalId(value || null)}
              >
                <SelectTrigger className="w-64" data-testid="select-schedule-professional">
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {(professionals || []).map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedProfessionalId && (
                isLoadingSchedules ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dia</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Fim</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(schedules || []).map((schedule) => {
                        const weekday = weekdays.find(w => w.value === schedule.weekday);
                        return (
                          <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                            <TableCell className="font-medium">{weekday?.label || schedule.weekday}</TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                className="w-28"
                                defaultValue={schedule.startTime.slice(0, 5)}
                                onBlur={(e) => {
                                  if (e.target.value !== schedule.startTime.slice(0, 5)) {
                                    handleUpdateSchedule(schedule, e.target.value, schedule.endTime);
                                  }
                                }}
                                data-testid={`input-start-${schedule.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="time"
                                className="w-28"
                                defaultValue={schedule.endTime.slice(0, 5)}
                                onBlur={(e) => {
                                  if (e.target.value !== schedule.endTime.slice(0, 5)) {
                                    handleUpdateSchedule(schedule, schedule.startTime, e.target.value);
                                  }
                                }}
                                data-testid={`input-end-${schedule.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 hover:bg-transparent"
                                onClick={() => handleUpdateSchedule(schedule, schedule.startTime, schedule.endTime, !schedule.isActive)}
                                data-testid={`button-toggle-schedule-${schedule.id}`}
                              >
                                <Badge variant={schedule.isActive ? "default" : "secondary"} className="cursor-pointer">
                                  {schedule.isActive ? "Ativo" : "Inativo"}
                                </Badge>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )
              )}

              {!selectedProfessionalId && (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/10">
                  <Clock className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">Selecione um profissional para ver a escala</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isProfessionalDialogOpen} onOpenChange={setIsProfessionalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProfessional ? "Editar Profissional" : "Novo Profissional"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do profissional
            </DialogDescription>
          </DialogHeader>
          <Form {...professionalForm}>
            <form onSubmit={professionalForm.handleSubmit(handleProfessionalSubmit)} className="space-y-4">
              <FormField
                control={professionalForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome completo" data-testid="input-professional-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={professionalForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-professional-role">
                          <SelectValue placeholder="Selecione a função" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="doctor">Médico(a)</SelectItem>
                        <SelectItem value="nurse">Enfermeiro(a)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={professionalForm.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidade</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Ex: Clínico Geral" data-testid="input-professional-specialty" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={professionalForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-professional-status">
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

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsProfessionalDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createProfessional.isPending || updateProfessional.isPending}
                  data-testid="button-save-professional"
                >
                  {(createProfessional.isPending || updateProfessional.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </Shell>
  );
}
