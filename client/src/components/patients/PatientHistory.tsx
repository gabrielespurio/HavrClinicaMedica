import { useAppointments, useUpdateAppointment, type Appointment } from "@/hooks/useAppointments";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, FileText, Loader2, User, Edit, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/agenda/AppointmentForm";
import { useToast } from "@/hooks/use-toast";

interface PatientHistoryProps {
  patientId: string;
}

export function PatientHistory({ patientId }: PatientHistoryProps) {
  const { data: appointments, isLoading } = useAppointments({ patientId });
  const updateAppointment = useUpdateAppointment();
  const { toast } = useToast();
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const typeLabels: Record<string, string> = {
    consulta: "Consulta",
    retorno: "Retorno",
    tirzepatida: "Aplicação Tirzepatida",
    tizerpatida: "Aplicação Tirzepatida",
    aplicacao: "Aplicação",
  };

  const typeColors: Record<string, string> = {
    consulta: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    retorno: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    tirzepatida: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    aplicacao: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  };

  const handleEdit = (apt: Appointment) => {
    setEditingAppointment(apt);
    setIsDialogOpen(true);
  };

  const handleCancel = async (apt: Appointment) => {
    if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
      try {
        await updateAppointment.mutateAsync({
          id: apt.id,
          data: { ...apt, status: "cancelled" }
        });
        toast({ title: "Agendamento cancelado com sucesso!" });
      } catch (error: any) {
        toast({
          title: "Erro ao cancelar agendamento",
          description: error.message,
          variant: "destructive"
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg bg-muted/10">
        <Calendar className="h-10 w-10 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground font-medium">Histórico Vazio</p>
        <p className="text-xs text-muted-foreground/70">Este paciente ainda não possui atendimentos registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[130px]">Data</TableHead>
              <TableHead className="w-[80px]">Horário</TableHead>
              <TableHead className="w-[110px]">Tipo</TableHead>
              <TableHead>Profissional</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((apt) => (
              <TableRow key={apt.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-appointment-${apt.id}`}>
                <TableCell>
                  <div className="flex items-center text-sm font-medium">
                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    {format(parseISO(apt.date), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    {apt.time.slice(0, 5)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className={typeColors[apt.type] || typeColors.consulta}
                  >
                    {typeLabels[apt.type] || apt.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="mr-1.5 h-3.5 w-3.5" />
                    {apt.professional || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  {apt.notes ? (
                    <div className="flex items-center text-sm text-muted-foreground max-w-[180px] truncate">
                      <FileText className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{apt.notes}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleEdit(apt)}
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleCancel(apt)}
                      disabled={apt.status === "cancelled"}
                      title="Cancelar"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Total de {appointments.length} atendimento{appointments.length !== 1 ? 's' : ''} registrado{appointments.length !== 1 ? 's' : ''}
      </p>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          {editingAppointment && (
            <AppointmentForm
              defaultDate={parseISO(editingAppointment.date)}
              appointment={editingAppointment}
              onSuccess={() => setIsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
