import { useGetCalendarEvents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, List as ListIcon, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from "date-fns";

export default function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get start/end of the month view (including trailing/leading days to complete weeks)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const { data: events, isLoading } = useGetCalendarEvents({
    start: calendarStart.toISOString(),
    end: calendarEnd.toISOString(),
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4 h-full flex flex-col -m-6 p-6">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Calendar</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-md border bg-card p-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" onClick={today} className="h-8 px-3 font-medium">Today</Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <h2 className="text-xl font-semibold w-48 text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Link href="/events" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
              <ListIcon className="w-4 h-4 mr-2" />
              List View
            </Link>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 border-0 rounded-none shadow-none md:border md:rounded-lg md:shadow-sm">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="grid grid-cols-7 border-b border-border bg-muted/50 flex-shrink-0">
            {weekDays.map(day => (
              <div key={day} className="py-2 text-center text-sm font-semibold text-muted-foreground border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 auto-rows-fr">
            {days.map((day, i) => {
              // Find events that fall on this day
              const dayEvents = events?.filter(e => {
                if (!e.startDate) return false;
                const start = new Date(e.startDate);
                const end = e.endDate ? new Date(e.endDate) : start;
                return day >= start && day <= end;
              }) || [];

              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={day.toISOString()} 
                  className={`border-r border-b p-1 min-h-[100px] flex flex-col ${!isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-card'} ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className={`text-right p-1 text-sm font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {dayEvents.map(event => (
                      <Link 
                        key={`${event.id}-${day.toISOString()}`} 
                        href={`/events/${event.id}`}
                        className={`block text-xs px-2 py-1 rounded truncate shadow-sm transition-colors border ${
                          event.eventStatus === 'Definite' ? 'bg-green-100/80 border-green-200 text-green-900 hover:bg-green-200 dark:bg-green-900/50 dark:border-green-800 dark:text-green-100' :
                          event.eventStatus === 'Tentative' ? 'bg-amber-100/80 border-amber-200 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/50 dark:border-amber-800 dark:text-amber-100' :
                          'bg-blue-100/80 border-blue-200 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/50 dark:border-blue-800 dark:text-blue-100'
                        }`}
                        title={event.eventName}
                      >
                        {event.eventName}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}