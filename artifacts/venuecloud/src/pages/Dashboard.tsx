import { 
  useGetDashboardSummary,
  useGetDashboardTasksToday,
  useGetDashboardEventsToday,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { CalendarDays, Activity } from "lucide-react";
import { formatDateOnly } from "@/lib/date";

type UpcomingEvent = {
  id: number;
  eventName: string;
  startDate: string | null;
  eventStatus: string;
  estimatedAttendance: number | null;
  owner: string | null;
  accountName: string | null;
};

type ActivityItem = {
  id: number;
  kind: "event" | "task" | "lead" | "communication";
  title: string;
  subtitle: string;
  ts: string;
  linkHref: string;
};

function getStatusColor(status: string) {
  switch (status) {
    case "Definite": return "bg-green-100 text-green-800";
    case "Tentative": return "bg-amber-100 text-amber-800";
    case "Actualized": return "bg-blue-100 text-blue-800";
    case "Cancelled": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-700";
  }
}

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: tasks, isLoading: isLoadingTasks } = useGetDashboardTasksToday();
  const { data: events, isLoading: isLoadingEvents } = useGetDashboardEventsToday();

  const { data: upcomingEvents, isLoading: isLoadingUpcoming } = useQuery<UpcomingEvent[]>({
    queryKey: ["/api/dashboard/upcoming-events"],
    queryFn: () => fetch("/api/dashboard/upcoming-events").then(r => r.json()),
  });

  const { data: activityFeed, isLoading: isLoadingActivity } = useQuery<ActivityItem[]>({
    queryKey: ["/api/dashboard/activity-feed"],
    queryFn: () => fetch("/api/dashboard/activity-feed").then(r => r.json()),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Day At A Glance</h1>
        <p className="text-muted-foreground">Here is what's happening today at The Pines Resort.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Events" value={summary?.totalEvents} loading={isLoadingSummary} />
        <StatsCard title="Events This Month" value={summary?.eventsThisMonth} loading={isLoadingSummary} />
        <StatsCard title="Open Leads" value={summary?.openLeads} loading={isLoadingSummary} />
        <StatsCard title="Open Tasks" value={summary?.openTasks} loading={isLoadingSummary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Tasks (Due Today/Overdue)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingTasks ? (
                  <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ) : tasks?.length ? (
                  tasks.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant={t.priority === 'High' ? 'destructive' : 'secondary'}>{t.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.dueDate || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No tasks due today</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Events Starting Today</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingEvents ? (
                  <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ) : events?.length ? (
                  events.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link href={`/events/${e.id}`} className="font-medium text-primary hover:underline">{e.eventName}</Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(e.eventStatus)}>{e.eventStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{(e as any).accountName || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No events starting today</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader className="py-4 flex flex-row items-center gap-2">
          <CalendarDays className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-lg">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Name</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUpcoming ? (
                Array(4).fill(0).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell></TableRow>
                ))
              ) : upcomingEvents?.length ? (
                upcomingEvents.map(e => (
                  <TableRow key={e.id} className="hover:bg-muted/40">
                    <TableCell>
                      <Link href={`/events/${e.id}`} className="font-medium text-primary hover:underline">{e.eventName}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateOnly(e.startDate, "medium", "TBD")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getStatusColor(e.eventStatus)}`}>{e.eventStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{e.estimatedAttendance ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{e.owner || "—"}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No upcoming events</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Activity Feed */}
      <Card>
        <CardHeader className="py-4 flex flex-row items-center gap-2">
          <Activity className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingActivity ? (
            <div className="p-4 space-y-3">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : activityFeed?.length ? (
            <div className="divide-y">
              {activityFeed.map((item) => (
                <div key={`${item.kind}-${item.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30">
                  <KindDot kind={item.kind} />
                  <div className="flex-1 min-w-0">
                    <Link href={item.linkHref} className="font-medium text-sm hover:underline text-foreground">
                      {item.title}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {new Date(item.ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">No recent activity</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KindDot({ kind }: { kind: string }) {
  const colors: Record<string, string> = {
    event: "bg-blue-500",
    task: "bg-amber-500",
    lead: "bg-purple-500",
    communication: "bg-green-500",
  };
  const labels: Record<string, string> = {
    event: "Event",
    task: "Task",
    lead: "Lead",
    communication: "Comm",
  };
  return (
    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[kind] ?? "bg-gray-400"}`} />
      <span className="text-[9px] text-muted-foreground">{labels[kind] ?? kind}</span>
    </div>
  );
}

function StatsCard({ title, value, loading }: { title: string, value?: number, loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
