import { useGetCalendarEvents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, List as ListIcon, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import {
  format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay,
  startOfWeek, endOfWeek,
} from "date-fns";
import { CalendarLegend, useLifecycleColors, getStatusColor, StatusBadge } from "@/components/CalendarLegend";

type View = "month" | "week" | "day";
type LifecycleColors = ReturnType<typeof useLifecycleColors>;

function normDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function EventChip({ event, lifecycleColors }: { event: any; lifecycleColors: LifecycleColors }) {
  const colorStyle = getStatusColor(lifecycleColors, event.eventStatus ?? "");
  const startDate = event.startDate ? new Date(event.startDate) : null;
  const endDate = event.endDate ? new Date(event.endDate) : null;

  const dateLabel = startDate
    ? endDate && format(normDay(endDate), "yyyy-MM-dd") !== format(normDay(startDate), "yyyy-MM-dd")
      ? `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`
      : format(startDate, "MMM d, yyyy")
    : "—";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="w-full text-left text-xs px-1.5 py-0.5 rounded truncate shadow-sm hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-opacity"
          style={{ backgroundColor: colorStyle.background, color: colorStyle.color }}
        >
          {event.eventName}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3" side="top" align="start">
        <div className="space-y-2.5">
          <div>
            <div className="font-semibold text-sm leading-tight">{event.eventName}</div>
            {event.accountName && (
              <div className="text-xs text-muted-foreground mt-0.5">{event.accountName}</div>
            )}
          </div>
          <div className="text-xs space-y-1.5">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Date</span>
              <span className="font-medium text-right">{dateLabel}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-muted-foreground shrink-0">Status</span>
              <StatusBadge status={event.eventStatus ?? ""} />
            </div>
          </div>
          <div className="pt-2 border-t">
            <Link
              href={`/events/${event.id}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View Event →
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const lifecycleColors = useLifecycleColors();

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);

  const rangeStart =
    view === "month" ? startOfWeek(startOfMonth(currentDate)) :
    view === "week"  ? weekStart :
                       normDay(currentDate);

  const rangeEnd =
    view === "month" ? endOfWeek(endOfMonth(currentDate)) :
    view === "week"  ? weekEnd :
                       normDay(currentDate);

  const { data: events } = useGetCalendarEvents({
    start: rangeStart.toISOString(),
    end: new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59).toISOString(),
  });

  const goNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goPrev = () => {
    if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const weekLabel =
    format(weekStart, "MMM") === format(weekEnd, "MMM")
      ? `${format(weekStart, "MMM d")} – ${format(weekEnd, "d, yyyy")}`
      : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  const dateLabel =
    view === "month" ? format(currentDate, "MMMM yyyy") :
    view === "week"  ? weekLabel :
                       format(currentDate, "EEE, MMM d, yyyy");

  const weekDayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const eventsForDay = (day: Date) => {
    const dayNorm = normDay(day);
    return (
      events?.filter((e) => {
        if (!e.startDate) return false;
        const start = normDay(new Date(e.startDate));
        const end = e.endDate ? normDay(new Date(e.endDate)) : start;
        return dayNorm >= start && dayNorm <= end;
      }) ?? []
    );
  };

  const monthDays = view === "month"
    ? eachDayOfInterval({ start: rangeStart, end: rangeEnd })
    : [];

  const weekViewDays = view === "week"
    ? eachDayOfInterval({ start: weekStart, end: weekEnd })
    : [];

  return (
    <div className="h-full flex flex-col -m-6 p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-3 flex-shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Event Calendar</h1>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center rounded-md border bg-card overflow-hidden text-sm">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  view === v
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center rounded-md border bg-card p-1">
            <Button variant="ghost" size="icon" onClick={goPrev} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={goToday} className="h-8 px-3 font-medium">Today</Button>
            <Button variant="ghost" size="icon" onClick={goNext} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <h2 className="font-semibold text-lg text-center min-w-[160px]">{dateLabel}</h2>

          <Link
            href="/events"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            <ListIcon className="w-4 h-4 mr-2" />List View
          </Link>
        </div>
      </div>

      {/* ── Calendar card ── */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex flex-col h-full">

          {/* ══ MONTH VIEW ══ */}
          {view === "month" && (
            <>
              <div className="grid grid-cols-7 border-b bg-muted/50 flex-shrink-0">
                {weekDayLabels.map((d) => (
                  <div key={d} className="py-2 text-center text-sm font-semibold text-muted-foreground border-r last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {monthDays.map((day) => {
                  const dayEvents = eventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`border-r border-b p-1 min-h-[90px] flex flex-col last:border-r-0
                        ${!isCurrentMonth ? "bg-muted/30 text-muted-foreground" : "bg-card"}
                        ${isToday ? "bg-blue-50/60" : ""}`}
                    >
                      <div className={`text-right p-0.5 text-sm font-medium ${isToday ? "text-blue-600" : ""}`}>
                        {format(day, "d")}
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-0.5">
                        {dayEvents.map((event) => (
                          <EventChip
                            key={`${event.id}-${day.toISOString()}`}
                            event={event}
                            lifecycleColors={lifecycleColors}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ══ WEEK VIEW ══ */}
          {view === "week" && (
            <>
              <div className="grid grid-cols-7 border-b bg-muted/50 flex-shrink-0">
                {weekViewDays.map((day) => {
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`py-2.5 text-center border-r last:border-r-0 ${isToday ? "bg-blue-50" : ""}`}
                    >
                      <div className="text-xs font-medium text-muted-foreground">{format(day, "EEE")}</div>
                      <div className={`text-xl font-semibold mt-0.5 ${isToday ? "text-blue-600" : ""}`}>
                        {format(day, "d")}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-7 flex-1 overflow-y-auto">
                {weekViewDays.map((day) => {
                  const dayEvents = eventsForDay(day);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`border-r last:border-r-0 p-1.5 space-y-1 min-h-[160px]
                        ${isToday ? "bg-blue-50/30" : "bg-card"}`}
                    >
                      {dayEvents.map((event) => (
                        <EventChip
                          key={`${event.id}-${day.toISOString()}`}
                          event={event}
                          lifecycleColors={lifecycleColors}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ══ DAY VIEW ══ */}
          {view === "day" && (
            <div className="flex-1 overflow-y-auto p-5">
              {(() => {
                const dayEvents = eventsForDay(currentDate);
                const isToday = isSameDay(currentDate, new Date());
                if (dayEvents.length === 0) {
                  return (
                    <div className="text-center text-muted-foreground py-20">
                      <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No events {isToday ? "today" : `on ${format(currentDate, "MMMM d, yyyy")}`}</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2 max-w-2xl mx-auto">
                    <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wide font-medium">
                      {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
                      {isToday ? " · Today" : ""}
                    </p>
                    {dayEvents.map((event) => {
                      const colorStyle = getStatusColor(lifecycleColors, event.eventStatus ?? "");
                      const startDate = event.startDate ? new Date(event.startDate) : null;
                      const endDate = event.endDate ? new Date(event.endDate) : null;
                      const dLabel = startDate
                        ? endDate && format(normDay(endDate), "yyyy-MM-dd") !== format(normDay(startDate), "yyyy-MM-dd")
                          ? `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`
                          : format(startDate, "MMM d, yyyy")
                        : "—";
                      return (
                        <div
                          key={event.id}
                          className="flex items-stretch gap-3 p-3 rounded-lg border bg-card hover:bg-accent/20 transition-colors"
                        >
                          <div
                            className="w-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: colorStyle.background }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <div className="font-medium text-sm">{event.eventName}</div>
                                {event.accountName && (
                                  <div className="text-xs text-muted-foreground">{event.accountName}</div>
                                )}
                              </div>
                              <StatusBadge status={event.eventStatus ?? ""} />
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{dLabel}</div>
                          </div>
                          <Link
                            href={`/events/${event.id}`}
                            className="text-xs font-semibold text-primary hover:underline whitespace-nowrap self-center pl-2"
                          >
                            View →
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Legend */}
          <div className="border-t px-4 py-2 bg-muted/30 flex-shrink-0">
            <CalendarLegend />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
