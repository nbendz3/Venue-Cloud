import { useState, useMemo, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BedDouble, CalendarDays, ChevronLeft, ChevronRight,
  Plus, Edit, MoveRight, Eye, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

type RoomType = {
  id: number;
  name: string;
  totalInventory: number;
  site?: string | null;
  sortOrder?: number | null;
};

type RoomBlock = {
  id: number;
  eventId: number;
  eventName: string;
  blockName: string;
  startDate?: string | null;
  departureDate?: string | null;
  cutoffDate?: string | null;
  site?: string | null;
  status?: string | null;
  numRooms?: number | null;
  contracted?: number | null;
  blocked?: number | null;
  forecast?: number | null;
  pickup?: number | null;
  avgRate?: number | null;
  total?: number | null;
};

type GridData = {
  startDate: string;
  endDate: string;
  roomTypes: RoomType[];
  blocks: RoomBlock[];
};

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cur = start;
  while (cur <= end) {
    dates.push(cur);
    cur = addDays(cur, 1);
  }
  return dates;
}

function formatDateHeader(dateStr: string): { dow: string; day: string; month: string } {
  const d = new Date(dateStr + "T00:00:00");
  return {
    dow: d.toLocaleDateString("en-US", { weekday: "short" }),
    day: String(d.getDate()),
    month: d.toLocaleDateString("en-US", { month: "short" }),
  };
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00").getDay();
  return d === 0 || d === 6;
}

// Compute blocked rooms for a room type on a specific date
function computeBlocked(blocks: RoomBlock[], roomTypeName: string, date: string): number {
  return blocks
    .filter(b =>
      b.blockName === roomTypeName &&
      b.startDate && b.departureDate &&
      b.startDate <= date && b.departureDate > date
    )
    .reduce((sum, b) => sum + (b.numRooms ?? 0), 0);
}

// Which blocks are active on this date for this room type
function getBlocksForCell(blocks: RoomBlock[], roomTypeName: string, date: string): RoomBlock[] {
  return blocks.filter(b =>
    b.blockName === roomTypeName &&
    b.startDate && b.departureDate &&
    b.startDate <= date && b.departureDate > date
  );
}

type CellColor = "empty" | "green" | "yellow" | "red";

function getCellColor(blocked: number, total: number): CellColor {
  if (blocked === 0 || total === 0) return "empty";
  const pct = blocked / total;
  if (pct > 1) return "red";
  if (pct < 0.4) return "yellow";
  return "green";
}

const CELL_CLASSES: Record<CellColor, string> = {
  empty: "bg-transparent",
  green: "bg-green-100 text-green-800 font-semibold",
  yellow: "bg-yellow-100 text-yellow-800 font-semibold",
  red: "bg-red-100 text-red-800 font-semibold",
};

const STATUS_BADGE: Record<string, string> = {
  Confirmed: "bg-green-50 text-green-700 border-green-200",
  Tentative: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Cancelled: "bg-red-50 text-red-700 border-red-200",
  Active: "bg-blue-50 text-blue-700 border-blue-200",
};

const SITES = ["Main", "North Wing", "South Wing", "Garden"];

