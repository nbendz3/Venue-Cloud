import { Router } from "express";
import { db } from "@workspace/db";
import {
  serviceTypesTable,
  serviceItemsTable,
  revenueCentersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// PUT /service-types/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(serviceTypesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(serviceTypesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    const items = await db
      .select()
      .from(serviceItemsTable)
      .where(eq(serviceItemsTable.serviceTypeId, id));
    res.json({ ...updated, items });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /service-types/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(serviceItemsTable).where(eq(serviceItemsTable.serviceTypeId, id));
    await db.delete(serviceTypesTable).where(eq(serviceTypesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /service-types/:id/items
router.get("/:id/items", async (req, res) => {
  try {
    const serviceTypeId = parseInt(req.params.id);
    const items = await db
      .select({
        id: serviceItemsTable.id,
        serviceTypeId: serviceItemsTable.serviceTypeId,
        itemName: serviceItemsTable.itemName,
        description: serviceItemsTable.description,
        notes: serviceItemsTable.notes,
        notesInternal: serviceItemsTable.notesInternal,
        quantity: serviceItemsTable.quantity,
        autoQuantity: serviceItemsTable.autoQuantity,
        aLaCartePrice: serviceItemsTable.aLaCartePrice,
        addOnPrice: serviceItemsTable.addOnPrice,
        cost: serviceItemsTable.cost,
        numberRequired: serviceItemsTable.numberRequired,
        perNumberOfGuests: serviceItemsTable.perNumberOfGuests,
        quantityPrecision: serviceItemsTable.quantityPrecision,
        category: serviceItemsTable.category,
        categorySubOption: serviceItemsTable.categorySubOption,
        categoryIi: serviceItemsTable.categoryIi,
        markItemInternal: serviceItemsTable.markItemInternal,
        chargeHourly: serviceItemsTable.chargeHourly,
        numHours: serviceItemsTable.numHours,
        revenueCenterId: serviceItemsTable.revenueCenterId,
        appliedRates: serviceItemsTable.appliedRates,
        sectionName: serviceItemsTable.sectionName,
        itemTotal: serviceItemsTable.itemTotal,
        revenueCenterName: revenueCentersTable.name,
      })
      .from(serviceItemsTable)
      .leftJoin(
        revenueCentersTable,
        eq(serviceItemsTable.revenueCenterId, revenueCentersTable.id)
      )
      .where(eq(serviceItemsTable.serviceTypeId, serviceTypeId));
    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /service-types/:id/items
router.post("/:id/items", async (req, res) => {
  try {
    const serviceTypeId = parseInt(req.params.id);
    const {
      itemName, description, notes, quantity, autoQuantity,
      aLaCartePrice, addOnPrice, cost, revenueCenterId, appliedRates, category,
      chargeHourly, numHours, numberRequired, perNumberOfGuests, sectionName,
      selected,
    } = req.body;

    // Calculate item total
    const qty = parseFloat(quantity ?? "1") || 1;
    const price = parseFloat(aLaCartePrice ?? "0") || 0;
    const addOn = parseFloat(addOnPrice ?? "0") || 0;
    const itemTotal = ((price + addOn) * qty).toFixed(2);

    const [item] = await db
      .insert(serviceItemsTable)
      .values({
        serviceTypeId,
        itemName,
        description,
        notes,
        quantity: quantity?.toString(),
        autoQuantity,
        aLaCartePrice: aLaCartePrice?.toString(),
        addOnPrice: addOnPrice?.toString(),
        cost: cost?.toString(),
        revenueCenterId,
        appliedRates,
        category,
        sectionName: sectionName || null,
        chargeHourly,
        numHours: numHours?.toString(),
        numberRequired,
        perNumberOfGuests,
        itemTotal,
        // An item added explicitly from the builder is an order, not an option:
        // default to selected unless the caller says otherwise.
        selected: selected !== undefined ? !!selected : true,
      })
      .returning();

    const rc = revenueCenterId
      ? await db.query.revenueCentersTable.findFirst({ where: eq(revenueCentersTable.id, revenueCenterId) })
      : null;

    res.status(201).json({ ...item, revenueCenterName: rc?.name ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
