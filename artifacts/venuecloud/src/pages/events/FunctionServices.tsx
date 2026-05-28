import React, { useState, useMemo, useEffect } from "react";
import { formatPricingType } from "@/lib/formatters";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetEvent,
  useGetFunction,
  useListEventFunctions,
  useGetFunctionMenus,
  useGetMenuTemplates,
  useCreateFunctionMenu,
  useDeleteFunctionMenu,
  useCreateServiceType,
  useDeleteServiceType,
  useCreateServiceItem,
  useUpdateServiceItem,
  useDeleteServiceItem,
  useAddMenuTemplate,
  useGetRevenueCenters,
  useListCatalogItems,
  useGetCatalogItemsMeta,
} from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Edit,
  MoreHorizontal,
  Search,
  X,
  Printer,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const MENU_CATEGORIES = [
  "Show All",
  "Wedding Menus",
  "Banquet Menus",
  "Beverage Menus",
  "Setup and Service Menus",
  "Amenities",
];

const SERVICE_ITEM_CATEGORIES = ["Food", "Beverage", "Equipment", "Labor", "Miscellaneous"];

const SERVICE_TYPE_NAMES = [
  "Buffet",
  "Food & Bev",
  "Set Up",
  "Tasting Setup",
  "Enhancements",
  "Audio Visual Equipment",
  "Labor",
  "Miscellaneous",
];

const PRICING_TYPES = [
  "A La Carte Pricing",
  "Package Pricing - Percentage Amount Allocation",
  "Package Pricing - Monetary Amount Allocation",
];

const APPLIED_RATES_OPTIONS = [
  "Gratuity and Sales Tax",
  "Sales Tax Only",
  "Gratuity Only",
  "None",
];