export default function GuestRooms() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDays(today, 13));
  const [site, setSite] = useState("_all_");
  const [selectedBlock, setSelectedBlock] = useState<RoomBlock | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch } = useQuery<GridData>({
    queryKey: ["guest-rooms-grid", startDate, endDate, site],
    // The response was previously parsed as JSON without checking the status,
    // so an error page came back as a parse failure and the view sat on its
    // skeletons with nothing to tell the user.
    queryFn: async () => {
      const p = new URLSearchParams({ start: startDate, end: endDate });
      if (site !== "_all_") p.set("site", site);
      const r = await fetch(`${BASE}/guest-rooms/grid?${p}`);
      if (!r.ok) throw new Error(`Guest rooms request failed (${r.status})`);
      return r.json();
    },
    retry: 1,
  });

  const dates = useMemo(() => dateRange(startDate, endDate), [startDate, endDate]);
  const roomTypes = data?.roomTypes ?? [];
  const blocks = data?.blocks ?? [];

  function shiftDays(n: number) {
    setStartDate(d => addDays(d, n));
    setEndDate(d => addDays(d, n));
  }

  function goToday() {
    setStartDate(today);
    setEndDate(addDays(today, 13));
  }

  return (
    <div className="flex flex-col h-full -m-6 overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 border-b bg-card px-5 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BedDouble className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold leading-none">Guest Rooms Control</h1>
            <p className="text-xs text-muted-foreground">Room inventory & block management</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => shiftDays(-7)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">Start</label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground">End</label>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => shiftDays(7)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-8" onClick={goToday}>
            <CalendarDays className="w-3.5 h-3.5 mr-1" /> Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={site} onValueChange={setSite}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Sites</SelectItem>
              {SITES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => refetch()}>
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-auto p-5 space-y-5">

        {/* ── Inventory Grid ── */}
        <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
          <div className="flex">
            {/* Fixed left column - room type labels */}
            <div className="flex-shrink-0 w-44 border-r bg-muted/20">
              {/* Top-left header cell */}
              <div className="h-14 border-b flex items-end px-3 pb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Room Type</span>
              </div>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 border-b px-3 flex items-center">
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                  </div>
                ))
              ) : roomTypes.length === 0 ? (
                <div className="h-24 flex items-center justify-center px-3">
                  <p className="text-xs text-muted-foreground text-center">No room types configured</p>
                </div>
              ) : (
                roomTypes.map(rt => (
                  <div key={rt.id} className="h-12 border-b last:border-b-0 px-3 flex flex-col justify-center">
                    <span className="text-sm font-medium truncate">{rt.name}</span>
                    <span className="text-[10px] text-muted-foreground">{rt.totalInventory} total</span>
                  </div>
                ))
              )}
            </div>

            {/* Scrollable date columns */}
            <div ref={gridRef} className="flex-1 overflow-x-auto">
              <div style={{ minWidth: `${dates.length * 56}px` }}>
                {/* Date header row */}
                <div className="flex border-b h-14">
                  {dates.map(date => {
                    const { dow, day, month } = formatDateHeader(date);
                    const isT = isToday(date);
                    const isWE = isWeekend(date);
                    return (
                      <div
                        key={date}
                        className={`w-14 flex-shrink-0 flex flex-col items-center justify-end pb-1.5 border-r last:border-r-0 text-center
                          ${isT ? "bg-primary/5" : isWE ? "bg-muted/40" : ""}`}
                      >
                        <span className={`text-[10px] font-medium ${isT ? "text-primary" : "text-muted-foreground"}`}>{dow}</span>
                        <span className={`text-sm font-bold leading-tight ${isT ? "text-primary" : ""}`}>{day}</span>
                        <span className={`text-[10px] ${isT ? "text-primary" : "text-muted-foreground"}`}>{month}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Grid rows */}
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, ri) => (
                    <div key={ri} className="flex border-b h-12">
                      {dates.map((_, ci) => (
                        <div key={ci} className="w-14 flex-shrink-0 border-r last:border-r-0 animate-pulse bg-muted/20" />
                      ))}
                    </div>
                  ))
                ) : roomTypes.length === 0 ? null : (
                  roomTypes.map(rt => (
                    <div key={rt.id} className="flex border-b last:border-b-0 h-12">
                      {dates.map(date => {
                        const blocked = computeBlocked(blocks, rt.name, date);
                        const total = rt.totalInventory ?? 0;
                        const color = getCellColor(blocked, total);
                        const cellBlocks = getBlocksForCell(blocks, rt.name, date);
                        const isWE = isWeekend(date);
                        const isT = isToday(date);

                        return (
                          <div
                            key={date}
                            title={blocked > 0 ? `${rt.name} on ${date}: ${blocked}/${total} blocked` : undefined}
                            className={`w-14 flex-shrink-0 border-r last:border-r-0 flex items-center justify-center text-xs cursor-default transition-colors
                              ${isT ? "ring-1 ring-inset ring-primary/20" : ""}
                              ${isWE && color === "empty" ? "bg-muted/20" : ""}
                              ${CELL_CLASSES[color]}
                              ${blocked > 0 ? "cursor-pointer hover:brightness-95 active:brightness-90" : ""}
                            `}
                            onClick={() => {
                              if (cellBlocks.length === 1) setSelectedBlock(cellBlocks[0]);
                              else if (cellBlocks.length > 1) toast.info(`${cellBlocks.length} blocks on this date`);
                            }}
                          >
                            {blocked > 0 ? (
                              <span className="font-semibold text-[11px]">{blocked}/{total}</span>
                            ) : (
                              <span className="text-muted-foreground/30 text-[10px]">—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground bg-muted/10">
            <span className="font-medium">Legend:</span>
            {[
              { color: "bg-green-100 border-green-300", label: "On target (≥40%)" },
              { color: "bg-yellow-100 border-yellow-300", label: "Under 40%" },
              { color: "bg-red-100 border-red-300", label: "Over capacity" },
              { color: "bg-muted/40", label: "Weekend" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded border ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Selected block detail ── */}
        {selectedBlock && (
          <div className="border rounded-lg bg-blue-50/50 border-blue-200 p-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Selected Block</p>
              <p className="font-semibold">{selectedBlock.eventName}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedBlock.blockName} · {formatDate(selectedBlock.startDate)} – {formatDate(selectedBlock.departureDate)}
                {selectedBlock.numRooms != null && ` · ${selectedBlock.numRooms} rooms`}
                {selectedBlock.status && ` · ${selectedBlock.status}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/events/${selectedBlock.eventId}`}>
                <Button size="sm" variant="outline" className="text-xs">
                  <Eye className="w-3.5 h-3.5 mr-1" /> View Event
                </Button>
              </Link>
              <Button size="sm" variant="ghost" className="text-xs h-7 w-7 p-0" onClick={() => setSelectedBlock(null)}>✕</Button>
            </div>
          </div>
        )}

        {/* ── Guest Rooms Bookings Section ── */}
        <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
          <div className="border-b px-5 py-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Guest Rooms Bookings</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {blocks.length} booking{blocks.length !== 1 ? "s" : ""} in selected date range
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs h-8">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add / Edit Guest Rooms Booking
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8">
                <MoveRight className="w-3.5 h-3.5 mr-1" /> Move All Bookings
              </Button>
              {selectedBlock && (
                <>
                  <Link href={`/events/${selectedBlock.eventId}`}>
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Guest Rooms Block
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => toast.info("Opening edit form…")}>
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit Guest Rooms Block
                  </Button>
                </>
              )}
            </div>
          </div>

          {isError ? (
            <div className="p-10 text-center">
              <p className="text-sm font-medium text-destructive">Could not load room blocks</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(error as Error)?.message ?? "The request failed."}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading bookings…</div>
          ) : blocks.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <BedDouble className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No room blocks in this date range</p>
              <p className="text-xs mt-1">Adjust the date range or add a room block to an event.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    {["Event Name", "Room Type", "Check-in", "Check-out", "# Rooms", "Status", "Cutoff Date", "Avg Rate"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {blocks.map(block => (
                    <tr
                      key={block.id}
                      className={`hover:bg-muted/30 cursor-pointer transition-colors ${selectedBlock?.id === block.id ? "bg-blue-50" : ""}`}
                      onClick={() => setSelectedBlock(block)}
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/events/${block.eventId}`}
                          className="font-medium text-primary hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          {block.eventName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-sm">{block.blockName}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm">{formatDate(block.startDate)}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm">{formatDate(block.departureDate)}</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{block.numRooms ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {block.status ? (
                          <Badge variant="outline" className={`text-xs font-normal ${STATUS_BADGE[block.status] ?? ""}`}>
                            {block.status}
                          </Badge>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(block.cutoffDate)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm">
                        {block.avgRate != null ? `$${block.avgRate.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
