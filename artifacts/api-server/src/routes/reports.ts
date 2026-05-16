import { Router } from "express";
import { db } from "@workspace/db";
import {
  reportsTable, reportSchedulesTable, reportJobResultsTable,
  eventsTable, leadsTable, contactsTable, accountsTable,
  functionsTable, tasksTable, guestRoomBlocksTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ── Report Types ─────────────────────────────────────────────────────────────

export const REPORT_TYPES = [
  { id: "Event", name: "Event Report", description: "Events with status, dates, attendance and financial totals." },
  { id: "Function", name: "Function Report", description: "Individual functions with type, date, location and attendance." },
  { id: "EventLead", name: "Event Lead Report", description: "Sales leads with probability, budget and decision dates." },
  { id: "Contact", name: "Contact Report", description: "Contact directory with email, phone and title." },
  { id: "Account", name: "Account Report", description: "Corporate accounts with billing and contact information." },
  { id: "Task", name: "Task Report", description: "Tasks with priority, due date and completion status." },
  { id: "FunctionMenu", name: "Function Menu Report", description: "Menus assigned to functions with pricing details." },
  { id: "FunctionServiceItem", name: "Function Service Item Report", description: "Individual service items with revenue and cost data." },
  { id: "GuestRoomsBlock", name: "Guest Rooms Block Report", description: "Room block allocations with pickup and rate data." },
  { id: "FunctionFinancialSnapshot", name: "Function Financial Snapshot", description: "Point-in-time financials captured at each lifecycle stage." },
  { id: "FunctionRevenueCenterFinancials", name: "Function Revenue Center Financials", description: "Financial breakdown by revenue center per function." },
];

// All available columns per report type
const REPORT_COLUMNS: Record<string, Array<{group: string; fields: string[]}>> = {
  Event: [
    { group: "Event", fields: ["ID", "Event Name", "Event Number", "Event Status", "Start Date", "End Date", "Event Type", "Market Type", "Est. Attendance"] },
    { group: "Sales", fields: ["Owner", "Salesperson", "Site", "Division", "Lifecycle Model", "PMS Group Number"] },
    { group: "Financial", fields: ["Payment Arrangements", "Tax Exempt", "Billing Notes"] },
    { group: "Primary Contact", fields: ["Primary Contact Name"] },
  ],
  Function: [
    { group: "Function", fields: ["ID", "Event ID", "Function Type", "Function Number", "Function Date", "Start Time", "End Time", "Location", "Setup Style"] },
    { group: "Attendance", fields: ["Est. Attendance", "Guaranteed Attendance", "Set Count"] },
    { group: "Financial", fields: ["Room Rental"] },
    { group: "Sales", fields: ["Owner"] },
  ],
  EventLead: [
    { group: "Lead", fields: ["ID", "Lead Name", "Lead Status", "Lead Source", "Decision Date", "Arrival Date", "Departure Date"] },
    { group: "Financial", fields: ["Budget", "Probability", "Forecasted Revenue", "Rooms Revenue", "Food Revenue", "Beverage Revenue"] },
    { group: "Sales", fields: ["Owner", "Salesperson", "Site"] },
    { group: "Contact", fields: ["Contact Name", "Account Name"] },
  ],
  Contact: [
    { group: "Contact", fields: ["ID", "First Name", "Last Name", "Title", "Email", "Work Phone", "Cell Phone"] },
    { group: "Address", fields: ["Address 1", "City", "State", "Zip", "Country"] },
    { group: "Account", fields: ["Account Name"] },
  ],
  Account: [
    { group: "Account", fields: ["ID", "Account Name", "Account Type", "Account Number"] },
    { group: "Address", fields: ["Address 1", "City", "State", "Zip", "Country"] },
    { group: "Financial", fields: ["Billing Contact", "Billing Notes"] },
  ],
  Task: [
    { group: "Task", fields: ["ID", "Task Name", "Task Status", "Priority", "Due Date", "Completed At"] },
    { group: "Assignment", fields: ["Assigned To", "Owner", "Event ID", "Account Name"] },
  ],
  GuestRoomsBlock: [
    { group: "Room Block", fields: ["ID", "Event ID", "Room Type", "Block Date", "Rooms Blocked", "Rooms Picked Up", "Avg Rate", "Total"] },
  ],
  FunctionMenu: [
    { group: "Menu", fields: ["ID", "Function ID", "Menu Name", "Pricing Type", "Package Price", "Package Cost"] },
  ],
  FunctionServiceItem: [
    { group: "Item", fields: ["ID", "Service Type", "Item Name", "Quantity", "A La Carte Price", "Add-On Price", "Cost", "Item Total"] },
    { group: "Revenue", fields: ["Revenue Center", "Applied Rates", "Category"] },
  ],
  FunctionFinancialSnapshot: [
    { group: "Snapshot", fields: ["ID", "Function ID", "Event Status", "Date", "Charges", "Adj. Charges", "Cost", "Margin", "Margin %"] },
  ],
  FunctionRevenueCenterFinancials: [
    { group: "Revenue Center", fields: ["Function ID", "Revenue Center", "Charges", "Adj. Charges", "Sales Tax", "Occ. Tax", "Gratuity", "Total", "Cost", "Margin"] },
  ],
};

router.get("/types", async (req, res) => {
  res.json(REPORT_TYPES);
});

router.get("/columns/:reportType", async (req, res) => {
  const cols = REPORT_COLUMNS[req.params.reportType];
  if (!cols) return res.status(404).json({ error: "Unknown report type" });
  res.json(cols);
});

// ── CRUD ─────────────────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const { reportType, search, folder } = req.query as Record<string, string>;
    let reports = await db.select().from(reportsTable).orderBy(desc(reportsTable.updatedAt));
    if (reportType) reports = reports.filter((r) => r.reportType === reportType);
    if (folder) reports = reports.filter((r) => r.folder === folder);
    if (search) {
      const s = search.toLowerCase();
      reports = reports.filter((r) => r.reportName.toLowerCase().includes(s));
    }
    res.json(reports);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db.insert(reportsTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create report" });
  }
});

