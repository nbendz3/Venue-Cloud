import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Settings as SettingsIcon, Copy } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

// ── Types ────────────────────────────────────────────────────────────────────

type Item = { id: number; name?: string; status?: string; color?: string; textColor?: string; [key: string]: unknown };

type RevenueCenter = { id: number; name: string; fieldCode?: string | null; category?: string | null; isActive?: boolean | null; isDefault?: boolean | null };
type LifecycleModel = { id: number; name: string; description?: string | null; category?: string | null; stages?: string | null; isDefault?: boolean | null; definedInMasterList?: boolean | null };
type SetupStyle = { id: number; name: string; fieldCode?: string | null; definedInMasterList?: boolean | null };
type ServiceItemCategory = { id: number; name: string; fieldCode?: string | null };
type AppliedRate = { id: number; name: string; rate?: string | null; revenueCenterId?: number | null; isActive?: boolean | null };
type TaxRate = { id: number; name: string; rate?: string | null; isActive?: boolean | null };

// ── Constants ────────────────────────────────────────────────────────────────

const ALL_LIFECYCLE_STAGES = [
  "New", "Process Inquiry", "Send Proposal", "Process Tentative", "Confirm",
  "Complete Event Order", "Guarantee", "Actualize", "Send Thank You", "Close",
  "Cancel / Deny Event", "Hold", "Lost", "Waitlisted", "In Review", "Archived",
];

const RC_CATEGORIES = ["Food & Beverage", "Audio Visual", "Rental", "Service", "Other"];

// ── Generic settings tables (simple name-only list) ──────────────────────────

const SETTINGS_TABLES: Array<{
  slug: string; label: string; section: string;
  extraFields?: Array<{ key: string; label: string; type?: string }>;
}> = [
  { slug: "event-types", label: "Event Types", section: "Events" },
  { slug: "event-categories", label: "Event Categories", section: "Events" },
  { slug: "market-types", label: "Market Types", section: "Events" },
  { slug: "referral-types", label: "Referral Types", section: "Events" },
  { slug: "cancelled-reasons", label: "Cancelled Reasons", section: "Events" },
  { slug: "function-types", label: "Function Types", section: "Functions" },
  { slug: "function-sub-types", label: "Function Sub-Types", section: "Functions" },
  { slug: "meal-periods", label: "Meal Periods", section: "Functions", extraFields: [{ key: "fieldCode", label: "Field Code" }] },
  { slug: "timeline-types", label: "Timeline Types", section: "Functions" },
  { slug: "timeline-items-master", label: "Timeline Items", section: "Functions", extraFields: [{ key: "defaultOffsetDays", label: "Offset Days", type: "number" }, { key: "defaultOffsetDirection", label: "Direction" }] },
  { slug: "payment-arrangement-types", label: "Payment Arrangement Types", section: "Financial" },
  { slug: "payment-method-types", label: "Payment Method Types", section: "Financial" },
  { slug: "payment-type-options", label: "Payment Type Options", section: "Financial" },
  { slug: "service-types-master", label: "Service Types", section: "Menu & Service" },
  { slug: "service-menu-categories", label: "Service Menu Categories", section: "Menu & Service", extraFields: [{ key: "sortOrder", label: "Sort Order", type: "number" }] },
  { slug: "service-item-category-ii", label: "Service Item Category II", section: "Menu & Service" },
  { slug: "ingredient-categories", label: "Ingredient Categories", section: "Menu & Service" },
  { slug: "ingredients", label: "Ingredients", section: "Menu & Service", extraFields: [{ key: "unit", label: "Unit" }, { key: "costPerUnit", label: "Cost/Unit", type: "number" }] },
  { slug: "master-event-types", label: "Master Event Types", section: "Master Events" },
  { slug: "personnel-roles", label: "Personnel Roles", section: "CRM" },
  { slug: "contact-types", label: "Contact Types", section: "CRM" },
  { slug: "fiscal-years", label: "Fiscal Years", section: "Fiscal" },
  { slug: "fiscal-periods", label: "Fiscal Periods", section: "Fiscal" },
  { slug: "lifecycle-colors", label: "Lifecycle Colors", section: "Calendar" },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function BoolBadge({ value }: { value?: boolean | null }) {
  if (value == null) return <span className="text-gray-300">—</span>;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
      {value ? "Yes" : "No"}
    </span>
  );
}

