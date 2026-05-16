import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable, eventsTable, leadsTable, contactsTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { reportType, search } = req.query as Record<string, string>;
    const reports = await db.query.reportsTable.findMany();
    let filtered = reports;
    if (reportType) filtered = filtered.filter((r) => r.reportType === reportType);
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((r) => r.reportName.toLowerCase().includes(s));
    }
    res.json(filtered);
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

router.get("/:id/run", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const report = await db.query.reportsTable.findFirst({ where: eq(reportsTable.id, id) });
    if (!report) return res.status(404).json({ error: "Not found" });

    // Return sample data based on report type
    let columns: string[] = [];
    let rows: Record<string, unknown>[] = [];

    if (report.reportType === "Event") {
      const events = await db.query.eventsTable.findMany();
      columns = ["ID", "Event Name", "Status", "Start Date", "End Date", "Attendance", "Site"];
      rows = events.map((e) => ({
        ID: e.id,
        "Event Name": e.eventName,
        Status: e.eventStatus,
        "Start Date": e.startDate,
        "End Date": e.endDate,
        Attendance: e.estimatedAttendance,
        Site: e.site,
      }));
    } else if (report.reportType === "Lead") {
      const leads = await db.query.leadsTable.findMany();
      columns = ["ID", "Lead Name", "Status", "Budget", "Probability", "Decision Date"];
      rows = leads.map((l) => ({
        ID: l.id,
        "Lead Name": l.leadName,
        Status: l.leadStatus,
        Budget: l.budget,
        Probability: l.probability,
        "Decision Date": l.decisionDate,
      }));
    } else if (report.reportType === "Contact") {
      const contacts = await db.query.contactsTable.findMany();
      columns = ["ID", "First Name", "Last Name", "Email", "Work Phone", "Title"];
      rows = contacts.map((c) => ({
        ID: c.id,
        "First Name": c.firstName,
        "Last Name": c.lastName,
        Email: c.email,
        "Work Phone": c.workPhone,
        Title: c.title,
      }));
    } else {
      columns = ["Message"];
      rows = [{ Message: "Report executed successfully" }];
    }

    res.json({ reportId: id, reportName: report.reportName, columns, rows, rowCount: rows.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to run report" });
  }
});

export default router;
