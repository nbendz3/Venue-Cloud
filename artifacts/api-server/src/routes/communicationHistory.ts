import { Router } from "express";
import { db } from "@workspace/db";
import { communicationHistoryTable, contactsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// GET /communication-history?relatedType=Event&relatedId=1
router.get("/", async (req, res) => {
  try {
    const { relatedType, relatedId } = req.query as Record<string, string>;
    let query = db
      .select({
        id: communicationHistoryTable.id,
        relatedType: communicationHistoryTable.relatedType,
        relatedId: communicationHistoryTable.relatedId,
        subject: communicationHistoryTable.subject,
        type: communicationHistoryTable.type,
        category: communicationHistoryTable.category,
        result: communicationHistoryTable.result,
        date: communicationHistoryTable.date,
        contactId: communicationHistoryTable.contactId,
        contactName: contactsTable.firstName,
        content: communicationHistoryTable.content,
        internal: communicationHistoryTable.internal,
        attachments: communicationHistoryTable.attachments,
        createdAt: communicationHistoryTable.createdAt,
        createdBy: communicationHistoryTable.createdBy,
      })
      .from(communicationHistoryTable)
      .leftJoin(contactsTable, eq(communicationHistoryTable.contactId, contactsTable.id))
      .$dynamic();

    if (relatedType && relatedId) {
      query = query.where(
        and(
          eq(communicationHistoryTable.relatedType, relatedType),
          eq(communicationHistoryTable.relatedId, parseInt(relatedId))
        )
      );
    }
    const rows = await query.orderBy(desc(communicationHistoryTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch communication history" });
  }
});

// POST /communication-history
router.post("/", async (req, res) => {
  try {
    const [created] = await db
      .insert(communicationHistoryTable)
      .values(req.body)
      .returning();
    res.status(201).json(created);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create communication log" });
  }
});

// PUT /communication-history/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(communicationHistoryTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(communicationHistoryTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update communication log" });
  }
});

// DELETE /communication-history/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(communicationHistoryTable).where(eq(communicationHistoryTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete communication log" });
  }
});

export default router;
