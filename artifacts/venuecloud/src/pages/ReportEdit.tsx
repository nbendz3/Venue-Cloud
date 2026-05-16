import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, Play, Save, Plus, X, GripVertical, ChevronDown, ChevronRight,
  Download, BarChart2, FileText, Eye, Trash2, Search,
} from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

/* ─── Types ────────────────────────────────────────────────────── */
type Report = {
  id: number; reportName: string; description?: string | null;
  reportType?: string | null; folder?: string | null;
  selectedColumns?: string | null; groupings?: string | null;
  sorts?: string | null; calculations?: string | null;
  filters?: string | null; dateType?: string | null;
  dateRange?: string | null; startDate?: string | null;
  endDate?: string | null; hideDetailRows?: boolean | null;
  owner?: string | null;
};
type ColumnGroup = { group: string; fields: string[] };
type SortRow = { column: string; sortOrder: "Ascending" | "Descending" };
type GroupingRow = { column: string; sortOrder: "Ascending" | "Descending" };
type CalcRow = { column: string; avg: boolean; sum: boolean; max: boolean; min: boolean };
type FilterRow = { id: string; operator: "" | "AND" | "OR"; column: string; comparator: string; value: string };
type FilterGroup = { id: string; rows: FilterRow[] };

/* ─── Static config ─────────────────────────────────────────────── */
const DATE_RANGES = [
  "Today","Yesterday","Current Week","Last Week","Current Month","Last Month",
  "Current Quarter","Last Quarter","Current Year","Last Year","Next 30 Days",
  "Next 60 Days","Next 90 Days","Custom",
];
const DATE_TYPES: Record<string, string[]> = {
  Event: ["Event - Day/Date", "Created Date", "Updated Date"],
  Function: ["Function Date", "Created Date"],
  "Event Lead": ["Decision Date", "Arrival Date", "Created Date"],
  Task: ["Due Date", "Created Date", "Completed Date"],
  "Guest Room Block": ["Block Date"],
  "Function Adjustment": ["Adjustment Date", "Function Date", "Event Start Date", "Booking Date"],
};
const FOLDERS = [
  "Event Reports","Financial Reports","Sales Reports","CRM Reports",
  "Administrative","Custom Reports","Uncategorized",
];

/* ─── Comparator options by inferred field type ──────────────────── */
function getComparators(column: string): string[] {
  const col = column.toLowerCase();
  if (col.includes("date") || col.includes("time")) {
    return ["on","before","after","between","in last N days","is blank","is not blank"];
  }
  if (col.includes("amount") || col.includes("price") || col.includes("cost") ||
      col.includes("revenue") || col.includes("rental") || col.includes("rate") ||
      col.includes("attendance") || col.includes("count") || col.includes("number") || col === "set") {
    return ["equals","does not equal","less than","greater than","less than or equal","greater than or equal","is blank","is not blank"];
  }
  if (col.includes("status") || col.includes("type") || col.includes("market") || col.includes("referral")) {
    return ["equals","does not equal","is in list","is not in list","is blank","is not blank"];
  }
  return ["contains","does not contain","equals","does not equal","starts with","is blank","is not blank"];
}

/* ─── uid helper ─────────────────────────────────────────────────── */
let _uid = 0;
const uid = () => String(++_uid);

