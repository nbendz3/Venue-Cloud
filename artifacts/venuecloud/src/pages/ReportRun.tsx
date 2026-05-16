import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Pencil, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

type ReportResult = {
  reportId: number;
  reportName: string;
  reportType?: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  groupings: Array<{ column: string; sortOrder: string }>;
  calculations: Array<{ column: string; func: string }>;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Report = { id: number; reportName: string; reportType?: string | null; folder?: string | null };

function computeCalc(rows: Record<string, unknown>[], column: string, func: string): string {
  const vals = rows.map((r) => parseFloat(String(r[column] ?? ""))).filter((v) => !isNaN(v));
  if (!vals.length) return "—";
  switch (func) {
    case "Sum": return vals.reduce((a, b) => a + b, 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    case "Average": return (vals.reduce((a, b) => a + b, 0) / vals.length).toLocaleString(undefined, { maximumFractionDigits: 2 });
    case "Min": return Math.min(...vals).toLocaleString();
    case "Max": return Math.max(...vals).toLocaleString();
    case "Count": return String(vals.length);
    default: return "—";
  }
}

function exportCSV(columns: string[], rows: Record<string, unknown>[], filename: string) {
  const header = columns.join(",");
  const body = rows.map((r) => columns.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportRunPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [runKey, setRunKey] = useState(0);

  const { data: report } = useQuery<Report>({
    queryKey: ["reports", id],
    queryFn: () => fetch(`${BASE}/reports/${id}`).then((r) => r.json()),
    enabled: !!id,
  });

  const { data: result, isLoading, isFetching, refetch } = useQuery<ReportResult>({
    queryKey: ["report-result", id, page, runKey],
    queryFn: () =>
      fetch(`${BASE}/reports/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page }),
      }).then((r) => r.json()),
    enabled: !!id,
  });

  const groupedBy = result?.groupings?.[0]?.column;

  // Group rows by first grouping column
  const groupedRows: Record<string, Record<string, unknown>[]> = {};
  if (result && groupedBy) {
    for (const row of result.rows) {
      const key = String(row[groupedBy] ?? "Other");
      if (!groupedRows[key]) groupedRows[key] = [];
      groupedRows[key].push(row);
    }
  }

  function handleExport() {
    if (!result) return;
    exportCSV(result.columns, result.rows, result.reportName);
    toast.success("Exported to CSV");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/reports")} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{report?.reportName ?? "Running Report…"}</h1>
          <p className="text-xs text-gray-500">
            {result && `${result.rowCount.toLocaleString()} rows · Page ${result.page} of ${result.totalPages}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setRunKey((k) => k + 1); setPage(1); }}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!result}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
          <Button size="sm" onClick={() => navigate(`/reports/${id}/edit`)}>
            <Pencil className="h-4 w-4 mr-2" />Edit
          </Button>
        </div>
      </div>

      {/* Calculations bar */}
      {result?.calculations && result.calculations.length > 0 && (
        <div className="flex gap-4 mb-4 flex-wrap">
          {result.calculations.map((calc, i) => (
            <div key={i} className="bg-white border rounded-lg px-4 py-2 text-sm">
              <span className="text-gray-500">{calc.func}({calc.column}): </span>
              <span className="font-semibold text-gray-900">{computeCalc(result.rows, calc.column, calc.func)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Running report…</div>
      ) : !result ? (
        <div className="text-center py-16 text-gray-400">No results</div>
      ) : groupedBy ? (
        // Grouped view
        <div className="space-y-4">
          {Object.entries(groupedRows).map(([groupVal, groupRows]) => (
            <div key={groupVal} className="bg-white border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                <span className="font-medium text-gray-700">{groupedBy}: {groupVal}</span>
                <Badge variant="secondary">{groupRows.length}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {result.columns.filter((c) => c !== groupedBy).map((col) => (
                        <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {groupRows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {result.columns.filter((c) => c !== groupedBy).map((col) => (
                          <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(row[col] ?? "—")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat view
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {result.columns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wide whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.rows.length === 0 ? (
                  <tr>
                    <td colSpan={result.columns.length} className="px-4 py-8 text-center text-gray-400">No data found.</td>
                  </tr>
                ) : result.rows.map((row, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}>
                    {result.columns.map((col) => (
                      <td key={col} className="px-4 py-2.5 text-gray-700 whitespace-nowrap text-sm">
                        {String(row[col] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <span className="text-sm text-gray-500">
                Page {result.page} of {result.totalPages} · {result.rowCount.toLocaleString()} total rows
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))} disabled={page >= result.totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
