import { useState } from "react";
import {
  useGetEvent,
  useListEventFunctions,
  useListGuestRoomBlocks,
  useListEventContacts,
  useAddEventContact,
  useRemoveEventContact,
  useListContacts,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, DollarSign, Utensils, TrendingUp, Plus, MoreHorizontal, Copy, XCircle, Eye, Trash2, UserPlus, BedDouble, Users, CheckCircle2, Circle, CalendarDays, Clock, StickyNote, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { formatDateOnly } from "@/lib/date";

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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: event, isLoading } = useGetEvent(eventId, { query: { enabled: !!eventId } as any });
  const { data: functions } = useListEventFunctions(eventId, { query: { enabled: !!eventId } as any });
  const { data: lifecycle } = useQuery<LifecycleData>({
    queryKey: ["/api/events", eventId, "lifecycle"],
    queryFn: () => fetch(`/api/events/${eventId}/lifecycle`).then(r => r.json()),
    enabled: !!eventId,
  });

  const { data: roomBlocks } = useListGuestRoomBlocks(
    { eventId },
    { query: { enabled: !!eventId } as any }
  );

  const { data: eventContacts, isLoading: contactsLoading } = useListEventContacts(
    eventId,
    { query: { enabled: !!eventId } as any }
  );

  const { data: allContacts } = useListContacts(
    {},
    { query: { enabled: true } as any }
  );

  const addEventContact = useAddEventContact();
  const removeEventContact = useRemoveEventContact();

  const [addContactOpen, setAddContactOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string>("_none_");
  const [contactRole, setContactRole] = useState("");

  const [roomBlockDialogOpen, setRoomBlockDialogOpen] = useState(false);
  const [editingRoomBlockId, setEditingRoomBlockId] = useState<number | null>(null);
  const [roomBlockForm, setRoomBlockForm] = useState({
    blockName: "", startDate: "", departureDate: "", blocked: "", pickup: "", avgRate: "",
  });

  const { data: personnel, isLoading: personnelLoading } = useQuery<{
    id: number; eventId: number; name: string; role: string | null;
    department: string | null; phone: string | null; createdAt: string;
  }[]>({
    queryKey: ["/api/events", eventId, "personnel"],
    queryFn: () => fetch(`/api/events/${eventId}/personnel`).then((r) => r.json()),
    enabled: !!eventId,
  });

  const [personnelDialogOpen, setPersonnelDialogOpen] = useState(false);
  const [personnelForm, setPersonnelForm] = useState({ name: "", role: "", department: "", phone: "" });

  const addPersonnel = useMutation({
    mutationFn: (data: object) =>
      fetch(`/api/events/${eventId}/personnel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "personnel"] });
      setPersonnelDialogOpen(false);
      setPersonnelForm({ name: "", role: "", department: "", phone: "" });
      toast({ title: "Personnel added" });
    },
    onError: () => toast({ title: "Failed to add personnel", variant: "destructive" }),
  });
  const removePersonnel = useMutation({
    mutationFn: (personnelId: number) =>
      fetch(`/api/events/${eventId}/personnel/${personnelId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "personnel"] });
      toast({ title: "Personnel removed" });
    },
    onError: () => toast({ title: "Failed to remove personnel", variant: "destructive" }),
  });

  // ── Notes ──────────────────────────────────────────────────
  const { data: eventNotes, isLoading: notesLoading } = useQuery<{
    id: number; relatedType: string; relatedId: number; noteText: string;
    salesperson: string | null; internal: boolean; createdAt: string;
  }[]>({
    queryKey: ["/api/notes", { relatedType: "Event", relatedId: eventId }],
    queryFn: () => fetch(`/api/notes?relatedType=Event&relatedId=${eventId}`).then(r => r.json()),
    enabled: !!eventId,
  });
  const [newNoteText, setNewNoteText] = useState("");
  const [noteInternal, setNoteInternal] = useState(false);
  const addNote = useMutation({
    mutationFn: (data: object) =>
      fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNewNoteText("");
      setNoteInternal(false);
      toast({ title: "Note added" });
    },
    onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
  });
  const deleteNote = useMutation({
    mutationFn: (id: number) => fetch(`/api/notes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Note deleted" });
    },
  });

  // ── Tasks ──────────────────────────────────────────────────
  const { data: eventTasks, isLoading: tasksLoading } = useQuery<{
    id: number; name: string; priority: string; description: string | null;
    relatedType: string | null; relatedId: number | null; salesperson: string | null;
    dueDate: string | null; status: string; createdAt: string;
  }[]>({
    queryKey: ["/api/tasks", { relatedType: "Event", relatedId: eventId }],
    queryFn: () => fetch(`/api/tasks?relatedType=Event&relatedId=${eventId}`).then(r => r.json()),
    enabled: !!eventId,
  });
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ name: "", priority: "Medium", dueDate: "", salesperson: "", description: "" });
  const addTask = useMutation({
    mutationFn: (data: object) =>
      fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTaskDialogOpen(false);
      setTaskForm({ name: "", priority: "Medium", dueDate: "", salesperson: "", description: "" });
      toast({ title: "Task created" });
    },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });
  const toggleTask = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });
  const deleteTask = useMutation({
    mutationFn: (id: number) => fetch(`/api/tasks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted" });
    },
  });

  // ── Appointments ───────────────────────────────────────────
  const { data: eventAppts, isLoading: apptsLoading } = useQuery<{
    id: number; name: string; startDatetime: string | null; endDatetime: string | null;
    relatedType: string | null; relatedId: number | null; category: string | null;
    salesperson: string | null; result: string | null; contactName: string | null; createdAt: string;
  }[]>({
    queryKey: ["/api/appointments", { relatedType: "Event", relatedId: eventId }],
    queryFn: () => fetch(`/api/appointments?relatedType=Event&relatedId=${eventId}`).then(r => r.json()),
    enabled: !!eventId,
  });
  const [apptDialogOpen, setApptDialogOpen] = useState(false);
  const [apptForm, setApptForm] = useState({ name: "", startDatetime: "", endDatetime: "", category: "", salesperson: "", result: "" });
  const addAppt = useMutation({
    mutationFn: (data: object) =>
      fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setApptDialogOpen(false);
      setApptForm({ name: "", startDatetime: "", endDatetime: "", category: "", salesperson: "", result: "" });
      toast({ title: "Appointment created" });
    },
    onError: () => toast({ title: "Failed to create appointment", variant: "destructive" }),
  });
  const deleteAppt = useMutation({
    mutationFn: (id: number) => fetch(`/api/appointments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Appointment deleted" });
    },
  });

  const rbQueryKey = ["/api/guest-room-blocks"];
  const createRoomBlock = useMutation({
    mutationFn: (data: object) =>
      fetch("/api/guest-room-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbQueryKey });
      setRoomBlockDialogOpen(false);
      toast({ title: "Room block added" });
    },
    onError: () => toast({ title: "Failed to add room block", variant: "destructive" }),
  });
  const updateRoomBlock = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) =>
      fetch(`/api/guest-room-blocks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbQueryKey });
      setRoomBlockDialogOpen(false);
      toast({ title: "Room block updated" });
    },
    onError: () => toast({ title: "Failed to update room block", variant: "destructive" }),
  });
  const deleteRoomBlock = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/guest-room-blocks/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rbQueryKey });
      toast({ title: "Room block removed" });
    },
    onError: () => toast({ title: "Failed to remove room block", variant: "destructive" }),
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
            <button
              key={section}
              onClick={() => document.getElementById(`section-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="block w-full text-left px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {section}
            </button>
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
                              {formatDateOnly(event.startDate as string, "long")}
                            </Link>
                          : <span className="font-medium">TBD</span>}
                      </DetailField>
                      <DetailField label="End Date">
                        <span className="font-medium">
                          {formatDateOnly(event.endDate as string, "long")}
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
                                  <Link href={`/events/${eventId}/functions/${fn.id}`} title="View Function Detail" className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <Eye className="w-3 h-3" />
                                  </Link>
                                  <Link href={`/events/${eventId}/functions/${fn.id}/edit`} title="Edit Function" className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <Edit className="w-3 h-3" />
                                  </Link>
                                  <Link href={`/events/${eventId}/functions/${fn.id}/services`} title="Service Menus (BEO)" className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <Utensils className="w-3 h-3" />
                                  </Link>
                                  <Link href={`/events/${eventId}/functions/${fn.id}/financials`} title="Function Financial Details" className="inline-flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                    <DollarSign className="w-3 h-3" />
                                  </Link>
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

              if (section === "Guest Room Blocks") {
                const fmtDate = (d: string | null | undefined) =>
                  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                const pickupPct = (blocked: number | null | undefined, pickup: number | null | undefined) => {
                  if (!blocked || pickup == null) return "—";
                  return `${Math.round((pickup / blocked) * 100)}%`;
                };
                const openAdd = () => {
                  setEditingRoomBlockId(null);
                  setRoomBlockForm({ blockName: "", startDate: "", departureDate: "", blocked: "", pickup: "", avgRate: "" });
                  setRoomBlockDialogOpen(true);
                };
                const openEdit = (block: NonNullable<typeof roomBlocks>[number]) => {
                  setEditingRoomBlockId(block.id);
                  setRoomBlockForm({
                    blockName: block.blockName ?? "",
                    startDate: block.startDate ?? "",
                    departureDate: block.departureDate ?? "",
                    blocked: block.blocked != null ? String(block.blocked) : "",
                    pickup: block.pickup != null ? String(block.pickup) : "",
                    avgRate: block.avgRate != null ? String(block.avgRate) : "",
                  });
                  setRoomBlockDialogOpen(true);
                };
                const handleSaveBlock = () => {
                  const payload = {
                    eventId,
                    blockName: roomBlockForm.blockName,
                    startDate: roomBlockForm.startDate || null,
                    departureDate: roomBlockForm.departureDate || null,
                    blocked: roomBlockForm.blocked ? parseInt(roomBlockForm.blocked) : null,
                    pickup: roomBlockForm.pickup ? parseInt(roomBlockForm.pickup) : null,
                    avgRate: roomBlockForm.avgRate ? roomBlockForm.avgRate : null,
                  };
                  if (editingRoomBlockId != null) {
                    updateRoomBlock.mutate({ id: editingRoomBlockId, data: payload });
                  } else {
                    createRoomBlock.mutate(payload);
                  }
                };
                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b">
                      <h2 className="text-lg font-semibold">Guest Room Blocks</h2>
                      <Button size="sm" onClick={openAdd}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Room Block
                      </Button>
                    </div>
                    <Card>
                      {(!roomBlocks || roomBlocks.length === 0) ? (
                        <CardContent className="p-8 text-center text-muted-foreground text-sm">
                          No room blocks for this event.
                        </CardContent>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="text-xs bg-muted/40">
                                <TableHead>Room Type</TableHead>
                                <TableHead>Check-In Date</TableHead>
                                <TableHead>Check-Out Date</TableHead>
                                <TableHead className="text-center">Rooms Blocked</TableHead>
                                <TableHead className="text-center">Rooms Picked Up</TableHead>
                                <TableHead className="text-center">Pickup %</TableHead>
                                <TableHead className="text-right">Rate</TableHead>
                                <TableHead className="w-16"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {roomBlocks.map((block) => (
                                <TableRow key={block.id} className="text-sm">
                                  <TableCell className="font-medium">{block.blockName}</TableCell>
                                  <TableCell className="whitespace-nowrap">{fmtDate(block.startDate)}</TableCell>
                                  <TableCell className="whitespace-nowrap">{fmtDate(block.departureDate)}</TableCell>
                                  <TableCell className="text-center">{block.blocked ?? '—'}</TableCell>
                                  <TableCell className="text-center">{block.pickup ?? '—'}</TableCell>
                                  <TableCell className="text-center">
                                    <span className={
                                      block.blocked && block.pickup != null
                                        ? block.pickup / block.blocked >= 0.8 ? "text-green-600 font-medium" : "text-amber-600 font-medium"
                                        : "text-muted-foreground"
                                    }>
                                      {pickupPct(block.blocked, block.pickup)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {block.avgRate != null ? fmt$(block.avgRate) : '—'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      <button
                                        className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        onClick={() => openEdit(block)}
                                        title="Edit room block"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                        onClick={() => deleteRoomBlock.mutate(block.id)}
                                        title="Remove room block"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>

                    {roomBlockDialogOpen && (
                      <Dialog open onOpenChange={(open) => { if (!open) setRoomBlockDialogOpen(false); }}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>{editingRoomBlockId != null ? "Edit Room Block" : "Add Room Block"}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <div>
                              <Label className="text-xs mb-1.5 block">Room Type</Label>
                              <Input
                                placeholder="e.g. Standard King"
                                value={roomBlockForm.blockName}
                                onChange={(e) => setRoomBlockForm((f) => ({ ...f, blockName: e.target.value }))}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs mb-1.5 block">Check-In Date</Label>
                                <Input
                                  type="date"
                                  value={roomBlockForm.startDate}
                                  onChange={(e) => setRoomBlockForm((f) => ({ ...f, startDate: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1.5 block">Check-Out Date</Label>
                                <Input
                                  type="date"
                                  value={roomBlockForm.departureDate}
                                  onChange={(e) => setRoomBlockForm((f) => ({ ...f, departureDate: e.target.value }))}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs mb-1.5 block">Rooms Blocked</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={roomBlockForm.blocked}
                                  onChange={(e) => setRoomBlockForm((f) => ({ ...f, blocked: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1.5 block">Picked Up</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={roomBlockForm.pickup}
                                  onChange={(e) => setRoomBlockForm((f) => ({ ...f, pickup: e.target.value }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1.5 block">Rate ($)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={roomBlockForm.avgRate}
                                  onChange={(e) => setRoomBlockForm((f) => ({ ...f, avgRate: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setRoomBlockDialogOpen(false)}>Cancel</Button>
                            <Button
                              onClick={handleSaveBlock}
                              disabled={!roomBlockForm.blockName || createRoomBlock.isPending || updateRoomBlock.isPending}
                            >
                              {editingRoomBlockId != null ? "Save Changes" : "Add Block"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                );
              }

              if (section === "Personnel") {
                const ROLE_OPTIONS = [
                  "Catering Manager", "Event Coordinator", "Sales Manager", "Chef",
                  "Banquet Captain", "Room Setup", "Audio Visual Tech", "Security",
                  "Parking Attendant", "Coat Check",
                ];
                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b">
                      <h2 className="text-lg font-semibold">Personnel</h2>
                      <Button size="sm" onClick={() => setPersonnelDialogOpen(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Personnel
                      </Button>
                    </div>
                    <Card>
                      {personnelLoading ? (
                        <CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent>
                      ) : !personnel || personnel.length === 0 ? (
                        <CardContent className="p-8 text-center text-muted-foreground text-sm">
                          No personnel assigned.
                        </CardContent>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="text-xs bg-muted/40">
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {personnel.map((p) => (
                                <TableRow key={p.id} className="text-sm">
                                  <TableCell className="font-medium">{p.name}</TableCell>
                                  <TableCell>
                                    {p.role
                                      ? <Badge variant="outline" className="text-xs">{p.role}</Badge>
                                      : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{p.department ?? '—'}</TableCell>
                                  <TableCell className="text-muted-foreground whitespace-nowrap">{p.phone ?? '—'}</TableCell>
                                  <TableCell>
                                    <button
                                      className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                      onClick={() => removePersonnel.mutate(p.id)}
                                      title="Remove"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>

                    {personnelDialogOpen && (
                      <Dialog open onOpenChange={(open) => { if (!open) { setPersonnelDialogOpen(false); setPersonnelForm({ name: "", role: "", department: "", phone: "" }); } }}>
                        <DialogContent className="max-w-md">
                          <DialogHeader><DialogTitle>Add Personnel</DialogTitle></DialogHeader>
                          <div className="space-y-3 py-2">
                            <div>
                              <Label className="text-xs mb-1.5 block">Name</Label>
                              <Input
                                placeholder="Full name"
                                value={personnelForm.name}
                                onChange={(e) => setPersonnelForm((f) => ({ ...f, name: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5 block">Role</Label>
                              <Select value={personnelForm.role || "_none_"} onValueChange={(v) => setPersonnelForm((f) => ({ ...f, role: v === "_none_" ? "" : v }))}>
                                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none_">— No role —</SelectItem>
                                  {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5 block">Department</Label>
                              <Input
                                placeholder="e.g. Food & Beverage"
                                value={personnelForm.department}
                                onChange={(e) => setPersonnelForm((f) => ({ ...f, department: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5 block">Phone</Label>
                              <Input
                                placeholder="555-0000"
                                value={personnelForm.phone}
                                onChange={(e) => setPersonnelForm((f) => ({ ...f, phone: e.target.value }))}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { setPersonnelDialogOpen(false); setPersonnelForm({ name: "", role: "", department: "", phone: "" }); }}>Cancel</Button>
                            <Button
                              onClick={() => addPersonnel.mutate({ name: personnelForm.name, role: personnelForm.role || null, department: personnelForm.department || null, phone: personnelForm.phone || null })}
                              disabled={!personnelForm.name || addPersonnel.isPending}
                            >
                              Add
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                );
              }

              if (section === "Event Timeline") {
                const fmtTimelineDate = (d: string) =>
                  new Date(d + (d.includes("T") ? "" : "T00:00:00")).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

                type TLItem = { date: string; label: string; sublabel?: string; kind: "created" | "lifecycle" | "event-start" | "event-end" };
                const today = new Date().toISOString().split("T")[0];

                const items: TLItem[] = [];
                if (event.createdAt) {
                  items.push({ date: new Date(event.createdAt).toISOString().split("T")[0], label: "Lead Created", kind: "created" });
                }
                if (lifecycle?.stages) {
                  lifecycle.stages
                    .filter((s) => !!s.dateProcessed)
                    .forEach((s) => items.push({ date: s.dateProcessed!, label: s.action, sublabel: s.eventStatus, kind: "lifecycle" }));
                }
                if (event.startDate) items.push({ date: event.startDate, label: "Event Start", sublabel: event.eventName, kind: "event-start" });
                if (event.endDate && event.endDate !== event.startDate) items.push({ date: event.endDate, label: "Event End", kind: "event-end" });

                items.sort((a, b) => a.date.localeCompare(b.date));

                const isPast = (d: string) => d <= today;

                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Event Timeline</h2>
                    <Card>
                      <CardContent className="p-6">
                        {items.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No timeline data available.</p>
                        ) : (
                          <div className="relative">
                            {/* Vertical line */}
                            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />
                            <div className="space-y-0">
                              {items.map((item, i) => {
                                const done = isPast(item.date);
                                const isEventDay = item.kind === "event-start" || item.kind === "event-end";
                                return (
                                  <div key={i} className="flex gap-4 relative pb-6 last:pb-0">
                                    {/* Icon */}
                                    <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                                      isEventDay
                                        ? done ? "border-blue-500 bg-blue-50 text-blue-600" : "border-blue-300 bg-white text-blue-400"
                                        : done ? "border-green-500 bg-green-50 text-green-600" : "border-muted bg-white text-muted-foreground"
                                    }`}>
                                      {item.kind === "created" && <Clock className="w-4 h-4" />}
                                      {item.kind === "lifecycle" && (done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />)}
                                      {(item.kind === "event-start" || item.kind === "event-end") && <CalendarDays className="w-4 h-4" />}
                                    </div>
                                    {/* Content */}
                                    <div className="flex-1 pt-1.5">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
                                          {item.label}
                                        </span>
                                        {item.sublabel && (
                                          <Badge variant="outline" className={`text-xs ${
                                            item.kind === "lifecycle" && done ? getStatusColor(item.sublabel) : ""
                                          }`}>
                                            {item.sublabel}
                                          </Badge>
                                        )}
                                        {isEventDay && <Badge className="text-xs bg-blue-600 hover:bg-blue-700">Event Day</Badge>}
                                      </div>
                                      <div className={`text-xs mt-0.5 ${done ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                                        {fmtTimelineDate(item.date)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              }

              if (section === "Contacts") {
                const primaryContact = (eventContacts ?? []).find(
                  (ec) => ec.contactRole === "Primary Contact"
                );
                const filtered = (allContacts ?? []).filter((c) => {
                  const q = contactSearch.toLowerCase();
                  if (!q) return true;
                  return (
                    `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
                    (c.email ?? "").toLowerCase().includes(q)
                  );
                });

                const handleAddContact = () => {
                  if (selectedContactId === "_none_") return;
                  addEventContact.mutate(
                    {
                      id: eventId,
                      data: {
                        contactId: Number(selectedContactId),
                        contactRole: contactRole || null,
                      },
                    },
                    {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ["/api/events/{id}/contacts"] });
                        setAddContactOpen(false);
                        setSelectedContactId("_none_");
                        setContactRole("");
                        setContactSearch("");
                        toast({ title: "Contact linked to event" });
                      },
                      onError: (err: any) => {
                        toast({ title: err?.message ?? "Failed to add contact", variant: "destructive" });
                      },
                    }
                  );
                };

                const handleRemove = (contactId: number) => {
                  removeEventContact.mutate(
                    { id: eventId, contactId },
                    {
                      onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ["/api/events/{id}/contacts"] });
                        toast({ title: "Contact removed" });
                      },
                    }
                  );
                };

                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold">Contacts</h2>
                        {primaryContact && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            Primary: <span className="font-medium text-foreground">{primaryContact.contactName}</span>
                          </span>
                        )}
                      </div>
                      <Button size="sm" onClick={() => setAddContactOpen(true)}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Contact
                      </Button>
                    </div>
                    <Card>
                      {contactsLoading ? (
                        <CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent>
                      ) : !eventContacts || eventContacts.length === 0 ? (
                        <CardContent className="p-8 text-center text-muted-foreground text-sm">
                          No contacts linked to this event.
                        </CardContent>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="text-xs bg-muted/40">
                                <TableHead>Name</TableHead>
                                <TableHead>Account</TableHead>
                                <TableHead>Role / Type</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-center">Primary</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {eventContacts.map((ec) => {
                                const isPrimary = ec.contactRole === "Primary Contact";
                                return (
                                  <TableRow key={ec.id} className={`text-sm ${isPrimary ? "bg-green-50/40" : ""}`}>
                                    <TableCell className="font-medium">
                                      <Link
                                        href={`/contacts/${ec.contactId}`}
                                        className="text-primary hover:underline"
                                      >
                                        {ec.contactName ?? `Contact #${ec.contactId}`}
                                      </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {ec.accountName ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                      {ec.contactRole
                                        ? <Badge variant="outline" className={`text-xs ${isPrimary ? "border-green-400 text-green-700 bg-green-50" : ""}`}>{ec.contactRole}</Badge>
                                        : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground whitespace-nowrap">
                                      {ec.phone ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                      {ec.email ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {isPrimary
                                        ? <Badge className="text-xs bg-green-600 hover:bg-green-700">Primary</Badge>
                                        : <span className="text-muted-foreground text-xs">—</span>}
                                    </TableCell>
                                    <TableCell>
                                      <button
                                        className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                        onClick={() => handleRemove(ec.contactId)}
                                        title="Remove contact"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>

                    {addContactOpen && (
                      <Dialog open onOpenChange={() => { setAddContactOpen(false); setContactSearch(""); setSelectedContactId("_none_"); setContactRole(""); }}>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Add Contact to Event</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div>
                              <Label className="text-xs mb-1.5 block">Search Contact</Label>
                              <Input
                                placeholder="Name or email..."
                                value={contactSearch}
                                onChange={(e) => { setContactSearch(e.target.value); setSelectedContactId("_none_"); }}
                              />
                            </div>
                            {contactSearch && (
                              <div className="border rounded-md max-h-48 overflow-y-auto">
                                {filtered.length === 0 ? (
                                  <div className="p-4 text-sm text-center text-muted-foreground">No contacts found</div>
                                ) : (
                                  filtered.slice(0, 20).map((c) => (
                                    <button
                                      key={c.id}
                                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex flex-col ${selectedContactId === String(c.id) ? "bg-primary/10" : ""}`}
                                      onClick={() => setSelectedContactId(String(c.id))}
                                    >
                                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                                      {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                            {!contactSearch && (
                              <div>
                                <Label className="text-xs mb-1.5 block">Or select contact</Label>
                                <Select value={selectedContactId} onValueChange={setSelectedContactId}>
                                  <SelectTrigger><SelectValue placeholder="Choose a contact..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="_none_">— Select contact —</SelectItem>
                                    {(allContacts ?? []).map((c) => (
                                      <SelectItem key={c.id} value={String(c.id)}>
                                        {c.firstName} {c.lastName}{c.email ? ` — ${c.email}` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div>
                              <Label className="text-xs mb-1.5 block">Contact Role</Label>
                              <Select value={contactRole || "_none_"} onValueChange={(v) => setContactRole(v === "_none_" ? "" : v)}>
                                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none_">— No role —</SelectItem>
                                  <SelectItem value="Primary Contact">Primary Contact</SelectItem>
                                  <SelectItem value="Billing Contact">Billing Contact</SelectItem>
                                  <SelectItem value="On-site Contact">On-site Contact</SelectItem>
                                  <SelectItem value="Ceremony Contact">Ceremony Contact</SelectItem>
                                  <SelectItem value="Reception Contact">Reception Contact</SelectItem>
                                  <SelectItem value="Catering Contact">Catering Contact</SelectItem>
                                  <SelectItem value="AV Contact">AV Contact</SelectItem>
                                  <SelectItem value="Coordinator">Coordinator</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { setAddContactOpen(false); setContactSearch(""); setSelectedContactId("_none_"); setContactRole(""); }}>
                              Cancel
                            </Button>
                            <Button
                              onClick={handleAddContact}
                              disabled={selectedContactId === "_none_" || addEventContact.isPending}
                            >
                              Add Contact
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                );
              }

              if (section === "Notes") {
                const priorityColors: Record<string, string> = {
                  High: "text-red-600", Medium: "text-amber-600", Low: "text-muted-foreground",
                };
                const fmtNote = (d: string) =>
                  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b">
                      <h2 className="text-lg font-semibold">Notes</h2>
                    </div>
                    {/* Add note input */}
                    <Card className="mb-4">
                      <CardContent className="p-4 space-y-3">
                        <Textarea
                          placeholder="Add a note..."
                          className="min-h-[80px] resize-none text-sm"
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={noteInternal}
                              onChange={(e) => setNoteInternal(e.target.checked)}
                              className="rounded"
                            />
                            Internal note
                          </label>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!newNoteText.trim()) return;
                              addNote.mutate({
                                relatedType: "Event",
                                relatedId: eventId,
                                noteText: newNoteText.trim(),
                                salesperson: event.salesperson ?? event.owner ?? null,
                                internal: noteInternal,
                              });
                            }}
                            disabled={!newNoteText.trim() || addNote.isPending}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Note
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    {/* Notes list */}
                    {notesLoading ? (
                      <Skeleton className="h-20 w-full" />
                    ) : !eventNotes || eventNotes.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground text-sm">No notes yet.</CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {[...eventNotes].reverse().map((note) => (
                          <Card key={note.id} className={note.internal ? "border-amber-200 bg-amber-50/40" : ""}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm flex-1 whitespace-pre-wrap leading-relaxed">{note.noteText}</p>
                                <button
                                  className="h-6 w-6 flex-shrink-0 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                  onClick={() => deleteNote.mutate(note.id)}
                                  title="Delete note"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                {note.internal && <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">Internal</Badge>}
                                <span className="font-medium">{note.salesperson ?? "Unknown"}</span>
                                <span>·</span>
                                <span>{fmtNote(note.createdAt)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (section === "Tasks") {
                const priorityColor = (p: string) =>
                  p === "High" ? "border-red-400 text-red-700 bg-red-50"
                  : p === "Medium" ? "border-amber-400 text-amber-700 bg-amber-50"
                  : "border-slate-300 text-slate-600";
                const fmtDue = (d: string | null | undefined) =>
                  d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                const isOverdue = (d: string | null | undefined, status: string) =>
                  !!d && d < new Date().toISOString().split("T")[0] && status !== "Completed";
                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b">
                      <h2 className="text-lg font-semibold">Tasks</h2>
                      <Button size="sm" onClick={() => setTaskDialogOpen(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> New Task
                      </Button>
                    </div>
                    <Card>
                      {tasksLoading ? (
                        <CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent>
                      ) : !eventTasks || eventTasks.length === 0 ? (
                        <CardContent className="p-8 text-center text-muted-foreground text-sm">No tasks for this event.</CardContent>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="text-xs bg-muted/40">
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Task Name</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Assigned To</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {eventTasks.map((task) => {
                                const done = task.status === "Completed";
                                const overdue = isOverdue(task.dueDate, task.status);
                                return (
                                  <TableRow key={task.id} className={`text-sm ${done ? "opacity-60" : ""}`}>
                                    <TableCell>
                                      <button
                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                          done ? "border-green-500 bg-green-500 text-white" : "border-muted-foreground/40 hover:border-green-400"
                                        }`}
                                        onClick={() => toggleTask.mutate({ id: task.id, status: done ? "Open" : "Completed" })}
                                        title={done ? "Mark open" : "Mark complete"}
                                      >
                                        {done && <Check className="w-3 h-3" />}
                                      </button>
                                    </TableCell>
                                    <TableCell className={`font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                                      {task.name}
                                      {task.description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{task.description}</p>}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={`text-xs ${priorityColor(task.priority)}`}>{task.priority}</Badge>
                                    </TableCell>
                                    <TableCell className={`whitespace-nowrap ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                      {fmtDue(task.dueDate)}
                                      {overdue && <span className="text-xs ml-1">(overdue)</span>}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{task.salesperson ?? "—"}</TableCell>
                                    <TableCell>
                                      <button
                                        className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                        onClick={() => deleteTask.mutate(task.id)}
                                        title="Delete task"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>

                    {taskDialogOpen && (
                      <Dialog open onOpenChange={(open) => { if (!open) { setTaskDialogOpen(false); setTaskForm({ name: "", priority: "Medium", dueDate: "", salesperson: "", description: "" }); } }}>
                        <DialogContent className="max-w-md">
                          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
                          <div className="space-y-3 py-2">
                            <div>
                              <Label className="text-xs mb-1.5 block">Task Name</Label>
                              <Input placeholder="Task description..." value={taskForm.name} onChange={(e) => setTaskForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs mb-1.5 block">Priority</Label>
                                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm(f => ({ ...f, priority: v }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs mb-1.5 block">Due Date</Label>
                                <Input type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm(f => ({ ...f, dueDate: e.target.value }))} />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5 block">Assigned To</Label>
                              <Input placeholder="Salesperson name" value={taskForm.salesperson} onChange={(e) => setTaskForm(f => ({ ...f, salesperson: e.target.value }))} />
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5 block">Description (optional)</Label>
                              <Textarea placeholder="Additional details..." className="resize-none text-sm" value={taskForm.description} onChange={(e) => setTaskForm(f => ({ ...f, description: e.target.value }))} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { setTaskDialogOpen(false); setTaskForm({ name: "", priority: "Medium", dueDate: "", salesperson: "", description: "" }); }}>Cancel</Button>
                            <Button
                              onClick={() => addTask.mutate({ name: taskForm.name, priority: taskForm.priority, dueDate: taskForm.dueDate || null, salesperson: taskForm.salesperson || null, description: taskForm.description || null, relatedType: "Event", relatedId: eventId, status: "Open" })}
                              disabled={!taskForm.name || addTask.isPending}
                            >Create Task</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                );
              }

              if (section === "Appointments") {
                const fmtAppt = (d: string | null | undefined) => {
                  if (!d) return "—";
                  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
                };
                const APPT_TYPES = ["Call", "Meeting", "Site Visit", "Tasting", "Contract Review", "Follow-up", "Other"];
                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b">
                      <h2 className="text-lg font-semibold">Appointments</h2>
                      <Button size="sm" onClick={() => setApptDialogOpen(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> New Appointment
                      </Button>
                    </div>
                    <Card>
                      {apptsLoading ? (
                        <CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent>
                      ) : !eventAppts || eventAppts.length === 0 ? (
                        <CardContent className="p-8 text-center text-muted-foreground text-sm">No appointments scheduled.</CardContent>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="text-xs bg-muted/40">
                                <TableHead>Subject</TableHead>
                                <TableHead>Date / Time</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Attendees</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {eventAppts.map((appt) => (
                                <TableRow key={appt.id} className="text-sm">
                                  <TableCell className="font-medium">{appt.name}</TableCell>
                                  <TableCell className="whitespace-nowrap text-muted-foreground">{fmtAppt(appt.startDatetime)}</TableCell>
                                  <TableCell>
                                    {appt.category
                                      ? <Badge variant="outline" className="text-xs">{appt.category}</Badge>
                                      : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {appt.contactName ?? appt.salesperson ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                    {appt.result || "—"}
                                  </TableCell>
                                  <TableCell>
                                    <button
                                      className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                                      onClick={() => deleteAppt.mutate(appt.id)}
                                      title="Delete appointment"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </Card>

                    {apptDialogOpen && (
                      <Dialog open onOpenChange={(open) => { if (!open) { setApptDialogOpen(false); setApptForm({ name: "", startDatetime: "", endDatetime: "", category: "", salesperson: "", result: "" }); } }}>
                        <DialogContent className="max-w-md">
                          <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
                          <div className="space-y-3 py-2">
                            <div>
                              <Label className="text-xs mb-1.5 block">Subject</Label>
                              <Input placeholder="e.g. Site Walk – Main Ballroom" value={apptForm.name} onChange={(e) => setApptForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs mb-1.5 block">Start Date / Time</Label>
                                <Input type="datetime-local" value={apptForm.startDatetime} onChange={(e) => setApptForm(f => ({ ...f, startDatetime: e.target.value }))} />
                              </div>
                              <div>
                                <Label className="text-xs mb-1.5 block">End Date / Time</Label>
                                <Input type="datetime-local" value={apptForm.endDatetime} onChange={(e) => setApptForm(f => ({ ...f, endDatetime: e.target.value }))} />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5 block">Type</Label>
                              <Select value={apptForm.category || "_none_"} onValueChange={(v) => setApptForm(f => ({ ...f, category: v === "_none_" ? "" : v }))}>
                                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="_none_">— Select type —</SelectItem>
                                  {APPT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5 block">Attendees</Label>
                              <Input placeholder="e.g. Sarah Johnson, James Whitfield" value={apptForm.salesperson} onChange={(e) => setApptForm(f => ({ ...f, salesperson: e.target.value }))} />
                            </div>
                            <div>
                              <Label className="text-xs mb-1.5 block">Notes</Label>
                              <Textarea className="resize-none text-sm" placeholder="Agenda or notes..." value={apptForm.result} onChange={(e) => setApptForm(f => ({ ...f, result: e.target.value }))} />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { setApptDialogOpen(false); setApptForm({ name: "", startDatetime: "", endDatetime: "", category: "", salesperson: "", result: "" }); }}>Cancel</Button>
                            <Button
                              onClick={() => addAppt.mutate({ name: apptForm.name, startDatetime: apptForm.startDatetime || null, endDatetime: apptForm.endDatetime || null, category: apptForm.category || null, salesperson: apptForm.salesperson || null, result: apptForm.result || null, relatedType: "Event", relatedId: eventId })}
                              disabled={!apptForm.name || addAppt.isPending}
                            >Create Appointment</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                );
              }

              if (section === "Communication History") {
                const commPrimaryContact = (eventContacts ?? []).find(
                  (ec) => ec.contactRole === "Primary Contact"
                );
                return (
                  <div key={section} id={`section-${sectionIdx}`} className="scroll-mt-6">
                    <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Communication History</h2>
                    <CommunicationHistoryPanel
                      relatedType="Event"
                      relatedId={eventId}
                      primaryContactName={commPrimaryContact?.contactName ?? null}
                      primaryContactEmail={null}
                    />
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
                                <TableHead className="whitespace-nowrap min-w-[130px]">Date Processed</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {!lifecycle ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                                    Loading lifecycle stages…
                                  </TableCell>
                                </TableRow>
                              ) : (lifecycle.stages ?? []).length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-sm">
                                    No lifecycle stages configured.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                (lifecycle.stages ?? []).map((stage, i) => {
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
                            {(lifecycle.stages ?? []).filter(s => !!s.dateProcessed).length} of {(lifecycle.stages ?? []).length} stages completed
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
