import { Router } from "express";
import { db } from "@workspace/db";
import { eventContactsTable, contactsTable, accountsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  try {
    const p = req.params as { id: string };
    const eventId = parseInt(p.id);
    const rows = await db
      .select({
        id: eventContactsTable.id,
        eventId: eventContactsTable.eventId,
        contactId: eventContactsTable.contactId,
        contactRole: eventContactsTable.contactRole,
        createdAt: eventContactsTable.createdAt,
        firstName: contactsTable.firstName,
        lastName: contactsTable.lastName,
        email: contactsTable.email,
        workPhone: contactsTable.workPhone,
        mobilePhone: contactsTable.mobilePhone,
        accountId: contactsTable.accountId,
      })
      .from(eventContactsTable)
      .leftJoin(contactsTable, eq(eventContactsTable.contactId, contactsTable.id))
      .where(eq(eventContactsTable.eventId, eventId));

    const accountIds = [...new Set(rows.map((r) => r.accountId).filter((id): id is number => id != null))];
    let accountMap: Record<number, string> = {};
    if (accountIds.length > 0) {
      const accounts = await db
        .select({ id: accountsTable.id, name: accountsTable.name })
        .from(accountsTable)
        .where(or(...accountIds.map((id) => eq(accountsTable.id, id))));
      accountMap = Object.fromEntries(accounts.map((a) => [a.id, a.name]));
    }

    res.json(
      rows.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        contactId: r.contactId,
        contactRole: r.contactRole,
        contactName: `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || null,
        accountName: r.accountId ? (accountMap[r.accountId] ?? null) : null,
        phone: r.mobilePhone || r.workPhone || null,
        email: r.email,
        createdAt: r.createdAt,
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch event contacts" });
  }
});

router.post("/", async (req, res) => {
  try {
    const p = req.params as { id: string };
    const eventId = parseInt(p.id);
    const { contactId, contactRole } = req.body as { contactId: number; contactRole?: string };

    const existing = await db
      .select({ id: eventContactsTable.id })
      .from(eventContactsTable)
      .where(and(eq(eventContactsTable.eventId, eventId), eq(eventContactsTable.contactId, contactId)));
    if (existing.length > 0) {
      res.status(409).json({ error: "Contact already linked to this event" });
      return;
    }

    const [created] = await db
      .insert(eventContactsTable)
      .values({ eventId, contactId, contactRole: contactRole ?? null })
      .returning();

    const contact = await db.query.contactsTable.findFirst({
      where: eq(contactsTable.id, contactId),
    });
    let accountName: string | null = null;
    if (contact?.accountId) {
      const acc = await db.query.accountsTable.findFirst({
        where: eq(accountsTable.id, contact.accountId),
      });
      accountName = acc?.name ?? null;
    }

    res.status(201).json({
      id: created.id,
      eventId: created.eventId,
      contactId: created.contactId,
      contactRole: created.contactRole,
      contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : null,
      accountName,
      phone: contact?.mobilePhone || contact?.workPhone || null,
      email: contact?.email ?? null,
      createdAt: created.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add event contact" });
  }
});

router.delete("/:contactId", async (req, res) => {
  try {
    const p = req.params as { id: string; contactId: string };
    const eventId = parseInt(p.id);
    const contactId = parseInt(p.contactId);
    await db
      .delete(eventContactsTable)
      .where(and(eq(eventContactsTable.eventId, eventId), eq(eventContactsTable.contactId, contactId)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to remove event contact" });
  }
});

export default router;
