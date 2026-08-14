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
import { eq, and } from "drizzle-orm";
import { calculateFunctionPricing } from "../services/pricing.js";

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
                sectionName: serviceItemsTable.sectionName,
                selected: serviceItemsTable.selected,
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

    // Overlay server-computed money so the client never has to calculate it.
    // Line totals reflect only SELECTED items; unselected items are priced at
    // zero because attaching a template makes an item available, not ordered.
    const pricing = await calculateFunctionPricing(functionId);
    const lineById = new Map(pricing.lines.map((l) => [l.serviceItemId, l]));

    const priced = result.map((menu) => {
      const mt = pricing.menuTotals[menu.id] ?? { charges: 0, cost: 0, selectedCount: 0, itemCount: 0 };
      return {
        ...menu,
        menuTotalCharges: String(mt.charges),
        menuTotalCost: String(mt.cost),
        selectedCount: mt.selectedCount,
        itemCount: mt.itemCount,
        serviceTypes: (menu.serviceTypes ?? []).map((st) => {
          const stt = pricing.serviceTypeTotals[st.id] ?? { charges: 0, cost: 0, selectedCount: 0, itemCount: 0 };
          return {
            ...st,
            serviceTypeTotalCharges: String(stt.charges),
            serviceTypeTotalCost: String(stt.cost),
            selectedCount: stt.selectedCount,
            itemCount: stt.itemCount,
            items: (st.items ?? []).map((item) => ({
              ...item,
              itemTotal: String(lineById.get(item.id)?.lineTotal ?? 0),
              lineCost: String(lineById.get(item.id)?.lineCost ?? 0),
            })),
          };
        }),
      };
    });

    res.json(priced);
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
    if (!template) { res.status(404).json({ error: "Template not found" }); return; }

    // Attaching the same template twice is legitimate -- a second bar setup,
    // say -- but it must never happen silently: function 1 in production had
    // "Banquet Bar Brittany" attached twice and billed for both.
    const existing = await db
      .select()
      .from(functionMenusTable)
      .where(and(eq(functionMenusTable.functionId, functionId), eq(functionMenusTable.templateId, templateId)));

    if (existing.length > 0 && req.body?.confirmDuplicate !== true) {
      res.status(409).json({
        error: "duplicate_template",
        message: `"${template.name}" is already on this function. Add a second copy?`,
        existingCount: existing.length,
      });
      return;
    }

    // Distinguish the copies on the BEO.
    const displayName = existing.length > 0 ? `${template.name} (${existing.length + 1})` : template.name;

    const [menu] = await db
      .insert(functionMenusTable)
      .values({
        functionId,
        templateId,
        functionMenuName: displayName,
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
        // Cost must be carried across or margin reporting is dead on arrival.
        catalogCost: catalogItemsTable.cost,
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
        const [newItem] = await db
          .insert(serviceItemsTable)
          .values({
            serviceTypeId: st.id,
            itemName: ti.itemName ?? "Item",
            notes: ti.notes,
            quantity: qty,
            aLaCartePrice: price,
            cost: ti.catalogCost,
            revenueCenterId: ti.revenueCenterId,
            sectionName: ti.sectionName,
            // Attaching a template makes items AVAILABLE, not ordered. Nothing
            // is billable until someone ticks it in the services builder.
            selected: false,
            itemTotal: "0.00",
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
    if (!updated) { res.status(404).json({ error: "Menu not found" }); return; }
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
    if (!srcMenu) { res.status(404).json({ error: "Menu not found" }); return; }

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
            // A copied menu must keep the same selections, otherwise
            // duplicating a priced menu silently zeroes it out.
            selected: item.selected,
            chargeHourly: item.chargeHourly,
            numHours: item.numHours,
            markItemInternal: item.markItemInternal,
            quantityPrecision: item.quantityPrecision,
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