function fmt(val: string | number | null | undefined) {
  if (val === null || val === undefined || val === "") return "—";
  const n = parseFloat(String(val));
  if (isNaN(n)) return String(val);
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DIETARY_OPTIONS = ["None","Vegetarian","Vegan","Gluten-Free","Kosher","Halal","Dairy-Free","Nut-Free","Low-Sodium","Low-Fat"];
const CATEGORY_OPTIONS = ["Food","Beverage","Audio Visual","Labor","Setup","Décor","Rental","Miscellaneous"];
const CATEGORY_SUB_OPTIONS: Record<string,string[]> = {
  Food: ["Breakfast","Brunch","Lunch","Dinner","Hors d'Oeuvres","Dessert","Snack","Break"],
  Beverage: ["Alcoholic","Non-Alcoholic","Coffee/Tea","Juice","Water"],
  "Audio Visual": ["Equipment","Labor","Support"],
  Labor: ["Setup","Breakdown","Service","Security","Valet"],
  Setup: ["Tables","Chairs","Linens","Staging","Lighting"],
  Décor: ["Floral","Centerpieces","Signage","Balloons"],
  Rental: ["Equipment","Furniture","Specialty"],
  Miscellaneous: ["Other"],
};
const QUANTITY_PRECISION_OPTIONS = ["0 decimal places","1 decimal place","2 decimal places","3 decimal places"];
const HOURS_PRECISION_OPTIONS = ["0 decimal places","1 decimal place","2 decimal places"];

type ServiceItemRow = {
  id: number;
  serviceTypeId: number;
  itemName: string;
  description?: string | null;
  notes?: string | null;
  notesInternal?: boolean | null;
  quantity?: string | null;
  aLaCartePrice?: string | null;
  addOnPrice?: string | null;
  cost?: string | null;
  revenueCenterId?: number | null;
  appliedRates?: string | null;
  category?: string | null;
  categorySubOption?: string | null;
  categoryII?: string | null;
  dietaryRestrictions?: string | null;
  itemTotal?: string | null;
  revenueCenterName?: string | null;
  chargeHourly?: boolean | null;
  numHours?: string | null;
  useIngredientsCost?: boolean | null;
  numberRequired?: string | null;
  perNumberOfGuests?: string | null;
  quantityPrecision?: string | null;
  markItemInternal?: boolean | null;
  markQuantityInternal?: boolean | null;
  useFunctionTimeRange?: boolean | null;
  startTime?: string | null;
  endTime?: string | null;
  autoHours?: boolean | null;
  useFunctionSetupTeardownTimes?: boolean | null;
  setupMinutes?: string | null;
  teardownMinutes?: string | null;
  applyOvertimeHoursCharges?: boolean | null;
  overtimeHoursPrice?: string | null;
  overtimeHours?: string | null;
  hoursPrecision?: string | null;
};

function ServiceItemRow({
  item,
  functionId,
  menuId,
}: {
  item: ServiceItemRow;
  functionId: number;
  menuId: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [form, setForm] = useState({ ...item });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateItem = useUpdateServiceItem();
  const deleteItem = useDeleteServiceItem();

  const save = () => {
    updateItem.mutate(
      {
        id: item.id,
        data: {
          itemName: form.itemName,
          description: form.description ?? undefined,
          notes: form.notes ?? undefined,
          quantity: form.quantity ? parseFloat(form.quantity) : undefined,
          aLaCartePrice: form.aLaCartePrice ? parseFloat(form.aLaCartePrice) : undefined,
          addOnPrice: form.addOnPrice ? parseFloat(form.addOnPrice) : undefined,
          cost: form.cost ? parseFloat(form.cost) : undefined,
          appliedRates: form.appliedRates ?? undefined,
          category: form.category ?? undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
          setEditing(false);
          toast({ title: "Item updated" });
        },
      }
    );
  };

  const remove = () => {
    deleteItem.mutate(
      { id: item.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
          toast({ title: "Item deleted" });
        },
      }
    );
  };

  return (
    <>
      <TableRow className="group">
        <TableCell>
          <Checkbox />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <button
              className="text-muted-foreground hover:text-foreground mr-1"
              onClick={() => setEditing(true)}
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button className="text-muted-foreground hover:text-destructive" onClick={remove}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </TableCell>
        <TableCell className="text-center text-base" title={(item as any).dietaryRestrictions ?? ""}>
          {(item as any).dietaryRestrictions && (item as any).dietaryRestrictions !== "None"
            ? "🌿"
            : <span className="text-muted-foreground text-xs">—</span>}
        </TableCell>
        <TableCell className="font-medium">{item.itemName}</TableCell>
        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
          {item.notes ?? "—"}
        </TableCell>
        <TableCell>
          {item.notesInternal
            ? <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Internal</Badge>
            : <span className="text-muted-foreground text-xs">—</span>}
        </TableCell>
        <TableCell className="text-sm">{item.quantity ?? "—"}</TableCell>
        <TableCell className="text-sm">{fmt(item.aLaCartePrice)}</TableCell>
        <TableCell className="text-sm">{fmt(item.addOnPrice)}</TableCell>
        <TableCell className="text-sm">{item.numHours ?? "—"}</TableCell>
        <TableCell className="text-sm font-medium">
          {(() => {
            const qty = parseFloat(String(item.quantity ?? "1")) || 1;
            const price = parseFloat(String(item.aLaCartePrice ?? "0")) || 0;
            const hours = parseFloat(String(item.numHours ?? "1")) || 1;
            const stored = parseFloat(String(item.itemTotal ?? "0")) || 0;
            if (stored > 0) return fmt(stored);
            if (price === 0) return "—";
            return fmt(item.chargeHourly ? price * hours * qty : price * qty);
          })()}
        </TableCell>
        <TableCell className="text-sm">{item.revenueCenterName ?? "—"}</TableCell>
        <TableCell className="text-sm">{item.appliedRates ?? "—"}</TableCell>
        <TableCell className="text-sm">{item.category ?? "—"}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{(item as any).categorySubOption ?? "—"}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{(item as any).categoryII ?? "—"}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={16} className="py-4 px-6">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p>{item.description ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Notes</Label>
                  <p>{item.notes ?? "—"}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">A La Carte Price</Label>
                    <p>{fmt(item.aLaCartePrice)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Add-On Price</Label>
                    <p>{fmt(item.addOnPrice)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cost</Label>
                    <p>{fmt(item.cost)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Revenue Center</Label>
                  <p>{item.revenueCenterName ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Applied Rates</Label>
                  <p>{item.appliedRates ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <p>{item.category ?? "—"}</p>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
      {editing && (
        <Dialog open onOpenChange={() => { setEditing(false); setShowAllDetails(false); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Service Item — {item.itemName}</DialogTitle>
            </DialogHeader>

            {/* ── Basic Fields ── */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="col-span-2">
                <Label className="text-xs">Item Name *</Label>
                <Input className="mt-1" value={form.itemName} onChange={e => setForm({ ...form, itemName: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Notes</Label>
                <Textarea className="mt-1 text-sm" rows={2} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Checkbox checked={!!form.notesInternal} onCheckedChange={v => setForm({ ...form, notesInternal: !!v })} />
                <Label className="text-sm">Notes Internal (hidden on client BEO)</Label>
              </div>

              <div>
                <Label className="text-xs">Quantity</Label>
                <Input className="mt-1" type="number" value={form.quantity ?? ""} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">A La Carte Price</Label>
                <Input className="mt-1" type="number" value={form.aLaCartePrice ?? ""} onChange={e => setForm({ ...form, aLaCartePrice: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Add-On Price</Label>
                <Input className="mt-1" type="number" value={form.addOnPrice ?? ""} onChange={e => setForm({ ...form, addOnPrice: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Revenue Center</Label>
                <Input className="mt-1" value={form.revenueCenterName ?? ""} onChange={e => setForm({ ...form, revenueCenterName: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Applied Rates</Label>
                <Select value={form.appliedRates ?? "_none_"} onValueChange={v => setForm({ ...form, appliedRates: v === "_none_" ? "" : v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{APPLIED_RATES_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.category ?? "_none_"} onValueChange={v => setForm({ ...form, category: v === "_none_" ? "" : v, categorySubOption: "" })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— None —</SelectItem>
                    {CATEGORY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category Sub Option</Label>
                <Select value={form.categorySubOption ?? "_none_"} onValueChange={v => setForm({ ...form, categorySubOption: v === "_none_" ? "" : v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— None —</SelectItem>
                    {(CATEGORY_SUB_OPTIONS[form.category ?? ""] ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category II</Label>
                <Input className="mt-1" value={(form as any).categoryII ?? ""} onChange={e => setForm({ ...form, ...({"categoryII": e.target.value} as any) })} />
              </div>
              <div>
                <Label className="text-xs">Dietary Restrictions</Label>
                <Select value={(form as any).dietaryRestrictions ?? "_none_"} onValueChange={v => setForm({ ...form, ...({"dietaryRestrictions": v === "_none_" ? "" : v} as any) })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">None</SelectItem>
                    {DIETARY_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Show All Item Details toggle ── */}
            <div className="border-t pt-3">
              <button
                className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                onClick={() => setShowAllDetails(p => !p)}
              >
                {showAllDetails ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                {showAllDetails ? "Hide" : "Show All"} Item Details
              </button>

              {showAllDetails && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Cost</Label>
                    <Input className="mt-1" type="number" value={form.cost ?? ""} onChange={e => setForm({ ...form, cost: e.target.value })} />
                  </div>
                  <div className="flex items-center gap-2 self-end pb-1">
                    <Checkbox checked={!!(form as any).useIngredientsCost} onCheckedChange={v => setForm({ ...form, ...({ useIngredientsCost: !!v } as any) })} />
                    <Label className="text-sm">Use Ingredients Cost</Label>
                  </div>

                  <div>
                    <Label className="text-xs">Number Required</Label>
                    <Input className="mt-1" type="number" value={(form as any).numberRequired ?? ""} onChange={e => setForm({ ...form, ...({ numberRequired: e.target.value } as any) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Per Number of Guests</Label>
                    <Input className="mt-1" type="number" value={(form as any).perNumberOfGuests ?? ""} onChange={e => setForm({ ...form, ...({ perNumberOfGuests: e.target.value } as any) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Quantity Precision</Label>
                    <Select value={(form as any).quantityPrecision ?? "_none_"} onValueChange={v => setForm({ ...form, ...({ quantityPrecision: v === "_none_" ? "" : v } as any) })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none_">— Default —</SelectItem>
                        {QUANTITY_PRECISION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 col-span-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={!!(form as any).markItemInternal} onCheckedChange={v => setForm({ ...form, ...({ markItemInternal: !!v } as any) })} />
                      <Label className="text-sm">Mark Item Internal (hidden on client BEO)</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={!!(form as any).markQuantityInternal} onCheckedChange={v => setForm({ ...form, ...({ markQuantityInternal: !!v } as any) })} />
                      <Label className="text-sm">Mark Quantity Internal</Label>
                    </div>
                  </div>

                  <div className="col-span-2 border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Time Settings</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 col-span-2">
                        <Checkbox checked={!!(form as any).useFunctionTimeRange} onCheckedChange={v => setForm({ ...form, ...({ useFunctionTimeRange: !!v } as any) })} />
                        <Label className="text-sm">Use Function Time Range</Label>
                      </div>
                      <div>
                        <Label className="text-xs">Start Time</Label>
                        <Input className="mt-1" type="time" value={(form as any).startTime ?? ""} onChange={e => setForm({ ...form, ...({ startTime: e.target.value } as any) })} />
                      </div>
                      <div>
                        <Label className="text-xs">End Time</Label>
                        <Input className="mt-1" type="time" value={(form as any).endTime ?? ""} onChange={e => setForm({ ...form, ...({ endTime: e.target.value } as any) })} />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Hourly Charges</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={!!form.chargeHourly} onCheckedChange={v => setForm({ ...form, chargeHourly: !!v })} />
                        <Label className="text-sm">Charge Hourly</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={!!(form as any).autoHours} onCheckedChange={v => setForm({ ...form, ...({ autoHours: !!v } as any) })} />
                        <Label className="text-sm">Auto Hours</Label>
                      </div>
                      <div>
                        <Label className="text-xs"># Hours</Label>
                        <Input className="mt-1" type="number" value={form.numHours ?? ""} onChange={e => setForm({ ...form, numHours: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-xs">Hours Precision</Label>
                        <Select value={(form as any).hoursPrecision ?? "_none_"} onValueChange={v => setForm({ ...form, ...({ hoursPrecision: v === "_none_" ? "" : v } as any) })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Default" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none_">— Default —</SelectItem>
                            {HOURS_PRECISION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <Checkbox checked={!!(form as any).useFunctionSetupTeardownTimes} onCheckedChange={v => setForm({ ...form, ...({ useFunctionSetupTeardownTimes: !!v } as any) })} />
                        <Label className="text-sm">Use Function Setup and Teardown Times</Label>
                      </div>
                      <div>
                        <Label className="text-xs">Setup Minutes</Label>
                        <Input className="mt-1" type="number" value={(form as any).setupMinutes ?? ""} onChange={e => setForm({ ...form, ...({ setupMinutes: e.target.value } as any) })} />
                      </div>
                      <div>
                        <Label className="text-xs">Teardown Minutes</Label>
                        <Input className="mt-1" type="number" value={(form as any).teardownMinutes ?? ""} onChange={e => setForm({ ...form, ...({ teardownMinutes: e.target.value } as any) })} />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 border-t pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Overtime</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 col-span-2">
                        <Checkbox checked={!!(form as any).applyOvertimeHoursCharges} onCheckedChange={v => setForm({ ...form, ...({ applyOvertimeHoursCharges: !!v } as any) })} />
                        <Label className="text-sm">Apply Overtime Hours Charges</Label>
                      </div>
                      <div>
                        <Label className="text-xs">Overtime Hours Price</Label>
                        <Input className="mt-1" type="number" value={(form as any).overtimeHoursPrice ?? ""} onChange={e => setForm({ ...form, ...({ overtimeHoursPrice: e.target.value } as any) })} />
                      </div>
                      <div>
                        <Label className="text-xs">Overtime Hours</Label>
                        <Input className="mt-1" type="number" value={(form as any).overtimeHours ?? ""} onChange={e => setForm({ ...form, ...({ overtimeHours: e.target.value } as any) })} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setEditing(false); setShowAllDetails(false); }}>Cancel</Button>
              <Button onClick={save} disabled={updateItem.isPending}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/* ─── Master service item library (demo data) ────────────────────── */
const MASTER_ITEMS = [
  { id: 1, name: "Breakfast Buffet", category: "Food", price: 24.50, cost: 12.00, rates: "Gratuity and Sales Tax" },
  { id: 2, name: "Lunch Buffet", category: "Food", price: 32.00, cost: 16.00, rates: "Gratuity and Sales Tax" },
  { id: 3, name: "Dinner Plated - Choice", category: "Food", price: 58.00, cost: 24.00, rates: "Gratuity and Sales Tax" },
  { id: 4, name: "Coffee Break - AM", category: "Beverage", price: 12.00, cost: 4.00, rates: "Gratuity and Sales Tax" },
  { id: 5, name: "Coffee Break - PM", category: "Beverage", price: 12.00, cost: 4.00, rates: "Gratuity and Sales Tax" },
  { id: 6, name: "Soft Drinks - Consumption", category: "Beverage", price: 4.50, cost: 1.50, rates: "Gratuity and Sales Tax" },
  { id: 7, name: "Full Bar Package", category: "Beverage", price: 28.00, cost: 10.00, rates: "Gratuity and Sales Tax" },
  { id: 8, name: "Beer & Wine Package", category: "Beverage", price: 18.00, cost: 6.00, rates: "Gratuity and Sales Tax" },
  { id: 9, name: "Audio/Visual Package - Basic", category: "A/V", price: 350.00, cost: 120.00, rates: "Sales Tax Only" },
  { id: 10, name: "Projector & Screen", category: "A/V", price: 150.00, cost: 50.00, rates: "Sales Tax Only" },
  { id: 11, name: "Wireless Microphone", category: "A/V", price: 75.00, cost: 25.00, rates: "Sales Tax Only" },
  { id: 12, name: "Stage (12x16)", category: "Setup", price: 450.00, cost: 200.00, rates: "Sales Tax Only" },
  { id: 13, name: "Round Tables (60\")", category: "Setup", price: 8.00, cost: 3.00, rates: "Sales Tax Only" },
  { id: 14, name: "Banquet Chairs", category: "Setup", price: 2.50, cost: 0.75, rates: "Sales Tax Only" },
  { id: 15, name: "Linens - White", category: "Setup", price: 12.00, cost: 4.00, rates: "Sales Tax Only" },
  { id: 16, name: "Centerpiece - Floral", category: "Décor", price: 55.00, cost: 30.00, rates: "Sales Tax Only" },
  { id: 17, name: "Votive Candles (10)", category: "Décor", price: 15.00, cost: 5.00, rates: "None" },
  { id: 18, name: "Event Coordinator (hourly)", category: "Labor", price: 45.00, cost: 20.00, rates: "None" },
  { id: 19, name: "Setup Labor (hourly)", category: "Labor", price: 35.00, cost: 15.00, rates: "None" },
  { id: 20, name: "Security (per guard/hr)", category: "Labor", price: 38.00, cost: 18.00, rates: "None" },
];
const MASTER_ITEM_CATEGORIES = ["All", "Food", "Beverage", "A/V", "Setup", "Décor", "Labor"];

function ServiceTypeBlock({
  serviceType,
  functionId,
  menuId,
  allMenus,
}: {
  serviceType: any;
  functionId: number;
  menuId: number;
  allMenus: any[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [masterListOpen, setMasterListOpen] = useState(false);
  const [fromMenuOpen, setFromMenuOpen] = useState(false);
  const [masterSearch, setMasterSearch] = useState("");
  const [masterCategory, setMasterCategory] = useState("All");
  const [selectedMasterItems, setSelectedMasterItems] = useState<number[]>([]);
  const [selectedMenuSource, setSelectedMenuSource] = useState<number | null>(null);
  const [selectedMenuItems, setSelectedMenuItems] = useState<number[]>([]);
  const [itemForm, setItemForm] = useState({
    itemName: "",
    description: "",
    aLaCartePrice: "",
    addOnPrice: "",
    cost: "",
    quantity: "1",
    appliedRates: "Gratuity and Sales Tax",
    category: "",
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createItem = useCreateServiceItem();
  const deleteType = useDeleteServiceType();

  const addItem = () => {
    createItem.mutate(
      {
        id: serviceType.id,
        data: {
          itemName: itemForm.itemName,
          description: itemForm.description || undefined,
          quantity: itemForm.quantity ? parseFloat(itemForm.quantity) : undefined,
          aLaCartePrice: itemForm.aLaCartePrice ? parseFloat(itemForm.aLaCartePrice) : undefined,
          addOnPrice: itemForm.addOnPrice ? parseFloat(itemForm.addOnPrice) : undefined,
          cost: itemForm.cost ? parseFloat(itemForm.cost) : undefined,
          appliedRates: itemForm.appliedRates,
          category: itemForm.category || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
          setAddItemOpen(false);
          setItemForm({ itemName: "", description: "", aLaCartePrice: "", addOnPrice: "", cost: "", quantity: "1", appliedRates: "Gratuity and Sales Tax", category: "" });
          toast({ title: "Item added" });
        },
      }
    );
  };

  const removeType = () => {
    deleteType.mutate(
      { id: serviceType.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
          toast({ title: "Service type removed" });
        },
      }
    );
  };

  const totalCharges = (serviceType.items ?? []).reduce(
    (sum: number, i: any) => sum + (parseFloat(i.itemTotal ?? "0") || 0),
    0
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/40 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCollapsed((c) => !c)} className="text-muted-foreground hover:text-foreground">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <span className="font-medium text-sm">{serviceType.serviceTypeName}</span>
          {serviceType.maxSelections && (
            <Badge variant="outline" className="text-xs">Max {serviceType.maxSelections}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Total: <span className="font-medium text-foreground">{fmt(totalCharges)}</span></span>
          <Button size="sm" variant="outline" onClick={() => setAddItemOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Item
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setMasterListOpen(true)}>
                <Search className="w-4 h-4 mr-2" /> Add Items from Master Library
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFromMenuOpen(true)} disabled={allMenus.filter(m => m.id !== menuId).length === 0}>
                <Plus className="w-4 h-4 mr-2" /> Add Items from Another Menu
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={removeType}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Service Type
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-20">Actions</TableHead>
                <TableHead className="w-8" title="Dietary">🍽</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Internal</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>A La Carte</TableHead>
                <TableHead>Add-On</TableHead>
                <TableHead># Hours</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Revenue Ctr</TableHead>
                <TableHead>Applied Rates</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Cat. Sub Option</TableHead>
                <TableHead>Category II</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceType.items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={16} className="text-center text-muted-foreground py-6 text-sm">
                    No items yet. Use the buttons above to add items.
                  </TableCell>
                </TableRow>
              )}
              {serviceType.items?.map((item: ServiceItemRow) => (
                <ServiceItemRow key={item.id} item={item} functionId={functionId} menuId={menuId} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog 1: Add Custom Item */}
      {addItemOpen && (
        <Dialog open onOpenChange={() => setAddItemOpen(false)}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add Custom Item — {serviceType.serviceTypeName}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2">
                <Label>Item Name *</Label>
                <Input value={itemForm.itemName} onChange={(e) => setItemForm({ ...itemForm, itemName: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
              </div>
              <div>
                <Label>A La Carte Price</Label>
                <Input type="number" value={itemForm.aLaCartePrice} onChange={(e) => setItemForm({ ...itemForm, aLaCartePrice: e.target.value })} />
              </div>
              <div>
                <Label>Add-On Price</Label>
                <Input type="number" value={itemForm.addOnPrice} onChange={(e) => setItemForm({ ...itemForm, addOnPrice: e.target.value })} />
              </div>
              <div>
                <Label>Cost</Label>
                <Input type="number" value={itemForm.cost} onChange={(e) => setItemForm({ ...itemForm, cost: e.target.value })} />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} />
              </div>
              <div>
                <Label>Applied Rates</Label>
                <Select value={itemForm.appliedRates} onValueChange={(v) => setItemForm({ ...itemForm, appliedRates: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APPLIED_RATES_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Input value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
              <Button onClick={addItem} disabled={!itemForm.itemName || createItem.isPending}>Add Item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog 2: Add Items from Master Library */}
      {masterListOpen && (
        <Dialog open onOpenChange={() => { setMasterListOpen(false); setSelectedMasterItems([]); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Items from Master Service Library</DialogTitle>
            </DialogHeader>
            <div className="flex gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search items..." value={masterSearch} onChange={e => setMasterSearch(e.target.value)} className="pl-9" />
              </div>
              <Select value={masterCategory} onValueChange={setMasterCategory}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>{MASTER_ITEM_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>A La Carte Price</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Applied Rates</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MASTER_ITEMS
                    .filter(mi =>
                      (masterCategory === "All" || mi.category === masterCategory) &&
                      mi.name.toLowerCase().includes(masterSearch.toLowerCase())
                    )
                    .map(mi => (
                      <TableRow
                        key={mi.id}
                        className={`cursor-pointer ${selectedMasterItems.includes(mi.id) ? "bg-primary/10" : ""}`}
                        onClick={() => setSelectedMasterItems(prev => prev.includes(mi.id) ? prev.filter(x => x !== mi.id) : [...prev, mi.id])}
                      >
                        <TableCell>
                          <Checkbox checked={selectedMasterItems.includes(mi.id)} onCheckedChange={() =>
                            setSelectedMasterItems(prev => prev.includes(mi.id) ? prev.filter(x => x !== mi.id) : [...prev, mi.id])
                          } />
                        </TableCell>
                        <TableCell className="font-medium text-sm">{mi.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{mi.category}</TableCell>
                        <TableCell className="text-sm">{fmt(mi.price)}</TableCell>
                        <TableCell className="text-sm">{fmt(mi.cost)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{mi.rates}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setMasterListOpen(false); setSelectedMasterItems([]); }}>Cancel</Button>
              <Button
                disabled={selectedMasterItems.length === 0 || createItem.isPending}
                onClick={async () => {
                  for (const id of selectedMasterItems) {
                    const mi = MASTER_ITEMS.find(m => m.id === id)!;
                    await createItem.mutateAsync({
                      id: serviceType.id,
                      data: { itemName: mi.name, aLaCartePrice: mi.price, cost: mi.cost, appliedRates: mi.rates, quantity: 1, category: mi.category },
                    });
                  }
                  queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
                  toast({ title: `${selectedMasterItems.length} item(s) added from library` });
                  setMasterListOpen(false);
                  setSelectedMasterItems([]);
                }}
              >
                Add Selected ({selectedMasterItems.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog 3: Add Items from Another Menu */}
      {fromMenuOpen && (
        <Dialog open onOpenChange={() => { setFromMenuOpen(false); setSelectedMenuItems([]); setSelectedMenuSource(null); }}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Items from Another Menu</DialogTitle>
            </DialogHeader>
            <div className="mb-3">
              <Label className="text-xs">Source Menu</Label>
              <Select value={selectedMenuSource ? String(selectedMenuSource) : "_none_"} onValueChange={v => { setSelectedMenuSource(v === "_none_" ? null : Number(v)); setSelectedMenuItems([]); }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a menu..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Select menu —</SelectItem>
                  {allMenus.filter(m => m.id !== menuId).map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.functionMenuName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedMenuSource && (() => {
              const srcMenu = allMenus.find(m => m.id === selectedMenuSource);
              const srcItems = (srcMenu?.serviceTypes ?? []).flatMap((st: any) => st.items ?? []);
              return srcItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No items in selected menu.</p>
              ) : (
                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>A La Carte</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {srcItems.map((item: any) => (
                        <TableRow
                          key={item.id}
                          className={`cursor-pointer ${selectedMenuItems.includes(item.id) ? "bg-primary/10" : ""}`}
                          onClick={() => setSelectedMenuItems(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])}
                        >
                          <TableCell>
                            <Checkbox checked={selectedMenuItems.includes(item.id)} onCheckedChange={() =>
                              setSelectedMenuItems(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])
                            } />
                          </TableCell>
                          <TableCell className="font-medium text-sm">{item.itemName}</TableCell>
                          <TableCell className="text-sm">{fmt(item.aLaCartePrice)}</TableCell>
                          <TableCell className="text-sm">{fmt(item.cost)}</TableCell>
                          <TableCell className="text-sm">{item.quantity ?? "1"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setFromMenuOpen(false); setSelectedMenuItems([]); setSelectedMenuSource(null); }}>Cancel</Button>
              <Button
                disabled={selectedMenuItems.length === 0 || createItem.isPending || !selectedMenuSource}
                onClick={async () => {
                  const srcMenu = allMenus.find(m => m.id === selectedMenuSource);
                  const srcItems = (srcMenu?.serviceTypes ?? []).flatMap((st: any) => st.items ?? []);
                  for (const itemId of selectedMenuItems) {
                    const src = srcItems.find((i: any) => i.id === itemId);
                    if (!src) continue;
                    await createItem.mutateAsync({
                      id: serviceType.id,
                      data: { itemName: src.itemName, description: src.description || undefined, aLaCartePrice: src.aLaCartePrice ? parseFloat(src.aLaCartePrice) : undefined, addOnPrice: src.addOnPrice ? parseFloat(src.addOnPrice) : undefined, cost: src.cost ? parseFloat(src.cost) : undefined, quantity: src.quantity ? parseFloat(src.quantity) : 1, appliedRates: src.appliedRates || undefined, category: src.category || undefined },
                    });
                  }
                  queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
                  toast({ title: `${selectedMenuItems.length} item(s) copied from menu` });
                  setFromMenuOpen(false);
                  setSelectedMenuItems([]);
                  setSelectedMenuSource(null);
                }}
              >
                Copy Selected ({selectedMenuItems.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Item Library Picker ──────────────────────────────────────────────────────

function ItemLibraryPicker({
  open,
  onClose,
  onAddCustom,
  onConfirm,
  guestCount,
}: {
  open: boolean;
  onClose: () => void;
  onAddCustom: () => void;
  onConfirm: (items: Array<{ catalogItem: any; qty: string; categoryName: string; sectionName: string; notes: string }>) => Promise<void>;
  guestCount: number;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("_all_");
  const [selected, setSelected] = useState<number[]>([]);
  const [qty, setQty] = useState(String(guestCount || 1));
  const [sectionName, setSectionName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: items = [] } = useListCatalogItems({ isActive: true });
  const { data: meta } = useGetCatalogItemsMeta();

  const categoryMap = useMemo(
    () => Object.fromEntries((meta?.categories ?? []).map((c: any) => [c.id, c.name])),
    [meta]
  );

  useEffect(() => {
    if (open) {
      setSearch("");
      setCategoryFilter("_all_");
      setSelected([]);
      setQty(String(guestCount || 1));
      setSectionName("");
      setNotes("");
    }
  }, [open, guestCount]);

  const filtered = (items as any[]).filter((item) => {
    if (categoryFilter !== "_all_" && String(item.categoryId) !== categoryFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return item.name.toLowerCase().includes(s) || (item.description ?? "").toLowerCase().includes(s);
  });

  const toggle = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const toAdd = selected.map((id) => {
        const item = (items as any[]).find((i) => i.id === id)!;
        const categoryName =
          item.categoryId != null ? (categoryMap[item.categoryId] ?? "Miscellaneous") : "Miscellaneous";
        return { catalogItem: item, qty, categoryName, sectionName, notes };
      });
      await onConfirm(toAdd);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Item from Library</DialogTitle>
          <p className="text-sm text-muted-foreground pt-0.5">
            Select one or more items — name, price, and service type are pre-filled from the catalog.
          </p>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-8 text-sm"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            {search && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setSearch("")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 h-8 text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Categories</SelectItem>
              {(meta?.categories ?? []).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 text-xs">
                <TableHead className="w-8"></TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer text-sm ${
                      selected.includes(item.id)
                        ? "bg-primary/10 border-l-2 border-l-primary"
                        : "hover:bg-muted/40"
                    }`}
                    onClick={() => toggle(item.id)}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onCheckedChange={() => toggle(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.categoryId != null ? (categoryMap[item.categoryId] ?? "—") : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.price != null ? `$${parseFloat(item.price).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.unit ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {selected.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div className="space-y-1">
              <Label className="text-sm">Quantity</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">
                Section / Course{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="e.g. First Course, Setup…"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-sm">
                Notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special notes for these items"
              />
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">
              {selected.length} item{selected.length !== 1 ? "s" : ""} selected — quantity, section, and notes apply to all.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            className="mr-auto text-muted-foreground hover:text-foreground"
            onClick={() => {
              onClose();
              onAddCustom();
            }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Item
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.length === 0 || saving}>
            {saving
              ? "Adding…"
              : `Add ${selected.length > 0 ? selected.length + " " : ""}Item${selected.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Menu Block ───────────────────────────────────────────────────────────────

function MenuBlock({
  menu,
  functionId,
  eventId,
  allMenus,
  guestCount,
}: {
  menu: any;
  functionId: number;
  eventId: number;
  allMenus: any[];
  guestCount: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showUnselected, setShowUnselected] = useState(true);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editMenuOpen, setEditMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<{ itemId: number; field: "qty" | "price"; value: string } | null>(null);
  // Optimistic selected state: itemId → boolean (overrides server value until refetch)
  const [optimisticSelected, setOptimisticSelected] = useState<Map<number, boolean>>(new Map());

  const [itemForm, setItemForm] = useState({
    itemName: "",
    serviceTypeName: SERVICE_ITEM_CATEGORIES[0],
    quantity: "1",
    unitPrice: "",
    revenueCenterId: "",
    sectionName: "",
  });

  const [menuForm, setMenuForm] = useState({
    functionMenuName: menu.functionMenuName as string,
    pricingType: (menu.pricingType ?? "A La Carte Pricing") as string,
  });

  const [editForm, setEditForm] = useState({
    itemName: "",
    quantity: "",
    unitPrice: "",
    revenueCenterId: "",
    notes: "",
    sectionName: "",
  });

  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: revenueCenters } = useGetRevenueCenters({});
  const deleteMenu = useDeleteFunctionMenu();
  const createServiceType = useCreateServiceType();
  const createItem = useCreateServiceItem();
  const updateItem = useUpdateServiceItem();
  const deleteItem = useDeleteServiceItem();

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });

  const handleAddFromLibrary = async (
    toAdd: Array<{ catalogItem: any; qty: string; categoryName: string; sectionName: string; notes: string }>
  ) => {
    for (const { catalogItem, qty, categoryName, sectionName, notes } of toAdd) {
      let serviceTypeId: number;
      const existing = (menu.serviceTypes ?? []).find(
        (st: any) => st.serviceTypeName.toLowerCase() === categoryName.toLowerCase()
      );
      if (existing) {
        serviceTypeId = existing.id;
      } else {
        const newSt = await createServiceType.mutateAsync({
          id: menu.id,
          data: { serviceTypeName: categoryName },
        });
        serviceTypeId = (newSt as any).id;
      }
      await createItem.mutateAsync({
        id: serviceTypeId,
        data: {
          itemName: catalogItem.name,
          quantity: qty ? parseFloat(qty) : 1,
          aLaCartePrice: catalogItem.price ? parseFloat(catalogItem.price) : undefined,
          revenueCenterId: catalogItem.revenueCenterId ?? undefined,
          sectionName: sectionName || undefined,
          notes: notes || undefined,
          selected: true,
        } as any,
      });
    }
    invalidate();
    toast({ title: `${toAdd.length} item${toAdd.length !== 1 ? "s" : ""} added` });
  };

  const copyMenuMut = useMutation({
    mutationFn: () =>
      fetch(`/api/functions/${functionId}/menus/${menu.id}/copy`, { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      invalidate();
      toast({ title: "Menu copied" });
    },
  });

  const updateMenuMut = useMutation({
    mutationFn: (data: { functionMenuName: string; pricingType: string }) =>
      fetch(`/api/functions/${functionId}/menus/${menu.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      invalidate();
      setEditMenuOpen(false);
      toast({ title: "Menu updated" });
    },
  });

  const removeMenu = () => {
    deleteMenu.mutate(
      { id: menu.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Menu removed" });
        },
      }
    );
  };

  // Flatten all service type items into a single list
  const allItems: any[] = (menu.serviceTypes ?? []).flatMap((st: any) =>
    (st.items ?? []).map((item: any) => ({
      ...item,
      serviceTypeName: st.serviceTypeName,
    }))
  );

  // Resolve effective selected state for an item (optimistic overrides server value)
  const effectiveSelected = (item: any): boolean =>
    optimisticSelected.has(item.id)
      ? (optimisticSelected.get(item.id) ?? false)
      : (item.selected ?? false);

  const menuTotal = allItems.reduce((sum, i) => {
    if (!effectiveSelected(i)) return sum;
    const stored = parseFloat(i.itemTotal ?? "0") || 0;
    if (stored > 0) return sum + stored;
    const qty = parseFloat(i.quantity ?? "1") || 1;
    const price = parseFloat(i.aLaCartePrice ?? "0") || 0;
    return sum + price * qty;
  }, 0);

  const selectedCount = allItems.filter(effectiveSelected).length;

  const toggleSelected = (item: any) => {
    const newVal = !((optimisticSelected.has(item.id) ? optimisticSelected.get(item.id) : item.selected) ?? false);
    // Apply optimistically immediately
    setOptimisticSelected((prev) => new Map(prev).set(item.id, newVal));
    // Persist to server
    fetch(`/api/service-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selected: newVal }),
    }).then(() => {
      invalidate();
      // After server confirms + cache refreshed, clear optimistic entry
      setOptimisticSelected((prev) => {
        const next = new Map(prev);
        next.delete(item.id);
        return next;
      });
    }).catch(() => {
      // Roll back on failure
      setOptimisticSelected((prev) => {
        const next = new Map(prev);
        next.delete(item.id);
        return next;
      });
      toast({ title: "Failed to update item", variant: "destructive" });
    });
  };

  const saveInlineEdit = () => {
    if (!inlineEdit) return;
    const patch: any =
      inlineEdit.field === "qty"
        ? { quantity: parseFloat(inlineEdit.value) || 1 }
        : { aLaCartePrice: parseFloat(inlineEdit.value) || 0 };
    updateItem.mutate(
      { id: inlineEdit.itemId, data: patch },
      { onSuccess: () => { invalidate(); setInlineEdit(null); } }
    );
  };

  const handleAddItem = async () => {
    if (!itemForm.itemName) return;
    setIsAdding(true);
    try {
      let serviceTypeId: number;
      const existing = (menu.serviceTypes ?? []).find(
        (st: any) => st.serviceTypeName.toLowerCase() === itemForm.serviceTypeName.toLowerCase()
      );
      if (existing) {
        serviceTypeId = existing.id;
      } else {
        const newSt = await createServiceType.mutateAsync({
          id: menu.id,
          data: { serviceTypeName: itemForm.serviceTypeName },
        });
        serviceTypeId = (newSt as any).id;
      }
      await createItem.mutateAsync({
        id: serviceTypeId,
        data: {
          itemName: itemForm.itemName,
          quantity: itemForm.quantity ? parseFloat(itemForm.quantity) : undefined,
          aLaCartePrice: itemForm.unitPrice ? parseFloat(itemForm.unitPrice) : undefined,
          revenueCenterId: itemForm.revenueCenterId ? parseInt(itemForm.revenueCenterId) : undefined,
          sectionName: itemForm.sectionName || undefined,
          selected: true,
        } as any,
      });
      invalidate();
      setAddItemOpen(false);
      setItemForm({ itemName: "", serviceTypeName: SERVICE_ITEM_CATEGORIES[0], quantity: "1", unitPrice: "", revenueCenterId: "", sectionName: "" });
      toast({ title: "Item added" });
    } catch {
      toast({ title: "Failed to add item", variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const openEditItem = (item: any) => {
    setEditingItem(item);
    setEditForm({
      itemName: item.itemName ?? "",
      quantity: item.quantity ?? "1",
      unitPrice: item.aLaCartePrice ?? "",
      revenueCenterId: item.revenueCenterId ? String(item.revenueCenterId) : "",
      notes: item.notes ?? "",
      sectionName: item.sectionName ?? "",
    });
  };

  const handleSaveItem = () => {
    if (!editingItem) return;
    updateItem.mutate(
      {
        id: editingItem.id,
        data: {
          itemName: editForm.itemName,
          quantity: editForm.quantity ? parseFloat(editForm.quantity) : undefined,
          aLaCartePrice: editForm.unitPrice ? parseFloat(editForm.unitPrice) : undefined,
          revenueCenterId: editForm.revenueCenterId ? parseInt(editForm.revenueCenterId) : undefined,
          notes: editForm.notes || undefined,
          sectionName: editForm.sectionName || undefined,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setEditingItem(null);
          toast({ title: "Item updated" });
        },
      }
    );
  };

  const handleDeleteItem = (itemId: number) => {
    if (!confirm("Delete this item?")) return;
    deleteItem.mutate(
      { id: itemId },
      { onSuccess: () => { invalidate(); toast({ title: "Item deleted" }); } }
    );
  };

  const MENU_BORDER_COLORS = [
    "border-l-blue-500", "border-l-green-500", "border-l-purple-500",
    "border-l-orange-500", "border-l-pink-500", "border-l-teal-500",
  ];
  const borderColor = MENU_BORDER_COLORS[menu.id % MENU_BORDER_COLORS.length];

  return (
    <div className={`border-l-4 ${borderColor} rounded-lg border border-border overflow-hidden`}>
      {/* ── Menu Header ── */}
      <div className="bg-card px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => setCollapsed((c) => !c)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <div className="min-w-0">
            <div className="font-semibold truncate">{menu.functionMenuName}</div>
            <div className="text-xs text-muted-foreground">
              MNU-{String(menu.id).padStart(3, "0")}
              {menu.pricingType ? ` · ${formatPricingType(menu.pricingType)}` : ""}
              {" · Total: "}
              <span className="font-medium text-foreground">{fmt(menuTotal)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {allItems.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8"
              onClick={() => setShowUnselected((v) => !v)}
            >
              {showUnselected ? "Hide Unselected" : `Show Unselected (${allItems.length - selectedCount})`}
            </Button>
          )}
          <Button size="sm" onClick={() => setLibraryPickerOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setMenuForm({ functionMenuName: menu.functionMenuName, pricingType: menu.pricingType ?? "A La Carte Pricing" }); setEditMenuOpen(true); }}>
                <Edit className="w-4 h-4 mr-2" /> Edit Menu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copyMenuMut.mutate()} disabled={copyMenuMut.isPending}>
                Copy Menu
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={removeMenu} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Remove Menu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Items Table ── */}
      {!collapsed && (
        <div className="bg-muted/5">
          {allItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm border-t">
              <p>No items yet.</p>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => setLibraryPickerOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add first item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-muted/40">
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead className="text-right w-28">Qty</TableHead>
                    <TableHead className="text-right w-28">Unit Price</TableHead>
                    <TableHead className="text-right w-24">Total</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const rows: React.ReactNode[] = [];
                    let lastSection: string | null = undefined as unknown as string | null;
                    const visibleItems = showUnselected ? allItems : allItems.filter(effectiveSelected);
                    visibleItems.forEach((item) => {
                      const sec: string | null = item.sectionName ?? null;
                      if (sec !== null && sec !== lastSection) {
                        rows.push(
                          <TableRow key={`sec-${menu.id}-${sec}`} className="bg-teal-50 border-y border-teal-100 hover:bg-teal-50">
                            <TableCell colSpan={7} className="py-1.5 px-4">
                              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">{sec}</span>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      lastSection = sec;

                      const isSelected = effectiveSelected(item);
                      const qty = parseFloat(item.quantity ?? "1") || 1;
                      const price = parseFloat(item.aLaCartePrice ?? "0") || 0;
                      const stored = parseFloat(item.itemTotal ?? "0") || 0;
                      const total = stored > 0 ? stored : price * qty;

                      const editingQty = inlineEdit != null && inlineEdit.itemId === item.id && inlineEdit.field === "qty";
                      const editingPrice = inlineEdit != null && inlineEdit.itemId === item.id && inlineEdit.field === "price";

                      rows.push(
                        <TableRow
                          key={item.id}
                          className={`text-sm transition-opacity ${isSelected ? "" : "opacity-40"}`}
                        >
                          {/* Checkbox */}
                          <TableCell className="pr-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelected(item)}
                              aria-label="Select item"
                            />
                          </TableCell>

                          {/* Name */}
                          <TableCell className={isSelected ? "font-medium" : ""}>
                            {item.itemName}
                            {item.notes && (
                              <div className="text-xs text-muted-foreground truncate max-w-[220px]">{item.notes}</div>
                            )}
                          </TableCell>

                          {/* Service Type */}
                          <TableCell>
                            <Badge variant="secondary" className="text-xs font-normal whitespace-nowrap">
                              {item.serviceTypeName}
                            </Badge>
                          </TableCell>

                          {/* Qty — inline editable */}
                          <TableCell className="text-right">
                            {editingQty ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  className="w-16 text-right border rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={inlineEdit!.value}
                                  autoFocus
                                  onChange={(e) => setInlineEdit((p) => p ? { ...p, value: e.target.value } : p)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setInlineEdit(null); }}
                                />
                                <button className="text-green-600 hover:text-green-700 p-0.5" onClick={saveInlineEdit} title="Confirm"><Check className="w-3.5 h-3.5" /></button>
                                <button className="text-muted-foreground hover:text-foreground p-0.5" onClick={() => setInlineEdit(null)} title="Cancel"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <span
                                className={`tabular-nums cursor-pointer rounded px-1.5 py-0.5 hover:bg-muted ${isSelected ? "" : "pointer-events-none"}`}
                                onClick={() => isSelected && setInlineEdit({ itemId: item.id, field: "qty", value: String(qty) })}
                                title={isSelected ? "Click to edit" : undefined}
                              >
                                {item.quantity ?? "1"}
                              </span>
                            )}
                          </TableCell>

                          {/* Unit Price — inline editable */}
                          <TableCell className="text-right">
                            {editingPrice ? (
                              <div className="flex items-center justify-end gap-1">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-20 text-right border rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                  value={inlineEdit!.value}
                                  autoFocus
                                  onChange={(e) => setInlineEdit((p) => p ? { ...p, value: e.target.value } : p)}
                                  onKeyDown={(e) => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setInlineEdit(null); }}
                                />
                                <button className="text-green-600 hover:text-green-700 p-0.5" onClick={saveInlineEdit} title="Confirm"><Check className="w-3.5 h-3.5" /></button>
                                <button className="text-muted-foreground hover:text-foreground p-0.5" onClick={() => setInlineEdit(null)} title="Cancel"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            ) : (
                              <span
                                className={`tabular-nums cursor-pointer rounded px-1.5 py-0.5 hover:bg-muted ${isSelected ? "" : "pointer-events-none"}`}
                                onClick={() => isSelected && setInlineEdit({ itemId: item.id, field: "price", value: item.aLaCartePrice ?? "0" })}
                                title={isSelected ? "Click to edit" : undefined}
                              >
                                {fmt(item.aLaCartePrice)}
                              </span>
                            )}
                          </TableCell>

                          {/* Total */}
                          <TableCell className="text-right tabular-nums font-medium">
                            {isSelected ? (price === 0 && stored === 0 ? "—" : fmt(total)) : "—"}
                          </TableCell>

                          {/* Actions */}
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <button
                                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => openEditItem(item)}
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                                onClick={() => handleDeleteItem(item.id)}
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    });
                    return rows;
                  })()}
                </TableBody>
              </Table>
              {!showUnselected && allItems.length - selectedCount > 0 && (
                <div className="text-center py-2 border-t">
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    onClick={() => setShowUnselected(true)}
                  >
                    Show {allItems.length - selectedCount} unselected item{allItems.length - selectedCount !== 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Library Picker ── */}
      <ItemLibraryPicker
        open={libraryPickerOpen}
        onClose={() => setLibraryPickerOpen(false)}
        onAddCustom={() => setAddItemOpen(true)}
        onConfirm={handleAddFromLibrary}
        guestCount={guestCount}
      />

      {/* ── Add Custom Item Modal ── */}
      {addItemOpen && (
        <Dialog open onOpenChange={() => setAddItemOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Item — {menu.functionMenuName}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label className="text-xs mb-1.5 block">Item Name *</Label>
                <Input
                  placeholder="e.g. Breakfast Buffet"
                  value={itemForm.itemName}
                  onChange={(e) => setItemForm((f) => ({ ...f, itemName: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Service Type</Label>
                <Select
                  value={itemForm.serviceTypeName}
                  onValueChange={(v) => setItemForm((f) => ({ ...f, serviceTypeName: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_ITEM_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Section / Course <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. Reception, First Course…"
                  value={itemForm.sectionName}
                  onChange={(e) => setItemForm((f) => ({ ...f, sectionName: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Revenue Center</Label>
                <Select
                  value={itemForm.revenueCenterId || "_none_"}
                  onValueChange={(v) => setItemForm((f) => ({ ...f, revenueCenterId: v === "_none_" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— None —</SelectItem>
                    {((revenueCenters as any[]) ?? []).map((rc) => (
                      <SelectItem key={rc.id} value={String(rc.id)}>{rc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
              <Button onClick={handleAddItem} disabled={!itemForm.itemName || isAdding}>
                {isAdding ? "Adding…" : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Edit Item Modal ── */}
      {editingItem && (
        <Dialog open onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label className="text-xs mb-1.5 block">Item Name *</Label>
                <Input
                  value={editForm.itemName}
                  onChange={(e) => setEditForm((f) => ({ ...f, itemName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1.5 block">Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.unitPrice}
                    onChange={(e) => setEditForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Revenue Center</Label>
                <Select
                  value={editForm.revenueCenterId || "_none_"}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, revenueCenterId: v === "_none_" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— None —</SelectItem>
                    {((revenueCenters as any[]) ?? []).map((rc) => (
                      <SelectItem key={rc.id} value={String(rc.id)}>{rc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Section / Course <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  placeholder="e.g. Reception, First Course…"
                  value={editForm.sectionName}
                  onChange={(e) => setEditForm((f) => ({ ...f, sectionName: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Notes</Label>
                <Textarea
                  rows={2}
                  className="resize-none text-sm"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
              <Button onClick={handleSaveItem} disabled={!editForm.itemName || updateItem.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Edit Menu Modal ── */}
      {editMenuOpen && (
        <Dialog open onOpenChange={() => setEditMenuOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Menu</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label className="text-xs mb-1.5 block">Menu Name *</Label>
                <Input
                  value={menuForm.functionMenuName}
                  onChange={(e) => setMenuForm((f) => ({ ...f, functionMenuName: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Pricing Type</Label>
                <Select
                  value={menuForm.pricingType || PRICING_TYPES[0]}
                  onValueChange={(v) => setMenuForm((f) => ({ ...f, pricingType: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICING_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditMenuOpen(false)}>Cancel</Button>
              <Button
                onClick={() => updateMenuMut.mutate(menuForm)}
                disabled={!menuForm.functionMenuName || updateMenuMut.isPending}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const PRICING_TYPES_MENU = [
  "A La Carte Pricing",
  "Package Pricing - Percentage Amount Allocation",
  "Package Pricing - Monetary Amount Allocation",
];

function AddMenuDialog({
  eventId,
  functionId,
  onClose,
}: {
  eventId: number;
  functionId: number;
  onClose: () => void;
}) {
  const [view, setView] = useState<"library" | "custom">("library");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("_all_");
  const [selected, setSelected] = useState<number[]>([]);

  // Custom menu form state
  const [customName, setCustomName] = useState("Custom Menu");
  const [customCategory, setCustomCategory] = useState("_none_");
  const [customPricingType, setCustomPricingType] = useState("A La Carte Pricing");

  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch all templates (no server-side category filter — we group client-side)
  const { data: allTemplates, isLoading } = useGetMenuTemplates(
    { search: search || undefined },
    { query: { keepPreviousData: true } as any }
  );
  const { data: meta } = useGetCatalogItemsMeta();

  // Build categoryId → name map
  const categoryMap = useMemo(
    () => Object.fromEntries((meta?.categories ?? []).map((c: any) => [c.id, c.name])),
    [meta]
  );

  // Resolve a template's display category (prefer categoryId lookup, fall back to category string)
  const resolveCategory = (t: any): string => {
    if (t.categoryId != null && categoryMap[t.categoryId]) return categoryMap[t.categoryId];
    if (t.category) return t.category;
    return "Uncategorized";
  };

  // Client-side category filter + group
  const filteredTemplates = useMemo(() => {
    return (allTemplates ?? []).filter((t: any) => {
      if (categoryFilter !== "_all_") {
        const cat = resolveCategory(t);
        if (cat !== categoryFilter) return false;
      }
      return true;
    });
  }, [allTemplates, categoryFilter, categoryMap]);

  // Group by category for display
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const t of filteredTemplates) {
      const cat = resolveCategory(t);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTemplates, categoryMap]);

  // Unique category names from all templates (for filter dropdown)
  const allCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const t of (allTemplates ?? [])) seen.add(resolveCategory(t));
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [allTemplates, categoryMap]);

  const addTemplate = useAddMenuTemplate();
  const createMenu = useCreateFunctionMenu();

  const toggleSelect = (id: number) => {
    setSelected((prev) => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAdd = async () => {
    for (const templateId of selected) {
      await addTemplate.mutateAsync({ id: functionId, data: { templateId } });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
    toast({ title: `${selected.length} menu(s) added` });
    onClose();
  };

  const handleCreateCustom = () => {
    if (!customName.trim()) return;
    createMenu.mutate(
      {
        id: functionId,
        data: {
          functionMenuName: customName.trim(),
          pricingType: customPricingType !== "_none_" ? customPricingType : "A La Carte Pricing",
          description: customCategory !== "_none_" ? customCategory : undefined,
        },
      },
      {
        onSuccess: (newMenu: any) => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
          toast({ title: `"${customName.trim()}" created` });
          onClose();
          navigate(`/events/${eventId}/functions/${functionId}/menus/${newMenu.id}/edit`);
        },
        onError: () => {
          toast({ title: "Failed to create menu", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>
              {view === "library" ? "Add Menu from Template Library" : "Create Custom (Blank) Menu"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {view === "library" ? (
          <>
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-52"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all_">All Categories</SelectItem>
                  {allCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Menu #</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Pricing Type</TableHead>
                    <TableHead>Package Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow><TableCell colSpan={6} className="text-center py-6"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
                  )}
                  {!isLoading && groupedTemplates.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No templates found.</TableCell></TableRow>
                  )}
                  {groupedTemplates.map(([catName, rows]) => (
                    <>
                      <TableRow key={`cat-${catName}`} className="bg-muted/60 pointer-events-none select-none">
                        <TableCell colSpan={6} className="py-1.5 px-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {catName}
                          </span>
                          <Badge variant="secondary" className="ml-2 text-xs font-normal">{rows.length}</Badge>
                        </TableCell>
                      </TableRow>
                      {rows.map((t: any) => (
                        <TableRow
                          key={t.id}
                          className={`cursor-pointer ${selected.includes(t.id) ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/40"}`}
                          onClick={() => toggleSelect(t.id)}
                        >
                          <TableCell>
                            <Checkbox checked={selected.includes(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                          </TableCell>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.menuNumber ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{resolveCategory(t)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatPricingType(t.pricingType)}</TableCell>
                          <TableCell className="text-sm">{fmt(t.packagePrice)}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setView("custom")} className="sm:mr-auto">
                <Plus className="w-4 h-4 mr-1" /> Add Custom (Blank) Menu
              </Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleAdd} disabled={selected.length === 0 || addTemplate.isPending}>
                Add Selected ({selected.length})
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Menu Name <span className="text-red-500">*</span></Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. Evening Reception Menu"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={customCategory} onValueChange={setCustomCategory}>
                  <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— None —</SelectItem>
                    {MENU_CATEGORIES.filter(c => c !== "Show All").map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pricing Type</Label>
                <Select value={customPricingType} onValueChange={setCustomPricingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRICING_TYPES_MENU.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setView("library")}>← Back to Library</Button>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleCreateCustom}
                disabled={!customName.trim() || createMenu.isPending}
              >
                {createMenu.isPending ? "Creating…" : "Create & Edit Menu"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function FunctionServices() {
  const params = useParams<{ id: string; functionId: string }>();
  const eventId = Number(params.id);
  const functionId = Number(params.functionId);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: event } = useGetEvent(eventId, { query: { enabled: !!eventId } as any });
  const { data: fn, isLoading: fnLoading } = useGetFunction(functionId, {
    query: { enabled: !!functionId } as any,
  });
  const { data: functions } = useListEventFunctions(eventId, { query: { enabled: !!eventId } as any });
  const { data: menus, isLoading: menusLoading } = useGetFunctionMenus(functionId, {
    query: { enabled: !!functionId } as any,
  });

  const totalCharges = (menus ?? []).reduce((sum: number, menu: any) => {
    return sum + (menu.serviceTypes ?? []).reduce((s: number, st: any) => {
      return s + (st.items ?? []).reduce((si: number, i: any) => si + (parseFloat(i.itemTotal ?? "0") || 0), 0);
    }, 0);
  }, 0);

  if (fnLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-4" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="flex h-full -m-6">
      {/* Left sidebar */}
      <div className="w-72 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href={`/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
            <ArrowLeft className="w-4 h-4" /> {event?.eventName ?? "Back to Event"}
          </Link>
          <div className="font-semibold">{fn?.functionType ?? "Function"} Services</div>
          <div className="text-xs text-muted-foreground mt-0.5">{fn?.functionDate}</div>
        </div>
        <div className="p-4 border-b space-y-2">
          <div className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Summary</div>
          <div className="flex justify-between text-sm">
            <span>Menus</span><span className="font-medium">{menus?.length ?? 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Charges</span><span className="font-semibold text-primary">{fmt(totalCharges)}</span>
          </div>
        </div>
        <div className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground uppercase font-medium tracking-wide mb-2">Quick Links</div>
          <Link href={`/events/${eventId}`} className="block text-sm py-1.5 px-3 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            Event Details
          </Link>
          <Link href={`/events/${eventId}/financials`} className="block text-sm py-1.5 px-3 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            Event Financials
          </Link>
          <Link href={`/events/${eventId}/functions/${functionId}/financials`} className="block text-sm py-1.5 px-3 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
            Function Financials
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Orange accent sub-header with function picker */}
        <div className="border-b-2 border-orange-400 bg-orange-50 px-6 py-2 flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-semibold text-orange-700 whitespace-nowrap">Show Details for Function:</span>
          <Select
            value={String(functionId)}
            onValueChange={(v) => navigate(`/events/${eventId}/functions/${v}/services`)}
          >
            <SelectTrigger className="h-7 text-xs border-orange-300 bg-white max-w-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(functions ?? []).map((f: any) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {`${(f as any).functionNumber ?? f.id} - ${f.functionType ?? "Function"} on ${f.functionDate ?? "TBD"} at ${f.startTime ?? "?"}-${f.endTime ?? "?"} in ${(f as any).location ?? "TBD"}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <header className="h-14 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <h1 className="font-bold text-base">Function Services — {fn?.functionType}</h1>
            <div className="text-xs text-muted-foreground">
              {event?.eventName} · {fn?.functionDate}
              {(fn as any)?.functionNumber ? ` · ${(fn as any).functionNumber}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/events/${eventId}/functions/${functionId}`}>View Details</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/events/${eventId}/functions/${functionId}/financials`}>Financials</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/events/${eventId}/functions/${functionId}/beo`}>
                <Printer className="w-4 h-4 mr-1" /> Print BEO
              </Link>
            </Button>
            <Button size="sm" onClick={() => setAddMenuOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Menu
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline"><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Reorder Menus</DropdownMenuItem>
                <DropdownMenuItem>Copy Services from Another Function</DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/events/${eventId}/functions/${functionId}/financials`}>View Financial Details</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/events/${eventId}/functions/${functionId}`}>View Function Details</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>View Daily Menu Mix</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {menusLoading && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {!menusLoading && menus?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="text-4xl mb-4">🍽️</div>
              <h3 className="text-lg font-semibold mb-2">No menus yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add menus from the template library or create a custom menu.
              </p>
              <Button onClick={() => setAddMenuOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Menu
              </Button>
            </div>
          )}
          <div className="space-y-6">
            {menus?.map((menu: any) => (
              <MenuBlock
                key={menu.id}
                menu={menu}
                functionId={functionId}
                eventId={eventId}
                allMenus={menus ?? []}
                guestCount={Number((fn as any)?.estimatedAttendance ?? (fn as any)?.guaranteedAttendance ?? 1)}
              />
            ))}
          </div>
        </div>
      </div>

      {addMenuOpen && (
        <AddMenuDialog eventId={eventId} functionId={functionId} onClose={() => setAddMenuOpen(false)} />
      )}
    </div>
  );
}
