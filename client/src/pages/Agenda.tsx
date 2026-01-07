import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
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
    return (appointments || []).filter((apt) => isSameDay(parseISO(apt.date), date));
  };

  const getPatientName = (patientId: string) => {
    const patient = (patients || []).find(p => p.id === patientId);
    return patient?.name || "Paciente";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-700 border-blue-200";
      case "attended": return "bg-green-100 text-green-700 border-green-200";
      case "in_progress": return "bg-amber-100 text-amber-700 border-amber-200";
      case "cancelled": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
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

  const getTypeColor = (type: string, status?: string) => {
    if (status && status !== "scheduled") {
      return getStatusColor(status);
    }
    switch (type) {
      case "consulta": return "bg-blue-100 text-blue-700 border-blue-200";
      case "retorno": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "tirzepatida": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "aplicacao": return "bg-teal-100 text-teal-700 border-teal-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getTypeLabel = (type: string) => {
    const t = type.toLowerCase();
    switch (t) {
      case "consulta": return "Consulta";
      case "retorno": return "Retorno";
      case "tirzepatida":
      case "tizerpatida": return "Aplicação Tirzepatida";
      case "aplicacao": return "Aplicação";
      default: return type;
    }
  };

  const renderMonthView = () => {
    const start = startOfWeek(startOfMonth(viewDate));
    const end = endOfWeek(endOfMonth(viewDate));
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="grid grid-cols-7 gap-px bg-muted/20 border rounded-lg overflow-hidden shadow-sm h-full auto-rows-fr">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            className="bg-muted/10 p-2 text-center text-sm font-semibold text-muted-foreground border-b"
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dayAppointments = getAppointmentsForDate(day);
          const isCurrentMonth = isSameMonth(day, viewDate);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          
          return (
            <div
              key={day.toString()}
              className={cn(
                "min-h-[100px] bg-card p-2 hover:bg-muted/5 transition-colors cursor-pointer border-b border-r",
                !isCurrentMonth && "bg-muted/5 text-muted-foreground",
                isWeekend && "bg-muted/10 pointer-events-none opacity-60"
              )}
              onClick={() => !isWeekend && handleSlotClick(setHours(day, 9))}
            >
              <div className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                   isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
                )}>
                {format(day, "d")}
              </div>
              <div className="mt-2 space-y-1">
                {dayAppointments.slice(0, 3).map((apt) => (
                  <div key={apt.id} onClick={(e) => handleAppointmentClick(e, apt)}>
                    <div className={cn("text-[10px] px-1.5 py-0.5 rounded truncate border", getTypeColor(apt.type, apt.status))}>
                      <span className="font-medium mr-1">{apt.time.slice(0, 5)}</span>
                      {getTypeLabel(apt.type)}
                    </div>
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-muted-foreground pl-1">
                    + {dayAppointments.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTimeGridView = (days: Date[]) => {
    const hours = Array.from({ length: 9 }, (_, i) => i + 9);

    return (
      <div className="flex flex-col h-full border rounded-lg bg-card shadow-sm overflow-hidden">
        <div 
          className="grid border-b bg-muted/10 pr-[var(--scrollbar-width,0px)]" 
          style={{ gridTemplateColumns: `4rem repeat(${days.length}, 1fr)` }}
        >
          <div className="p-2 border-r text-center text-[10px] text-muted-foreground font-medium flex items-end justify-center pb-2">
            GMT-3
          </div>
          {days.map((day) => (
            <div
              key={day.toString()}
              className={cn(
                "p-2 text-center border-r last:border-r-0",
                isToday(day) && "bg-primary/5"
              )}
            >
              <div className="text-xs font-medium text-muted-foreground uppercase">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div
                className={cn(
                  "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-lg font-semibold",
                  isToday(day)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
        
        <div 
          className="flex-1 overflow-y-scroll"
          ref={(el) => {
            if (el) {
              const scrollbarWidth = el.offsetWidth - el.clientWidth;
              el.parentElement?.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
            }
          }}
        >
          <div className="grid" style={{ gridTemplateColumns: `4rem repeat(${days.length}, 1fr)` }}>
             <div className="border-r bg-muted/5">
                {hours.map((hour) => (
                    <div key={hour} className="h-20 border-b text-right pr-2 pt-2 text-xs text-muted-foreground relative">
                        <span className="-top-2.5 relative">{hour}:00</span>
                    </div>
                ))}
             </div>

             {days.map((day) => {
                 const dayAppointments = getAppointmentsForDate(day);
                 return (
                     <div key={day.toString()} className="border-r last:border-r-0 relative group">
                         {hours.map((hour) => (
                             <div 
                                key={hour} 
                                className="h-20 border-b border-muted/30 hover:bg-muted/10 cursor-pointer transition-colors"
                                onClick={() => handleSlotClick(setHours(day, hour))}
                             ></div>
                         ))}
                         
                         {dayAppointments.map((apt) => {
                             const [hourStr, minStr] = apt.time.split(':');
                             const hour = parseInt(hourStr, 10);
                             const minutes = parseInt(minStr, 10);
                             const topOffset = (hour - 9 + minutes / 60) * 5;
                             const height = 2.4;
                             
                             if (hour < 9 || hour > 17) return null;
                             
                             return (
                                 <div
                                     key={apt.id}
                                     className="absolute inset-x-1 p-1 z-10"
                                     style={{ top: `${topOffset}rem`, height: `${height}rem` }}
                                     onClick={(e) => handleAppointmentClick(e, apt)}
                                 >
                                    <div className={cn("h-full w-full rounded border p-2 text-xs flex flex-col gap-1 shadow-sm transition-all hover:brightness-95 cursor-pointer", getTypeColor(apt.type, apt.status))}>
                                      <div className="font-semibold flex justify-between gap-1">
                                        <span className="truncate">{getTypeLabel(apt.type)}</span>
                                        <span>{apt.time.slice(0, 5)}</span>
                                      </div>
                                      <div className="truncate font-medium opacity-90">
                                         {getPatientName(apt.patientId)}
                                      </div>
                                    </div>
                                 </div>
                             );
                         })}
                         
                         {isToday(day) && (
                            <div 
                                className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                                style={{ top: `${(new Date().getHours() - 9 + new Date().getMinutes()/60) * 5}rem` }}
                            >
                                <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-red-500"></div>
                            </div>
                         )}
                     </div>
                 );
             })}
          </div>
        </div>
      </div>
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
      <div className="flex flex-col h-full p-6 space-y-4">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">
              {format(viewDate, "MMMM yyyy", { locale: ptBR })}
            </h1>
            <div className="flex items-center bg-card rounded-md border shadow-sm p-1">
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
                className="h-8 px-3 text-sm font-medium"
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
          </div>

          <div className="flex items-center gap-2">
             <div className="bg-card rounded-md border p-1 shadow-sm flex">
                <Button
                    variant={viewMode === "month" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("month")}
                    className="h-8"
                    data-testid="button-view-month"
                >
                    Mês
                </Button>
                <Button
                    variant={viewMode === "week" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("week")}
                    className="h-8"
                    data-testid="button-view-week"
                >
                    Semana
                </Button>
                <Button
                    variant={viewMode === "day" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("day")}
                    className="h-8"
                    data-testid="button-view-day"
                >
                    Dia
                </Button>
             </div>
             
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => { 
                      setEditingAppointment(null);
                      setSelectedSlot(new Date()); 
                    }} className="shadow-sm" data-testid="button-new-appointment">
                        <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
                    </Button>
                </DialogTrigger>
                <DialogContent>
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
