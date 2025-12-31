import { useStore, type Appointment } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Stethoscope } from "lucide-react";

interface PatientHistoryProps {
  patientId: string;
}

export function PatientHistory({ patientId }: PatientHistoryProps) {
  const { appointments } = useStore();

  const patientAppointments = appointments
    .filter((apt) => apt.patientId === patientId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const typeLabels: Record<string, string> = {
    consulta: "Consulta",
    retorno: "Retorno",
    tirzepatida: "Tirzepatida",
    aplicacao: "Aplicação",
  };

  if (patientAppointments.length === 0) {
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
              <TableHead className="w-[180px]">Data e Hora</TableHead>
              <TableHead>Tipo de Atendimento</TableHead>
              <TableHead>Profissional</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patientAppointments.map((apt) => (
              <TableRow key={apt.id} className="hover:bg-muted/30 transition-colors">
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center text-sm font-medium">
                      <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      {format(parseISO(apt.date), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      {format(parseISO(apt.date), "HH:mm")}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary border border-primary/20">
                    {typeLabels[apt.type] || apt.type}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-sm">
                    <Stethoscope className="mr-2 h-4 w-4 text-muted-foreground" />
                    {apt.professional}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