function RateBadge({ rate }: { rate?: string | null }) {
  if (!rate) return <span className="text-gray-300">—</span>;
  return <span className="font-mono text-sm">{(parseFloat(rate) * 100).toFixed(2)}%</span>;
}

// ── Revenue Centers Panel ─────────────────────────────────────────────────────

function RevenueCenterForm({ item, onSave, onCancel }: { item?: RevenueCenter; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    fieldCode: item?.fieldCode ?? "",
    category: item?.category ?? "",
    isActive: item?.isActive ?? true,
    isDefault: item?.isDefault ?? false,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name *</Label><Input className="mt-1" value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div><Label>Field Code</Label><Input className="mt-1" value={form.fieldCode} onChange={e => set("fieldCode", e.target.value)} /></div>
      </div>
      <div>
        <Label>Category</Label>
        <Select value={form.category || "_none_"} onValueChange={v => set("category", v === "_none_" ? "" : v)}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none_">None</SelectItem>
            {RC_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox checked={!!form.isActive} onCheckedChange={v => set("isActive", !!v)} />
          Is Active
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox checked={!!form.isDefault} onCheckedChange={v => set("isDefault", !!v)} />
          Is Default
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function RevenueCentersPanel() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<RevenueCenter[]>({
    queryKey: ["revenue-centers"],
    queryFn: () => fetch(`${BASE}/revenue-centers`).then(r => r.json()),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<RevenueCenter | null>(null);

  const createMut = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}/revenue-centers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["revenue-centers"] }); setShowCreate(false); toast.success("Created"); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => fetch(`${BASE}/revenue-centers/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["revenue-centers"] }); setEditTarget(null); toast.success("Updated"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/revenue-centers/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["revenue-centers"] }); toast.success("Deleted"); },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{items.length} record{items.length !== 1 ? "s" : ""}</span>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Revenue Center</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Actions", "Name", "Field Code", "Category", "Is Active", "Is Default"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y bg-white">
            {isLoading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No records. Click "New Revenue Center" to add one.</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditTarget(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm("Delete?")) deleteMut.mutate(item.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.fieldCode || "—"}</td>
                <td className="px-3 py-2 text-gray-600">{item.category || "—"}</td>
                <td className="px-3 py-2"><BoolBadge value={item.isActive} /></td>
                <td className="px-3 py-2"><BoolBadge value={item.isDefault} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>New Revenue Center</DialogTitle></DialogHeader>
          <RevenueCenterForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Edit Revenue Center</DialogTitle></DialogHeader>
          {editTarget && <RevenueCenterForm item={editTarget} onSave={d => updateMut.mutate({ id: editTarget.id, d })} onCancel={() => setEditTarget(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Lifecycle Models Panel ────────────────────────────────────────────────────

function LifecycleModelForm({ item, onSave, onCancel }: { item?: LifecycleModel; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    description: item?.description ?? "",
    category: item?.category ?? "",
    isDefault: item?.isDefault ?? false,
    selectedStages: item?.stages ? (JSON.parse(item.stages) as string[]) : [] as string[],
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleStage = (s: string) => setForm(p => ({
    ...p,
    selectedStages: p.selectedStages.includes(s) ? p.selectedStages.filter(x => x !== s) : [...p.selectedStages, s],
  }));

  const handleSave = () => {
    onSave({ ...form, stages: JSON.stringify(form.selectedStages), selectedStages: undefined });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Name *</Label><Input className="mt-1" value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div className="col-span-2"><Label>Description</Label><Textarea className="mt-1 h-16 resize-none" value={form.description} onChange={e => set("description", e.target.value)} /></div>
        <div>
          <Label>Category</Label>
          <Input className="mt-1" value={form.category} onChange={e => set("category", e.target.value)} placeholder="e.g. Standard" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <Checkbox checked={!!form.isDefault} onCheckedChange={v => set("isDefault", !!v)} />
            Is Default
          </label>
        </div>
      </div>
      <div>
        <Label className="mb-2 block">Event Lifecycle Stages</Label>
        <div className="grid grid-cols-2 gap-1.5 border rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50">
          {ALL_LIFECYCLE_STAGES.map(stage => (
            <label key={stage} className="flex items-center gap-2 cursor-pointer text-sm py-0.5">
              <Checkbox
                checked={form.selectedStages.includes(stage)}
                onCheckedChange={() => toggleStage(stage)}
              />
              {stage}
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">{form.selectedStages.length} stages selected</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!form.name}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function LifecycleModelsPanel() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<LifecycleModel[]>({
    queryKey: ["settings", "lifecycle-models"],
    queryFn: () => fetch(`${BASE}/settings/lifecycle-models`).then(r => r.json()),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<LifecycleModel | null>(null);

  const inv = () => qc.invalidateQueries({ queryKey: ["settings", "lifecycle-models"] });

  const createMut = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}/settings/lifecycle-models`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setShowCreate(false); toast.success("Created"); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => fetch(`${BASE}/settings/lifecycle-models/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setEditTarget(null); toast.success("Updated"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/settings/lifecycle-models/${id}`, { method: "DELETE" }),
    onSuccess: () => { inv(); toast.success("Deleted"); },
  });
  const copyMut = useMutation({
    mutationFn: (item: LifecycleModel) => fetch(`${BASE}/settings/lifecycle-models`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...item, id: undefined, name: `${item.name} (Copy)`, isDefault: false }) }).then(r => r.json()),
    onSuccess: () => { inv(); toast.success("Copied"); },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{items.length} record{items.length !== 1 ? "s" : ""}</span>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Lifecycle Model</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Actions", "Name", "Category", "Stages", "Is Default", "Master List"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y bg-white">
            {isLoading ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">No lifecycle models yet.</td></tr>
            ) : items.map(item => {
              const stages: string[] = item.stages ? JSON.parse(item.stages) : [];
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => copyMut.mutate(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700" title="Copy"><Copy className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditTarget(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm("Delete?")) deleteMut.mutate(item.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                  <td className="px-3 py-2 text-gray-500">{item.category || "—"}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{stages.length ? `${stages.length} stage${stages.length !== 1 ? "s" : ""}` : "—"}</td>
                  <td className="px-3 py-2"><BoolBadge value={item.isDefault} /></td>
                  <td className="px-3 py-2"><BoolBadge value={item.definedInMasterList} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>New Lifecycle Model</DialogTitle></DialogHeader>
          <LifecycleModelForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Edit Lifecycle Model</DialogTitle></DialogHeader>
          {editTarget && <LifecycleModelForm item={editTarget} onSave={d => updateMut.mutate({ id: editTarget.id, d })} onCancel={() => setEditTarget(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Setup Styles Panel ────────────────────────────────────────────────────────

function SetupStyleForm({ item, onSave, onCancel }: { item?: SetupStyle; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: item?.name ?? "", fieldCode: item?.fieldCode ?? "", definedInMasterList: item?.definedInMasterList ?? true });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name *</Label><Input className="mt-1" value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div><Label>Field Code</Label><Input className="mt-1" value={form.fieldCode} onChange={e => set("fieldCode", e.target.value)} /></div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <Checkbox checked={!!form.definedInMasterList} onCheckedChange={v => set("definedInMasterList", !!v)} />
        Defined in Master List
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function SetupStylesPanel() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<SetupStyle[]>({
    queryKey: ["settings", "setup-styles"],
    queryFn: () => fetch(`${BASE}/settings/setup-styles`).then(r => r.json()),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<SetupStyle | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["settings", "setup-styles"] });

  const createMut = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}/settings/setup-styles`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setShowCreate(false); toast.success("Created"); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => fetch(`${BASE}/settings/setup-styles/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setEditTarget(null); toast.success("Updated"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/settings/setup-styles/${id}`, { method: "DELETE" }),
    onSuccess: () => { inv(); toast.success("Deleted"); },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{items.length} record{items.length !== 1 ? "s" : ""}</span>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Setup Style</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Actions", "Name", "Field Code", "Master List"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y bg-white">
            {isLoading ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">No setup styles yet.</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditTarget(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm("Delete?")) deleteMut.mutate(item.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.fieldCode || "—"}</td>
                <td className="px-3 py-2"><BoolBadge value={item.definedInMasterList} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>New Setup Style</DialogTitle></DialogHeader>
          <SetupStyleForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Edit Setup Style</DialogTitle></DialogHeader>
          {editTarget && <SetupStyleForm item={editTarget} onSave={d => updateMut.mutate({ id: editTarget.id, d })} onCancel={() => setEditTarget(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Service Item Categories Panel ─────────────────────────────────────────────

function ServiceItemCategoryForm({ item, onSave, onCancel }: { item?: ServiceItemCategory; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: item?.name ?? "", fieldCode: item?.fieldCode ?? "" });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name *</Label><Input className="mt-1" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div><Label>Field Code</Label><Input className="mt-1" value={form.fieldCode} onChange={e => setForm(p => ({ ...p, fieldCode: e.target.value }))} /></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function ServiceItemCategoriesPanel() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<ServiceItemCategory[]>({
    queryKey: ["settings", "service-item-categories"],
    queryFn: () => fetch(`${BASE}/settings/service-item-categories`).then(r => r.json()),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceItemCategory | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["settings", "service-item-categories"] });

  const createMut = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}/settings/service-item-categories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setShowCreate(false); toast.success("Created"); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => fetch(`${BASE}/settings/service-item-categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setEditTarget(null); toast.success("Updated"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/settings/service-item-categories/${id}`, { method: "DELETE" }),
    onSuccess: () => { inv(); toast.success("Deleted"); },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{items.length} record{items.length !== 1 ? "s" : ""}</span>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Category</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Actions", "Name", "Field Code"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y bg-white">
            {isLoading ? (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400">No categories yet.</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditTarget(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm("Delete?")) deleteMut.mutate(item.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.fieldCode || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>New Service Item Category</DialogTitle></DialogHeader>
          <ServiceItemCategoryForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Edit Service Item Category</DialogTitle></DialogHeader>
          {editTarget && <ServiceItemCategoryForm item={editTarget} onSave={d => updateMut.mutate({ id: editTarget.id, d })} onCancel={() => setEditTarget(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Applied Rates Panel ───────────────────────────────────────────────────────

function AppliedRateForm({ item, revenueCenters, onSave, onCancel }: { item?: AppliedRate; revenueCenters: RevenueCenter[]; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    ratePercent: item?.rate ? (parseFloat(item.rate) * 100).toFixed(4).replace(/\.?0+$/, "") : "",
    revenueCenterId: item?.revenueCenterId ? String(item.revenueCenterId) : "",
    isActive: item?.isActive ?? true,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const handleSave = () => {
    const rate = form.ratePercent ? String(parseFloat(form.ratePercent) / 100) : null;
    const revenueCenterId = form.revenueCenterId ? parseInt(form.revenueCenterId) : null;
    onSave({ name: form.name, rate, revenueCenterId, isActive: form.isActive });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name *</Label><Input className="mt-1" value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div>
          <Label>Rate %</Label>
          <div className="relative mt-1">
            <Input type="number" step="0.01" min="0" max="100" value={form.ratePercent} onChange={e => set("ratePercent", e.target.value)} className="pr-6" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </div>
      </div>
      <div>
        <Label>Revenue Center</Label>
        <Select value={form.revenueCenterId || "_none_"} onValueChange={v => set("revenueCenterId", v === "_none_" ? "" : v)}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none_">None</SelectItem>
            {revenueCenters.map(rc => <SelectItem key={rc.id} value={String(rc.id)}>{rc.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <Checkbox checked={!!form.isActive} onCheckedChange={v => set("isActive", !!v)} />
        Is Active
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!form.name}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function AppliedRatesPanel() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<AppliedRate[]>({
    queryKey: ["settings", "applied-rates"],
    queryFn: () => fetch(`${BASE}/settings/applied-rates`).then(r => r.json()),
  });
  const { data: revenueCenters = [] } = useQuery<RevenueCenter[]>({
    queryKey: ["revenue-centers"],
    queryFn: () => fetch(`${BASE}/revenue-centers`).then(r => r.json()),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<AppliedRate | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["settings", "applied-rates"] });

  const createMut = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}/settings/applied-rates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setShowCreate(false); toast.success("Created"); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => fetch(`${BASE}/settings/applied-rates/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setEditTarget(null); toast.success("Updated"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/settings/applied-rates/${id}`, { method: "DELETE" }),
    onSuccess: () => { inv(); toast.success("Deleted"); },
  });

  const rcMap = Object.fromEntries(revenueCenters.map(r => [r.id, r.name]));

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{items.length} record{items.length !== 1 ? "s" : ""}</span>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Applied Rate</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Actions", "Name", "Rate %", "Revenue Center", "Is Active"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y bg-white">
            {isLoading ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No applied rates yet.</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditTarget(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm("Delete?")) deleteMut.mutate(item.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                <td className="px-3 py-2"><RateBadge rate={item.rate} /></td>
                <td className="px-3 py-2 text-gray-500">{item.revenueCenterId ? (rcMap[item.revenueCenterId] ?? "—") : "—"}</td>
                <td className="px-3 py-2"><BoolBadge value={item.isActive} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>New Applied Rate</DialogTitle></DialogHeader>
          <AppliedRateForm revenueCenters={revenueCenters} onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Edit Applied Rate</DialogTitle></DialogHeader>
          {editTarget && <AppliedRateForm item={editTarget} revenueCenters={revenueCenters} onSave={d => updateMut.mutate({ id: editTarget.id, d })} onCancel={() => setEditTarget(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Tax Rates Panel ───────────────────────────────────────────────────────────

function TaxRateForm({ item, onSave, onCancel }: { item?: TaxRate; onSave: (d: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    ratePercent: item?.rate ? (parseFloat(item.rate) * 100).toFixed(4).replace(/\.?0+$/, "") : "",
    isActive: item?.isActive ?? true,
  });
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const handleSave = () => {
    const rate = form.ratePercent ? String(parseFloat(form.ratePercent) / 100) : null;
    onSave({ name: form.name, rate, isActive: form.isActive });
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Name *</Label><Input className="mt-1" value={form.name} onChange={e => set("name", e.target.value)} /></div>
        <div>
          <Label>Rate %</Label>
          <div className="relative mt-1">
            <Input type="number" step="0.01" min="0" max="100" value={form.ratePercent} onChange={e => set("ratePercent", e.target.value)} className="pr-6" />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <Checkbox checked={!!form.isActive} onCheckedChange={v => set("isActive", !!v)} />
        Is Active
      </label>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!form.name}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function TaxRatesPanel() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery<TaxRate[]>({
    queryKey: ["settings", "tax-rates"],
    queryFn: () => fetch(`${BASE}/settings/tax-rates`).then(r => r.json()),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<TaxRate | null>(null);
  const inv = () => qc.invalidateQueries({ queryKey: ["settings", "tax-rates"] });

  const createMut = useMutation({
    mutationFn: (d: any) => fetch(`${BASE}/settings/tax-rates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setShowCreate(false); toast.success("Created"); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: any }) => fetch(`${BASE}/settings/tax-rates/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
    onSuccess: () => { inv(); setEditTarget(null); toast.success("Updated"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/settings/tax-rates/${id}`, { method: "DELETE" }),
    onSuccess: () => { inv(); toast.success("Deleted"); },
  });

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{items.length} record{items.length !== 1 ? "s" : ""}</span>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5 mr-1" />New Tax Rate</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{["Actions", "Name", "Rate %", "Is Active"].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y bg-white">
            {isLoading ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : !items.length ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400">No tax rates yet.</td></tr>
            ) : items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditTarget(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm("Delete?")) deleteMut.mutate(item.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                <td className="px-3 py-2"><RateBadge rate={item.rate} /></td>
                <td className="px-3 py-2"><BoolBadge value={item.isActive} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>New Tax Rate</DialogTitle></DialogHeader>
          <TaxRateForm onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Edit Tax Rate</DialogTitle></DialogHeader>
          {editTarget && <TaxRateForm item={editTarget} onSave={d => updateMut.mutate({ id: editTarget.id, d })} onCancel={() => setEditTarget(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Generic settings panel (simple name list) ─────────────────────────────────

function ColorSwatch({ color, textColor }: { color: string; textColor: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: color, color: textColor }}>
      {color}
    </span>
  );
}

function LifecycleColorEditor({ item, onSave, onCancel }: { item?: Item; onSave: (d: Record<string, string>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ status: item?.status ?? "", color: item?.color ?? "#6B7280", textColor: item?.textColor ?? "#FFFFFF" });
  return (
    <div className="space-y-4">
      <div><Label>Status *</Label><Input value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Background Color</Label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
            <Input value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="font-mono" />
          </div>
        </div>
        <div><Label>Text Color</Label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={form.textColor} onChange={e => setForm(p => ({ ...p, textColor: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
            <Input value={form.textColor} onChange={e => setForm(p => ({ ...p, textColor: e.target.value }))} className="font-mono" />
          </div>
        </div>
      </div>
      <div><Label>Preview</Label>
        <div className="mt-1">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: form.color, color: form.textColor }}>{form.status || "Preview"}</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.status}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function GenericItemEditor({ item, extraFields, onSave, onCancel }: {
  item?: Item;
  extraFields?: Array<{ key: string; label: string; type?: string }>;
  onSave: (d: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    name: String(item?.name ?? ""),
    ...Object.fromEntries((extraFields ?? []).map(f => [f.key, String((item as any)?.[f.key] ?? "")])),
  });
  return (
    <div className="space-y-4">
      <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
      {extraFields?.map(f => (
        <div key={f.key}><Label>{f.label}</Label>
          <Input type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
        </div>
      ))}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function GenericTablePanel({ tableConfig }: { tableConfig: typeof SETTINGS_TABLES[number] }) {
  const qc = useQueryClient();
  const { slug, label, extraFields } = tableConfig;
  const isColorTable = slug === "lifecycle-colors";
  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["settings", slug],
    queryFn: () => fetch(`${BASE}/settings/${slug}`).then(r => r.json()),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [search, setSearch] = useState("");

  const filtered = items.filter(i => String(i.name ?? i.status ?? "").toLowerCase().includes(search.toLowerCase()));

  const createMut = useMutation({
    mutationFn: (data: Record<string, string>) => fetch(`${BASE}/settings/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", slug] }); setShowCreate(false); toast.success("Created"); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) => fetch(`${BASE}/settings/${slug}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", slug] }); setEditTarget(null); toast.success("Updated"); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/settings/${slug}/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", slug] }); toast.success("Deleted"); },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Input placeholder="Filter…" className="h-8 text-sm max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
        <Badge variant="secondary">{items.length}</Badge>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
      </div>
      {isLoading ? <p className="text-sm text-gray-400 py-4">Loading…</p> : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No items found.</p>
      ) : (
        <div className="divide-y border rounded-md overflow-hidden">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-gray-50 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                {isColorTable && item.color && <ColorSwatch color={String(item.color)} textColor={String(item.textColor ?? "#fff")} />}
                <span className="text-gray-800 truncate">{String(item.name ?? item.status ?? "—")}</span>
                {extraFields?.map(f => (item as any)[f.key] != null && (item as any)[f.key] !== "" ? (
                  <span key={f.key} className="text-gray-400 text-xs">· {String((item as any)[f.key])}</span>
                ) : null)}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditTarget(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => { if (confirm("Delete this item?")) deleteMut.mutate(item.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Add {label}</DialogTitle></DialogHeader>
          {isColorTable ? <LifecycleColorEditor onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} /> : <GenericItemEditor extraFields={extraFields} onSave={d => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Edit {label}</DialogTitle></DialogHeader>
          {editTarget && (isColorTable ? <LifecycleColorEditor item={editTarget} onSave={d => updateMut.mutate({ id: editTarget.id, data: d })} onCancel={() => setEditTarget(null)} /> : <GenericItemEditor item={editTarget} extraFields={extraFields} onSave={d => updateMut.mutate({ id: editTarget.id, data: d })} onCancel={() => setEditTarget(null)} />)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Nav structure ─────────────────────────────────────────────────────────────

type NavSection =
  | { kind: "generic"; label: string; tables: typeof SETTINGS_TABLES }
  | { kind: "custom"; label: string; component: React.ComponentType };

const NAV: NavSection[] = [
  { kind: "custom", label: "Revenue Centers", component: RevenueCentersPanel },
  { kind: "custom", label: "Lifecycle Models", component: LifecycleModelsPanel },
  { kind: "custom", label: "Applied Rates", component: AppliedRatesPanel },
  { kind: "custom", label: "Tax Rates", component: TaxRatesPanel },
  {
    kind: "generic", label: "Events",
    tables: SETTINGS_TABLES.filter(t => t.section === "Events"),
  },
  {
    kind: "generic", label: "Functions",
    tables: [
      ...SETTINGS_TABLES.filter(t => t.section === "Functions"),
    ],
  },
  { kind: "custom", label: "Setup Styles", component: SetupStylesPanel },
  {
    kind: "generic", label: "Financial",
    tables: SETTINGS_TABLES.filter(t => t.section === "Financial"),
  },
  {
    kind: "generic", label: "Menu & Service",
    tables: SETTINGS_TABLES.filter(t => t.section === "Menu & Service"),
  },
  { kind: "custom", label: "Service Item Categories", component: ServiceItemCategoriesPanel },
  {
    kind: "generic", label: "Master Events",
    tables: SETTINGS_TABLES.filter(t => t.section === "Master Events"),
  },
  {
    kind: "generic", label: "CRM",
    tables: SETTINGS_TABLES.filter(t => t.section === "CRM"),
  },
  {
    kind: "generic", label: "Fiscal",
    tables: SETTINGS_TABLES.filter(t => t.section === "Fiscal"),
  },
  {
    kind: "generic", label: "Calendar",
    tables: SETTINGS_TABLES.filter(t => t.section === "Calendar"),
  },
];

// ── Main Settings page ────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>(NAV[0].label);

  const activeNav = NAV.find(n => n.label === activeSection);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-6 w-6 text-gray-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage lookup tables and system configuration</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left nav */}
        <div className="w-52 shrink-0">
          <nav className="space-y-0.5">
            {NAV.map(section => (
              <button
                key={section.label}
                onClick={() => setActiveSection(section.label)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === section.label ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {activeNav?.kind === "custom" && (
            <div className="bg-white border rounded-lg p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">{activeNav.label}</h2>
              <activeNav.component />
            </div>
          )}

          {activeNav?.kind === "generic" && (
            <Accordion type="multiple" className="space-y-2">
              {activeNav.tables.map(tableConfig => (
                <AccordionItem key={tableConfig.slug} value={tableConfig.slug} className="border rounded-lg bg-white px-4">
                  <AccordionTrigger className="text-sm font-medium text-gray-800 hover:no-underline py-3">
                    {tableConfig.label}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <GenericTablePanel tableConfig={tableConfig} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </div>
  );
}
