import { 
  useGetDashboardSummary,
  useGetDashboardTasksToday,
  useGetDashboardEventsToday,
  useGetDashboardFunctionsToday
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: tasks, isLoading: isLoadingTasks } = useGetDashboardTasksToday();
  const { data: events, isLoading: isLoadingEvents } = useGetDashboardEventsToday();

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
                      <TableCell className="font-medium text-primary cursor-pointer hover:underline">{e.eventName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          e.eventStatus === 'Definite' ? 'bg-green-100 text-green-800' :
                          e.eventStatus === 'Tentative' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }>{e.eventStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.accountName || 'N/A'}</TableCell>
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
