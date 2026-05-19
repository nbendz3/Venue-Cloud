import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart2, Search, Plus, Play, Pencil, Trash2, Copy,
  Download, MoreHorizontal, CalendarClock, ChevronRight,
  ChevronDown, Folder, FolderOpen, X, FileText,
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
type SampleData = { columns: string[]; rows: Record<string, string>[] };

/* ─── Sample data generator ─────────────────────────────────────── */
function generateSampleData(reportName: string, reportType: string | null | undefined): SampleData {
  const name = reportName.toLowerCase();

  if (name.includes("active event") || name.includes("event summary") || name.includes("monthly event summary")) {
    return {
      columns: ["Event Name", "Status", "Start Date", "End Date", "Attendance", "Revenue"],
      rows: [
        { "Event Name": "Meridian Corp Annual Gala", "Status": "Definite", "Start Date": "2026-06-10", "End Date": "2026-06-12", "Attendance": "320", "Revenue": "$48,500" },
        { "Event Name": "Tech Summit 2026", "Status": "Tentative", "Start Date": "2026-07-15", "End Date": "2026-07-17", "Attendance": "185", "Revenue": "$27,200" },
        { "Event Name": "Blue Ridge Retreat", "Status": "Definite", "Start Date": "2026-08-03", "End Date": "2026-08-05", "Attendance": "60", "Revenue": "$14,750" },
        { "Event Name": "Summit Partners Banquet", "Status": "Inquiry", "Start Date": "2026-09-20", "End Date": "2026-09-20", "Attendance": "140", "Revenue": "$19,400" },
        { "Event Name": "Hartwell Leadership Seminar", "Status": "Definite", "Start Date": "2026-10-08", "End Date": "2026-10-09", "Attendance": "75", "Revenue": "$11,250" },
      ],
    };
  }

  if (name.includes("monthly event revenue") || name.includes("revenue by market")) {
    if (name.includes("market")) {
      return {
        columns: ["Market Type", "Events", "Total Revenue", "Avg Revenue", "% of Total"],
        rows: [
          { "Market Type": "Corporate", "Events": "7", "Total Revenue": "$124,800", "Avg Revenue": "$17,828", "% of Total": "43.2%" },
          { "Market Type": "Social / Wedding", "Events": "5", "Total Revenue": "$98,500", "Avg Revenue": "$19,700", "% of Total": "34.1%" },
          { "Market Type": "Non-Profit", "Events": "3", "Total Revenue": "$32,100", "Avg Revenue": "$10,700", "% of Total": "11.1%" },
          { "Market Type": "Government", "Events": "2", "Total Revenue": "$21,600", "Avg Revenue": "$10,800", "% of Total": "7.5%" },
          { "Market Type": "Association", "Events": "1", "Total Revenue": "$12,000", "Avg Revenue": "$12,000", "% of Total": "4.1%" },
        ],
      };
    }
    return {
      columns: ["Month", "Events", "Total Revenue", "Avg Revenue", "YoY Change"],
      rows: [
        { "Month": "January 2026", "Events": "4", "Total Revenue": "$52,400", "Avg Revenue": "$13,100", "YoY Change": "+8.2%" },
        { "Month": "February 2026", "Events": "3", "Total Revenue": "$38,750", "Avg Revenue": "$12,917", "YoY Change": "+11.4%" },
        { "Month": "March 2026", "Events": "6", "Total Revenue": "$91,200", "Avg Revenue": "$15,200", "YoY Change": "+5.7%" },
        { "Month": "April 2026", "Events": "5", "Total Revenue": "$74,300", "Avg Revenue": "$14,860", "YoY Change": "+14.1%" },
        { "Month": "May 2026", "Events": "4", "Total Revenue": "$61,100", "Avg Revenue": "$15,275", "YoY Change": "+9.3%" },
      ],
    };
  }

  if (name.includes("lead pipeline") || name.includes("open lead") || name.includes("outstanding lead")) {
    return {
      columns: ["Lead Name", "Account", "Probability", "Budget", "Stage", "Decision Date"],
      rows: [
        { "Lead Name": "Spring Conference 2027", "Account": "Meridian Corporation", "Probability": "75%", "Budget": "$35,000", "Stage": "Proposal Sent", "Decision Date": "2026-06-30" },
        { "Lead Name": "Annual Team Offsite", "Account": "Cascade Technologies", "Probability": "50%", "Budget": "$18,500", "Stage": "Site Visit", "Decision Date": "2026-07-15" },
        { "Lead Name": "Charity Gala 2026", "Account": "Hartwell Industries", "Probability": "90%", "Budget": "$52,000", "Stage": "Contract Review", "Decision Date": "2026-06-10" },
        { "Lead Name": "Q3 Sales Kickoff", "Account": "Summit Partners LLC", "Probability": "35%", "Budget": "$24,000", "Stage": "Inquiry", "Decision Date": "2026-08-01" },
        { "Lead Name": "Executive Retreat", "Account": "Blue Ridge Consulting", "Probability": "60%", "Budget": "$41,000", "Stage": "Proposal Sent", "Decision Date": "2026-07-22" },
      ],
    };
  }

  if (name.includes("contact directory") || name.includes("contact")) {
    return {
      columns: ["Name", "Account", "Title", "Email", "Phone"],
      rows: [
        { "Name": "Sarah Mitchell", "Account": "Meridian Corporation", "Title": "Event Coordinator", "Email": "s.mitchell@meridian.com", "Phone": "(555) 201-4400" },
        { "Name": "James Thornton", "Account": "Cascade Technologies", "Title": "VP Operations", "Email": "j.thornton@cascade.tech", "Phone": "(555) 342-8812" },
        { "Name": "Linda Reyes", "Account": "Hartwell Industries", "Title": "Executive Assistant", "Email": "linda.reyes@hartwell.com", "Phone": "(555) 487-3300" },
        { "Name": "Kevin Park", "Account": "Summit Partners LLC", "Title": "Meeting Planner", "Email": "k.park@summitpartners.com", "Phone": "(555) 619-7740" },
        { "Name": "Amanda Cross", "Account": "Blue Ridge Consulting", "Title": "Director, HR", "Email": "a.cross@blueridge.com", "Phone": "(555) 733-2250" },
      ],
    };
  }

  if (name.includes("task completion") || name.includes("task overdue") || name.includes("task")) {
    const isOverdue = name.includes("overdue");
    return {
      columns: isOverdue
        ? ["Task", "Assignee", "Priority", "Due Date", "Days Overdue"]
        : ["Task", "Assignee", "Status", "Priority", "Due Date"],
      rows: isOverdue
        ? [
            { "Task": "Send contract to Meridian", "Assignee": "J. Smith", "Priority": "High", "Due Date": "2026-05-16", "Days Overdue": "3" },
            { "Task": "Confirm AV requirements for Summit Gala", "Assignee": "M. Torres", "Priority": "High", "Due Date": "2026-05-15", "Days Overdue": "4" },
            { "Task": "Review catering menus with Blue Ridge", "Assignee": "J. Smith", "Priority": "Medium", "Due Date": "2026-05-16", "Days Overdue": "3" },
            { "Task": "Send proposal to Cascade", "Assignee": "R. Chen", "Priority": "High", "Due Date": "2026-05-15", "Days Overdue": "4" },
          ]
        : [
            { "Task": "Send contract to Meridian", "Assignee": "J. Smith", "Status": "Overdue", "Priority": "High", "Due Date": "2026-05-16" },
            { "Task": "Prepare banquet floor plan", "Assignee": "M. Torres", "Status": "In Progress", "Priority": "Medium", "Due Date": "2026-05-22" },
            { "Task": "Follow up with Summit Partners", "Assignee": "R. Chen", "Status": "Completed", "Priority": "Low", "Due Date": "2026-05-18" },
            { "Task": "Review BEO for Tech Summit", "Assignee": "J. Smith", "Status": "Completed", "Priority": "High", "Due Date": "2026-05-14" },
            { "Task": "Order floral arrangements", "Assignee": "L. Hayes", "Status": "In Progress", "Priority": "Medium", "Due Date": "2026-05-25" },
          ],
    };
  }

  if (name.includes("function revenue") || name.includes("function detail") || name.includes("function utilization")) {
    if (name.includes("revenue")) {
      return {
        columns: ["Function Type", "Count", "Total Revenue", "Avg Revenue", "Avg Attendance"],
        rows: [
          { "Function Type": "Dinner", "Count": "12", "Total Revenue": "$86,400", "Avg Revenue": "$7,200", "Avg Attendance": "148" },
          { "Function Type": "Breakfast", "Count": "8", "Total Revenue": "$24,000", "Avg Revenue": "$3,000", "Avg Attendance": "85" },
          { "Function Type": "Reception", "Count": "6", "Total Revenue": "$31,800", "Avg Revenue": "$5,300", "Avg Attendance": "112" },
          { "Function Type": "Luncheon", "Count": "9", "Total Revenue": "$38,250", "Avg Revenue": "$4,250", "Avg Attendance": "95" },
          { "Function Type": "Meeting", "Count": "14", "Total Revenue": "$42,000", "Avg Revenue": "$3,000", "Avg Attendance": "42" },
        ],
      };
    }
    if (name.includes("detail")) {
      return {
        columns: ["Event", "Function", "Date", "Location", "Attendance", "Room Rental"],
        rows: [
          { "Event": "Meridian Corp Annual Gala", "Function": "Welcome Reception", "Date": "2026-06-10", "Location": "Grand Ballroom A", "Attendance": "320", "Room Rental": "$4,500" },
          { "Event": "Meridian Corp Annual Gala", "Function": "Awards Dinner", "Date": "2026-06-11", "Location": "Grand Ballroom A+B", "Attendance": "320", "Room Rental": "$7,200" },
          { "Event": "Tech Summit 2026", "Function": "Keynote Breakfast", "Date": "2026-07-15", "Location": "Pines Pavilion", "Attendance": "185", "Room Rental": "$2,800" },
          { "Event": "Tech Summit 2026", "Function": "Breakout Sessions", "Date": "2026-07-16", "Location": "Cedar/Pine Rooms", "Attendance": "185", "Room Rental": "$3,600" },
          { "Event": "Blue Ridge Retreat", "Function": "Team Dinner", "Date": "2026-08-04", "Location": "Lake View Terrace", "Attendance": "60", "Room Rental": "$1,800" },
        ],
      };
    }
    return {
      columns: ["Location", "Functions Held", "Total Attendance", "Avg Rental", "Utilization %"],
      rows: [
        { "Location": "Grand Ballroom A", "Functions Held": "18", "Total Attendance": "3,240", "Avg Rental": "$5,400", "Utilization %": "82%" },
        { "Location": "Grand Ballroom B", "Functions Held": "14", "Total Attendance": "1,960", "Avg Rental": "$4,200", "Utilization %": "64%" },
        { "Location": "Pines Pavilion", "Functions Held": "22", "Total Attendance": "2,860", "Avg Rental": "$2,800", "Utilization %": "76%" },
        { "Location": "Cedar Room", "Functions Held": "31", "Total Attendance": "1,240", "Avg Rental": "$1,200", "Utilization %": "88%" },
        { "Location": "Lake View Terrace", "Functions Held": "11", "Total Attendance": "770", "Avg Rental": "$1,650", "Utilization %": "45%" },
      ],
    };
  }

  if (name.includes("account activity") || name.includes("account")) {
    return {
      columns: ["Account Name", "Events (YTD)", "Total Revenue", "Open Leads", "Last Event Date"],
      rows: [
        { "Account Name": "Meridian Corporation", "Events (YTD)": "4", "Total Revenue": "$148,200", "Open Leads": "2", "Last Event Date": "2026-05-10" },
        { "Account Name": "Cascade Technologies", "Events (YTD)": "3", "Total Revenue": "$72,400", "Open Leads": "1", "Last Event Date": "2026-04-22" },
        { "Account Name": "Hartwell Industries", "Events (YTD)": "2", "Total Revenue": "$58,900", "Open Leads": "3", "Last Event Date": "2026-03-15" },
        { "Account Name": "Summit Partners LLC", "Events (YTD)": "2", "Total Revenue": "$41,750", "Open Leads": "1", "Last Event Date": "2026-04-08" },
        { "Account Name": "Blue Ridge Consulting", "Events (YTD)": "1", "Total Revenue": "$22,100", "Open Leads": "2", "Last Event Date": "2026-02-28" },
      ],
    };
  }

  if (name.includes("guest room") || name.includes("room pickup")) {
    return {
      columns: ["Event", "Room Type", "Rooms Blocked", "Rooms Picked Up", "Pickup %", "Avg Rate"],
      rows: [
        { "Event": "Meridian Corp Annual Gala", "Room Type": "Deluxe King", "Rooms Blocked": "40", "Rooms Picked Up": "37", "Pickup %": "92.5%", "Avg Rate": "$249" },
        { "Event": "Meridian Corp Annual Gala", "Room Type": "Standard Queen", "Rooms Blocked": "20", "Rooms Picked Up": "18", "Pickup %": "90.0%", "Avg Rate": "$199" },
        { "Event": "Tech Summit 2026", "Room Type": "Deluxe King", "Rooms Blocked": "25", "Rooms Picked Up": "19", "Pickup %": "76.0%", "Avg Rate": "$249" },
        { "Event": "Tech Summit 2026", "Room Type": "Standard Queen", "Rooms Blocked": "30", "Rooms Picked Up": "21", "Pickup %": "70.0%", "Avg Rate": "$199" },
        { "Event": "Blue Ridge Retreat", "Room Type": "Suite", "Rooms Blocked": "10", "Rooms Picked Up": "8", "Pickup %": "80.0%", "Avg Rate": "$349" },
      ],
    };
  }

  // Fallback by report type
  const typeMap: Record<string, SampleData> = {
    Event: {
      columns: ["Event Name", "Type", "Status", "Start Date", "Attendance", "Revenue"],
      rows: [
        { "Event Name": "Annual Gala", "Type": "Social", "Status": "Definite", "Start Date": "2026-06-10", "Attendance": "320", "Revenue": "$48,500" },
        { "Event Name": "Sales Kickoff", "Type": "Meeting", "Status": "Tentative", "Start Date": "2026-07-01", "Attendance": "80", "Revenue": "$14,200" },
        { "Event Name": "Leadership Summit", "Type": "Conference", "Status": "Definite", "Start Date": "2026-08-15", "Attendance": "150", "Revenue": "$31,000" },
      ],
    },
    Function: {
      columns: ["Function Name", "Event", "Type", "Date", "Location", "Attendance"],
      rows: [
        { "Function Name": "Welcome Reception", "Event": "Annual Gala", "Type": "Reception", "Date": "2026-06-10", "Location": "Grand Ballroom A", "Attendance": "320" },
        { "Function Name": "Awards Dinner", "Event": "Annual Gala", "Type": "Dinner", "Date": "2026-06-11", "Location": "Grand Ballroom A+B", "Attendance": "300" },
        { "Function Name": "Keynote Breakfast", "Event": "Sales Kickoff", "Type": "Breakfast", "Date": "2026-07-01", "Location": "Pines Pavilion", "Attendance": "80" },
      ],
    },
    EventLead: {
      columns: ["Lead Name", "Account", "Probability", "Budget", "Stage"],
      rows: [
        { "Lead Name": "Spring Conference 2027", "Account": "Meridian Corp", "Probability": "75%", "Budget": "$35,000", "Stage": "Proposal Sent" },
        { "Lead Name": "Team Retreat", "Account": "Cascade Tech", "Probability": "50%", "Budget": "$18,500", "Stage": "Site Visit" },
        { "Lead Name": "Charity Gala", "Account": "Hartwell Industries", "Probability": "90%", "Budget": "$52,000", "Stage": "Contract Review" },
      ],
    },
    Lead: {
      columns: ["Lead Name", "Account", "Probability", "Budget", "Decision Date"],
      rows: [
        { "Lead Name": "Spring Conference 2027", "Account": "Meridian Corp", "Probability": "75%", "Budget": "$35,000", "Decision Date": "2026-06-30" },
        { "Lead Name": "Team Retreat", "Account": "Cascade Tech", "Probability": "50%", "Budget": "$18,500", "Decision Date": "2026-07-15" },
      ],
    },
    Task: {
      columns: ["Task", "Assignee", "Status", "Priority", "Due Date"],
      rows: [
        { "Task": "Send contract to Meridian", "Assignee": "J. Smith", "Status": "Overdue", "Priority": "High", "Due Date": "2026-05-16" },
        { "Task": "Prepare banquet floor plan", "Assignee": "M. Torres", "Status": "In Progress", "Priority": "Medium", "Due Date": "2026-05-22" },
        { "Task": "Follow up with Summit Partners", "Assignee": "R. Chen", "Status": "Completed", "Priority": "Low", "Due Date": "2026-05-18" },
      ],
    },
    Contact: {
      columns: ["Name", "Account", "Email", "Phone", "Title"],
      rows: [
        { "Name": "Sarah Mitchell", "Account": "Meridian Corporation", "Email": "s.mitchell@meridian.com", "Phone": "(555) 201-4400", "Title": "Event Coordinator" },
        { "Name": "James Thornton", "Account": "Cascade Technologies", "Email": "j.thornton@cascade.tech", "Phone": "(555) 342-8812", "Title": "VP Operations" },
      ],
    },
    Account: {
      columns: ["Account Name", "Events (YTD)", "Total Revenue", "Open Leads"],
      rows: [
        { "Account Name": "Meridian Corporation", "Events (YTD)": "4", "Total Revenue": "$148,200", "Open Leads": "2" },
        { "Account Name": "Cascade Technologies", "Events (YTD)": "3", "Total Revenue": "$72,400", "Open Leads": "1" },
      ],
    },
    GuestRoomsBlock: {
      columns: ["Event", "Room Type", "Blocked", "Picked Up", "Pickup %"],
      rows: [
        { "Event": "Annual Gala", "Room Type": "Deluxe King", "Blocked": "40", "Picked Up": "37", "Pickup %": "92.5%" },
        { "Event": "Tech Summit", "Room Type": "Standard Queen", "Blocked": "30", "Picked Up": "21", "Pickup %": "70.0%" },
      ],
    },
  };

  return typeMap[reportType ?? ""] ?? {
    columns: ["Name", "Value", "Date"],
    rows: [
      { "Name": "Sample Record 1", "Value": "$12,400", "Date": "2026-05-01" },
      { "Name": "Sample Record 2", "Value": "$9,800", "Date": "2026-04-15" },
      { "Name": "Sample Record 3", "Value": "$7,250", "Date": "2026-03-22" },
    ],
  };
}

