import { useGetEvent, useListEventFunctions } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, DollarSign, Utensils, TrendingUp, Plus, MoreHorizontal, Copy, XCircle, Eye } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type LifecycleStageRow = {
  action: string;
  eventStatus: string;
  eventStatusPhase: string;
  id: number | null;
  dateProcessed: string | null;
  financialSnapshot: number | null;
};

type LifecycleData = {
  stages: LifecycleStageRow[];
  totalAdjustedCharges: number;
  lifecycleModel: string;
};

const fmt$ = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EventDetail() {
  const params = useParams();
  const eventId = Number(params.id);
  const { data: event, isLoading } = useGetEvent(eventId, { query: { enabled: !!eventId } as any });
  const { data: functions } = useListEventFunctions(eventId, { query: { enabled: !!eventId } as any });
  const { data: lifecycle } = useQuery<LifecycleData>({
    queryKey: ["/api/events", eventId, "lifecycle"],
    queryFn: () => fetch(`/api/events/${eventId}/lifecycle`).then(r => r.json()),
    enabled: !!eventId,
  });

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
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button size="sm" asChild>
                    <Link href={`/events/${eventId}/functions/new`}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> New Function
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline">Edit Functions</Button>
                  <Button size="sm" variant="outline">
                    <Edit className="w-3 h-3 mr-1" /> Mass Edit Selected
                  </Button>
                  <Button size="sm" variant="outline">
                    <Copy className="w-3 h-3 mr-1" /> Copy Selected Functions
                  </Button>
                  <Button size="sm" variant="outline">
                    <XCircle className="w-3 h-3 mr-1" /> Cancel Selected Functions
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="px-2">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Cancel Function</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Print Function Sheet</DropdownMenuItem>
                      <DropdownMenuItem>Export Functions</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  {functions && functions.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="text-xs bg-muted/40">
                            <TableHead className="w-8 px-3"></TableHead>
                            <TableHead className="w-24">Actions</TableHead>
                            <TableHead className="whitespace-nowrap">Start Date</TableHead>
                            <TableHead className="whitespace-nowrap">Start Time</TableHead>
                            <TableHead className="whitespace-nowrap">End Time</TableHead>
                            <TableHead className="whitespace-nowrap">Function Type</TableHead>
                            <TableHead className="whitespace-nowrap">Function Name</TableHead>
                            <TableHead className="whitespace-nowrap">Function #</TableHead>
                            <TableHead className="whitespace-nowrap">Location</TableHead>
                            <TableHead className="whitespace-nowrap">Location Desc.</TableHead>
                            <TableHead className="whitespace-nowrap">Attendance</TableHead>
                            <TableHead className="whitespace-nowrap">Room Rental</TableHead>
                            <TableHead className="whitespace-nowrap">Min. Charge</TableHead>
                            <TableHead className="whitespace-nowrap">Has Services</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {functions.map((fn: any) => (
                            <TableRow key={fn.id} className="text-sm hover:bg-muted/30">
                              <TableCell className="px-3">
                                <input type="checkbox" className="rounded border-gray-300 w-3.5 h-3.5" />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-0.5">
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild title="View Function Detail">
                                    <Link href={`/events/${eventId}/functions/${fn.id}`}>
                                      <Eye className="w-3 h-3" />
                                    </Link>
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild title="Edit Function">
                                    <Link href={`/events/${eventId}/functions/${fn.id}/edit`}>
                                      <Edit className="w-3 h-3" />
                                    </Link>
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild title="Service Menus (BEO)">
                                    <Link href={`/events/${eventId}/functions/${fn.id}/services`}>
                                      <Utensils className="w-3 h-3" />
                                    </Link>
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild title="Financial Details">
                                    <Link href={`/events/${eventId}/functions/${fn.id}/financials`}>
                                      <DollarSign className="w-3 h-3" />
                                    </Link>
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Link href={`/events/${eventId}/functions/${fn.id}`} className="text-primary hover:underline font-medium whitespace-nowrap">
                                  {fn.functionDate || '—'}
                                </Link>
                              </TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">{fn.startTime || '—'}</TableCell>
                              <TableCell className="text-muted-foreground whitespace-nowrap">{fn.endTime || '—'}</TableCell>
                              <TableCell>
                                <Link href={`/events/${eventId}/functions/${fn.id}`} className="text-primary hover:underline whitespace-nowrap">
                                  {fn.functionType || '—'}
                                </Link>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{fn.functionName || fn.functionType || '—'}</TableCell>
                              <TableCell className="font-mono text-xs whitespace-nowrap">{fn.functionNumber || `#${fn.id}`}</TableCell>
                              <TableCell className="whitespace-nowrap">{fn.locationName || '—'}</TableCell>
                              <TableCell className="text-muted-foreground max-w-[140px] truncate" title={fn.locationDescription ?? ''}>
                                {fn.locationDescription || '—'}
                              </TableCell>
                              <TableCell className="text-right">{fn.estimatedAttendance ?? '—'}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {fn.roomRental != null ? `$${Number(fn.roomRental).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {fn.minimumCharge != null ? `$${Number(fn.minimumCharge).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-xs ${fn.hasServices ? 'text-green-700 border-green-300 bg-green-50' : 'text-muted-foreground'}`}>
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

              if (section === "Event Lifecycle") {
                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Event Lifecycle</h2>
                    <Card>
                      <CardContent className="p-0">
                        {/* Total adjusted charges header */}
                        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                          <span className="text-sm font-medium text-muted-foreground">
                            Event Total Adjusted Charges
                          </span>
                          <span className="text-base font-semibold">
                            {lifecycle ? fmt$(lifecycle.totalAdjustedCharges) : "—"}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="text-xs bg-muted/40">
                                <TableHead className="whitespace-nowrap">Action</TableHead>
                                <TableHead className="whitespace-nowrap">Event Status</TableHead>
                                <TableHead className="whitespace-nowrap">Event Status Phase</TableHead>
                                <TableHead className="whitespace-nowrap text-right">Financial Snapshot</TableHead>
                                <TableHead className="whitespace-nowrap">Date Processed</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {!lifecycle ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                                    Loading lifecycle stages…
                                  </TableCell>
                                </TableRow>
                              ) : lifecycle.stages.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                                    No lifecycle stages configured.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                lifecycle.stages.map((stage, i) => {
                                  const isCompleted = !!stage.dateProcessed;
                                  const isCancelled = stage.eventStatusPhase === "Cancelled";
                                  return (
                                    <TableRow
                                      key={i}
                                      className={
                                        isCompleted
                                          ? isCancelled
                                            ? "bg-red-50/50 text-sm"
                                            : "bg-green-50/40 text-sm"
                                          : "text-sm text-muted-foreground"
                                      }
                                    >
                                      <TableCell className="font-medium">
                                        {isCompleted ? (
                                          <span className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCancelled ? "bg-red-500" : "bg-green-500"}`} />
                                            {stage.action}
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                                            {stage.action}
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {isCompleted ? (
                                          <Badge variant="outline" className={`text-xs ${getStatusColor(stage.eventStatus)}`}>
                                            {stage.eventStatus}
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground">{stage.eventStatus}</span>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <span className={isCompleted ? "font-medium" : "text-muted-foreground"}>
                                          {stage.eventStatusPhase}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right font-mono text-sm">
                                        {stage.financialSnapshot != null
                                          ? fmt$(stage.financialSnapshot)
                                          : <span className="text-muted-foreground">—</span>}
                                      </TableCell>
                                      <TableCell>
                                        {stage.dateProcessed
                                          ? <span className="font-medium">{new Date(stage.dateProcessed).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                          : <span className="text-muted-foreground">—</span>}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        {lifecycle && (
                          <div className="px-5 py-2 border-t text-xs text-muted-foreground">
                            Lifecycle Model: <span className="font-medium">{lifecycle.lifecycleModel}</span>
                            {" · "}
                            {lifecycle.stages.filter(s => !!s.dateProcessed).length} of {lifecycle.stages.length} stages completed
                          </div>
                        )}
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
