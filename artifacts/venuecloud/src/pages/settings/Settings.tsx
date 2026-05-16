import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Settings as SettingsIcon } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

type SettingsItem = { id: number; name?: string; status?: string; color?: string; textColor?: string; [key: string]: unknown };

const SETTINGS_TABLES: Array<{
  slug: string;
  label: string;
  section: string;
  extraFields?: Array<{ key: string; label: string; type?: string }>;
}> = [
  { slug: "event-types", label: "Event Types", section: "Events" },
  { slug: "event-categories", label: "Event Categories", section: "Events" },
  { slug: "market-types", label: "Market Types", section: "Events" },
  { slug: "referral-types", label: "Referral Types", section: "Events" },
  { slug: "cancelled-reasons", label: "Cancelled Reasons", section: "Events" },
  { slug: "function-types", label: "Function Types", section: "Functions" },
  { slug: "function-sub-types", label: "Function Sub-Types", section: "Functions" },
  { slug: "setup-styles", label: "Setup Styles", section: "Functions" },
  { slug: "meal-periods", label: "Meal Periods", section: "Functions", extraFields: [{ key: "fieldCode", label: "Field Code" }] },
  { slug: "timeline-types", label: "Timeline Types", section: "Functions" },
  { slug: "timeline-items-master", label: "Timeline Items", section: "Functions", extraFields: [{ key: "defaultOffsetDays", label: "Offset Days", type: "number" }, { key: "defaultOffsetDirection", label: "Direction" }] },
  { slug: "payment-arrangement-types", label: "Payment Arrangement Types", section: "Financial" },
  { slug: "payment-method-types", label: "Payment Method Types", section: "Financial" },
  { slug: "payment-type-options", label: "Payment Type Options", section: "Financial" },
  { slug: "applied-rates", label: "Applied Rates", section: "Financial" },
  { slug: "service-types-master", label: "Service Types", section: "Menu & Service" },
  { slug: "service-menu-categories", label: "Service Menu Categories", section: "Menu & Service", extraFields: [{ key: "sortOrder", label: "Sort Order", type: "number" }] },
  { slug: "service-item-categories", label: "Service Item Categories", section: "Menu & Service" },
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

const SECTIONS = [...new Set(SETTINGS_TABLES.map((t) => t.section))];

function useSettingsTable(slug: string) {
  return useQuery<SettingsItem[]>({
    queryKey: ["settings", slug],
    queryFn: () => fetch(`${BASE}/settings/${slug}`).then((r) => r.json()),
  });
}

function ColorSwatch({ color, textColor }: { color: string; textColor: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: color, color: textColor }}>
      {color}
    </span>
  );
}

function LifecycleColorEditor({ item, onSave, onCancel }: { item?: SettingsItem; onSave: (d: Record<string, string>) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    status: item?.status ?? "",
    color: item?.color ?? "#6B7280",
    textColor: item?.textColor ?? "#FFFFFF",
  });
  return (
    <div className="space-y-4">
      <div>
        <Label>Status *</Label>
        <Input value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Background Color</Label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
            <Input value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="font-mono" />
          </div>
        </div>
        <div>
          <Label>Text Color</Label>
          <div className="flex gap-2 mt-1">
            <input type="color" value={form.textColor} onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
            <Input value={form.textColor} onChange={(e) => setForm((p) => ({ ...p, textColor: e.target.value }))} className="font-mono" />
          </div>
        </div>
      </div>
      <div>
        <Label>Preview</Label>
        <div className="mt-1">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: form.color, color: form.textColor }}>
            {form.status || "Preview"}
          </span>
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
  item?: SettingsItem;
  extraFields?: Array<{ key: string; label: string; type?: string }>;
  onSave: (d: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    name: String(item?.name ?? ""),
    ...Object.fromEntries((extraFields ?? []).map((f) => [f.key, String((item as any)?.[f.key] ?? "")])),
  });
  return (
    <div className="space-y-4">
      <div>
        <Label>Name *</Label>
        <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
      </div>
      {extraFields?.map((f) => (
        <div key={f.key}>
          <Label>{f.label}</Label>
          <Input type={f.type ?? "text"} value={form[f.key] ?? ""} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} />
        </div>
      ))}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name}>Save</Button>
      </DialogFooter>
    </div>
  );
}

function SettingsTablePanel({ tableConfig }: { tableConfig: typeof SETTINGS_TABLES[number] }) {
  const qc = useQueryClient();
  const { slug, label, extraFields } = tableConfig;
  const isColorTable = slug === "lifecycle-colors";
  const { data: items = [], isLoading } = useSettingsTable(slug);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<SettingsItem | null>(null);
  const [search, setSearch] = useState("");

  const filtered = items.filter((i) =>
    String(i.name ?? i.status ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      fetch(`${BASE}/settings/${slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", slug] }); setShowCreate(false); toast.success("Created"); },
    onError: () => toast.error("Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) =>
      fetch(`${BASE}/settings/${slug}/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", slug] }); setEditTarget(null); toast.success("Updated"); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/settings/${slug}/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", slug] }); toast.success("Deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <Input placeholder="Filter…" className="h-8 text-sm max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Badge variant="secondary">{items.length}</Badge>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
      </div>
      {isLoading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No items found.</p>
      ) : (
        <div className="divide-y border rounded-md overflow-hidden">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-white hover:bg-gray-50 text-sm">
              <div className="flex items-center gap-3 min-w-0">
                {isColorTable && item.color && (
                  <ColorSwatch color={String(item.color)} textColor={String(item.textColor ?? "#fff")} />
                )}
                <span className="text-gray-800 truncate">{String(item.name ?? item.status ?? "—")}</span>
                {extraFields?.map((f) =>
                  (item as any)[f.key] != null && (item as any)[f.key] !== "" ? (
                    <span key={f.key} className="text-gray-400 text-xs">· {String((item as any)[f.key])}</span>
                  ) : null
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditTarget(item)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => { if (confirm("Delete this item?")) deleteMutation.mutate(item.id); }} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add {label}</DialogTitle></DialogHeader>
          {isColorTable
            ? <LifecycleColorEditor onSave={(d) => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} />
            : <GenericItemEditor extraFields={extraFields} onSave={(d) => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit {label}</DialogTitle></DialogHeader>
          {editTarget && (isColorTable
            ? <LifecycleColorEditor item={editTarget} onSave={(d) => updateMutation.mutate({ id: editTarget.id, data: d })} onCancel={() => setEditTarget(null)} />
            : <GenericItemEditor item={editTarget} extraFields={extraFields} onSave={(d) => updateMutation.mutate({ id: editTarget.id, data: d })} onCancel={() => setEditTarget(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0]);
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-6 w-6 text-gray-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage lookup tables and system configuration</p>
        </div>
      </div>
      <div className="flex gap-6">
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeSection === section ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100"}`}
              >
                {section}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 min-w-0">
          <Accordion type="multiple" className="space-y-2">
            {SETTINGS_TABLES.filter((t) => t.section === activeSection).map((tableConfig) => (
              <AccordionItem key={tableConfig.slug} value={tableConfig.slug} className="border rounded-lg bg-white px-4">
                <AccordionTrigger className="text-sm font-medium text-gray-800 hover:no-underline py-3">
                  {tableConfig.label}
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <SettingsTablePanel tableConfig={tableConfig} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