/* ─── CSV Export ─────────────────────────────────────────────────── */
function exportCSV(columns: string[], rows: Record<string, string>[], filename: string) {
  const header = columns.map(c => `"${c}"`).join(",");
  const body = rows.map(r => columns.map(c => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([header + "\n" + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Hooks ──────────────────────────────────────────────────────── */
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

/* ─── Constants ──────────────────────────────────────────────────── */
const TYPE_COLOR: Record<string, string> = {
  Event: "bg-red-50 text-red-700 border-red-200",
  Function: "bg-orange-50 text-orange-700 border-orange-200",
  EventLead: "bg-blue-50 text-blue-700 border-blue-200",
  Lead: "bg-blue-50 text-blue-700 border-blue-200",
  Account: "bg-purple-50 text-purple-700 border-purple-200",
  Contact: "bg-teal-50 text-teal-700 border-teal-200",
  Task: "bg-yellow-50 text-yellow-700 border-yellow-200",
  GuestRoomsBlock: "bg-green-50 text-green-700 border-green-200",
};

/* ─── Small helpers ──────────────────────────────────────────────── */
function ActionBtn({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
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

/* ─── Report Row ─────────────────────────────────────────────────── */
function ReportRow({ report, isSelected, onSelect, onCopy, onDelete }: {
  report: Report;
  isSelected: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const [, navigate] = useLocation();
  const typeColor = TYPE_COLOR[report.reportType ?? ""] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const dt = new Date(report.createdAt);
  const createdStr = isNaN(dt.getTime()) ? "—"
    : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <tr
      className={`group transition-colors cursor-pointer ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
      onClick={onSelect}
    >
      <td className="px-4 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-0.5">
          <ActionBtn label="Copy" onClick={onCopy}>
            <Copy className="w-3.5 h-3.5" />
          </ActionBtn>
          <ActionBtn label="Edit" onClick={() => navigate(`/reports/${report.id}/edit`)}>
            <Pencil className="w-3.5 h-3.5" />
          </ActionBtn>
          <ActionBtn label="Run (full page)" onClick={() => navigate(`/reports/${report.id}/run`)}>
            <Play className="w-3.5 h-3.5" />
          </ActionBtn>
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
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
      <td className="px-4 py-2 max-w-[200px]">
        <span className={`font-medium text-sm truncate block ${isSelected ? "text-primary" : "text-foreground"}`}>
          {report.reportName}
        </span>
      </td>
      <td className="px-4 py-2 max-w-[220px]">
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
        {createdStr}
      </td>
    </tr>
  );
}

/* ─── Detail / Run Panel ─────────────────────────────────────────── */
function ReportDetailPanel({ report, onClose }: { report: Report; onClose: () => void }) {
  const today = new Date().toISOString().split("T")[0];
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(threeMonthsAgo);
  const [dateTo, setDateTo] = useState(today);
  const [results, setResults] = useState<SampleData | null>(null);
  const [running, setRunning] = useState(false);

  const typeColor = TYPE_COLOR[report.reportType ?? ""] ?? "bg-gray-50 text-gray-600 border-gray-200";

  function handleRun() {
    setRunning(true);
    setResults(null);
    // Simulate a brief loading delay
    setTimeout(() => {
      setResults(generateSampleData(report.reportName, report.reportType));
      setRunning(false);
    }, 600);
  }

  function handleExport() {
    if (!results) return;
    exportCSV(results.columns, results.rows, report.reportName);
    toast.success("Exported to CSV");
  }

  return (
    <div className="w-[460px] flex-shrink-0 border-l bg-card flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="flex-shrink-0 border-b px-4 py-3 flex items-start gap-3">
        <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold leading-tight truncate">{report.reportName}</h2>
          {report.reportType && (
            <Badge variant="outline" className={`text-[10px] font-normal mt-1 ${typeColor}`}>
              {report.reportType}
            </Badge>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-0.5"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Description */}
        {report.description && (
          <div className="px-4 py-3 border-b bg-muted/20">
            <p className="text-xs text-muted-foreground leading-relaxed">{report.description}</p>
          </div>
        )}

        {/* Date Range + Run */}
        <div className="px-4 py-4 border-b space-y-3">
          <p className="text-xs font-medium text-foreground">Date Range</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <Button
            className="w-full"
            size="sm"
            onClick={handleRun}
            disabled={running}
          >
            <Play className={`w-3.5 h-3.5 mr-2 ${running ? "animate-pulse" : ""}`} />
            {running ? "Running…" : "Run Report"}
          </Button>
        </div>

        {/* Results */}
        {running && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Generating results…</p>
          </div>
        )}

        {results && !running && (
          <div className="px-4 py-3 space-y-3">
            {/* Results header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Results</p>
                <p className="text-[10px] text-muted-foreground">{results.rows.length} rows · {dateFrom} to {dateTo}</p>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleExport}>
                <Download className="w-3 h-3 mr-1.5" />
                Export CSV
              </Button>
            </div>

            {/* Results table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      {results.columns.map(col => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap uppercase tracking-wide text-[10px]"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-muted/20" : ""}>
                        {results.columns.map(col => (
                          <td key={col} className="px-3 py-2 text-foreground whitespace-nowrap">
                            {row[col] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center pb-2">
              Sample data shown for preview purposes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function ReportsPage() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: reportTypes = [] } = useReportTypes();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeFolder, setActiveFolder] = useState("All Reports");
  const [siteExpanded, setSiteExpanded] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

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

      {/* ── Main Content + Panel ── */}
      <div className="flex-1 flex overflow-hidden min-w-0">
        {/* Report list column */}
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
                  {reports.length} shown · {allReports.length} total{selectedReport ? " · 1 selected" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/reports/scheduled-jobs">
                <Button variant="outline" size="sm" className="text-xs">
                  <CalendarClock className="h-3.5 w-3.5 mr-1.5" />
                  Scheduled Jobs
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
              <SelectTrigger className="w-44 h-8 text-xs">
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
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reports.map((report) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      isSelected={selectedReport?.id === report.id}
                      onSelect={() => setSelectedReport(r => r?.id === report.id ? null : report)}
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

        {/* ── Right Detail Panel ── */}
        {selectedReport && (
          <ReportDetailPanel
            key={selectedReport.id}
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
          />
        )}
      </div>
    </div>
  );
}
