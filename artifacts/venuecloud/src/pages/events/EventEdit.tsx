import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";
type Event = Record<string, unknown>;

const SITES = ["The Pines Resort", "Mountain Lodge", "Lakeside Venue"];
const STATUSES = ["New", "Inquiry", "Tentative", "Definite", "Event Order", "Actualized", "Cancelled"];
const LIFECYCLE_MODELS = ["Standard", "Wedding", "Corporate", "Social"];

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const isNew = id === "new";

  const { data: eventTypes = [] } = useQuery<{id:number;name:string}[]>({ queryKey: ["settings","event-types"], queryFn: () => fetch(`${BASE}/settings/event-types`).then(r=>r.json()) });
  const { data: eventCategories = [] } = useQuery<{id:number;name:string}[]>({ queryKey: ["settings","event-categories"], queryFn: () => fetch(`${BASE}/settings/event-categories`).then(r=>r.json()) });
  const { data: marketTypes = [] } = useQuery<{id:number;name:string}[]>({ queryKey: ["settings","market-types"], queryFn: () => fetch(`${BASE}/settings/market-types`).then(r=>r.json()) });
  const { data: referralTypes = [] } = useQuery<{id:number;name:string}[]>({ queryKey: ["settings","referral-types"], queryFn: () => fetch(`${BASE}/settings/referral-types`).then(r=>r.json()) });
  const { data: accounts = [] } = useQuery<{id:number;accountName:string}[]>({ queryKey: ["accounts-list"], queryFn: () => fetch(`${BASE}/accounts`).then(r=>r.json()) });
  const { data: contacts = [] } = useQuery<{id:number;firstName:string;lastName:string}[]>({ queryKey: ["contacts-list"], queryFn: () => fetch(`${BASE}/contacts`).then(r=>r.json()) });

  const { data: existing } = useQuery<Event>({
    queryKey: ["events", id],
    queryFn: () => fetch(`${BASE}/events/${id}`).then(r => r.json()),
    enabled: !isNew && !!id,
  });

  const [form, setForm] = useState<Record<string,string|boolean>>({
    eventName: "", eventStatus: "Tentative", site: "The Pines Resort",
    startDate: "", endDate: "", eventType: "", eventCategory: "", marketType: "",
    referralType: "", estimatedAttendance: "", eventNote: "", paymentArrangements: "",
    billingNotes: "", taxExempt: false, owner: "Sarah Johnson", salesperson: "Sarah Johnson",
    eventLifecycleModel: "Standard",
  });

  useEffect(() => { if (existing) setForm(existing as any); }, [existing]);

  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => isNew
      ? fetch(`${BASE}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch(`${BASE}/events/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success(isNew ? "Event created" : "Event saved");
      navigate(`/events/${saved.id}`);
    },
    onError: () => toast.error("Failed to save event"),
  });

  const F = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(isNew ? "/events" : `/events/${id}`)} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold">{isNew ? "New Event" : "Edit Event"}</h1>
      </div>

      <div className="space-y-6">
        {/* Event Details */}
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Event Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Event Name" required><Input value={String(form.eventName??"")} onChange={e=>set("eventName",e.target.value)} /></F>
            <F label="Primary Contact">
              <Select value={String(form.primaryContactId??"")} onValueChange={v=>set("primaryContactId",v)}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>{contacts.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Site" required>
              <Select value={String(form.site||"The Pines Resort")} onValueChange={v=>set("site",v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SITES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Event Status">
              <Select value={String(form.eventStatus||"Tentative")} onValueChange={v=>set("eventStatus",v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Start Date"><Input type="date" value={String(form.startDate||"")} onChange={e=>set("startDate",e.target.value)} /></F>
            <F label="End Date"><Input type="date" value={String(form.endDate||"")} onChange={e=>set("endDate",e.target.value)} /></F>
            <F label="Event Type" required>
              <Select value={String(form.eventType||"")} onValueChange={v=>set("eventType",v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{eventTypes.map(t=><SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Event Category">
              <Select value={String(form.eventCategory||"")} onValueChange={v=>set("eventCategory",v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{eventCategories.map(t=><SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Market Type" required>
              <Select value={String(form.marketType||"")} onValueChange={v=>set("marketType",v)}>
                <SelectTrigger><SelectValue placeholder="Select market" /></SelectTrigger>
                <SelectContent>{marketTypes.map(t=><SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Referral Type">
              <Select value={String(form.referralType||"")} onValueChange={v=>set("referralType",v)}>
                <SelectTrigger><SelectValue placeholder="Select referral" /></SelectTrigger>
                <SelectContent>{referralTypes.map(t=><SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Estimated Attendance"><Input type="number" value={String(form.estimatedAttendance||"")} onChange={e=>set("estimatedAttendance",e.target.value)} /></F>
            <F label="Event Lifecycle Model">
              <Select value={String(form.eventLifecycleModel||"Standard")} onValueChange={v=>set("eventLifecycleModel",v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LIFECYCLE_MODELS.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Owner" required><Input value={String(form.owner||"")} onChange={e=>set("owner",e.target.value)} /></F>
            <F label="Salesperson" required><Input value={String(form.salesperson||"")} onChange={e=>set("salesperson",e.target.value)} /></F>
            {!isNew && <F label="Event Number"><Input value={String(form.eventNumber||"")} disabled className="bg-gray-50" /></F>}
            <div className="col-span-2">
              <F label="Event Note"><Textarea rows={3} value={String(form.eventNote||"")} onChange={e=>set("eventNote",e.target.value)} /></F>
            </div>
          </div>
        </section>

        {/* Billing Details */}
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Billing Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Payment Arrangements">
              <Select value={String(form.paymentArrangements||"")} onValueChange={v=>set("paymentArrangements",v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">None</SelectItem>
                  {["Credit Card on File","Invoice Net 30","Invoice Net 60","50% Deposit Required","Payment in Full at Event"].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Billing Contact">
              <Select value={String(form.billingContactId||"")} onValueChange={v=>set("billingContactId",v)}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>{contacts.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <div className="flex items-center gap-2 pt-4">
              <Checkbox checked={!!form.taxExempt} onCheckedChange={c=>set("taxExempt",!!c)} />
              <Label>Tax Exempt</Label>
            </div>
            <div className="col-span-2">
              <F label="Billing Notes"><Textarea rows={2} maxLength={256} value={String(form.billingNotes||"")} onChange={e=>set("billingNotes",e.target.value)} /></F>
            </div>
          </div>
        </section>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={()=>mutation.mutate(form)} disabled={!form.eventName||mutation.isPending}>
          <Save className="h-4 w-4 mr-2" />{mutation.isPending?"Saving…":"Save"}
        </Button>
        <Button variant="outline" onClick={()=>navigate(isNew?"/events":`/events/${id}`)}>Cancel</Button>
      </div>
    </div>
  );
}
