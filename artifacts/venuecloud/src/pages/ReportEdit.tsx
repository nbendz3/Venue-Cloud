import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
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
import { ArrowLeft, Play, Save, Plus, X, GripVertical, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

type Report = {
  id: number;
  reportName: string;
  description?: string | null;
  reportType?: string | null;
  folder?: string | null;
  selectedColumns?: string | null;
  groupings?: string | null;
  sorts?: string | null;
  calculations?: string | null;
  filters?: string | null;
  dateType?: string | null;
  dateRange?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  hideDetailRows?: boolean | null;
  owner?: string | null;
};

type ColumnGroup = { group: string; fields: string[] };

const DATE_RANGES = ["Today", "This Week", "This Month", "This Quarter", "This Year", "Last Month", "Last Quarter", "Last Year", "Next 30 Days", "Next 60 Days", "Next 90 Days", "Custom"];
const DATE_TYPES: Record<string, string[]> = {
  Event: ["Event - Day/Date", "Created Date", "Updated Date"],
  Function: ["Function Date", "Created Date"],
  EventLead: ["Decision Date", "Arrival Date", "Created Date"],
  Task: ["Due Date", "Created Date", "Completed Date"],
  GuestRoomsBlock: ["Block Date"],
};

const CALC_FUNCS = ["Sum", "Average", "Min", "Max", "Count"];

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
  const [sorts, setSorts] = useState<Array<{ column: string; sortOrder: string }>>([]);
  const [calculations, setCalculations] = useState<Array<{ column: string; func: string }>>([]);

  useEffect(() => {
    if (report) {
      setForm(report);
      setSelectedColumns(report.selectedColumns ? JSON.parse(report.selectedColumns) : []);
      setSorts(report.sorts ? JSON.parse(report.sorts) : []);
      setCalculations(report.calculations ? JSON.parse(report.calculations) : []);
    }
  }, [report]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Report>) =>
      fetch(`${BASE}/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports", id] }); toast.success("Report saved"); },
    onError: () => toast.error("Failed to save"),
  });

  const allFields = columnGroups.flatMap((g) => g.fields);

  function toggleColumn(col: string) {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  function handleSave() {
    saveMutation.mutate({
      ...form,
      selectedColumns: selectedColumns.length ? JSON.stringify(selectedColumns) : null,
      sorts: sorts.length ? JSON.stringify(sorts) : null,
      calculations: calculations.length ? JSON.stringify(calculations) : null,
    });
  }

  if (!report) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const dateTypeOptions = DATE_TYPES[report.reportType ?? ""] ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/reports")} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{report.reportName}</h1>
          <p className="text-xs text-gray-500">{report.reportType} Report · {report.folder ?? "No folder"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/reports/${id}/run`)}>
            <Play className="h-4 w-4 mr-2" />Run
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />{saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Builder */}
        <div className="col-span-2 space-y-6">
          {/* Columns */}
          <div className="bg-white border rounded-lg p-5">
            <h2 className="font-semibold text-gray-800 mb-1">Columns</h2>
            <p className="text-xs text-gray-400 mb-4">Select which columns to include. Unchecked = all columns.</p>
            {columnGroups.length === 0 ? (
              <p className="text-sm text-gray-400">No columns available for this report type.</p>
            ) : (
              <div className="space-y-4">
                {columnGroups.map((group) => (
                  <div key={group.group}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group.group}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.fields.map((field) => (
                        <label key={field} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedColumns.includes(field)}
                            onCheckedChange={() => toggleColumn(field)}
                          />
                          <span className="text-sm text-gray-700">{field}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedColumns.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-gray-500 mb-2">Selected ({selectedColumns.length}):</p>
                <div className="flex flex-wrap gap-1">
                  {selectedColumns.map((col) => (
                    <Badge key={col} variant="secondary" className="text-xs pr-1">
                      {col}
                      <button onClick={() => toggleColumn(col)} className="ml-1 hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sorts */}
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Sort Order</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSorts((p) => [...p, { column: "", sortOrder: "Ascending" }])}
                disabled={allFields.length === 0}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />Add Sort
              </Button>
            </div>
            {sorts.length === 0 ? (
              <p className="text-sm text-gray-400">No sorts configured.</p>
            ) : (
              <div className="space-y-2">
                {sorts.map((sort, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-gray-300" />
                    <Select
                      value={sort.column}
                      onValueChange={(v) => setSorts((p) => p.map((s, j) => j === i ? { ...s, column: v } : s))}
                    >
                      <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Column" /></SelectTrigger>
                      <SelectContent>
                        {(selectedColumns.length ? selectedColumns : allFields).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select
                      value={sort.sortOrder}
                      onValueChange={(v) => setSorts((p) => p.map((s, j) => j === i ? { ...s, sortOrder: v } : s))}
                    >
                      <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ascending">Ascending</SelectItem>
                        <SelectItem value="Descending">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => setSorts((p) => p.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calculations */}
          <div className="bg-white border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">Calculations</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCalculations((p) => [...p, { column: "", func: "Sum" }])}
                disabled={allFields.length === 0}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />Add Calculation
              </Button>
            </div>
            {calculations.length === 0 ? (
              <p className="text-sm text-gray-400">No calculations configured.</p>
            ) : (
              <div className="space-y-2">
                {calculations.map((calc, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select
                      value={calc.func}
                      onValueChange={(v) => setCalculations((p) => p.map((c, j) => j === i ? { ...c, func: v } : c))}
                    >
                      <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CALC_FUNCS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select
                      value={calc.column}
                      onValueChange={(v) => setCalculations((p) => p.map((c, j) => j === i ? { ...c, column: v } : c))}
                    >
                      <SelectTrigger className="flex-1 h-8 text-sm"><SelectValue placeholder="Column" /></SelectTrigger>
                      <SelectContent>
                        {(selectedColumns.length ? selectedColumns : allFields).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <button onClick={() => setCalculations((p) => p.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Report Info + Dates */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Report Info</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Report Name</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  value={form.reportName ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, reportName: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Textarea
                  className="mt-1 text-sm"
                  rows={2}
                  value={form.description ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Owner</Label>
                <Input
                  className="mt-1 h-8 text-sm"
                  value={form.owner ?? ""}
                  onChange={(e) => setForm((p) => ({ ...p, owner: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Date Filter</h3>
            <div className="space-y-3">
              {dateTypeOptions.length > 0 && (
                <div>
                  <Label className="text-xs">Date Type</Label>
                  <Select value={form.dateType ?? ""} onValueChange={(v) => setForm((p) => ({ ...p, dateType: v }))}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select date field" /></SelectTrigger>
                    <SelectContent>
                      {dateTypeOptions.map((dt) => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Date Range</Label>
                <Select value={form.dateRange ?? ""} onValueChange={(v) => setForm((p) => ({ ...p, dateRange: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map((dr) => <SelectItem key={dr} value={dr}>{dr}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.dateRange === "Custom" && (
                <>
                  <div>
                    <Label className="text-xs">Start Date</Label>
                    <Input type="date" className="mt-1 h-8 text-sm" value={form.startDate ?? ""} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">End Date</Label>
                    <Input type="date" className="mt-1 h-8 text-sm" value={form.endDate ?? ""} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Options</h3>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <Checkbox
                checked={form.hideDetailRows ?? false}
                onCheckedChange={(c) => setForm((p) => ({ ...p, hideDetailRows: !!c }))}
              />
              Hide detail rows (summary only)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
