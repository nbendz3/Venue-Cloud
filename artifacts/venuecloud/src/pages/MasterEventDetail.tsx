import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Network, Pencil, Plus, ChevronRight, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

const BASE = "/api";

type LinkedEvent = {
  id: number;
  eventName: string;
  eventNumber?: string | null;
  eventStatus: string;
  startDate?: string | null;
  estimatedAttendance?: number | null;
  owner?: string | null;
};

type MasterFunction = {
  id: number;
  eventId: number;
  eventName: string;
  functionName?: string | null;
  functionNumber?: string | null;
  functionDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  locationName?: string | null;
  estimatedAttendance?: number | null;
  hasServices: boolean;
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
  primaryContactName?: string | null;
  billingNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  events: LinkedEvent[];
};

const STATUS_COLORS: Record<string, string> = {
  Definite: "bg-green-100 text-green-800",
  Tentative: "bg-yellow-100 text-yellow-800",
  Cancelled: "bg-red-100 text-red-800",
  Actualized: "bg-blue-100 text-blue-800",
  Prospect: "bg-gray-100 text-gray-700",
};

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</dd>
    </div>
  );
}

export default function MasterEventDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: me, isLoading } = useQuery<MasterEvent>({
    queryKey: ["master-events", id],
    queryFn: () => fetch(`${BASE}/master-events/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: functions = [] } = useQuery<MasterFunction[]>({
    queryKey: ["master-events", id, "functions"],
    queryFn: () => fetch(`${BASE}/master-events/${id}/functions`).then((r) => r.json()),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading…</div>;
  if (!me || (me as any).error) return <div className="p-8 text-center text-gray-400">Master event not found</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500">
        <Link href="/master-events" className="hover:text-blue-600">Master Events</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-gray-800 font-medium">{me.masterEventName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100">
            <Network className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{me.masterEventName}</h1>
            <p className="text-sm text-gray-500 font-mono">{me.masterEventNumber}</p>
          </div>
        </div>
        <Link href={`/master-events/${id}/edit`}>
          <Button size="sm">
            <Pencil className="h-4 w-4 mr-1.5" />Edit Master Event
          </Button>
        </Link>
      </div>

      {/* Details Card */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
          Master Event Details
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
          <DetailRow label="Primary Contact" value={me.primaryContactName} />
          <DetailRow label="Group Master Account" value={me.groupMasterAccount} />
          <DetailRow label="Master Event Name" value={me.masterEventName} />
          <DetailRow label="Master Event Type" value={me.masterEventType} />
          <DetailRow label="Market Type" value={me.marketType} />
          <DetailRow label="Referral Type" value={me.referralType} />
          <DetailRow label="Owner" value={me.owner} />
          <DetailRow label="Salesperson" value={me.salesperson} />
          <DetailRow label="Master Event Number" value={me.masterEventNumber} />
          <DetailRow label="Division" value={me.division} />
        </dl>
      </div>

      {/* Events Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            Events <span className="text-gray-400 font-normal text-sm">({me.events?.length ?? 0})</span>
          </h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" />New Event with Function
            </Button>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1" />New Event
            </Button>
            <Button size="sm" variant="outline">Mass Edit</Button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Actions", "Event Name", "Event Number", "Start Date", "Status", "Attendance", "Owner"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {!me.events?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No events linked to this master event</td>
              </tr>
            ) : me.events.map((ev) => (
              <tr key={ev.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <Link href={`/events/${ev.id}`}>
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" title="View event">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/events/${ev.id}`} className="text-blue-600 hover:underline font-medium">
                    {ev.eventName}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{ev.eventNumber ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{formatDate(ev.startDate)}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[ev.eventStatus] ?? "bg-gray-100 text-gray-700"}`}>
                    {ev.eventStatus}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{ev.estimatedAttendance ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{ev.owner ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Functions Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">
            Functions <span className="text-gray-400 font-normal text-sm">({functions.length})</span>
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Actions", "Function Name", "Function #", "Event", "Start Date", "Start Time", "End Time", "Location", "Attendance", "Has Services"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {!functions.length ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">No functions across these events</td>
              </tr>
            ) : functions.map((fn) => (
              <tr key={fn.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  <Link href={`/events/${fn.eventId}/functions/${fn.id}`}>
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" title="View function">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/events/${fn.eventId}/functions/${fn.id}`} className="text-blue-600 hover:underline">
                    {fn.functionName || <span className="text-gray-400 italic">Unnamed</span>}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{fn.functionNumber ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <Link href={`/events/${fn.eventId}`} className="text-blue-600 hover:underline text-xs">
                    {fn.eventName}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fn.functionDate ? formatDate(fn.functionDate) : "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{fn.startTime ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{fn.endTime ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{fn.locationName ?? "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{fn.estimatedAttendance ?? "—"}</td>
                <td className="px-4 py-2.5">
                  {fn.hasServices ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
