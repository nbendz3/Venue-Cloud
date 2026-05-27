import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetEvent, useListEventFunctions, useGetFunction, useGetFunctionMenus } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Edit, DollarSign, MoreHorizontal, Plus, Utensils,
  Users, Clock, FileText, CheckSquare, Calendar, MessageSquare,
  Paperclip, BookOpen, ChevronRight, Printer,
} from "lucide-react";
import { CommunicationHistoryPanel } from "@/components/CommunicationHistoryPanel";

const SECTIONS = [
  "Function Details", "Personnel", "Function Timeline", "Services",
  "Notes", "Tasks", "Appointments", "Communication History",
  "Function Booking Details", "Attachments", "Last Updated",
];

const SECTION_ICONS = [
  FileText, Users, Clock, Utensils, BookOpen, CheckSquare,
  Calendar, MessageSquare, BookOpen, Paperclip, Clock,
];

function fmt(val: string | number | null | undefined) {
  if (val === null || val === undefined || val === "") return "—";
  const n = parseFloat(String(val));
  if (isNaN(n)) return String(val);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Field({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm font-medium">
        {value === null || value === undefined || value === "" ? "—" :
          typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
      </div>
    </div>
  );
}

export default function FunctionDetail() {
  const params = useParams<{ id: string; functionId: string }>();
  const eventId = Number(params.id);
  const functionId = Number(params.functionId);
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState(0);

  const { data: event } = useGetEvent(eventId, { query: { enabled: !!eventId } as any });
  const { data: functions } = useListEventFunctions(eventId, { query: { enabled: !!eventId } as any });
  const { data: fn, isLoading } = useGetFunction(functionId, { query: { enabled: !!functionId } as any });
  const { data: menus } = useGetFunctionMenus(functionId, { query: { enabled: !!functionId } as any });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-4" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!fn) {
    return <div className="p-8 text-center text-muted-foreground">Function not found.</div>;
  }

  const fnDisplay = `${fn.functionType ?? "Function"}: ${event?.eventName ?? ""} - ${fn.functionDate ?? ""} - ${(fn as any).functionNumber ?? `#${fn.id}`} - ${(fn as any).location ?? ""}`;

  return (
    <div className="flex h-full -m-6">
      {/* Left Navigation Sidebar */}
      <div className="w-56 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href={`/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
            <ArrowLeft className="w-4 h-4" /> {event?.eventName ?? "Back"}
          </Link>
          <div className="font-semibold text-orange-700">{fn.functionType ?? "Function"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{(fn as any).functionNumber ?? `#${fn.id}`}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SECTIONS.map((section, idx) => {
            const Icon = SECTION_ICONS[idx];
            return (
              <a
                key={section}
                href={`#fn-section-${idx}`}
                onClick={() => setActiveSection(idx)}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  activeSection === idx
                    ? "bg-orange-50 text-orange-700 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {section}
              </a>
            );
          })}
          <div className="border-t my-2" />
          <Link
            href={`/events/${eventId}/functions/${functionId}/services`}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Utensils className="w-3.5 h-3.5" /> Service Menus (BEO)
          </Link>
          <Link
            href={`/events/${eventId}/functions/${functionId}/financials`}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <DollarSign className="w-3.5 h-3.5" /> Financial Details
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Top bar with orange accent */}
        <div className="border-b-4 border-orange-500 bg-orange-50 flex-shrink-0">
          {/* Breadcrumb */}
          <div className="px-6 pt-2 pb-1 flex items-center gap-2 text-xs text-orange-700">
            <Link href="/events" className="hover:underline">Events</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/events/${eventId}`} className="hover:underline">{event?.eventName ?? `Event #${eventId}`}</Link>
            {(event as any)?.masterEventName && (
              <>
                <span className="text-orange-400">|</span>
                <span>Master: </span>
                <Link href={`/master-events/${(event as any).masterEventId}`} className="hover:underline">
                  {(event as any).masterEventName}
                </Link>
              </>
            )}
          </div>

          {/* Function Picker Sub-Header */}
          <div className="px-6 pb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-orange-700 whitespace-nowrap">Show Details for Function:</span>
              <Select
                value={String(functionId)}
                onValueChange={(v) => navigate(`/events/${eventId}/functions/${v}`)}
              >
                <SelectTrigger className="h-7 text-xs border-orange-300 bg-white max-w-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(functions ?? []).map((f: any) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {`${(f as any).functionNumber ?? f.id} - ${f.functionType ?? "Function"} on ${f.functionDate ?? "TBD"} at ${f.startTime ?? "?"}-${f.endTime ?? "?"} in ${(f as any).location ?? "TBD"}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Page Header + Toolbar */}
          <header className="px-6 pb-3 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg text-orange-900">{fnDisplay}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/events/${eventId}/functions/${functionId}/financials`}>
                  <DollarSign className="w-4 h-4 mr-1" /> Financial Details
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/events/${eventId}/functions/${functionId}/edit`}>
                  <Edit className="w-4 h-4 mr-1" /> Edit Function
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem>Cancel Function</DropdownMenuItem>
                  <DropdownMenuItem>Copy Function</DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/events/${eventId}/functions/${functionId}/services`}>Service Menus (New)</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Service Menus (Classic)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-5xl mx-auto space-y-8">

            {/* Section 0: Function Details */}
            <div id="fn-section-0" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-500" /> Function Details
              </h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-3 gap-5">
                  <Field label="Function Type" value={(fn as any).functionType} />
                  <Field label="Function Date" value={(fn as any).functionDate} />
                  <Field label="Function Number" value={(fn as any).functionNumber} />
                  <Field label="Location" value={(fn as any).location} />
                  <Field label="Start Time" value={(fn as any).startTime} />
                  <Field label="End Time" value={(fn as any).endTime} />
                  <Field label="Setup Minutes" value={(fn as any).setupMinutes} />
                  <Field label="Teardown Minutes" value={(fn as any).teardownMinutes} />
                  <Field label="Setup Style" value={(fn as any).setupStyle} />
                  <Field label="Room Rental" value={fmt((fn as any).roomRental)} />
                  <Field label="Estimated Attendance" value={(fn as any).estimatedAttendance} />
                  <Field label="Guaranteed Attendance" value={(fn as any).guaranteedAttendance} />
                  <Field label="Set" value={(fn as any).set} />
                  <Field label="Auto Update Attendance" value={(fn as any).autoUpdateAttendance} />
                  <Field label="Owner" value={(fn as any).owner} />
                  {(fn as any).notes && (
                    <div className="col-span-3">
                      <div className="text-xs text-muted-foreground mb-0.5">Setup Notes</div>
                      <div className="text-sm bg-amber-50 border border-amber-200 rounded-md p-3 whitespace-pre-wrap">
                        {(fn as any).notes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Section 1: Personnel */}
            <div id="fn-section-1" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-orange-500" /> Personnel
                </h2>
                <div className="flex gap-2">
                  <Select>
                    <SelectTrigger className="h-8 w-52 text-xs">
                      <SelectValue placeholder="Personnel Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Banquet Captain","Chef","Bartender","Server","AV Technician","Security","Valet"].map(r =>
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1" /> Add Personnel for Role</Button>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Actions</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Personnel Role</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Mobile Phone</TableHead>
                        <TableHead>Fax Number</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                          No personnel assigned.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Function Timeline */}
            <div id="fn-section-2" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" /> Function Timeline
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Add Timeline Items</Button>
                  <Button size="sm" variant="outline">Edit Timeline Items</Button>
                  <Button size="sm" variant="outline">Copy Timeline Items</Button>
                </div>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Actions</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                          No timeline items added.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Section 3: Services */}
            <div id="fn-section-3" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-orange-500" /> Services
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5 mr-1" /> Print BEO
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/events/${eventId}/functions/${functionId}/services`}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Manage Menus
                    </Link>
                  </Button>
                </div>
              </div>

              {((menus as any[]) ?? []).length > 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Menu Name</TableHead>
                          <TableHead>Pricing Type</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                          <TableHead className="w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {((menus as any[]) ?? []).map((menu: any) => {
                          const itemCount = (menu.serviceTypes ?? []).reduce(
                            (s: number, st: any) => s + (st.items?.length ?? 0), 0
                          );
                          const subtotal = parseFloat(menu.menuTotalCharges ?? "0");
                          return (
                            <TableRow key={menu.id}>
                              <TableCell className="font-medium text-sm">{menu.functionMenuName}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="text-xs">
                                  {menu.pricingType === "A La Carte Pricing" ? "A La Carte" :
                                   menu.pricingType?.includes("Package") ? "Package" : menu.pricingType ?? "—"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {itemCount} item{itemCount !== 1 ? "s" : ""}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">
                                {subtotal > 0 ? `$${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/events/${eventId}/functions/${functionId}/menus/${menu.id}/edit`}>
                                    Edit
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {/* Menus total row */}
                    {(() => {
                      const total = ((menus as any[]) ?? []).reduce(
                        (s: number, m: any) => s + parseFloat(m.menuTotalCharges ?? "0"), 0
                      );
                      return total > 0 ? (
                        <div className="flex justify-end px-4 py-3 border-t bg-muted/30">
                          <div className="flex items-center gap-6 text-sm">
                            <span className="text-muted-foreground">Services Subtotal</span>
                            <span className="font-bold text-base">
                              ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
                    <Utensils className="w-8 h-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No service menus added yet.</p>
                    <Button size="sm" asChild>
                      <Link href={`/events/${eventId}/functions/${functionId}/services`}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add First Menu
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Section 4: Notes */}
            <div id="fn-section-4" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-orange-500" /> Notes
                </h2>
                <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> New Note</Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Actions</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Salesperson</TableHead>
                        <TableHead>Internal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">No notes.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Section 5: Tasks */}
            <div id="fn-section-5" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-orange-500" /> Tasks
                </h2>
                <Button size="sm" asChild>
                  <Link href="/tasks/new"><Plus className="w-3.5 h-3.5 mr-1" /> New Task</Link>
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Actions</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Salesperson</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-sm">No tasks.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Section 6: Appointments */}
            <div id="fn-section-6" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-500" /> Appointments
                </h2>
                <Button size="sm" asChild>
                  <Link href="/appointments/new"><Plus className="w-3.5 h-3.5 mr-1" /> New Appointment</Link>
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Actions</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Start Date/Time</TableHead>
                        <TableHead>End Date/Time</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Salesperson</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">No appointments.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Section 7: Communication History */}
            <div id="fn-section-7" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-500" /> Communication History
              </h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                    <div className="flex gap-2">
                      <Button size="sm">Log Activity</Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/communication/generate-documents/${eventId}`}>Generate Function Document</Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/communication/compose-email/${eventId}`}>Send Function Email</Link>
                      </Button>
                    </div>
                    <div className="flex gap-2 ml-auto flex-wrap">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/communication/generate-documents/${eventId}`}>Generate Event Document</Link>
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/communication/compose-email/${eventId}`}>Send Event Email</Link>
                      </Button>
                      <Button size="sm" variant="ghost">Generate Master Event Document</Button>
                      <Button size="sm" variant="ghost">Send Master Event Email</Button>
                    </div>
                  </div>
                  <CommunicationHistoryPanel relatedType="Function" relatedId={functionId} />
                </CardContent>
              </Card>
            </div>

            {/* Section 8: Function Booking Details */}
            <div id="fn-section-8" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-orange-500" /> Function Booking Details
                </h2>
                <Button size="sm" variant="outline">Edit Booking Details</Button>
              </div>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-4">
                  <Field label="Guest Rooms Block Indicator" value="—" />
                  <Field label="Booking Details Information" value="—" />
                </CardContent>
              </Card>
            </div>

            {/* Section 9: Attachments */}
            <div id="fn-section-9" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-orange-500" /> Attachments
                </h2>
                <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> Attach Files</Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Actions</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Last Updated</TableHead>
                        <TableHead>Last Updated By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">No attachments.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Section 10: Last Updated */}
            <div id="fn-section-10" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" /> Last Updated
              </h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-4">
                  <Field label="Last Updated Date/Time" value={(fn as any).updatedAt ?? "—"} />
                  <Field label="Last Updated By" value="—" />
                  <Field label="Created Date/Time" value={(fn as any).createdAt ?? "—"} />
                  <Field label="Created By" value="—" />
                  <div className="col-span-2">
                    <Button variant="outline" size="sm">View Change History</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
