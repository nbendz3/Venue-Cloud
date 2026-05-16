import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { search, accountId } = req.query as Record<string, string>;
    const contacts = await db.query.contactsTable.findMany();
    let filtered = contacts;
    if (accountId) filtered = filtered.filter((c) => c.accountId === parseInt(accountId));
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName.toLowerCase().includes(s) ||
          c.lastName.toLowerCase().includes(s) ||
          (c.email ?? "").toLowerCase().includes(s)
      );
    }
    const enriched = await Promise.all(
      filtered.map(async (c) => {
        let accountName = null;
        if (c.accountId) {
          const acct = await db.query.accountsTable.findFirst({
            where: eq(accountsTable.id, c.accountId),
          });
          accountName = acct?.name ?? null;
        }
        return { ...c, accountName };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [created] = await db.insert(contactsTable).values(req.body).returning();
    res.status(201).json({ ...created, accountName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const contact = await db.query.contactsTable.findFirst({
      where: eq(contactsTable.id, id),
    });
    if (!contact) return res.status(404).json({ error: "Not found" });
    let accountName = null;
    if (contact.accountId) {
      const acct = await db.query.accountsTable.findFirst({
        where: eq(accountsTable.id, contact.accountId),
      });
      accountName = acct?.name ?? null;
    }
    res.json({ ...contact, accountName });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(contactsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(contactsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, accountName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(contactsTable).where(eq(contactsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

export default router;
