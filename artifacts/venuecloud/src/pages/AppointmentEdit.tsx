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

const BUSINESS_TYPES = ["Event", "Lead", "Account", "Contact", "Master Event"];
const CATEGORIES = ["Sales", "Site Tour", "Service", "Follow-Up", "Presentation", "Meeting", "General"];
const RESULTS = ["Booked", "Not Booked", "Follow-Up", "No Show", "Rescheduled", "Completed"];

export default function AppointmentEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const isNew = id === "new";
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = useQuery({
    queryKey: ["appointments", id],
    queryFn: () => fetch(`${BASE}/appointments/${id}`).then(r => r.json()),
    enabled: !isNew && !!id,
  });

  const [form, setForm] = useState<Record<string, string>>({
    appointmentName: "", salesperson: "Sarah Johnson", businessType: "",
    relatedBusinessName: "", category: "", result: "",
    description: "", startDate: today, startTime: "09:00", endTime: "10:00",
    contactName: "",
  });

  useEffect(() => { if (existing) setForm(existing as any); }, [existing]);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => isNew
      ? fetch(`${BASE}/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch(`${BASE}/appointments/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["appointments"] }); toast.success(isNew?"Appointment created":"Appointment saved"); navigate(-1 as any); },
    onError: () => toast.error("Failed to save appointment"),
  });

  const F = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1 as any)} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-2xl font-bold">{isNew ? "New Appointment" : "Edit Appointment"}</h1>
          <p className="text-sm text-gray-500">Appointments — {isNew ? "Add" : "Edit"} Appointment</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 pb-2 border-b">Appointment Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <F label="Salesperson"><Input value={form.salesperson} onChange={e=>set("salesperson",e.target.value)} /></F>
          <F label="Contact"><Input value={form.contactName} onChange={e=>set("contactName",e.target.value)} placeholder="Search…" /></F>

          <F label="Related Business Type">
            <Select value={form.businessType} onValueChange={v=>set("businessType",v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{BUSINESS_TYPES.map(t=><SelectItem key={t||"none"} value={t}>{t||"None"}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Related Business Name"><Input value={form.relatedBusinessName} onChange={e=>set("relatedBusinessName",e.target.value)} placeholder="Search…" /></F>

          <F label="Category">
            <Select value={form.category} onValueChange={v=>set("category",v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c=><SelectItem key={c||"none"} value={c}>{c||"None"}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Result">
            <Select value={form.result} onValueChange={v=>set("result",v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{RESULTS.map(r=><SelectItem key={r||"none"} value={r}>{r||"None"}</SelectItem>)}</SelectContent>
            </Select>
          </F>

          <div className="col-span-2">
            <F label="Name" required><Input value={form.appointmentName} onChange={e=>set("appointmentName",e.target.value)} /></F>
          </div>
          <div className="col-span-2">
            <F label="Description"><Textarea rows={4} maxLength={32767} value={form.description} onChange={e=>set("description",e.target.value)} /></F>
          </div>

          <F label="Start Date"><Input type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)} /></F>
          <div className="grid grid-cols-2 gap-2">
            <F label="Start Time"><Input type="time" value={form.startTime} onChange={e=>set("startTime",e.target.value)} /></F>
            <F label="End Time"><Input type="time" value={form.endTime} onChange={e=>set("endTime",e.target.value)} /></F>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6 flex-wrap">
        <Button onClick={()=>mutation.mutate(form)} disabled={!form.appointmentName||mutation.isPending}>
          <Save className="h-4 w-4 mr-2" />{mutation.isPending?"Saving…":"Save"}
        </Button>
        <Button variant="outline">Save and Add Task</Button>
        <Button variant="outline">Save and Add Appointment</Button>
        <Button variant="outline">Save and Log Activity</Button>
        <Button variant="outline" onClick={()=>navigate(-1 as any)}>Cancel</Button>
      </div>
    </div>
  );
}
