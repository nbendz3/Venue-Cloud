import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BarChart2, Plus, Play, Copy, Pencil, Trash2, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const BASE = "/api";

type Report = { id: number; reportName: string; reportType?: string | null; folder?: string | null };

type ScheduledJob = {
  id: number;
  jobName: string;
  reportName: string;
  frequency: "Daily" | "Weekly" | "Monthly";
  nextRunTime?: string | null;
  lastRunTime?: string | null;
  lastStatus?: "Success" | "Failed" | "Running" | "Pending" | null;
  owner: string;
  active: boolean;
};

const MOCK_JOBS: ScheduledJob[] = [
  { id: 1, jobName: "Daily Event Summary", reportName: "Event Status Overview", frequency: "Daily", nextRunTime: "2026-05-17T06:00:00Z", lastRunTime: "2026-05-16T06:00:00Z", lastStatus: "Success", owner: "Sarah Johnson", active: true },
  { id: 2, jobName: "Weekly Revenue Report", reportName: "Financial Summary by Site", frequency: "Weekly", nextRunTime: "2026-05-18T07:00:00Z", lastRunTime: "2026-05-11T07:00:00Z", lastStatus: "Success", owner: "Sarah Johnson", active: true },
  { id: 3, jobName: "Monthly Lead Pipeline", reportName: "Event Lead Pipeline Report", frequency: "Monthly", nextRunTime: "2026-06-01T06:00:00Z", lastRunTime: "2026-05-01T06:00:00Z", lastStatus: "Failed", owner: "Mike Torres", active: false },
];

