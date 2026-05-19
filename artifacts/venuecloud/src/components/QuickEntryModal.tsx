import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useListAccounts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar, Users, Building2, CheckSquare, FileText, Zap, X } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

type QuickEntryType = "event" | "lead" | "account" | "contact" | "task";

type Props = {
  open: boolean;
  onClose: () => void;
};

const ENTRY_TYPES: Array<{ id: QuickEntryType; label: string; icon: React.ReactNode; color: string }> = [
  { id: "event", label: "Event", icon: <Calendar className="h-5 w-5" />, color: "text-blue-600 bg-blue-50" },
  { id: "lead", label: "Event Lead", icon: <FileText className="h-5 w-5" />, color: "text-purple-600 bg-purple-50" },
  { id: "account", label: "Account", icon: <Building2 className="h-5 w-5" />, color: "text-green-600 bg-green-50" },
  { id: "contact", label: "Contact", icon: <Users className="h-5 w-5" />, color: "text-orange-600 bg-orange-50" },
  { id: "task", label: "Task", icon: <CheckSquare className="h-5 w-5" />, color: "text-red-600 bg-red-50" },
];

const EVENT_TYPES = [
  "Conference", "Corporate Retreat", "Meeting", "Social",
  "Team Building", "Training", "Wedding", "Banquet",
  "Seminar", "Gala", "Other",
];

function EventQuickForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [form, setForm] = useState({
    eventName: "",
    eventType: "",
    startDate: "",
    endDate: "",
    estimatedAttendance: "",
    owner: "",
  });
  const [accountId, setAccountId] = useState<number | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [showAccountList, setShowAccountList] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const { data: allAccounts } = useListAccounts({});

  const filteredAccounts = (allAccounts ?? []).filter((a) =>
    a.name.toLowerCase().includes(accountSearch.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowAccountList(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const mutation = useMutation({
    mutationFn: (payload: object) =>
      fetch(`${BASE}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: (data) => { toast.success("Event created"); onCreated(data.id); },
    onError: () => toast.error("Failed to create event"),
  });

  const handleSubmit = () => {
    mutation.mutate({
      eventName: form.eventName,
      eventType: form.eventType || undefined,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      estimatedAttendance: form.estimatedAttendance ? parseInt(form.estimatedAttendance) : undefined,
      owner: form.owner || undefined,
      groupMasterAccount: accountSearch || undefined,
      eventStatus: "Tentative",
      site: "The Pines",
    });
  };

  return (
    <div className="space-y-3">
      {/* Event Name */}
      <div>
        <Label className="text-xs mb-1 block">Event Name *</Label>
        <Input
          autoFocus
          placeholder="e.g. Jones Wedding"
          value={form.eventName}
          onChange={(e) => setForm((p) => ({ ...p, eventName: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && form.eventName && handleSubmit()}
        />
      </div>

      {/* Account — searchable */}
      <div ref={accountRef} className="relative">
        <Label className="text-xs mb-1 block">Account</Label>
        <div className="relative">
          <Input
            placeholder="Search accounts…"
            value={accountSearch}
            onChange={(e) => {
              setAccountSearch(e.target.value);
              setAccountId(null);
              setShowAccountList(true);
            }}
            onFocus={() => setShowAccountList(true)}
          />
          {accountId && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => { setAccountId(null); setAccountSearch(""); }}
              tabIndex={-1}
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {showAccountList && accountSearch.length > 0 && filteredAccounts.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-44 overflow-y-auto">
            {filteredAccounts.slice(0, 8).map((acc) => (
              <button
                key={acc.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setAccountId(acc.id);
                  setAccountSearch(acc.name);
                  setShowAccountList(false);
                }}
              >
                {acc.name}
              </button>
            ))}
          </div>
        )}
        {showAccountList && accountSearch.length > 0 && filteredAccounts.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
            No accounts found
          </div>
        )}
      </div>

      {/* Event Type */}
      <div>
        <Label className="text-xs mb-1 block">Event Type</Label>
        <Select value={form.eventType || "_none_"} onValueChange={(v) => setForm((p) => ({ ...p, eventType: v === "_none_" ? "" : v }))}>
          <SelectTrigger><SelectValue placeholder="— Select type —" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none_">— Select type —</SelectItem>
            {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Start / End Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1 block">Start Date</Label>
          <Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">End Date</Label>
          <Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
        </div>
      </div>

      {/* Estimated Attendance / Owner */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1 block">Est. Attendance</Label>
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={form.estimatedAttendance}
            onChange={(e) => setForm((p) => ({ ...p, estimatedAttendance: e.target.value }))}
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Owner</Label>
          <Input
            placeholder="e.g. Jane Smith"
            value={form.owner}
            onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))}
          />
        </div>
      </div>

      <Button
        className="w-full mt-1"
        onClick={handleSubmit}
        disabled={!form.eventName || mutation.isPending}
      >
        {mutation.isPending ? "Creating…" : "Create Event & Open"}
      </Button>
    </div>
  );
}

function LeadQuickForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [form, setForm] = useState({ leadName: "", leadStatus: "Inquiry", decisionDate: "", estimatedAttendance: "" });
  const mutation = useMutation({
    mutationFn: (d: typeof form) =>
      fetch(`${BASE}/leads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: (data) => { toast.success("Lead created"); onCreated(data.id); },
    onError: () => toast.error("Failed to create lead"),
  });
  return (
    <div className="space-y-3">
      <div><Label>Lead Name *</Label><Input value={form.leadName} onChange={(e) => setForm((p) => ({ ...p, leadName: e.target.value }))} placeholder="E.g. Smith Corp Annual Meeting" /></div>
      <div>
        <Label>Status</Label>
        <Select value={form.leadStatus} onValueChange={(v) => setForm((p) => ({ ...p, leadStatus: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["Inquiry", "Proposal Sent", "Follow-Up", "Decision Pending"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Decision Date</Label><Input type="date" value={form.decisionDate} onChange={(e) => setForm((p) => ({ ...p, decisionDate: e.target.value }))} /></div>
        <div><Label>Est. Attendance</Label><Input type="number" value={form.estimatedAttendance} onChange={(e) => setForm((p) => ({ ...p, estimatedAttendance: e.target.value }))} /></div>
      </div>
      <Button className="w-full" onClick={() => mutation.mutate(form)} disabled={!form.leadName || mutation.isPending}>
        {mutation.isPending ? "Creating…" : "Create Lead"}
      </Button>
    </div>
  );
}

function AccountQuickForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [form, setForm] = useState({ accountName: "", accountType: "", city: "", state: "" });
  const mutation = useMutation({
    mutationFn: (d: typeof form) =>
      fetch(`${BASE}/accounts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: (data) => { toast.success("Account created"); onCreated(data.id); },
    onError: () => toast.error("Failed to create account"),
  });
  return (
    <div className="space-y-3">
      <div><Label>Account Name *</Label><Input value={form.accountName} onChange={(e) => setForm((p) => ({ ...p, accountName: e.target.value }))} placeholder="E.g. Acme Corporation" /></div>
      <div>
        <Label>Type</Label>
        <Select value={form.accountType} onValueChange={(v) => setForm((p) => ({ ...p, accountType: v }))}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {["Corporate", "Association", "Government", "Social", "Sports", "Other"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} /></div>
        <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} /></div>
      </div>
      <Button className="w-full" onClick={() => mutation.mutate(form)} disabled={!form.accountName || mutation.isPending}>
        {mutation.isPending ? "Creating…" : "Create Account"}
      </Button>
    </div>
  );
}

function ContactQuickForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", workPhone: "" });
  const mutation = useMutation({
    mutationFn: (d: typeof form) =>
      fetch(`${BASE}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
    onSuccess: (data) => { toast.success("Contact created"); onCreated(data.id); },
    onError: () => toast.error("Failed to create contact"),
  });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
        <div><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
      </div>
      <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
      <div><Label>Work Phone</Label><Input value={form.workPhone} onChange={(e) => setForm((p) => ({ ...p, workPhone: e.target.value }))} /></div>
      <Button className="w-full" onClick={() => mutation.mutate(form)} disabled={!form.firstName || mutation.isPending}>
        {mutation.isPending ? "Creating…" : "Create Contact"}
      </Button>
    </div>
  );
}

function TaskQuickForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [form, setForm] = useState({ taskName: "", priority: "Normal", dueDate: "", assignedTo: "" });
  const mutation = useMutation({
    mutationFn: (d: typeof form) =>
      fetch(`${BASE}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...d, taskStatus: "Open" }) }).then((r) => r.json()),
    onSuccess: (data) => { toast.success("Task created"); onCreated(data.id); },
    onError: () => toast.error("Failed to create task"),
  });
  return (
    <div className="space-y-3">
      <div><Label>Task Name *</Label><Input value={form.taskName} onChange={(e) => setForm((p) => ({ ...p, taskName: e.target.value }))} placeholder="E.g. Send proposal" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Low", "Normal", "High", "Critical"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} /></div>
      </div>
      <div><Label>Assigned To</Label><Input value={form.assignedTo} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))} /></div>
      <Button className="w-full" onClick={() => mutation.mutate(form)} disabled={!form.taskName || mutation.isPending}>
        {mutation.isPending ? "Creating…" : "Create Task"}
      </Button>
    </div>
  );
}

export function QuickEntryModal({ open, onClose }: Props) {
  const [, navigate] = useLocation();
  const [activeType, setActiveType] = useState<QuickEntryType>("event");

  function handleCreated(type: QuickEntryType, id: number) {
    const routes: Record<QuickEntryType, string> = {
      event: `/events/${id}`,
      lead: `/leads/${id}`,
      account: `/accounts/${id}`,
      contact: `/contacts/${id}`,
      task: `/tasks`,
    };
    onClose();
    navigate(routes[type]);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Entry
          </DialogTitle>
        </DialogHeader>

        {/* Type selector */}
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {ENTRY_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveType(t.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-colors ${activeType === t.id ? t.color + " ring-2 ring-offset-1 ring-current" : "text-gray-500 hover:bg-gray-100"}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        {activeType === "event" && <EventQuickForm onCreated={(id) => handleCreated("event", id)} />}
        {activeType === "lead" && <LeadQuickForm onCreated={(id) => handleCreated("lead", id)} />}
        {activeType === "account" && <AccountQuickForm onCreated={(id) => handleCreated("account", id)} />}
        {activeType === "contact" && <ContactQuickForm onCreated={(id) => handleCreated("contact", id)} />}
        {activeType === "task" && <TaskQuickForm onCreated={(id) => handleCreated("task", id)} />}
      </DialogContent>
    </Dialog>
  );
}
