import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Network, Calendar, Users, Pencil, Save, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

const BASE = "/api";

type Event = {
  id: number;
  eventName: string;
  eventStatus: string;
  startDate?: string | null;
  endDate?: string | null;
  site?: string | null;
  estimatedAttendance?: number | null;
};

type MasterEvent = {
  id: number;
  masterEventName: string;
  masterEventNumber?: string | null;
  masterEventType?: string | null;
  marketType?: string | null;
  referralType?: string | null;
  groupMasterAccount?: string | null;
  owner?: string | null;
  salesperson?: string | null;
  division?: string | null;
  paymentArrangements?: string | null;
  primaryContactId?: number | null;
  primaryContactName?: string | null;
  billingNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  events: Event[];
};

const STATUS_COLORS: Record<string, string> = {
  Definite: "bg-green-100 text-green-800",
  Tentative: "bg-yellow-100 text-yellow-800",
  Cancelled: "bg-red-100 text-red-800",
  Actualized: "bg-blue-100 text-blue-800",
};

export default function MasterEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<MasterEvent>>({});

  const { data: me, isLoading } = useQuery<MasterEvent>({
    queryKey: ["master-events", id],
    queryFn: () => fetch(`${BASE}/master-events/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<MasterEvent>) =>
      fetch(`${BASE}/master-events/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["master-events", id] }); setEditing(false); },
  });

  function startEdit() {
    if (me) { setForm({ ...me }); setEditing(true); }
  }

  const set = (k: keyof MasterEvent, v: string) => setForm((p) => ({ ...p, [k]: v }));

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!me) return <div className="p-8 text-center text-gray-400">Master event not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/master-events" className="hover:text-blue-600 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Master Events
        </Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">{me.masterEventName}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2.5 rounded-lg">
            <Network className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{me.masterEventName}</h1>
            <p className="text-sm text-gray-500 font-mono">{me.masterEventNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button size="sm" onClick={() => updateMutation.mutate(form)}><Save className="h-4 w-4 mr-1" />Save</Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white border rounded-lg p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Master Event Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Type", key: "masterEventType", options: ["Conference Series", "Annual Convention", "Corporate Roadshow", "Wedding Series"] },
                { label: "Market Type", key: "marketType", options: ["Corporate", "Association", "Government", "Wedding"] },
                { label: "Owner", key: "owner" },
                { label: "Salesperson", key: "salesperson" },
                { label: "Division", key: "division" },
                { label: "Referral Type", key: "referralType", options: ["Walk-In", "Repeat Client", "Web Inquiry", "Trade Show"] },
                { label: "Group Master Account", key: "groupMasterAccount" },
                { label: "Payment Arrangements", key: "paymentArrangements" },
              ].map(({ label, key, options }) => (
                <div key={key}>
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">{label}</Label>
                  {editing ? (
                    options ? (
                      <Select value={(form as any)[key] ?? ""} onValueChange={(v) => set(key as keyof MasterEvent, v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
                        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input className="mt-1" value={(form as any)[key] ?? ""} onChange={(e) => set(key as keyof MasterEvent, e.target.value)} />
                    )
                  ) : (
                    <p className="mt-1 text-gray-900">{(me as any)[key] ?? <span className="text-gray-400">—</span>}</p>
                  )}
                </div>
              ))}
            </div>
            {editing && (
              <div className="mt-4">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Billing Notes</Label>
                <Textarea
                  className="mt-1"
                  value={form.billingNotes ?? ""}
                  onChange={(e) => set("billingNotes", e.target.value)}
                  rows={3}
                />
              </div>
            )}
            {!editing && me.billingNotes && (
              <div className="mt-4">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">Billing Notes</Label>
                <p className="mt-1 text-gray-700 text-sm whitespace-pre-wrap">{me.billingNotes}</p>
              </div>
            )}
          </div>

          {/* Linked Events */}
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Linked Events ({me.events?.length ?? 0})</h2>
            </div>
            {!me.events?.length ? (
              <p className="text-gray-400 text-sm">No events linked to this master event.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Event", "Status", "Start", "End", "Attendance", "Site"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {me.events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <Link href={`/events/${ev.id}`} className="text-blue-600 hover:underline">{ev.eventName}</Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[ev.eventStatus] ?? "bg-gray-100 text-gray-700"}`}>
                          {ev.eventStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(ev.startDate)}</td>
                      <td className="px-3 py-2 text-gray-500">{formatDate(ev.endDate)}</td>
                      <td className="px-3 py-2 text-gray-500">{ev.estimatedAttendance ?? "—"}</td>
                      <td className="px-3 py-2 text-gray-500">{ev.site ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Summary</h3>
            <dl className="space-y-2 text-sm">
              {[
                { label: "Events", value: me.events?.length ?? 0 },
                { label: "Created", value: formatDate(me.createdAt) },
                { label: "Updated", value: formatDate(me.updatedAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="text-gray-900 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {me.primaryContactName && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Primary Contact</h3>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                  {me.primaryContactName.charAt(0)}
                </div>
                <span className="text-sm text-gray-700">{me.primaryContactName}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
