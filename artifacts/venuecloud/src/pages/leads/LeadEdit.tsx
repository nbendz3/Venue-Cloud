import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

const LEAD_STATUSES = ["New", "Inquiry", "Proposal", "Tentative", "Definite", "Cancelled", "Closed"];
const LEAD_TYPES = ["Internet Inquiry", "Phone", "Walk-in", "Referral", "Trade Show", "Repeat Business", "Other"];
const SITES = ["The Pines Resort", "Mountain Lodge", "Lakeside Venue"];

export default function LeadEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const isNew = id === "new";

  const { data: marketTypes = [] } = useQuery<{id:number;name:string}[]>({ queryKey: ["settings","market-types"], queryFn: () => fetch(`${BASE}/settings/market-types`).then(r=>r.json()) });
  const { data: referralTypes = [] } = useQuery<{id:number;name:string}[]>({ queryKey: ["settings","referral-types"], queryFn: () => fetch(`${BASE}/settings/referral-types`).then(r=>r.json()) });
  const { data: functionTypes = [] } = useQuery<{id:number;name:string}[]>({ queryKey: ["settings","function-types"], queryFn: () => fetch(`${BASE}/settings/function-types`).then(r=>r.json()) });
  const { data: contacts = [] } = useQuery<{id:number;firstName:string;lastName:string}[]>({ queryKey: ["contacts-list"], queryFn: () => fetch(`${BASE}/contacts`).then(r=>r.json()) });

  const { data: existing } = useQuery({
    queryKey: ["leads", id],
    queryFn: () => fetch(`${BASE}/leads/${id}`).then(r => r.json()),
    enabled: !isNew && !!id,
  });

  const [form, setForm] = useState<Record<string, string | boolean>>({
    leadName: "", leadStatus: "Inquiry", site: "The Pines Resort",
    leadType: "", budget: "", probability: "50", decisionDate: "",
    arrivalDate: "", departureDate: "", estimatedAttendance: "",
    referralType: "", functionType: "", description: "",
    owner: "Sarah Johnson", salesperson: "Sarah Johnson", billingNotes: "",
    paymentArrangements: "",
  });

  useEffect(() => { if (existing) setForm(existing as any); }, [existing]);
  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => isNew
      ? fetch(`${BASE}/leads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch(`${BASE}/leads/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (saved) => { qc.invalidateQueries({ queryKey: ["leads"] }); toast.success(isNew?"Lead created":"Lead saved"); navigate(`/leads/${saved.id}`); },
    onError: () => toast.error("Failed to save lead"),
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
        <button onClick={() => navigate(isNew ? "/leads" : `/leads/${id}`)} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold">{isNew ? "New Event Lead" : "Edit Event Lead"}</h1>
      </div>

      <div className="space-y-6">
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Lead Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Lead Name" required><Input value={String(form.leadName||"")} onChange={e=>set("leadName",e.target.value)} /></F>
            <F label="Primary Contact">
              <Select value={String(form.primaryContactId||"")} onValueChange={v=>set("primaryContactId",v)}>
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
            <F label="Lead Status">
              <Select value={String(form.leadStatus||"Inquiry")} onValueChange={v=>set("leadStatus",v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAD_STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Lead Type">
              <Select value={String(form.leadType||"")} onValueChange={v=>set("leadType",v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{LEAD_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Probability (%)"><Input type="number" min="0" max="100" value={String(form.probability||"")} onChange={e=>set("probability",e.target.value)} /></F>
            <F label="Budget ($)"><Input type="number" value={String(form.budget||"")} onChange={e=>set("budget",e.target.value)} /></F>
            <F label="Estimated Attendance"><Input type="number" value={String(form.estimatedAttendance||"")} onChange={e=>set("estimatedAttendance",e.target.value)} /></F>
            <F label="Decision Date"><Input type="date" value={String(form.decisionDate||"")} onChange={e=>set("decisionDate",e.target.value)} /></F>
            <F label="Arrival Date"><Input type="date" value={String(form.arrivalDate||"")} onChange={e=>set("arrivalDate",e.target.value)} /></F>
            <F label="Referral Type">
              <Select value={String(form.referralType||"")} onValueChange={v=>set("referralType",v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="_none_">None</SelectItem>{referralTypes.map(t=><SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Function Type">
              <Select value={String(form.functionType||"")} onValueChange={v=>set("functionType",v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="_none_">None</SelectItem>{functionTypes.map(t=><SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Owner" required><Input value={String(form.owner||"")} onChange={e=>set("owner",e.target.value)} /></F>
            <F label="Salesperson" required><Input value={String(form.salesperson||"")} onChange={e=>set("salesperson",e.target.value)} /></F>
            <div className="col-span-2">
              <F label="Description"><Textarea rows={3} maxLength={2048} value={String(form.description||"")} onChange={e=>set("description",e.target.value)} /></F>
            </div>
          </div>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Billing Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Payment Arrangements">
              <Select value={String(form.paymentArrangements||"")} onValueChange={v=>set("paymentArrangements",v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">None</SelectItem>
                  {["Credit Card on File","Invoice Net 30","50% Deposit Required","Payment in Full at Event"].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Billing Contact">
              <Select value={String(form.billingContactId||"")} onValueChange={v=>set("billingContactId",v)}>
                <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>{contacts.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <div className="col-span-2">
              <F label="Billing Notes"><Textarea rows={2} maxLength={256} value={String(form.billingNotes||"")} onChange={e=>set("billingNotes",e.target.value)} /></F>
            </div>
          </div>
        </section>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={()=>mutation.mutate(form)} disabled={!form.leadName||mutation.isPending}>
          <Save className="h-4 w-4 mr-2" />{mutation.isPending?"Saving…":"Save"}
        </Button>
        <Button variant="outline" onClick={()=>navigate(isNew?"/leads":`/leads/${id}`)}>Save and New Event Lead</Button>
        <Button variant="outline" onClick={()=>navigate(isNew?"/leads":`/leads/${id}`)}>Cancel</Button>
      </div>
    </div>
  );
}