/* ═══════════════════════════════════════════════════════════════════
   Column Picker — two-panel layout
═══════════════════════════════════════════════════════════════════ */
function ColumnPicker({
  columnGroups, selected, onToggle, onRemove, onReorder,
}: {
  columnGroups: ColumnGroup[];
  selected: string[];
  onToggle: (col: string) => void;
  onRemove: (col: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() =>
    columnGroups.map(g => ({
      ...g,
      fields: g.fields.filter(f => f.toLowerCase().includes(search.toLowerCase())),
    })).filter(g => g.fields.length > 0),
    [columnGroups, search]
  );

  const toggleGroup = (group: string) =>
    setExpanded(p => ({ ...p, [group]: !p[group] }));
  const isExpanded = (g: string) => expanded[g] !== false; // default open

  return (
    <div className="grid grid-cols-2 gap-4 min-h-[320px]">
      {/* Available Columns (left) */}
      <div className="border rounded-lg flex flex-col">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-7 text-xs"
              placeholder="Search columns..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground p-4 text-center">No columns match.</p>
          )}
          {filtered.map(group => (
            <div key={group.group}>
              <button
                onClick={() => toggleGroup(group.group)}
                className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 sticky top-0 bg-background border-b"
              >
                {isExpanded(group.group) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {group.group}
                <span className="ml-auto text-xs font-normal">({group.fields.length})</span>
              </button>
              {isExpanded(group.group) && (
                <div>
                  {group.fields.map(field => (
                    <button
                      key={field}
                      onClick={() => onToggle(field)}
                      className={`w-full text-left px-4 py-1 text-xs transition-colors hover:bg-primary/5 ${
                        selected.includes(field) ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="px-3 py-1.5 border-t text-xs text-muted-foreground">
          Click a field to add → Selected
        </div>
      </div>

      {/* Selected Columns (right) */}
      <div className="border rounded-lg flex flex-col">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <span className="text-xs font-semibold">Selected Columns</span>
          <Badge variant="secondary" className="text-xs">{selected.length}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto">
          {selected.length === 0 && (
            <p className="text-xs text-muted-foreground p-4 text-center">
              No columns selected. Click from the left panel to add.
            </p>
          )}
          {selected.map((col, idx) => (
            <div key={col} className="flex items-center gap-1 px-2 py-1 group hover:bg-muted/30">
              <div className="flex flex-col gap-0">
                <button
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 h-3"
                  disabled={idx === 0}
                  onClick={() => onReorder(idx, idx - 1)}
                >
                  <ChevronDown className="w-3 h-3 rotate-180" />
                </button>
                <button
                  className="text-muted-foreground hover:text-foreground disabled:opacity-20 h-3"
                  disabled={idx === selected.length - 1}
                  onClick={() => onReorder(idx, idx + 1)}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
              <span className="text-xs flex-1 truncate">{col}</span>
              <button
                onClick={() => onRemove(col)}
                className="text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="px-3 py-1.5 border-t flex justify-end">
            <button onClick={() => selected.forEach(c => onRemove(c))} className="text-xs text-muted-foreground hover:text-destructive">
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Filter Builder
═══════════════════════════════════════════════════════════════════ */
function FilterBuilder({
  filterGroups, allFields, onChange,
}: {
  filterGroups: FilterGroup[];
  allFields: string[];
  onChange: (groups: FilterGroup[]) => void;
}) {
  const addGroup = () =>
    onChange([...filterGroups, { id: uid(), rows: [{ id: uid(), operator: "", column: "", comparator: "contains", value: "" }] }]);

  const deleteGroup = (gid: string) =>
    onChange(filterGroups.filter(g => g.id !== gid));

  const addRow = (gid: string) =>
    onChange(filterGroups.map(g =>
      g.id === gid
        ? { ...g, rows: [...g.rows, { id: uid(), operator: "AND", column: "", comparator: "contains", value: "" }] }
        : g
    ));

  const deleteRow = (gid: string, rid: string) =>
    onChange(filterGroups.map(g =>
      g.id === gid ? { ...g, rows: g.rows.filter(r => r.id !== rid) } : g
    ));

  const updateRow = (gid: string, rid: string, patch: Partial<FilterRow>) =>
    onChange(filterGroups.map(g =>
      g.id === gid
        ? { ...g, rows: g.rows.map(r => r.id === rid ? { ...r, ...patch } : r) }
        : g
    ));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Groups are AND-ed together. Rows within a group follow their operator.
        </p>
        <Button size="sm" variant="outline" onClick={addGroup}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Filter Group
        </Button>
      </div>

      {filterGroups.length === 0 && (
        <div className="border border-dashed rounded-lg py-8 text-center text-sm text-muted-foreground">
          No filters applied — report will return all records.
        </div>
      )}

      {filterGroups.map((group, gIdx) => (
        <div key={group.id} className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between bg-muted/40 px-3 py-2">
            <span className="text-xs font-semibold">Filter Group {gIdx + 1}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => addRow(group.id)}>
                <Plus className="w-3 h-3 mr-0.5" /> Add Filter
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={addGroup}>
                <Plus className="w-3 h-3 mr-0.5" /> Add Group
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive hover:text-destructive" onClick={() => deleteGroup(group.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {group.rows.map((row, rIdx) => {
              const comparators = getComparators(row.column);
              const isBetween = row.comparator === "between";
              return (
                <div key={row.id} className="flex items-center gap-2 flex-wrap">
                  {/* Operator */}
                  <div className="w-16">
                    {rIdx === 0 ? (
                      <span className="text-xs text-muted-foreground italic">Where</span>
                    ) : (
                      <Select value={row.operator || "AND"} onValueChange={v => updateRow(group.id, row.id, { operator: v as FilterRow["operator"] })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Column */}
                  <Select value={row.column || "_none_"} onValueChange={v => {
                    const col = v === "_none_" ? "" : v;
                    const cmps = getComparators(col);
                    updateRow(group.id, row.id, { column: col, comparator: cmps[0] ?? "contains" });
                  }}>
                    <SelectTrigger className="h-7 text-xs w-44"><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="_none_">— Select column —</SelectItem>
                      {allFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {/* Comparator */}
                  <Select value={row.comparator} onValueChange={v => updateRow(group.id, row.id, { comparator: v })}>
                    <SelectTrigger className="h-7 text-xs w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {comparators.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {/* Value */}
                  {!["is blank", "is not blank"].includes(row.comparator) && (
                    isBetween ? (
                      <div className="flex items-center gap-1">
                        <Input className="h-7 text-xs w-24" placeholder="From" value={row.value.split("|")[0] ?? ""}
                          onChange={e => updateRow(group.id, row.id, { value: `${e.target.value}|${row.value.split("|")[1] ?? ""}` })} />
                        <span className="text-xs text-muted-foreground">and</span>
                        <Input className="h-7 text-xs w-24" placeholder="To" value={row.value.split("|")[1] ?? ""}
                          onChange={e => updateRow(group.id, row.id, { value: `${row.value.split("|")[0] ?? ""}|${e.target.value}` })} />
                      </div>
                    ) : (
                      <Input className="h-7 text-xs w-36" placeholder="Value"
                        value={row.value}
                        onChange={e => updateRow(group.id, row.id, { value: e.target.value })} />
                    )
                  )}

                  <button onClick={() => deleteRow(group.id, row.id)}
                    className="text-muted-foreground/40 hover:text-destructive ml-auto">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {group.rows.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No filter rows. Click "Add Filter" above.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Calculations Table
═══════════════════════════════════════════════════════════════════ */
function CalculationBuilder({ calcs, allFields, onChange }: {
  calcs: CalcRow[];
  allFields: string[];
  onChange: (c: CalcRow[]) => void;
}) {
  const add = () => onChange([...calcs, { column: "", avg: false, sum: false, max: false, min: false }]);
  const del = (i: number) => onChange(calcs.filter((_, j) => j !== i));
  const upd = (i: number, patch: Partial<CalcRow>) =>
    onChange(calcs.map((c, j) => j === i ? { ...c, ...patch } : c));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={add} disabled={allFields.length === 0}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Calculation
        </Button>
      </div>
      {calcs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No calculations. Add one to show aggregate footer rows.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead>Column</TableHead>
              <TableHead className="text-center">Average</TableHead>
              <TableHead className="text-center">Sum</TableHead>
              <TableHead className="text-center">Maximum</TableHead>
              <TableHead className="text-center">Minimum</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calcs.map((c, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Select value={c.column || "_none_"} onValueChange={v => upd(i, { column: v === "_none_" ? "" : v })}>
                    <SelectTrigger className="h-7 text-xs w-44"><SelectValue placeholder="Select column" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="_none_">— Select column —</SelectItem>
                      {allFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                {(["avg","sum","max","min"] as const).map(k => (
                  <TableCell key={k} className="text-center">
                    <Checkbox checked={c[k]} onCheckedChange={v => upd(i, { [k]: !!v })} />
                  </TableCell>
                ))}
                <TableCell>
                  <button onClick={() => del(i)} className="text-muted-foreground/40 hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Groupings / Sorts Builder (shared layout)
═══════════════════════════════════════════════════════════════════ */
function SortGroupBuilder({ label, rows, allFields, onChange }: {
  label: string;
  rows: SortRow[] | GroupingRow[];
  allFields: string[];
  onChange: (r: SortRow[]) => void;
}) {
  const [newCol, setNewCol] = useState("");
  const [newOrder, setNewOrder] = useState<"Ascending"|"Descending">("Ascending");

  const add = () => {
    if (!newCol || newCol === "_none_") return;
    onChange([...rows, { column: newCol, sortOrder: newOrder }] as SortRow[]);
    setNewCol("");
  };
  const del = (i: number) => onChange(rows.filter((_, j) => j !== i) as SortRow[]);
  const upd = (i: number, sortOrder: "Ascending"|"Descending") =>
    onChange(rows.map((r, j) => j === i ? { ...r, sortOrder } : r) as SortRow[]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={newCol || "_none_"} onValueChange={v => setNewCol(v === "_none_" ? "" : v)}>
          <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Report Column" /></SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="_none_">— Select column —</SelectItem>
            {allFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={newOrder} onValueChange={v => setNewOrder(v as "Ascending"|"Descending")}>
          <SelectTrigger className="h-8 text-sm w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Ascending">Ascending</SelectItem>
            <SelectItem value="Descending">Descending</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={add} disabled={!newCol || newCol === "_none_" || allFields.length === 0}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add
        </Button>
      </div>
      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead>Column</TableHead>
              <TableHead>Sort Direction</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{r.column}</TableCell>
                <TableCell>
                  <Select value={r.sortOrder} onValueChange={v => upd(i, v as "Ascending"|"Descending")}>
                    <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ascending">Ascending</SelectItem>
                      <SelectItem value="Descending">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <button onClick={() => del(i)} className="text-muted-foreground/40 hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No {label.toLowerCase()} configured.</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Section wrapper
═══════════════════════════════════════════════════════════════════ */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-lg">
      <div className="px-5 py-3 border-b bg-muted/30">
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════════════ */
export default function ReportEditPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: report } = useQuery<Report>({
    queryKey: ["reports", id],
    queryFn: () => fetch(`${BASE}/reports/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: columnGroups = [] } = useQuery<ColumnGroup[]>({
    queryKey: ["report-columns", report?.reportType],
    queryFn: () => fetch(`${BASE}/reports/columns/${report!.reportType}`).then((r) => r.json()),
    enabled: !!report?.reportType,
  });

  const [form, setForm] = useState<Partial<Report>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [groupings, setGroupings] = useState<GroupingRow[]>([]);
  const [sorts, setSorts] = useState<SortRow[]>([]);
  const [calcs, setCalcs] = useState<CalcRow[]>([]);
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (report) {
      setForm(report);
      try { setSelectedColumns(JSON.parse(report.selectedColumns ?? "[]")); } catch {}
      try { setGroupings(JSON.parse(report.groupings ?? "[]")); } catch {}
      try { setSorts(JSON.parse(report.sorts ?? "[]")); } catch {}
      try { setCalcs(JSON.parse(report.calculations ?? "[]")); } catch {}
      try { setFilterGroups(JSON.parse(report.filters ?? "[]")); } catch {}
    }
  }, [report]);

  const allFields = useMemo(() => columnGroups.flatMap(g => g.fields), [columnGroups]);

  const buildSavePayload = () => ({
    ...form,
    selectedColumns: selectedColumns.length ? JSON.stringify(selectedColumns) : null,
    groupings: groupings.length ? JSON.stringify(groupings) : null,
    sorts: sorts.length ? JSON.stringify(sorts) : null,
    calculations: calcs.length ? JSON.stringify(calcs) : null,
    filters: filterGroups.length ? JSON.stringify(filterGroups) : null,
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch(`${BASE}/reports/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports", id] }); toast.success("Report saved"); },
    onError: () => toast.error("Failed to save"),
  });

  const setF = (k: keyof Report, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };
  const removeColumn = (col: string) => setSelectedColumns(prev => prev.filter(c => c !== col));
  const reorderColumn = (from: number, to: number) => {
    setSelectedColumns(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const dateTypeOptions = DATE_TYPES[report?.reportType ?? ""] ?? [];

  if (!report) return <div className="p-8 text-center text-muted-foreground">Loading report…</div>;

  return (
    <div className="flex flex-col h-full -m-6">
      {/* 7-Button Toolbar */}
      <div className="border-b bg-card px-4 py-2 flex items-center gap-1 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1 mr-3">
          <Link href="/reports" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="ml-1">
            <div className="text-sm font-bold leading-none">{form.reportName || report.reportName}</div>
            <div className="text-xs text-muted-foreground">{report.reportType} Report</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)}>
            <Eye className="w-3.5 h-3.5 mr-1" /> Preview Report
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.info("Opening printable view…")}>
            <FileText className="w-3.5 h-3.5 mr-1" /> Download Printable View
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Download className="w-3.5 h-3.5 mr-1" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => toast.success("Exporting as Excel…")}>Export as Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Exporting as CSV…")}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("Exporting as PDF…")}>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" onClick={() => saveMutation.mutate(buildSavePayload() as Record<string, unknown>)} disabled={saveMutation.isPending}>
            <Save className="w-3.5 h-3.5 mr-1" /> {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.info("Save As dialog…")}>
            Save As
          </Button>
          <Button size="sm" variant="outline" onClick={() => toast.info("Chart builder…")}>
            <BarChart2 className="w-3.5 h-3.5 mr-1" /> View Charts
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate(`/reports/${id}/run`)}>
            <Play className="w-3.5 h-3.5 mr-1" /> Run
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate("/reports")}>Done</Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 border-r bg-card overflow-y-auto flex-shrink-0 p-4 space-y-4">
          {/* Report Properties */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Report Properties</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input className="mt-1 h-8 text-sm" value={form.reportName ?? ""} onChange={e => setF("reportName", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea className="mt-1 text-xs" rows={2} value={form.description ?? ""} onChange={e => setF("description", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Folder</Label>
                <Select value={form.folder ?? "_none_"} onValueChange={v => setF("folder", v === "_none_" ? null : v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Choose folder" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">No Folder</SelectItem>
                    {FOLDERS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Owner</Label>
                <Input className="mt-1 h-8 text-sm" value={form.owner ?? ""} onChange={e => setF("owner", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Report Type</Label>
                <p className="mt-1 text-sm font-medium text-muted-foreground">{report.reportType ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Report Options</h3>
            <div className="space-y-3">
              <div className="text-xs font-medium text-muted-foreground">Report Date Range</div>
              {dateTypeOptions.length > 0 && (
                <div>
                  <Label className="text-xs">Date Type</Label>
                  <Select value={form.dateType ?? "_none_"} onValueChange={v => setF("dateType", v === "_none_" ? null : v)}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select date field" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">— Select —</SelectItem>
                      {dateTypeOptions.map(dt => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Date Range</Label>
                <Select value={form.dateRange ?? "_none_"} onValueChange={v => setF("dateRange", v === "_none_" ? null : v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— Select —</SelectItem>
                    {DATE_RANGES.map(dr => <SelectItem key={dr} value={dr}>{dr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.dateRange === "Custom" && (
                <>
                  <div>
                    <Label className="text-xs">Start Date</Label>
                    <Input type="date" className="mt-1 h-8 text-xs" value={form.startDate ?? ""} onChange={e => setF("startDate", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">End Date</Label>
                    <Input type="date" className="mt-1 h-8 text-xs" value={form.endDate ?? ""} onChange={e => setF("endDate", e.target.value)} />
                  </div>
                </>
              )}
              <div className="text-xs font-medium text-muted-foreground pt-1">Report Details</div>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <Checkbox checked={form.hideDetailRows ?? false} onCheckedChange={c => setF("hideDetailRows", !!c)} />
                Hide detail rows (summary only)
              </label>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Select Columns */}
          <Section title="Select Columns">
            <ColumnPicker
              columnGroups={columnGroups}
              selected={selectedColumns}
              onToggle={toggleColumn}
              onRemove={removeColumn}
              onReorder={reorderColumn}
            />
          </Section>

          {/* Groupings */}
          <Section title="Add/Edit Groupings">
            <SortGroupBuilder
              label="Groupings"
              rows={groupings}
              allFields={selectedColumns.length ? selectedColumns : allFields}
              onChange={setGroupings as (r: SortRow[]) => void}
            />
          </Section>

          {/* Sorts */}
          <Section title="Add/Edit Sorts">
            <SortGroupBuilder
              label="Sorts"
              rows={sorts}
              allFields={selectedColumns.length ? selectedColumns : allFields}
              onChange={setSorts}
            />
          </Section>

          {/* Calculations */}
          <Section title="Add/Edit Calculations">
            <CalculationBuilder
              calcs={calcs}
              allFields={selectedColumns.length ? selectedColumns : allFields}
              onChange={setCalcs}
            />
          </Section>

          {/* Filters */}
          <Section title="Add/Edit Filters">
            <FilterBuilder
              filterGroups={filterGroups}
              allFields={allFields}
              onChange={setFilterGroups}
            />
          </Section>
        </div>
      </div>

      {/* Preview panel */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div>
                <div className="font-bold">{form.reportName}</div>
                <div className="text-xs text-muted-foreground">{report.reportType} · {selectedColumns.length} columns · {filterGroups.length} filter group(s)</div>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5 mr-1" /> Export</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Export as Excel</DropdownMenuItem>
                    <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="ghost" onClick={() => setPreviewOpen(false)}><X className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {selectedColumns.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  Select columns to preview report data.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectedColumns.map(c => <TableHead key={c} className="text-xs">{c}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1,2,3,4,5].map(row => (
                      <TableRow key={row}>
                        {selectedColumns.map(c => (
                          <TableCell key={c} className="text-xs text-muted-foreground">Sample data {row}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="px-5 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
              <span>5 rows (preview — save to run full report)</span>
              <Button size="sm" asChild><Link href={`/reports/${id}/run`}>Run Full Report</Link></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
