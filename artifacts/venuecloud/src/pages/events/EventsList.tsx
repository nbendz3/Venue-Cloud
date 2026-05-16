import { useListEvents } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";

export function getStatusColor(status: string) {
  switch (status) {
    case 'Definite': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50';
    case 'Tentative': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50';
    case 'New': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
    case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export default function EventsList() {
  const [search, setSearch] = useState("");
  const { data: events, isLoading } = useListEvents({ search });

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-muted-foreground">Manage all property events and functions.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/events/calendar" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Calendar View
          </Link>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between space-y-0 flex-shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search events..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Event Name</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : events?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No events found.
                  </TableCell>
                </TableRow>
              ) : (
                events?.map(event => (
                  <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50 transition-colors group">
                    <TableCell className="text-muted-foreground text-xs">{event.eventNumber || `#${event.id}`}</TableCell>
                    <TableCell>
                      <Link href={`/events/${event.id}`} className="font-semibold text-foreground group-hover:text-primary transition-colors block">
                        {event.eventName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{event.accountName}</TableCell>
                    <TableCell className="text-sm">
                      {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}
                      {event.endDate && event.endDate !== event.startDate ? ` - ${new Date(event.endDate).toLocaleDateString()}` : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(event.eventStatus)}>
                        {event.eventStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {event.estimatedAttendance || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
