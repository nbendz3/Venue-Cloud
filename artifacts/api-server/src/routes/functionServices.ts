import { Router } from "express";
import { db } from "@workspace/db";
import {
  functionMenusTable,
  serviceTypesTable,
  serviceItemsTable,
  menuTemplatesTable,
  revenueCentersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /functions/:id/menus
router.get("/:id/menus", async (req, res) => {
  try {
    const functionId = parseInt(req.params.id);
    const menus = await db
      .select()
      .from(functionMenusTable)
      .where(eq(functionMenusTable.functionId, functionId));

    const result = await Promise.all(
      menus.map(async (menu) => {
        const serviceTypes = await db
          .select()
          .from(serviceTypesTable)
          .where(eq(serviceTypesTable.functionMenuId, menu.id))
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

        return { ...menu, serviceTypes: serviceTypesWithItems };
      })
    );

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /functions/:id/menus
router.post("/:id/menus", async (req, res) => {
  try {
    const functionId = parseInt(req.params.id);
    const { functionMenuName, pricingType, description, menuNotes } = req.body;
    const [menu] = await db
      .insert(functionMenusTable)
      .values({ functionId, functionMenuName, pricingType, description, menuNotes })
      .returning();
    res.status(201).json({ ...menu, serviceTypes: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /functions/:id/add-menu-template
router.post("/:id/add-menu-template", async (req, res) => {
  try {
    const functionId = parseInt(req.params.id);
    const { templateId } = req.body;

    const template = await db.query.menuTemplatesTable.findFirst({
      where: eq(menuTemplatesTable.id, templateId),
    });
    if (!template) return res.status(404).json({ error: "Template not found" });

    const [menu] = await db
      .insert(functionMenusTable)
      .values({
        functionId,
        templateId,
        functionMenuName: template.name,
        pricingType: template.pricingType,
      })
      .returning();

    res.status(201).json({ ...menu, serviceTypes: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
