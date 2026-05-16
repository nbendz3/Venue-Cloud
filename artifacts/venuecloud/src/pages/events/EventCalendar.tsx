import { useGetCalendarEvents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, List as ListIcon } from "lucide-react";
import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { CalendarLegend, useLifecycleColors, getStatusColor } from "@/components/CalendarLegend";

export default function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const lifecycleColors = useLifecycleColors();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const { data: events } = useGetCalendarEvents({
    start: calendarStart.toISOString(),
    end: calendarEnd.toISOString(),
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="h-full flex flex-col -m-6 p-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Event Calendar</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-md border bg-card p-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={today} className="h-8 px-3 font-medium">Today</Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-xl font-semibold w-48 text-center">{format(currentDate, "MMMM yyyy")}</h2>
          <Link
            href="/events"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <ListIcon className="w-4 h-4 mr-2" />List View
          </Link>
        </div>
      </div>

      {/* Calendar grid */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b bg-muted/50 flex-shrink-0">
            {weekDays.map((day) => (
              <div key={day} className="py-2 text-center text-sm font-semibold text-muted-foreground border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 flex-1 auto-rows-fr">
            {days.map((day) => {
              const dayEvents = events?.filter((e) => {
                if (!e.startDate) return false;
                const start = new Date(e.startDate);
                const end = e.endDate ? new Date(e.endDate) : start;
                return day >= start && day <= end;
              }) ?? [];

              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`border-r border-b p-1 min-h-[90px] flex flex-col ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground" : "bg-card"} ${isToday ? "bg-blue-50/50" : ""}`}
                >
                  <div className={`text-right p-0.5 text-sm font-medium ${isToday ? "text-blue-600" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-0.5">
                    {dayEvents.map((event) => {
                      const colorStyle = getStatusColor(lifecycleColors, event.eventStatus ?? "");
                      return (
                        <Link
                          key={`${event.id}-${day.toISOString()}`}
                          href={`/events/${event.id}`}
                          className="block text-xs px-1.5 py-0.5 rounded truncate shadow-sm transition-opacity hover:opacity-90"
                          style={{ backgroundColor: colorStyle.background, color: colorStyle.color }}
                          title={`${event.eventName} — ${event.eventStatus}`}
                        >
                          {event.eventName}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="border-t px-4 py-2 bg-muted/30 flex-shrink-0">
            <CalendarLegend />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
