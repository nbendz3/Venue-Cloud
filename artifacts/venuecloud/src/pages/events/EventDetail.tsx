import { useGetEvent, useListEventFunctions } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, DollarSign, Utensils, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatusColor } from "./EventsList";
import { EventMoreActions } from "@/components/EventMoreActions";
import { CommunicationHistoryPanel } from "@/components/CommunicationHistoryPanel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SECTIONS = [
  "Event Details", "Billing Details", "Functions", "Guest Room Blocks", 
  "Personnel", "Event Timeline", "Contacts", "Event Lifecycle", 
  "Notes", "Tasks", "Appointments", "Communication History", 
  "Sertifi eSignature Details", "Event Booking Details", "Event Attachments", 
  "Function Attachments", "Last Updated"
];

export default function EventDetail() {
  const params = useParams();
  const eventId = Number(params.id);
  const { data: event, isLoading } = useGetEvent(eventId, { query: { enabled: !!eventId } as any });
  const { data: functions } = useListEventFunctions(eventId, { query: { enabled: !!eventId } as any });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!event) {
    return <div className="p-8 text-center text-muted-foreground">Event not found.</div>;
  }

  return (
    <div className="flex h-full -m-6">
      {/* Left Navigation Sidebar */}
      <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
          <div className="font-semibold">{event.eventName}</div>
          <div className="text-xs text-muted-foreground mt-1">{event.eventNumber || `#${event.id}`}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SECTIONS.map((section, idx) => (
            <a 
              key={section} 
              href={`#section-${idx}`}
              className="block px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {section}
            </a>
          ))}
          <div className="border-t my-2" />
          <Link
            href={`/events/${eventId}/financials`}
            className="block px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-2"
          >
            <DollarSign className="w-3.5 h-3.5" /> Financial Details
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{event.eventName}</h1>
            <Badge variant="outline" className={getStatusColor(event.eventStatus)}>
              {event.eventStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/events/${eventId}/financials`}>
                <DollarSign className="w-4 h-4 mr-1" /> Financial Details
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/events/${eventId}/edit`}><Edit className="w-4 h-4 mr-2" /> Edit</Link>
            </Button>
            <EventMoreActions
              eventId={eventId}
              eventName={event.eventName}
              masterEventId={(event as any).masterEventId}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Section 0: Event Details */}
            <div id="section-0" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Event Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Account</div>
                    <div className="font-medium">{event.accountName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Primary Contact</div>
                    <div className="font-medium">{event.primaryContactName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Dates</div>
                    <div className="font-medium">
                      {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}
                      {event.endDate && event.endDate !== event.startDate ? ` - ${new Date(event.endDate).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Event Type</div>
                    <div className="font-medium">{event.eventType || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Market Type</div>
                    <div className="font-medium">{event.marketType || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Est. Attendance</div>
                    <div className="font-medium">{event.estimatedAttendance || '-'}</div>
                  </div>
                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground mb-1">Description / Notes</div>
                    <div className="font-medium whitespace-pre-wrap">{event.eventNote || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 1: Billing Details */}
            <div id="section-1" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Billing Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Payment Arrangements</div>
                    <div className="font-medium">{event.paymentArrangements || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Tax Exempt</div>
                    <div className="font-medium">{event.taxExempt ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground mb-1">Billing Notes</div>
                    <div className="font-medium whitespace-pre-wrap">{event.billingNotes || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Functions */}
            <div id="section-2" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Functions</h2>
              <Card>
                <CardContent className="p-0">
                  {functions && functions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Function</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {functions.map((fn: any) => (
                          <TableRow key={fn.id}>
                            <TableCell className="font-medium">
                              {fn.functionNumber || `#${fn.id}`}
                            </TableCell>
                            <TableCell>{fn.functionType || '—'}</TableCell>
                            <TableCell className="text-sm">{fn.functionDate || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {fn.startTime && fn.endTime ? `${fn.startTime} – ${fn.endTime}` : fn.startTime || '—'}
                            </TableCell>
                            <TableCell className="text-sm">{fn.location || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{fn.functionStatus || 'Active'}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{fn.expectedAttendance || '—'}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" asChild title="BEO / Services">
                                  <Link href={`/events/${eventId}/functions/${fn.id}/services`}>
                                    <Utensils className="w-3.5 h-3.5" />
                                  </Link>
                                </Button>
                                <Button size="sm" variant="ghost" asChild title="Financials">
                                  <Link href={`/events/${eventId}/functions/${fn.id}/financials`}>
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </Link>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No functions added to this event yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Remaining sections — some with real content, rest as placeholders */}
            {SECTIONS.slice(3).map((section, idx) => {
              const sectionIdx = idx + 3;
              if (section === "Communication History") {
                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Communication History</h2>
                    <Card>
                      <CardContent className="p-6">
                        <CommunicationHistoryPanel relatedType="Event" relatedId={eventId} />
                      </CardContent>
                    </Card>
                  </div>
                );
              }
              return (
                <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6 opacity-60">
                  <h2 className="text-lg font-semibold mb-4 pb-2 border-b">{section}</h2>
                  <Card className="bg-muted/30 border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground text-sm">
                      {section} content will render here
                    </CardContent>
                  </Card>
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
}
