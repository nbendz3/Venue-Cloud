import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, contactsTable, eventsTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { search, includeInactive } = req.query as Record<string, string>;
    let query = db.select().from(accountsTable);
    const results = await db.query.accountsTable.findMany();
    let filtered = results;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(s));
    }
    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

router.post("/", async (req, res) => {
  try {
    const accountNumber = `ACC-${Date.now()}`;
    const [created] = await db
      .insert(accountsTable)
      .values({ ...req.body, accountNumber })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const account = await db.query.accountsTable.findFirst({
      where: eq(accountsTable.id, id),
    });
    if (!account) { res.status(404).json({ error: "Not found" }); return; }
    res.json(account);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(accountsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(accountsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update account" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(accountsTable).where(eq(accountsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// GET /accounts/:id/events — events whose primary contact belongs to this account
router.get("/:id/events", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const contacts = await db.query.contactsTable.findMany({
      where: eq(contactsTable.accountId, id),
    });
    const contactIds = contacts.map(c => c.id);
    if (contactIds.length === 0) { res.json([]); return; }
    const events = await db.query.eventsTable.findMany();
    const filtered = events.filter(e => e.primaryContactId != null && contactIds.includes(e.primaryContactId));
    res.json(filtered.sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch account events" });
  }
});

export default router;
