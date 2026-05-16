import { Router } from "express";
import { db } from "@workspace/db";
import {
  functionMenusTable,
  serviceTypesTable,
  serviceItemsTable,
  revenueCentersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /function-menus/:id
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const menu = await db.query.functionMenusTable.findFirst({
      where: eq(functionMenusTable.id, id),
    });
    if (!menu) return res.status(404).json({ error: "Not found" });

    const serviceTypes = await db
      .select()
      .from(serviceTypesTable)
      .where(eq(serviceTypesTable.functionMenuId, id))
      .orderBy(serviceTypesTable.displayOrder);

    const serviceTypesWithItems = await Promise.all(
      serviceTypes.map(async (st) => {
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
            itemTotal: serviceItemsTable.itemTotal,
            revenueCenterName: revenueCentersTable.name,
          })
          .from(serviceItemsTable)
          .leftJoin(
            revenueCentersTable,
            eq(serviceItemsTable.revenueCenterId, revenueCentersTable.id)
          )
          .where(eq(serviceItemsTable.serviceTypeId, st.id));
        return { ...st, items };
      })
    );

    res.json({ ...menu, serviceTypes: serviceTypesWithItems });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /function-menus/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const [updated] = await db
      .update(functionMenusTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(functionMenusTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ ...updated, serviceTypes: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /function-menus/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Delete cascade: items → service types → menu
    const serviceTypes = await db
      .select({ id: serviceTypesTable.id })
      .from(serviceTypesTable)
      .where(eq(serviceTypesTable.functionMenuId, id));
    for (const st of serviceTypes) {
      await db.delete(serviceItemsTable).where(eq(serviceItemsTable.serviceTypeId, st.id));
    }
    await db.delete(serviceTypesTable).where(eq(serviceTypesTable.functionMenuId, id));
    await db.delete(functionMenusTable).where(eq(functionMenusTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /function-menus/:id/service-types
router.get("/:id/service-types", async (req, res) => {
  try {
    const menuId = parseInt(req.params.id);
    const types = await db
      .select()
      .from(serviceTypesTable)
      .where(eq(serviceTypesTable.functionMenuId, menuId))
      .orderBy(serviceTypesTable.displayOrder);
    const withItems = await Promise.all(
      types.map(async (st) => {
        const items = await db
          .select()
          .from(serviceItemsTable)
          .where(eq(serviceItemsTable.serviceTypeId, st.id));
        return { ...st, items };
      })
    );
    res.json(withItems);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /function-menus/:id/service-types
router.post("/:id/service-types", async (req, res) => {
  try {
    const functionMenuId = parseInt(req.params.id);
    const { serviceTypeName, description, serviceNotes, maxSelections } = req.body;
    const [st] = await db
      .insert(serviceTypesTable)
      .values({ functionMenuId, serviceTypeName, description, serviceNotes, maxSelections })
      .returning();
    res.status(201).json({ ...st, items: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
