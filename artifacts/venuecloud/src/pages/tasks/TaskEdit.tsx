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

const PRIORITIES = ["High", "Medium", "Low", "Critical"];
const STATUSES = ["Open", "In Progress", "Closed", "On Hold", "Cancelled"];
const RESULTS = ["Left Message", "Spoke With", "Completed", "Follow-Up Needed", "Booked", "Lost"];
const CATEGORIES = ["Sales", "Service", "Billing", "Follow-Up", "Confirmation", "Complaint", "Thank You", "General"];
const BUSINESS_TYPES = ["Event", "Lead", "Account", "Contact", "Master Event"];

export default function TaskEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const isNew = id === "new";
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => fetch(`${BASE}/tasks/${id}`).then(r => r.json()),
    enabled: !isNew && !!id,
  });

  const [form, setForm] = useState<Record<string, string | boolean>>({
    taskName: "", taskStatus: "Open", priority: "Normal",
    dueDate: today, description: "", result: "", category: "",
    assignedTo: "Sarah Johnson", salesperson: "Sarah Johnson",
    businessType: "", relatedBusinessName: "", contactName: "",
  });

  useEffect(() => { if (existing) setForm(existing as any); }, [existing]);
  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => isNew
      ? fetch(`${BASE}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch(`${BASE}/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success(isNew?"Task created":"Task saved"); navigate("/tasks"); },
    onError: () => toast.error("Failed to save task"),
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
        <button onClick={() => navigate("/tasks")} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold">{isNew ? "New Task" : "Edit Task"}</h1>
      </div>

      <div className="bg-white border rounded-lg p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 pb-2 border-b">Task Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <F label="Salesperson"><Input value={String(form.salesperson||"")} onChange={e=>set("salesperson",e.target.value)} /></F>
          <F label="Assigned To"><Input value={String(form.assignedTo||"")} onChange={e=>set("assignedTo",e.target.value)} /></F>

          <F label="Business Type">
            <Select value={String(form.businessType||"")} onValueChange={v=>set("businessType",v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{BUSINESS_TYPES.map(t=><SelectItem key={t||"none"} value={t}>{t||"None"}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Related Business Name"><Input value={String(form.relatedBusinessName||"")} onChange={e=>set("relatedBusinessName",e.target.value)} placeholder="Search…" /></F>

          <div className="col-span-2">
            <F label="Task Name" required><Input value={String(form.taskName||"")} onChange={e=>set("taskName",e.target.value)} /></F>
          </div>
          <div className="col-span-2">
            <F label="Description"><Textarea rows={4} maxLength={32767} value={String(form.description||"")} onChange={e=>set("description",e.target.value)} /></F>
          </div>

          <F label="Contact"><Input value={String(form.contactName||"")} onChange={e=>set("contactName",e.target.value)} placeholder="Search…" /></F>
          <F label="Task Date"><Input type="date" value={String(form.dueDate||today)} onChange={e=>set("dueDate",e.target.value)} /></F>

          <F label="Priority">
            <Select value={String(form.priority||"")} onValueChange={v=>set("priority",v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p=><SelectItem key={p||"none"} value={p}>{p||"None"}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Status">
            <Select value={String(form.taskStatus||"Open")} onValueChange={v=>set("taskStatus",v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </F>

          <F label="Category">
            <Select value={String(form.category||"")} onValueChange={v=>set("category",v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c=><SelectItem key={c||"none"} value={c}>{c||"None"}</SelectItem>)}</SelectContent>
            </Select>
          </F>
          <F label="Result">
            <Select value={String(form.result||"")} onValueChange={v=>set("result",v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>{RESULTS.map(r=><SelectItem key={r||"none"} value={r}>{r||"None"}</SelectItem>)}</SelectContent>
            </Select>
          </F>
        </div>
      </div>

      <div className="flex gap-3 mt-6 flex-wrap">
        <Button onClick={()=>mutation.mutate(form)} disabled={!form.taskName||mutation.isPending}>
          <Save className="h-4 w-4 mr-2" />{mutation.isPending?"Saving…":"Save"}
        </Button>
        <Button variant="outline" onClick={()=>{ mutation.mutate(form); }}>Save and Add Task</Button>
        <Button variant="outline" onClick={()=>{ mutation.mutate(form); }}>Save and Log Activity</Button>
        <Button variant="outline" onClick={()=>{ mutation.mutate(form); }}>Save and Add Appointment</Button>
        <Button variant="outline" onClick={()=>navigate("/tasks")}>Cancel</Button>
      </div>
    </div>
  );
}
