import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart2, Search, Plus, Play, Pencil, Trash2, Copy,
  Download, MoreHorizontal, CalendarClock, ChevronRight,
  ChevronDown, Folder, FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";
const SITE_NAME = "The Pines Resort";
const TREE_FOLDERS = ["All Reports", "Dining", "Events", "Financial", "Marketing"];

type Report = {
  id: number;
  reportName: string;
  description?: string | null;
  reportType?: string | null;
  folder?: string | null;
  owner?: string | null;
  createdBy?: string | null;
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

const TYPE_COLOR: Record<string, string> = {
  Event: "bg-red-50 text-red-700 border-red-200",
  Function: "bg-orange-50 text-orange-700 border-orange-200",
  EventLead: "bg-blue-50 text-blue-700 border-blue-200",
  Account: "bg-purple-50 text-purple-700 border-purple-200",
  Contact: "bg-teal-50 text-teal-700 border-teal-200",
  Task: "bg-yellow-50 text-yellow-700 border-yellow-200",
  GuestRoomsBlock: "bg-green-50 text-green-700 border-green-200",
};

function ActionBtn({
  label, onClick, children,
}: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      title={label}
      onClick={onClick}
      className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {children}
    </button>
  );
}

function ReportRow({ report, onCopy, onDelete }: {
  report: Report;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const typeColor = TYPE_COLOR[report.reportType ?? ""] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const dt = new Date(report.createdAt);
  const createdStr = isNaN(dt.getTime()) ? "—"
    : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      + " " + dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <tr className="hover:bg-muted/30 group transition-colors">
      <td className="px-4 py-2 whitespace-nowrap">
        <div className="flex items-center gap-0.5">
          <ActionBtn label="Copy" onClick={onCopy}>
            <Copy className="w-3.5 h-3.5" />
          </ActionBtn>
          <Link href={`/reports/${report.id}/edit`}>
            <ActionBtn label="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </ActionBtn>
          </Link>
          <Link href={`/reports/${report.id}/run`}>
            <ActionBtn label="Run">
              <Play className="w-3.5 h-3.5" />
            </ActionBtn>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title="More"
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => toast.info("Exporting…")}>
                <Download className="w-3.5 h-3.5 mr-2" /> Export
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => toast.info("Opening chart builder…")}>
                <BarChart2 className="w-3.5 h-3.5 mr-2" /> Chart
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
      <td className="px-4 py-2 max-w-[200px]">
        <Link href={`/reports/${report.id}/run`} className="font-medium text-primary hover:underline truncate block text-sm">
          {report.reportName}
        </Link>
      </td>
      <td className="px-4 py-2 max-w-[280px]">
        <span className="text-xs text-muted-foreground line-clamp-2">{report.description ?? "—"}</span>
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        {report.reportType ? (
          <Badge variant="outline" className={`text-xs font-normal ${typeColor}`}>
            {report.reportType}
          </Badge>
        ) : <span className="text-muted-foreground text-xs">—</span>}
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        {report.folder ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Folder className="w-3 h-3 flex-shrink-0" />{report.folder}
          </span>
        ) : <span className="text-muted-foreground text-xs">—</span>}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
        {report.createdBy ?? report.owner ?? "—"}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
        {createdStr}
      </td>
    </tr>
  );
}

export default function ReportsPage() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: reportTypes = [] } = useReportTypes();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFolder, setActiveFolder] = useState("All Reports");
  const [siteExpanded, setSiteExpanded] = useState(true);

  const { data: allReports = [], isLoading } = useReports(typeFilter || undefined, search || undefined);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/reports/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); toast.success("Report deleted"); },
    onError: () => toast.error("Failed to delete report"),
  });

  const copyMutation = useMutation({
    mutationFn: async (report: Report) => {
      const full = await fetch(`${BASE}/reports/${report.id}`).then(r => r.json());
      const { id: _id, createdAt: _ca, updatedAt: _ua, ...rest } = full;
      return fetch(`${BASE}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rest, reportName: `Copy of ${full.reportName}` }),
      }).then(r => r.json());
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Report copied");
      navigate(`/reports/${created.id}/edit`);
    },
    onError: () => toast.error("Failed to copy report"),
  });

  const reports = useMemo(() => {
    if (activeFolder === "All Reports") return allReports;
    return allReports.filter(r => (r.folder ?? "Other") === activeFolder);
  }, [allReports, activeFolder]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { "All Reports": allReports.length };
    for (const r of allReports) {
      const f = r.folder ?? "Other";
      counts[f] = (counts[f] ?? 0) + 1;
    }
    return counts;
  }, [allReports]);

  return (
    <div className="flex h-full -m-6 overflow-hidden">
      {/* ── Left Folder Tree ── */}
      <div className="w-52 flex-shrink-0 border-r bg-muted/20 flex flex-col overflow-y-auto">
        <div className="px-3 pt-4 pb-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Library</p>
        </div>

        <button
          onClick={() => setSiteExpanded(p => !p)}
          className="w-full flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold hover:bg-muted/50 transition-colors"
        >
          {siteExpanded
            ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
          <span className="truncate text-xs">{SITE_NAME}</span>
        </button>

        {siteExpanded && (
          <div className="pl-3 pb-4">
            {TREE_FOLDERS.map(folder => {
              const count = folderCounts[folder] ?? 0;
              const isActive = activeFolder === folder;
              return (
                <button
                  key={folder}
                  onClick={() => setActiveFolder(folder)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-muted/50 text-foreground"
                  }`}
                >
                  {isActive
                    ? <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                    : <Folder className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />}
                  <span className="flex-1 text-left truncate">{folder}</span>
                  {count > 0 && (
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 leading-none ${
                      isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="flex-shrink-0 border-b px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BarChart2 className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-base font-bold leading-none">
                Reports {activeFolder !== "All Reports" && <span className="text-muted-foreground font-normal">— {activeFolder}</span>}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reports.length} shown · {allReports.length} total in library
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/reports/scheduled-jobs">
              <Button variant="outline" size="sm" className="text-xs">
                <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                View Scheduled Report Jobs
              </Button>
            </Link>
            <Link href="/reports/new">
              <Button size="sm" className="text-xs">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Report
              </Button>
            </Link>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex-shrink-0 px-5 py-2.5 flex items-center gap-3 border-b bg-muted/10">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search reports…"
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter || "_all_"} onValueChange={(v) => setTypeFilter(v === "_all_" ? "" : v)}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="All Report Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Report Types</SelectItem>
              {reportTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">Loading reports…</div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-muted-foreground gap-2">
              <BarChart2 className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">No reports found</p>
              <p className="text-xs text-center max-w-xs">
                {activeFolder !== "All Reports"
                  ? `No reports in the "${activeFolder}" folder yet.`
                  : search || typeFilter
                  ? "Try clearing your search or filter."
                  : "Create your first report to get started."}
              </p>
              <Link href="/reports/new">
                <Button size="sm" className="mt-1 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />New Report
                </Button>
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card border-b shadow-[0_1px_0_0_hsl(var(--border))]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Actions</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Report Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Report Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Folder</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Created By</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Created Date/Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onCopy={() => copyMutation.mutate(report)}
                    onDelete={() => {
                      if (confirm(`Delete "${report.reportName}"?`)) deleteMutation.mutate(report.id);
                    }}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
