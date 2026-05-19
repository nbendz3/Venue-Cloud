import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Search } from "lucide-react";

const REPORT_TYPES = [
  { name: "Account", description: "Account details, contacts, and associated events." },
  { name: "Appointment", description: "Scheduled appointments and their outcomes." },
  { name: "Communication History", description: "All logged activities and communications." },
  { name: "Contact", description: "Contact directory with event associations." },
  { name: "Contact Event Revenue", description: "Revenue attributed to specific contacts." },
  { name: "Credit Card", description: "Credit card records on file." },
  { name: "Credit Card Transaction", description: "Payment transactions processed." },
  { name: "Enterprise", description: "Cross-property enterprise summary." },
  { name: "Event", description: "Full event list with status, dates, and revenue." },
  { name: "Event Availability", description: "Open dates and availability by venue area." },
  { name: "Event Calendar", description: "Calendar view of events by date range." },
  { name: "Event Cost Worksheet", description: "Cost breakdown per event and function." },
  { name: "Event Forecast", description: "Projected revenue from confirmed and tentative events." },
  { name: "Event Function Change History", description: "Audit log of function field changes." },
  { name: "Event Function Summary", description: "Summary of functions per event." },
  { name: "Event Lead", description: "Lead pipeline with probability and status." },
  { name: "Event Lead Function", description: "Functions associated with event leads." },
  { name: "Event Lifecycle Model", description: "Events by lifecycle stage and owner." },
  { name: "Event Package", description: "Menu packages used across events." },
  { name: "Event Package Function", description: "Package assignment by function." },
  { name: "Event Payment", description: "Payments received per event." },
  { name: "Event Personnel", description: "Staff assigned to events and functions." },
  { name: "Event Revenue Analysis", description: "Detailed revenue breakdown by type." },
  { name: "Event Revenue Performance to Plan by Fiscal Period", description: "Plan vs. actual by fiscal period." },
  { name: "Event Revenue Performance to Plan by Month", description: "Plan vs. actual by calendar month." },
  { name: "Event Revenue Summary", description: "High-level revenue rollup." },
  { name: "Event Revenue Summary by Date Range", description: "Revenue summary for a selected date range." },
  { name: "Event Recast", description: "Re-forecasted revenue adjustments." },
  { name: "Event Task", description: "Tasks associated with events." },
  { name: "Function Adjustment", description: "Manual adjustments made to function financials." },
  { name: "Function Personnel", description: "Personnel per function." },
  { name: "Function Timeline", description: "Timeline items for all functions." },
  { name: "Guest Room Block", description: "Room block details per event." },
  { name: "Guest Room Booking", description: "Individual room booking records." },
  { name: "Guest Room Revenue", description: "Revenue from guest room blocks." },
  { name: "Guest Room Type", description: "Room types and their rates." },
  { name: "Master Event", description: "Master event records with child event counts." },
  { name: "Menu Item", description: "Service items across all menus." },
  { name: "Menu Template", description: "Template library with pricing and items." },
  { name: "Note", description: "Notes logged against events, functions, and leads." },
  { name: "Report Subscription", description: "Scheduled report delivery subscriptions." },
  { name: "Revenue Analysis", description: "Revenue by revenue center and type." },
  { name: "Revenue Center", description: "Revenue center configuration and totals." },
  { name: "Sales Activity", description: "Sales call activity and communication logs." },
  { name: "Sales Pace", description: "Booking pace vs. prior year and goal." },
  { name: "Service Item", description: "Individual service items with costs and prices." },
  { name: "Service Type", description: "Service type groupings." },
  { name: "Site", description: "Site/property configuration details." },
  { name: "Task", description: "All tasks with priority, status, and owners." },
  { name: "User", description: "System users and their roles." },
  { name: "Venue", description: "Venue spaces and capacities." },
];

export default function ReportNew() {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();

  const filtered = REPORT_TYPES.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!selected || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportName: `New ${selected} Report`, reportType: selected }),
      });
      const created = await res.json();
      navigate(`/reports/${created.id}/edit`);
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/reports" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Reports — New</h1>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-4">
          Select the type of data you wish to report on.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search report types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden mb-6 max-h-[60vh] overflow-y-auto">
        {filtered.map((rt, idx) => (
          <div
            key={rt.name}
            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b last:border-b-0 ${
              selected === rt.name
                ? "bg-primary/10 border-l-4 border-l-primary"
                : idx % 2 === 0
                ? "bg-white hover:bg-muted/40"
                : "bg-muted/20 hover:bg-muted/40"
            }`}
            onClick={() => setSelected(rt.name)}
          >
            <Checkbox
              checked={selected === rt.name}
              onCheckedChange={() => setSelected(rt.name)}
              className="mt-0.5 flex-shrink-0"
            />
            <div>
              <div className="text-sm font-medium">{rt.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{rt.description}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No report types match your search.
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleCreate} disabled={!selected || creating}>
          {creating ? "Creating…" : "Create Report"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/reports">Cancel</Link>
        </Button>
        {selected && (
          <span className="text-sm text-muted-foreground ml-2">
            Selected: <span className="font-medium text-foreground">{selected}</span>
          </span>
        )}
      </div>
    </div>
  );
}
