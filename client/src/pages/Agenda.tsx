import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  User,
} from "lucide-react";
import {
  addDays,
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  parseISO,
  isSameMonth,
  isToday,
  setHours,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppointments, type Appointment } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/agenda/AppointmentForm";

type ViewMode = "month" | "week" | "day";

export default function Agenda() {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const { data: appointments, isLoading } = useAppointments();
  const { data: patients } = usePatients();

  const handlePrevious = () => {
    if (viewMode === "week") setViewDate(subWeeks(viewDate, 1));
    if (viewMode === "month") setViewDate(subMonths(viewDate, 1));
    if (viewMode === "day") setViewDate(addDays(viewDate, -1));
  };

  const handleNext = () => {
    if (viewMode === "week") setViewDate(addWeeks(viewDate, 1));
    if (viewMode === "month") setViewDate(addMonths(viewDate, 1));
    if (viewMode === "day") setViewDate(addDays(viewDate, 1));
  };

  const handleToday = () => setViewDate(new Date());

  const handleSlotClick = (date: Date) => {
    setEditingAppointment(null);
    setSelectedSlot(date);
    setIsDialogOpen(true);
  };

  const handleAppointmentClick = (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    setEditingAppointment(apt);
    setSelectedSlot(parseISO(apt.date));
    setIsDialogOpen(true);
  };

  const getAppointmentsForDate = (date: Date) => {
    return (appointments || []).filter(
      (apt) => isSameDay(parseISO(apt.date), date) && apt.status !== "cancelled"
    );
  };

  const getPatientName = (patientId: string) => {
    const patient = (patients || []).find(p => p.id === patientId);
    return patient?.name || "Paciente";
  };

  const getTypeStyles = (type: string, status?: string) => {
    if (status === "attended") {
      return { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" };
    }
    if (status === "in_progress") {
      return { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" };
    }
    if (status === "cancelled") {
      return { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" };
    }
    
    switch (type.toLowerCase()) {
      case "consulta":
        return { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" };
      case "retorno":
        return { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" };
      case "tirzepatida":
        return { bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500" };
      case "aplicacao":
        return { bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" };
      default:
        return { bg: "bg-slate-50 dark:bg-slate-950/30", border: "border-slate-200 dark:border-slate-800", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500" };
    }
  };

  const getTypeLabel = (type: string) => {
    const t = type.toLowerCase();
    switch (t) {
      case "consulta": return "Consulta";
      case "retorno": return "Retorno";
      case "tirzepatida":
      case "tizerpatida": return "Tirzepatida";
      case "aplicacao": return "Aplicação";
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled": return "Agendado";
      case "attended": return "Atendido";
      case "in_progress": return "Em atendimento";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  const renderMonthView = () => {
    const start = startOfWeek(startOfMonth(viewDate));
    const end = endOfWeek(endOfMonth(viewDate));
    const days = eachDayOfInterval({ start, end });

    return (
      <Card className="h-full overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/30">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, i) => (
            <div
              key={day}
              className={cn(
                "py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b",
                (i === 0 || i === 6) && "text-muted-foreground/60"
              )}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr h-[calc(100%-44px)]">
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDate(day);
            const isCurrentMonth = isSameMonth(day, viewDate);
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            
            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[90px] p-2 border-b border-r last:border-r-0 transition-colors",
                  "hover:bg-accent/30 cursor-pointer",
                  !isCurrentMonth && "bg-muted/20",
                  isWeekend && "bg-muted/40 cursor-not-allowed",
                  isToday(day) && "bg-primary/5"
                )}
                onClick={() => !isWeekend && handleSlotClick(setHours(day, 9))}
              >
                <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium mb-1",
                  isToday(day) 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : !isCurrentMonth 
                      ? "text-muted-foreground" 
                      : "text-foreground"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayAppointments.slice(0, 2).map((apt) => {
                    const styles = getTypeStyles(apt.type, apt.status);
                    return (
                      <div 
                        key={apt.id} 
                        onClick={(e) => handleAppointmentClick(e, apt)}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-md border truncate cursor-pointer transition-all hover:shadow-sm",
                          styles.bg, styles.border, styles.text
                        )}
                      >
                        <span className="font-semibold">{apt.time.slice(0, 5)}</span>
                        <span className="mx-1">·</span>
                        <span>{getPatientName(apt.patientId).split(' ')[0]}</span>
                      </div>
                    );
                  })}
                  {dayAppointments.length > 2 && (
                    <div className="text-[10px] text-muted-foreground font-medium pl-1">
                      +{dayAppointments.length - 2} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const renderTimeGridView = (days: Date[]) => {
    const hours = Array.from({ length: 9 }, (_, i) => i + 9);

    return (
      <Card className="flex flex-col h-full overflow-hidden">
        <div 
          className="grid border-b bg-muted/20 sticky top-0 z-10"
          style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}
        >
          <div className="py-3 px-2 text-center text-[10px] text-muted-foreground font-medium border-r flex items-end justify-center pb-2">
            <Clock className="h-3 w-3" />
          </div>
          {days.map((day) => (
            <div
              key={day.toString()}
              className={cn(
                "py-2 text-center border-r last:border-r-0",
                isToday(day) && "bg-primary/5"
              )}
            >
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div
                className={cn(
                  "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-base font-bold transition-colors",
                  isToday(day)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <div className="grid" style={{ gridTemplateColumns: `60px repeat(${days.length}, 1fr)` }}>
            <div className="border-r bg-muted/10">
              {hours.map((hour, i) => (
                <div 
                  key={hour} 
                  className={cn(
                    "h-24 border-b text-right pr-2 pt-1 text-xs font-medium text-muted-foreground relative",
                    i % 2 === 0 && "bg-muted/5"
                  )}
                >
                  <span className="relative -top-2">{String(hour).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {days.map((day) => {
              const dayAppointments = getAppointmentsForDate(day);
              return (
                <div key={day.toString()} className="border-r last:border-r-0 relative">
                  {hours.map((hour, i) => (
                    <div 
                      key={hour} 
                      className={cn(
                        "h-24 border-b border-muted/40 hover:bg-accent/20 cursor-pointer transition-colors",
                        i % 2 === 0 && "bg-muted/5"
                      )}
                      onClick={() => handleSlotClick(setHours(day, hour))}
                    />
                  ))}
                  
                  {(() => {
                    const groupedAppointments: Record<string, Appointment[]> = {};
                    dayAppointments.forEach(apt => {
                      if (!groupedAppointments[apt.time]) {
                        groupedAppointments[apt.time] = [];
                      }
                      groupedAppointments[apt.time].push(apt);
                    });

                    return Object.entries(groupedAppointments).map(([time, appointmentsAtTime]) => {
                      const [hourStr, minStr] = time.split(':');
                      const hour = parseInt(hourStr, 10);
                      const minutes = parseInt(minStr, 10);
                      const topOffset = (hour - 9 + minutes / 60) * 6;
                      const height = 5.5;
                      
                      if (hour < 9 || hour > 17) return null;
                      
                      const count = appointmentsAtTime.length;
                      const cardHeight = 1.8;
                      
                      return appointmentsAtTime.map((apt, index) => {
                        const styles = getTypeStyles(apt.type, apt.status);
                        const patientName = getPatientName(apt.patientId);
                        const firstName = patientName.split(' ')[0];
                        const cardTop = topOffset + (index * cardHeight);

                        return (
                          <div
                            key={apt.id}
                            className="absolute left-0 right-0 px-0.5 z-10"
                            style={{ 
                              top: `${cardTop}rem`, 
                              height: `${cardHeight}rem`,
                            }}
                            onClick={(e) => handleAppointmentClick(e, apt)}
                          >
                            <div 
                              className={cn(
                                "h-full w-full rounded border-l-3 px-2 py-1 text-xs flex items-center gap-2 cursor-pointer transition-all hover:shadow-md overflow-hidden",
                                styles.bg, styles.border
                              )}
                            >
                              <div className={cn("h-4 w-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white", styles.dot)}>
                                {firstName.charAt(0).toUpperCase()}
                              </div>
                              <span className={cn("font-medium truncate text-[11px]", styles.text)}>
                                {firstName}
                              </span>
                              <span className="text-muted-foreground text-[10px]">·</span>
                              <span className={cn("text-[10px] truncate", styles.text)}>
                                {getTypeLabel(apt.type)}
                              </span>
                              <span className={cn("text-[11px] font-bold ml-auto flex-shrink-0", styles.text)}>
                                {apt.time.slice(0, 5)}
                              </span>
                              {apt.status !== "scheduled" && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3 flex-shrink-0">
                                  {getStatusLabel(apt.status)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      });
                    });
                  })()}
                  
                  {isToday(day) && (
                    <div 
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{ top: `${(new Date().getHours() - 9 + new Date().getMinutes()/60) * 6}rem` }}
                    >
                      <div className="h-3 w-3 rounded-full bg-red-500 shadow-md -ml-1.5" />
                      <div className="flex-1 h-0.5 bg-red-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col h-full p-6 gap-4">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground capitalize">
                {format(viewDate, "MMMM yyyy", { locale: ptBR })}
              </h1>
              <p className="text-xs text-muted-foreground">
                {viewMode === "week" && `Semana de ${format(startOfWeek(viewDate), "d 'de' MMMM", { locale: ptBR })}`}
                {viewMode === "day" && format(viewDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                {viewMode === "month" && `${(appointments || []).filter(a => isSameMonth(parseISO(a.date), viewDate)).length} agendamentos`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-muted/50 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                className="h-8 w-8"
                data-testid="button-previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleToday}
                className="h-8 px-3 text-xs font-medium"
                data-testid="button-today"
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="h-8 w-8"
                data-testid="button-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex bg-muted/50 rounded-lg p-1">
              {[
                { mode: "month" as ViewMode, label: "Mês" },
                { mode: "week" as ViewMode, label: "Semana" },
                { mode: "day" as ViewMode, label: "Dia" },
              ].map(({ mode, label }) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className="h-8 text-xs"
                  data-testid={`button-view-${mode}`}
                >
                  {label}
                </Button>
              ))}
            </div>
             
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => { 
                    setEditingAppointment(null);
                    setSelectedSlot(new Date()); 
                  }} 
                  className="h-9 shadow-sm" 
                  data-testid="button-new-appointment"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> 
                  Novo Agendamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingAppointment ? "Detalhes do Agendamento" : "Novo Agendamento"}</DialogTitle>
                </DialogHeader>
                <AppointmentForm 
                  defaultDate={selectedSlot || new Date()} 
                  appointment={editingAppointment}
                  onSuccess={() => setIsDialogOpen(false)} 
                />
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="flex-1 min-h-0">
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderTimeGridView(eachDayOfInterval({ start: startOfWeek(viewDate), end: endOfWeek(viewDate) }).filter(d => d.getDay() !== 0 && d.getDay() !== 6))}
          {viewMode === "day" && renderTimeGridView([viewDate])}
        </div>
      </div>
    </Shell>
  );
}