router.get("/schedules/all", async (req, res) => {
  try {
    const schedules = await db.select().from(reportSchedulesTable).orderBy(desc(reportSchedulesTable.createdAt));
    res.json(schedules);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

router.post("/schedules", async (req, res) => {
  try {
    const [created] = await db.insert(reportSchedulesTable).values(req.body).returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

router.delete("/schedules/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(reportSchedulesTable).where(eq(reportSchedulesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id));
    if (!report) return res.status(404).json({ error: "Not found" });
    res.json(report);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(reportsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(reportsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update report" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(reportsTable).where(eq(reportsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

// ── Run ──────────────────────────────────────────────────────────────────────

router.post("/:id/run", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id));
    if (!report) return res.status(404).json({ error: "Not found" });

    let columns: string[] = [];
    let rawRows: Record<string, unknown>[] = [];

    if (report.reportType === "Event") {
      const events = await db.select().from(eventsTable);
      columns = ["ID", "Event Name", "Event Status", "Start Date", "End Date", "Est. Attendance", "Site", "Owner", "Salesperson"];
      rawRows = events.map((e) => ({
        ID: e.id, "Event Name": e.eventName, "Event Status": e.eventStatus,
        "Start Date": e.startDate, "End Date": e.endDate,
        "Est. Attendance": e.estimatedAttendance, Site: e.site,
        Owner: e.owner, Salesperson: e.salesperson, "Event Type": e.eventType,
        "Market Type": e.marketType, "Event Number": e.eventNumber,
      }));
    } else if (report.reportType === "Function") {
      const fns = await db.select().from(functionsTable);
      columns = ["ID", "Event ID", "Function Type", "Function Date", "Start Time", "End Time", "Est. Attendance", "Function Number"];
      rawRows = fns.map((f) => ({
        ID: f.id, "Event ID": f.eventId, "Function Type": f.functionType,
        "Function Date": f.functionDate, "Start Time": f.startTime, "End Time": f.endTime,
        "Est. Attendance": f.estimatedAttendance, "Function Number": f.functionNumber,
        "Setup Style": f.setupStyle, Owner: f.owner,
      }));
    } else if (report.reportType === "EventLead") {
      const leads = await db.select().from(leadsTable);
      columns = ["ID", "Lead Name", "Lead Status", "Budget", "Probability", "Decision Date"];
      rawRows = leads.map((l) => ({
        ID: l.id, "Lead Name": l.leadName, "Lead Status": l.leadStatus,
        Budget: l.budget, Probability: l.probability, "Decision Date": l.decisionDate,
      }));
    } else if (report.reportType === "Contact") {
      const contacts = await db.select().from(contactsTable);
      columns = ["ID", "First Name", "Last Name", "Email", "Work Phone", "Title"];
      rawRows = contacts.map((c) => ({
        ID: c.id, "First Name": c.firstName, "Last Name": c.lastName,
        Email: c.email, "Work Phone": c.workPhone, Title: c.title,
      }));
    } else if (report.reportType === "Account") {
      const accounts = await db.select().from(accountsTable);
      columns = ["ID", "Account Name", "Account Type", "City", "State", "Country"];
      rawRows = accounts.map((a) => ({
        ID: a.id, "Account Name": a.accountName, "Account Type": a.accountType,
        City: a.city, State: a.state, Country: a.country,
      }));
    } else if (report.reportType === "Task") {
      const tasks = await db.select().from(tasksTable);
      columns = ["ID", "Task Name", "Priority", "Due Date", "Task Status", "Assigned To"];
      rawRows = tasks.map((t) => ({
        ID: t.id, "Task Name": t.taskName, Priority: t.priority,
        "Due Date": t.dueDate, "Task Status": t.taskStatus, "Assigned To": t.assignedTo,
      }));
    } else if (report.reportType === "GuestRoomsBlock") {
      const blocks = await db.select().from(guestRoomBlocksTable);
      columns = ["ID", "Event ID", "Room Type", "Block Date", "Rooms Blocked", "Rooms Picked Up", "Avg Rate"];
      rawRows = blocks.map((b) => ({
        ID: b.id, "Event ID": b.eventId, "Room Type": b.roomType,
        "Block Date": b.blockDate, "Rooms Blocked": b.roomsBlocked,
        "Rooms Picked Up": b.roomsPickedUp, "Avg Rate": b.avgRate,
      }));
    } else {
      columns = ["Message"];
      rawRows = [{ Message: `${report.reportType} report executed successfully` }];
    }

    // Filter to selected columns if configured
    const selectedCols: string[] | null = report.selectedColumns ? JSON.parse(report.selectedColumns) : null;
    if (selectedCols && selectedCols.length > 0) {
      rawRows = rawRows.map((r) => {
        const filtered: Record<string, unknown> = {};
        for (const col of selectedCols) if (col in r) filtered[col] = r[col];
        return filtered;
      });
      columns = selectedCols;
    }

    // Apply sorts
    if (report.sorts) {
      const sorts = JSON.parse(report.sorts) as Array<{column: string; sortOrder: string}>;
      for (const sort of [...sorts].reverse()) {
        rawRows.sort((a, b) => {
          const av = String(a[sort.column] ?? "");
          const bv = String(b[sort.column] ?? "");
          return sort.sortOrder === "Descending" ? bv.localeCompare(av) : av.localeCompare(bv);
        });
      }
    }

    // Pagination
    const page = parseInt(String(req.body?.page ?? 1));
    const pageSize = 100;
    const start = (page - 1) * pageSize;
    const rows = rawRows.slice(start, start + pageSize);

    const groupings = report.groupings ? JSON.parse(report.groupings) : [];
    const calculations = report.calculations ? JSON.parse(report.calculations) : [];

    res.json({
      reportId: id, reportName: report.reportName, reportType: report.reportType,
      columns, rows, rowCount: rawRows.length,
      groupings, calculations,
      page, pageSize, totalPages: Math.ceil(rawRows.length / pageSize),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to run report" });
  }
});

export default router;
