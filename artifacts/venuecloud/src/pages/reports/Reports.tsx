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
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart2, Search, Plus, Play, Pencil, Trash2,
  FolderOpen, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const BASE = "/api";

type Report = {
  id: number;
  reportName: string;
  description?: string | null;
  reportType?: string | null;
  folder?: string | null;
  owner?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ReportType = { id: string; name: string; description: string };

function useReports(reportType?: string, search?: string) {
  return useQuery<Report[]>({
    queryKey: ["reports", reportType, search],
    queryFn: () => {
      const p = new URLSearchParams();
      if (reportType) p.set("reportType", reportType);
      if (search) p.set("search", search);
      return fetch(`${BASE}/reports?${p}`).then((r) => r.json());
    },
  });
}

function useReportTypes() {
  return useQuery<ReportType[]>({
    queryKey: ["report-types"],
    queryFn: () => fetch(`${BASE}/reports/types`).then((r) => r.json()),
  });
}

type CreateFormProps = {
  reportTypes: ReportType[];
  onSave: (d: Record<string, string>) => void;
  onCancel: () => void;
};

function CreateReportForm({ reportTypes, onSave, onCancel }: CreateFormProps) {
  const [form, setForm] = useState({ reportName: "", reportType: "", description: "", folder: "" });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const FOLDERS = ["Event Reports", "Financial Reports", "Sales Reports", "CRM Reports", "Administrative", "Custom Reports"];

  return (
    <div className="space-y-4">
      <div>
        <Label>Report Name *</Label>
        <Input value={form.reportName} onChange={(e) => set("reportName", e.target.value)} placeholder="E.g. Monthly Event Summary" />
      </div>
      <div>
        <Label>Report Type *</Label>
        <Select value={form.reportType} onValueChange={(v) => set("reportType", v)}>
          <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
          <SelectContent>
            {reportTypes.map((rt) => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {form.reportType && (
          <p className="text-xs text-gray-400 mt-1">{reportTypes.find((r) => r.id === form.reportType)?.description}</p>
        )}
      </div>
      <div>
        <Label>Folder</Label>
        <Select value={form.folder} onValueChange={(v) => set("folder", v)}>
          <SelectTrigger><SelectValue placeholder="Choose a folder" /></SelectTrigger>
          <SelectContent>
            {FOLDERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.reportName || !form.reportType}>
          Create Report
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function ReportsPage() {
  const qc = useQueryClient();
  const { data: reportTypes = [] } = useReportTypes();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<"list" | "folders">("folders");

  const { data: reports = [], isLoading } = useReports(typeFilter || undefined, search || undefined);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      fetch(`${BASE}/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      setShowCreate(false);
      toast.success("Report created");
      window.location.href = `/reports/${created.id}/edit`;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/reports/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast.success("Report deleted"); },
  });

  const folders = [...new Set(reports.map((r) => r.folder ?? "Uncategorized"))].sort();
  const byFolder: Record<string, Report[]> = {};
  for (const r of reports) {
    const f = r.folder ?? "Uncategorized";
    if (!byFolder[f]) byFolder[f] = [];
    byFolder[f].push(r);
  }

  const FOLDER_ICONS: Record<string, string> = {
    "Event Reports": "📋", "Financial Reports": "💰", "Sales Reports": "📈",
    "CRM Reports": "👥", "Administrative": "⚙️", "Custom Reports": "🔧", "Uncategorized": "📁",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart2 className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500">{reports.length} reports in library</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/reports/scheduled-jobs">
            <Button variant="outline"><BarChart2 className="h-4 w-4 mr-2" />View Scheduled Report Jobs</Button>
          </Link>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />New Report
          </Button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search reports…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-52">
            <Filter className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {reportTypes.map((rt) => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          <button onClick={() => setView("folders")} className={`px-3 py-1.5 text-sm ${view === "folders" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}>
            <FolderOpen className="h-4 w-4" />
          </button>
          <button onClick={() => setView("list")} className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}>
            <BarChart2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading reports…</div>
      ) : view === "folders" ? (
        <div className="space-y-4">
          {folders.map((folder) => (
            <div key={folder} className="bg-white border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b">
                <span>{FOLDER_ICONS[folder] ?? "📁"}</span>
                <span className="font-medium text-gray-700">{folder}</span>
                <Badge variant="secondary" className="ml-auto">{byFolder[folder].length}</Badge>
              </div>
              <div className="divide-y">
                {byFolder[folder].map((report) => (
                  <div key={report.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 group">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/reports/${report.id}`} className="text-sm font-medium text-blue-600 hover:underline truncate">
                          {report.reportName}
                        </Link>
                        {report.reportType && <Badge variant="outline" className="text-xs shrink-0">{report.reportType}</Badge>}
                      </div>
                      {report.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{report.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/reports/${report.id}/run`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Play className="h-3 w-3 mr-1" />Run
                        </Button>
                      </Link>
                      <Link href={`/reports/${report.id}/edit`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                      </Link>
                      <button
                        onClick={() => { if (confirm("Delete this report?")) deleteMutation.mutate(report.id); }}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {folders.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <BarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No reports found.</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />Create your first report
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Name", "Type", "Folder", "Owner", "Updated", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-3">
                    <Link href={`/reports/${report.id}`} className="text-blue-600 hover:underline font-medium">{report.reportName}</Link>
                    {report.description && <p className="text-xs text-gray-400">{report.description}</p>}
                  </td>
                  <td className="px-4 py-3">{report.reportType ? <Badge variant="outline">{report.reportType}</Badge> : "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{report.folder ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{report.owner ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(report.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                      <Link href={`/reports/${report.id}/run`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs"><Play className="h-3 w-3 mr-1" />Run</Button>
                      </Link>
                      <Link href={`/reports/${report.id}/edit`}>
                        <Pencil className="h-4 w-4 text-gray-400 hover:text-gray-700 cursor-pointer" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Report</DialogTitle></DialogHeader>
          <CreateReportForm
            reportTypes={reportTypes}
            onSave={(d) => createMutation.mutate(d)}
            onCancel={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
