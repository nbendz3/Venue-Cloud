import { useGetEvent, useListEventFunctions } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, DollarSign, Utensils, TrendingUp, Plus } from "lucide-react";
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

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

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
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-5">
                    {/* LEFT COLUMN */}
                    <div className="space-y-5">
                      <DetailField label="Primary Contact">
                        {(event as any).primaryContactId
                          ? <Link href={`/contacts/${(event as any).primaryContactId}`} className="text-primary hover:underline font-medium">{(event as any).primaryContactName || '—'}</Link>
                          : <span className="font-medium">{(event as any).primaryContactName || '—'}</span>}
                      </DetailField>
                      <DetailField label="Primary Contact Account">
                        <span className="font-medium">{(event as any).accountName || '—'}</span>
                      </DetailField>
                      <DetailField label="Event Name">
                        <span className="font-medium">{event.eventName}</span>
                      </DetailField>
                      <DetailField label="Group Master Account">
                        <span className="font-medium">{(event as any).groupMasterAccount || '—'}</span>
                      </DetailField>
                      <DetailField label="Event Type">
                        <span className="font-medium">{event.eventType || '—'}</span>
                      </DetailField>
                      <DetailField label="Event Category">
                        <span className="font-medium">{(event as any).eventCategory || '—'}</span>
                      </DetailField>
                      <DetailField label="Market Type">
                        <span className="font-medium">{(event as any).marketType || '—'}</span>
                      </DetailField>
                      <DetailField label="Referral Type">
                        <span className="font-medium">{(event as any).referralType || '—'}</span>
                      </DetailField>
                      <DetailField label="Estimated Attendance">
                        <span className="font-medium">{(event as any).estimatedAttendance ?? '—'}</span>
                      </DetailField>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-5">
                      <DetailField label="Owner">
                        <span className="font-medium">{(event as any).owner || '—'}</span>
                      </DetailField>
                      <DetailField label="Salesperson">
                        <span className="font-medium">{(event as any).salesperson || '—'}</span>
                      </DetailField>
                      <DetailField label="Event Number">
                        <span className="font-medium font-mono">{event.eventNumber || '—'}</span>
                      </DetailField>
                      <DetailField label="Start Date">
                        {event.startDate
                          ? <Link href={`/events/calendar`} className="text-primary hover:underline font-medium">
                              {new Date(event.startDate as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </Link>
                          : <span className="font-medium">TBD</span>}
                      </DetailField>
                      <DetailField label="End Date">
                        <span className="font-medium">
                          {event.endDate ? new Date(event.endDate as string).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : '—'}
                        </span>
                      </DetailField>
                      <DetailField label="Event Lifecycle Model">
                        <span className="font-medium">{(event as any).lifecycleModel || '—'}</span>
                      </DetailField>
                      <DetailField label="PMS Group Number">
                        <span className="font-medium">{(event as any).pmsGroupNumber || '—'}</span>
                      </DetailField>
                      <DetailField label="Event Status">
                        <Badge className={getStatusColor(event.eventStatus)}>{event.eventStatus}</Badge>
                      </DetailField>
                      <DetailField label="Site">
                        <span className="font-medium">{(event as any).site || '—'}</span>
                      </DetailField>
                    </div>

                    {/* Event Note — full width */}
                    <div className="col-span-2 border-t pt-4">
                      <DetailField label="Event Note">
                        <p className="font-medium whitespace-pre-wrap text-sm">{(event as any).eventNote || '—'}</p>
                      </DetailField>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 1: Billing Details */}
            <div id="section-1" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Billing Details</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-x-10 gap-y-5">
                    <DetailField label="Payment Arrangements">
                      <span className="font-medium">{(event as any).paymentArrangements || '—'}</span>
                    </DetailField>
                    <DetailField label="Billing Contact">
                      {(event as any).billingContactId
                        ? <Link href={`/contacts/${(event as any).billingContactId}`} className="text-primary hover:underline font-medium">{(event as any).billingContactName || `Contact #${(event as any).billingContactId}`}</Link>
                        : <span className="font-medium">—</span>}
                    </DetailField>
                    <DetailField label="Tax Exempt">
                      <span className="font-medium">{(event as any).taxExempt ? 'Yes' : 'No'}</span>
                    </DetailField>
                    <div className="col-span-2 border-t pt-4">
                      <DetailField label="Billing Notes">
                        <p className="font-medium whitespace-pre-wrap text-sm">{(event as any).billingNotes || '—'}</p>
                      </DetailField>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Functions */}
            <div id="section-2" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold">Functions</h2>
                <div className="flex items-center gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/events/${eventId}/functions/new`}>
                      <TrendingUp className="w-3.5 h-3.5 mr-1" /> New Function
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline">Edit Functions</Button>
                  <Button size="sm" variant="outline">Mass Edit Selected</Button>
                  <Button size="sm" variant="outline">Copy Selected</Button>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  {functions && functions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs">
                            <TableHead className="w-8"></TableHead>
                            <TableHead className="w-20">Actions</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>End Time</TableHead>
                            <TableHead>Function Type</TableHead>
                            <TableHead>Function Name</TableHead>
                            <TableHead>Function #</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Attendance</TableHead>
                            <TableHead>Room Rental</TableHead>
                            <TableHead>Has Services</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {functions.map((fn: any) => (
                            <TableRow key={fn.id} className="text-sm">
                              <TableCell>
                                <input type="checkbox" className="rounded" />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-0.5">
                                  <Button size="sm" variant="ghost" className="h-6 px-1 text-xs" asChild title="Edit">
                                    <Link href={`/events/${eventId}/functions/${fn.id}/edit`}>
                                      <Edit className="w-3 h-3" />
                                    </Link>
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 px-1 text-xs" asChild title="Service Menus (BEO)">
                                    <Link href={`/events/${eventId}/functions/${fn.id}/services`}>
                                      <Utensils className="w-3 h-3" />
                                    </Link>
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 px-1 text-xs" asChild title="Financials">
                                    <Link href={`/events/${eventId}/functions/${fn.id}/financials`}>
                                      <DollarSign className="w-3 h-3" />
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Link href={`/events/${eventId}/functions/${fn.id}`} className="text-primary hover:underline font-medium">
                                  {fn.functionDate || '—'}
                                </Link>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{fn.startTime || '—'}</TableCell>
                              <TableCell className="text-muted-foreground">{fn.endTime || '—'}</TableCell>
                              <TableCell>
                                <Link href={`/events/${eventId}/functions/${fn.id}`} className="text-primary hover:underline">
                                  {fn.functionType || '—'}
                                </Link>
                              </TableCell>
                              <TableCell>{fn.functionName || fn.functionType || '—'}</TableCell>
                              <TableCell className="font-mono text-xs">{fn.functionNumber || `#${fn.id}`}</TableCell>
                              <TableCell>{fn.location || '—'}</TableCell>
                              <TableCell>{fn.estimatedAttendance || fn.expectedAttendance || '—'}</TableCell>
                              <TableCell>{fn.roomRental ? `$${parseFloat(fn.roomRental).toLocaleString()}` : '—'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-xs ${fn.hasServices ? 'text-green-700 border-green-300' : ''}`}>
                                  {fn.hasServices ? 'Yes' : 'No'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No functions added yet.{' '}
                      <Link href={`/events/${eventId}/functions/new`} className="text-primary hover:underline">
                        Add a function
                      </Link>
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
