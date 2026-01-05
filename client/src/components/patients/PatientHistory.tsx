import { useAppointments, type Appointment } from "@/hooks/useAppointments";
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
import { Calendar, Clock, FileText, Loader2, User, Stethoscope } from "lucide-react";

interface PatientHistoryProps {
  patientId: string;
}

export function PatientHistory({ patientId }: PatientHistoryProps) {
  const { data: appointments, isLoading } = useAppointments({ patientId });

  const typeLabels: Record<string, string> = {
    consulta: "Consulta",
    retorno: "Retorno",
    tirzepatida: "Tirzepatida",
    aplicacao: "Aplicação",
  };

  const typeColors: Record<string, string> = {
    consulta: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    retorno: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    tirzepatida: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    aplicacao: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Total de {appointments.length} atendimento{appointments.length !== 1 ? 's' : ''} registrado{appointments.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