const DATE_RANGES = ["Current Month", "Last Month", "Current Quarter", "Last Quarter", "Current Year", "Last Year", "Last 30 Days", "Last 90 Days"];
const EXPORT_FORMATS = ["PDF", "Excel", "CSV", "Word"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ORDINALS = ["First", "Second", "Third", "Fourth", "Last"];

function StatusBadge({ status }: { status?: string | null }) {
  const colors: Record<string, string> = {
    Success: "bg-green-100 text-green-700",
    Failed: "bg-red-100 text-red-700",
    Running: "bg-blue-100 text-blue-700",
    Pending: "bg-gray-100 text-gray-600",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status ?? ""] ?? "bg-gray-100 text-gray-500"}`}>{status ?? "—"}</span>;
}

function NewJobDialog({ open, onClose, reports }: { open: boolean; onClose: () => void; reports: Report[] }) {
  const [form, setForm] = useState({ jobName: "", reportId: "", runDaily: false, runWeekly: false, runMonthly: false, startTime: "06:00", owner: "Sarah Johnson", active: true, weekdays: [] as string[], dateRange: "Current Month", exportFormat: "PDF", emailResults: false, emailAddress: "" });
  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));
  const toggleDay = (d: string) => setForm(p => ({ ...p, weekdays: p.weekdays.includes(d) ? p.weekdays.filter(x=>x!==d) : [...p.weekdays, d] }));

  function handleSave() {
    if (!form.jobName || !form.reportId) { toast.error("Name and Report are required"); return; }
    toast.success("Scheduled job created");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Scheduled Report Job</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-gray-700 border-b pb-1">Report Job Details</h3>
            <div><Label className="text-xs">Name</Label><Input className="mt-1 h-8 text-sm" value={form.jobName} onChange={e=>set("jobName",e.target.value)} /></div>
            <div><Label className="text-xs">Scheduled Start Time</Label><Input type="time" className="mt-1 h-8 text-sm" value={form.startTime} onChange={e=>set("startTime",e.target.value)} /></div>
            <div className="flex gap-4">
              {[{k:"runDaily",l:"Run Daily"},{k:"runWeekly",l:"Run Weekly"},{k:"runMonthly",l:"Run Monthly"},{k:"active",l:"Active"}].map(({k,l}) => (
                <label key={k} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox checked={!!(form as any)[k]} onCheckedChange={c=>set(k,!!c)} />{l}
                </label>
              ))}
            </div>
            <div><Label className="text-xs">Owner</Label><Input className="mt-1 h-8 text-sm" value={form.owner} onChange={e=>set("owner",e.target.value)} /></div>
          </div>

          {form.runWeekly && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700 border-b pb-1">Weekly Details</h3>
              <div className="flex gap-2 flex-wrap">
                {WEEKDAYS.map(d=>(
                  <button key={d} onClick={()=>toggleDay(d)} className={`px-2.5 py-1 rounded text-xs font-medium border ${form.weekdays.includes(d)?"bg-blue-600 text-white border-blue-600":"border-gray-300 text-gray-600 hover:bg-gray-50"}`}>{d}</button>
                ))}
              </div>
            </div>
          )}

          {form.runMonthly && (
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-gray-700 border-b pb-1">Monthly Details</h3>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="monthly" />On day <Input type="number" min="1" max="31" className="h-7 w-16 text-sm mx-1" defaultValue={1} /> of every month</label>
              <label className="flex items-center gap-2 text-sm flex-wrap">
                <input type="radio" name="monthly" />On the
                <Select><SelectTrigger className="h-7 w-24 text-xs"><SelectValue placeholder="First" /></SelectTrigger><SelectContent>{ORDINALS.map(o=><SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent></Select>
                <Select><SelectTrigger className="h-7 w-28 text-xs"><SelectValue placeholder="Monday" /></SelectTrigger><SelectContent>{WEEKDAYS.map(d=><SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent></Select>
                of every month
              </label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="monthly" />On the last day of every month</label>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700 border-b pb-1">Selected Report</h3>
            <Select value={form.reportId} onValueChange={v=>set("reportId",v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select a report" /></SelectTrigger>
              <SelectContent>{reports.map(r=><SelectItem key={r.id} value={String(r.id)}>{r.reportName}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700 border-b pb-1">Report Parameters</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date Range</Label>
                <Select value={form.dateRange} onValueChange={v=>set("dateRange",v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{DATE_RANGES.map(d=><SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Export Format</Label>
                <Select value={form.exportFormat} onValueChange={v=>set("exportFormat",v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPORT_FORMATS.map(f=><SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium text-sm text-gray-700 border-b pb-1">Email Details</h3>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.emailResults} onCheckedChange={c=>set("emailResults",!!c)} />Email link to report job results
            </label>
            {form.emailResults && <Input className="h-8 text-sm" placeholder="email@example.com" value={form.emailAddress} onChange={e=>set("emailAddress",e.target.value)} />}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Create Job</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ReportScheduledJobs() {
  const [showNew, setShowNew] = useState(false);
  const { data: reports = [] } = useQuery<Report[]>({ queryKey: ["reports"], queryFn: () => fetch(`${BASE}/reports`).then(r=>r.json()) });

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reports" className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Clock className="h-6 w-6 text-purple-600" />Scheduled Report Jobs</h1>
          <p className="text-sm text-gray-500">Automate recurring report delivery</p>
        </div>
        <div className="flex gap-2">
          <Link href="/reports"><Button variant="outline" size="sm"><BarChart2 className="h-4 w-4 mr-2" />View Reports</Button></Link>
          <Button size="sm" onClick={()=>setShowNew(true)}><Plus className="h-4 w-4 mr-2" />New Scheduled Report Job</Button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["", "Job Name", "Report", "Frequency", "Next Run", "Last Run", "Status", "Owner", "Active"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {MOCK_JOBS.map(job => (
              <tr key={job.id} className="hover:bg-gray-50 group">
                <td className="px-3 py-3">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <button className="p-1 rounded hover:bg-gray-100" title="Edit"><Pencil className="h-3.5 w-3.5 text-gray-400" /></button>
                    <button className="p-1 rounded hover:bg-gray-100" title="Copy"><Copy className="h-3.5 w-3.5 text-gray-400" /></button>
                    <button className="p-1 rounded hover:bg-gray-100" title="Delete"><Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" /></button>
                    <button className="p-1 rounded hover:bg-blue-50" title="Run Now"><Play className="h-3.5 w-3.5 text-gray-400 hover:text-blue-600" /></button>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{job.jobName}</td>
                <td className="px-4 py-3 text-gray-600">{job.reportName}</td>
                <td className="px-4 py-3"><Badge variant="outline">{job.frequency}</Badge></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{job.nextRunTime ? formatDate(job.nextRunTime) : "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{job.lastRunTime ? formatDate(job.lastRunTime) : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={job.lastStatus} /></td>
                <td className="px-4 py-3 text-gray-600">{job.owner}</td>
                <td className="px-4 py-3"><Badge variant={job.active?"default":"secondary"}>{job.active?"Active":"Inactive"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NewJobDialog open={showNew} onClose={()=>setShowNew(false)} reports={reports} />
    </div>
  );
}
