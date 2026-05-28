import { Router } from "express";
import { db } from "@workspace/db";
import {
  functionMenusTable,
  serviceTypesTable,
  serviceItemsTable,
  menuTemplatesTable,
  menuTemplateItemsTable,
  catalogItemsTable,
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

    // Copy template items into a service type, preserving sectionName
    const templateItems = await db
      .select({
        catalogItemId: menuTemplateItemsTable.catalogItemId,
        quantity: menuTemplateItemsTable.quantity,
        priceOverride: menuTemplateItemsTable.priceOverride,
        notes: menuTemplateItemsTable.notes,
        sectionName: menuTemplateItemsTable.sectionName,
        sortOrder: menuTemplateItemsTable.sortOrder,
        itemName: catalogItemsTable.name,
        catalogPrice: catalogItemsTable.price,
        revenueCenterId: catalogItemsTable.revenueCenterId,
      })
      .from(menuTemplateItemsTable)
      .leftJoin(catalogItemsTable, eq(menuTemplateItemsTable.catalogItemId, catalogItemsTable.id))
      .where(eq(menuTemplateItemsTable.templateId, templateId))
      .orderBy(menuTemplateItemsTable.sortOrder, menuTemplateItemsTable.id);

    let serviceTypes: any[] = [];
    if (templateItems.length > 0) {
      const [st] = await db
        .insert(serviceTypesTable)
        .values({ functionMenuId: menu.id, serviceTypeName: template.name, displayOrder: 0 })
        .returning();

      const insertedItems = [];
      for (const ti of templateItems) {
        const price = ti.priceOverride ?? ti.catalogPrice ?? null;
        const qty = ti.quantity ?? "1";
        const itemTotal = price ? (parseFloat(qty) * parseFloat(price)).toFixed(2) : null;
        const [newItem] = await db
          .insert(serviceItemsTable)
          .values({
            serviceTypeId: st.id,
            itemName: ti.itemName ?? "Item",
            notes: ti.notes,
            quantity: qty,
            aLaCartePrice: price,
            revenueCenterId: ti.revenueCenterId,
            sectionName: ti.sectionName,
            itemTotal,
          })
          .returning();
        insertedItems.push(newItem);
      }
      serviceTypes = [{ ...st, items: insertedItems }];
    }

    res.status(201).json({ ...menu, serviceTypes });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /functions/:id/menus/:menuId — update menu name / pricing type
router.put("/:id/menus/:menuId", async (req, res) => {
  try {
    const menuId = parseInt(req.params.menuId);
    const { functionMenuName, pricingType, description, menuNotes } = req.body;
    const [updated] = await db
      .update(functionMenusTable)
      .set({
        ...(functionMenuName !== undefined && { functionMenuName }),
        ...(pricingType !== undefined && { pricingType }),
        ...(description !== undefined && { description }),
        ...(menuNotes !== undefined && { menuNotes }),
        updatedAt: new Date(),
      })
      .where(eq(functionMenusTable.id, menuId))
      .returning();
    if (!updated) return res.status(404).json({ error: "Menu not found" });
    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /functions/:id/menus/:menuId/copy — duplicate a menu with all its service types and items
router.post("/:id/menus/:menuId/copy", async (req, res) => {
  try {
    const functionId = parseInt(req.params.id);
    const menuId = parseInt(req.params.menuId);

    const [srcMenu] = await db
      .select()
      .from(functionMenusTable)
      .where(eq(functionMenusTable.id, menuId));
    if (!srcMenu) return res.status(404).json({ error: "Menu not found" });

    const [newMenu] = await db
      .insert(functionMenusTable)
      .values({
        functionId,
        functionMenuName: `${srcMenu.functionMenuName} (Copy)`,
        pricingType: srcMenu.pricingType,
        description: srcMenu.description,
        menuNotes: srcMenu.menuNotes,
      })
      .returning();

    const srcServiceTypes = await db
      .select()
      .from(serviceTypesTable)
      .where(eq(serviceTypesTable.functionMenuId, menuId))
      .orderBy(serviceTypesTable.displayOrder);

    const newServiceTypes = [];
    for (const st of srcServiceTypes) {
      const [newSt] = await db
        .insert(serviceTypesTable)
        .values({
          functionMenuId: newMenu.id,
          serviceTypeName: st.serviceTypeName,
          displayOrder: st.displayOrder ?? 0,
        })
        .returning();

      const srcItems = await db
        .select()
        .from(serviceItemsTable)
        .where(eq(serviceItemsTable.serviceTypeId, st.id));

      const newItems = [];
      for (const item of srcItems) {
        const [newItem] = await db
          .insert(serviceItemsTable)
          .values({
            serviceTypeId: newSt.id,
            itemName: item.itemName,
            description: item.description,
            notes: item.notes,
            quantity: item.quantity,
            aLaCartePrice: item.aLaCartePrice,
            addOnPrice: item.addOnPrice,
            cost: item.cost,
            category: item.category,
            appliedRates: item.appliedRates,
            sectionName: item.sectionName,
            revenueCenterId: item.revenueCenterId,
          })
          .returning();
        newItems.push(newItem);
      }
      newServiceTypes.push({ ...newSt, items: newItems });
    }

    res.status(201).json({ ...newMenu, serviceTypes: newServiceTypes });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
