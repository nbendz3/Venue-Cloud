import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, ChevronRight, Network, Pencil, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type MasterEvent = {
  id: number;
  masterEventName: string;
  masterEventNumber?: string | null;
  masterEventType?: string | null;
  marketType?: string | null;
  owner?: string | null;
  salesperson?: string | null;
  division?: string | null;
  primaryContactName?: string | null;
  createdAt: string;
};

const BASE = "/api";

function useMasterEvents() {
  return useQuery<MasterEvent[]>({
    queryKey: ["master-events"],
    queryFn: () => fetch(`${BASE}/master-events`).then((r) => r.json()),
  });
}

function MasterEventForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<MasterEvent>;
  onSave: (data: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({
    masterEventName: initial?.masterEventName ?? "",
    masterEventType: initial?.masterEventType ?? "",
    marketType: initial?.marketType ?? "",
    owner: initial?.owner ?? "",
    salesperson: initial?.salesperson ?? "",
    division: initial?.division ?? "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div>
        <Label>Master Event Name *</Label>
        <Input value={form.masterEventName} onChange={(e) => set("masterEventName", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select value={form.masterEventType} onValueChange={(v) => set("masterEventType", v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {["Conference Series", "Annual Convention", "Corporate Roadshow", "Wedding Series", "Social Series", "Multi-Property Event"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Market Type</Label>
          <Select value={form.marketType} onValueChange={(v) => set("marketType", v)}>
            <SelectTrigger><SelectValue placeholder="Select market" /></SelectTrigger>
            <SelectContent>
              {["Corporate", "Association", "Government", "International", "Wedding", "Social/SMERF"].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Owner</Label>
          <Input value={form.owner} onChange={(e) => set("owner", e.target.value)} />
        </div>
        <div>
          <Label>Salesperson</Label>
          <Input value={form.salesperson} onChange={(e) => set("salesperson", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Division</Label>
        <Input value={form.division} onChange={(e) => set("division", e.target.value)} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.masterEventName}>Save</Button>
      </DialogFooter>
    </div>
  );
}

export default function MasterEventsPage() {
  const qc = useQueryClient();
  const { data: masterEvents = [], isLoading } = useMasterEvents();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<MasterEvent | null>(null);

  const filteredEvents = masterEvents.filter((me) =>
    me.masterEventName.toLowerCase().includes(search.toLowerCase()) ||
    (me.masterEventNumber ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      fetch(`${BASE}/master-events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-events"] }); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) =>
      fetch(`${BASE}/master-events/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-events"] }); setEditTarget(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/master-events/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master-events"] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Network className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Master Events</h1>
            <p className="text-sm text-gray-500">Group related events under a master umbrella</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />New Master Event
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search master events..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Master Events", value: masterEvents.length },
          { label: "Shown", value: filteredEvents.length },
          { label: "Types", value: [...new Set(masterEvents.map((m) => m.masterEventType).filter(Boolean))].length },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Master Event Name", "Number", "Type", "Market Type", "Owner", "Salesperson", "Created", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
            ) : filteredEvents.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No master events found</td></tr>
            ) : filteredEvents.map((me) => (
              <tr key={me.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/master-events/${me.id}`} className="text-blue-600 hover:underline font-medium">
                    {me.masterEventName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{me.masterEventNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  {me.masterEventType && <Badge variant="outline">{me.masterEventType}</Badge>}
                </td>
                <td className="px-4 py-3 text-gray-600">{me.marketType ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{me.owner ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{me.salesperson ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(me.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditTarget(me)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => { if (confirm("Delete this master event?")) deleteMutation.mutate(me.id); }} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <Link href={`/master-events/${me.id}`} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Master Event</DialogTitle></DialogHeader>
          <MasterEventForm onSave={(d) => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Master Event</DialogTitle></DialogHeader>
          {editTarget && (
            <MasterEventForm
              initial={editTarget}
              onSave={(d) => updateMutation.mutate({ id: editTarget.id, data: d })}
              onCancel={() => setEditTarget(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
