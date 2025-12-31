import { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
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
  getDay,
  parseISO,
  isSameMonth,
  isToday,
  startOfDay,
  getHours,
  setHours,
  setMinutes,
  addMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useStore, type Appointment, type AppointmentType } from "@/lib/store";
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
  const [viewMode, setViewMode] = useState<ViewMode>("week"); // Default to week view like Google Calendar
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const { appointments } = useStore();

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
    return appointments.filter((apt) => isSameDay(parseISO(apt.date), date));
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
          
          return (
            <div
              key={day.toString()}
              className={cn(
                "min-h-[100px] bg-card p-2 hover:bg-muted/5 transition-colors cursor-pointer border-b border-r",
                !isCurrentMonth && "bg-muted/5 text-muted-foreground"
              )}
              onClick={() => handleSlotClick(setHours(day, 9))} // Default to 9am on click
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
                    <AppointmentBadge appointment={apt} compact />
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
    const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 7am to 9pm (21:00)

    return (
      <div className="flex flex-col h-full border rounded-lg bg-card shadow-sm overflow-hidden">
        {/* Header Grid */}
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
        
        {/* Body Grid with Scroll */}
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
             {/* Time Column */}
             <div className="border-r bg-muted/5">
                {hours.map((hour) => (
                    <div key={hour} className="h-20 border-b text-right pr-2 pt-2 text-xs text-muted-foreground relative">
                        <span className="-top-2.5 relative">{hour}:00</span>
                    </div>
                ))}
             </div>

             {/* Days Columns */}
             {days.map((day) => {
                 const dayAppointments = getAppointmentsForDate(day);
                 return (
                     <div key={day.toString()} className="border-r last:border-r-0 relative group">
                         {/* Grid Lines */}
                         {hours.map((hour) => (
                             <div 
                                key={hour} 
                                className="h-20 border-b border-muted/30 hover:bg-muted/10 cursor-pointer transition-colors"
                                onClick={() => handleSlotClick(setHours(day, hour))}
                             ></div>
                         ))}
                         
                         {/* Appointments Overlay */}
                         {dayAppointments.map((apt) => {
                             const aptDate = parseISO(apt.date);
                             const hour = getHours(aptDate);
                             // Simple positioning: assume standard duration or grid alignment
                             // If hour < 7 or > 21, it might be hidden
                             const topOffset = (hour - 7) * 5; // 5rem per hour (h-20 = 5rem)
                             if (hour < 7 || hour > 21) return null;
                             
                             return (
                                 <div
                                     key={apt.id}
                                     className="absolute inset-x-1 p-1 z-10"
                                     style={{ top: `${topOffset}rem`, height: '4.8rem' }}
                                     onClick={(e) => handleAppointmentClick(e, apt)}
                                 >
                                    <AppointmentBadge appointment={apt} />
                                 </div>
                             );
                         })}
                         
                         {/* Current time indicator (only if today) */}
                         {isToday(day) && (
                            <div 
                                className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                                style={{ top: `${(getHours(new Date()) - 7 + new Date().getMinutes()/60) * 5}rem` }}
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

  return (
    <Shell>
      <div className="flex flex-col h-full p-6 space-y-4">
        <header className="flex items-center justify-between">
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
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={handleToday}
                className="h-8 px-3 text-sm font-medium"
              >
                Hoje
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="h-8 w-8"
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
                >
                    Mês
                </Button>
                <Button
                    variant={viewMode === "week" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("week")}
                    className="h-8"
                >
                    Semana
                </Button>
                <Button
                    variant={viewMode === "day" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("day")}
                    className="h-8"
                >
                    Dia
                </Button>
             </div>
             
             <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => { 
                      setEditingAppointment(null);
                      setSelectedSlot(new Date()); 
                    }} className="shadow-sm hover-elevate">
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
            {viewMode === "week" && renderTimeGridView(eachDayOfInterval({ start: startOfWeek(viewDate), end: endOfWeek(viewDate) }))}
            {viewMode === "day" && renderTimeGridView([viewDate])}
        </div>
      </div>
    </Shell>
  );
}

function AppointmentBadge({ appointment, compact = false }: { appointment: Appointment, compact?: boolean }) {
  const typeColors: Record<AppointmentType, string> = {
    consulta: "bg-blue-100 text-blue-700 border-blue-200",
    retorno: "bg-indigo-100 text-indigo-700 border-indigo-200",
    tirzepatida: "bg-emerald-100 text-emerald-700 border-emerald-200",
    aplicacao: "bg-teal-100 text-teal-700 border-teal-200",
  };

  const typeLabels: Record<AppointmentType, string> = {
    consulta: "Consulta",
    retorno: "Retorno",
    tirzepatida: "Tirzepatida",
    aplicacao: "Aplicação",
  };

  if (compact) {
     return (
        <div className={cn("text-[10px] px-1.5 py-0.5 rounded truncate border", typeColors[appointment.type])}>
            <span className="font-medium mr-1">{format(parseISO(appointment.date), "HH:mm")}</span>
            {typeLabels[appointment.type]}
        </div>
     )
  }

  return (
    <div className={cn("h-full w-full rounded border p-2 text-xs flex flex-col gap-1 shadow-sm transition-all hover:brightness-95 cursor-pointer", typeColors[appointment.type])}>
      <div className="font-semibold flex justify-between">
        <span>{typeLabels[appointment.type]}</span>
        <span>{format(parseISO(appointment.date), "HH:mm")}</span>
      </div>
      <div className="truncate font-medium opacity-90">
         {/* In a real app we would join with patients table to get name */}
         Paciente (ID: {appointment.patientId.slice(0,4)})
      </div>
      <div className="mt-auto truncate opacity-75 text-[10px]">
        {appointment.professional}
      </div>
    </div>
  );
}
