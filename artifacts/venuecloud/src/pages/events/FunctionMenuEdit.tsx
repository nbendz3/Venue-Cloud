import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetEvent, useGetFunction,
  useGetFunctionMenu, useUpdateFunctionMenu,
  useCreateServiceType, useCreateServiceItem, useUpdateServiceItem, useDeleteServiceItem,
  useListCatalogItems, useGetRevenueCenters,
  getGetFunctionMenuQueryKey, getGetFunctionMenusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Save, ChevronDown, ChevronRight, Plus, X, Search, Utensils,
} from "lucide-react";
import { toast } from "sonner";

const PRICING_TYPES = [
  "A La Carte Pricing",
  "Package Pricing - Monetary Amount Allocation",
  "Package Pricing - Percentage Amount Allocation",
];
const PACKAGE_PRICING_OPTIONS = [
  "Per Person", "Per Event", "Per Table", "Per Room", "Per Night", "Per Hour",
];

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm mb-1 block">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function CatalogItemPickerModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (items: { item: any; qty: number }[]) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [adding, setAdding] = useState(false);

  const { data: catalogItems } = useListCatalogItems(
    {},
    { query: { enabled: open } as any }
  );

  const categories = [
    "all",
    ...Array.from(
      new Set(((catalogItems as any[]) ?? []).map((i: any) => i.categoryName).filter(Boolean))
    ).sort(),
  ];

  const filtered = ((catalogItems as any[]) ?? []).filter((i: any) => {
    const matchSearch =
      !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || i.categoryName === category;
    return matchSearch && matchCat;
  });

  const selectedCount = Object.keys(selected).length;

  function toggle(itemId: number) {
    setSelected((p) => {
      if (p[itemId] !== undefined) {
        const next = { ...p };
        delete next[itemId];
        return next;
      }
      return { ...p, [itemId]: 1 };
    });
  }

  async function handleAdd() {
    const items = Object.entries(selected)
      .map(([id, qty]) => ({
        item: ((catalogItems as any[]) ?? []).find((i: any) => i.id === Number(id)),
        qty,
      }))
      .filter((x) => x.item);
    setAdding(true);
    try {
      await onAdd(items);
      setSelected({});
      setSearch("");
      setCategory("all");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Items from Library</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.slice(1).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-72 overflow-y-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
              <tr className="text-xs text-muted-foreground border-b">
                <th className="text-left p-2 w-8"></th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Category</th>
                <th className="text-right p-2">Price</th>
                <th className="text-right p-2 w-20">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item: any) => {
                const isSelected = selected[item.id] !== undefined;
                const price = parseFloat(item.price ?? "0") || 0;
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/40 ${isSelected ? "bg-primary/5" : ""}`}
                    onClick={() => toggle(item.id)}
                  >
                    <td className="p-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-2">
                      <div className="font-medium leading-tight">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">
                        {item.categoryName ?? "—"}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">
                      {price > 0 ? `$${price.toFixed(2)}` : "—"}
                      {item.pricingUnit && (
                        <span className="text-xs text-muted-foreground ml-1">/{item.pricingUnit}</span>
                      )}
                    </td>
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      {isSelected && (
                        <Input
                          className="h-6 text-xs w-16 text-right ml-auto"
                          type="number"
                          min="0.25"
                          step="0.25"
                          value={selected[item.id]}
                          onChange={(e) =>
                            setSelected((p) => ({
                              ...p,
                              [item.id]: parseFloat(e.target.value) || 1,
                            }))
                          }
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    No items match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={adding}>
            Cancel
          </Button>
          <Button disabled={selectedCount === 0 || adding} onClick={handleAdd}>
            {adding
              ? "Adding…"
              : selectedCount > 0
                ? `Add ${selectedCount} Item${selectedCount === 1 ? "" : "s"}`
                : "Add Items"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FunctionMenuEdit() {
  const params = useParams<{ id: string; functionId: string; menuId: string }>();
  const eventId = Number(params.id);
  const functionId = Number(params.functionId);
  const menuId = Number(params.menuId);
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: event } = useGetEvent(eventId, { query: { enabled: !!eventId } as any });
  const { data: fn } = useGetFunction(functionId, { query: { enabled: !!functionId } as any });
  const { data: menu, isLoading } = useGetFunctionMenu(menuId, {
    query: { enabled: !!menuId } as any,
  });
  const { data: revCenters } = useGetRevenueCenters({ query: { enabled: true } as any });

  const [headerForm, setHeaderForm] = useState({
    functionMenuName: "",
    pricingType: "A La Carte Pricing",
    autoCalculateQuantity: true,
    numberRequired: 1,
    perNumberOfGuests: 1,
    useFunctionTimeRange: true,
    startTime: "",
    endTime: "",
    menuLocation: "",
    description: "",
    menuNotes: "",
    markNotesInternal: false,
    packagePricing: "Per Person",
    packagePrice: "",
    packageCost: "",
  });
  const setHF = (k: string, v: any) => setHeaderForm((p) => ({ ...p, [k]: v }));

  const [moreOpen, setMoreOpen] = useState(false);
  const [qtyOverrides, setQtyOverrides] = useState<Record<number, string>>({});
  const [notesOverrides, setNotesOverrides] = useState<Record<number, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [headerDirty, setHeaderDirty] = useState(false);
  const prevTotalRef = useRef<string>("");

  useEffect(() => {
    if (menu) {
      setHeaderForm((prev) => ({
        ...prev,
        functionMenuName: (menu as any).functionMenuName ?? "",
        pricingType: (menu as any).pricingType ?? "A La Carte Pricing",
        numberRequired: (menu as any).numberRequired ?? 1,
        perNumberOfGuests: (menu as any).perNumberOfGuests ?? 1,
        menuLocation: (menu as any).menuLocation ?? "",
        description: (menu as any).description ?? "",
        menuNotes: (menu as any).menuNotes ?? "",
        packagePrice: (menu as any).packagePrice ?? "",
        packageCost: (menu as any).packageCost ?? "",
      }));
      setHeaderDirty(false);
    }
  }, [(menu as any)?.id]);

  const allServiceTypes: any[] = (menu as any)?.serviceTypes ?? [];
  const allItems: any[] = allServiceTypes.flatMap((st: any) =>
    (st.items ?? []).map((item: any) => ({
      ...item,
      serviceTypeId: st.id,
      serviceTypeName: st.serviceTypeName,
    }))
  );

  function getEffectiveQty(item: any): number {
    const o = qtyOverrides[item.id];
    return o !== undefined ? parseFloat(o) || 0 : parseFloat(item.quantity ?? "0") || 0;
  }
  function getEffectivePrice(item: any): number {
    return parseFloat(item.aLaCartePrice ?? "0") || 0;
  }
  function getEffectiveTotal(item: any): number {
    return getEffectiveQty(item) * getEffectivePrice(item);
  }

  const subtotal = allItems.reduce((s, i) => s + getEffectiveTotal(i), 0);
  const tax = allItems.reduce((s, i) => {
    const rc = ((revCenters as any[]) ?? []).find((r: any) => r.id === i.revenueCenterId);
    const rate = parseFloat(rc?.salesTaxRate ?? "0") / 100;
    return s + getEffectiveTotal(i) * rate;
  }, 0);
  const gratuity = subtotal * 0.22;
  const grandTotal = subtotal + tax + gratuity;

  const fnAttendance = parseFloat((fn as any)?.estimatedAttendance ?? "1") || 1;
  const menuQty = headerForm.autoCalculateQuantity
    ? Math.round((Number(headerForm.numberRequired) / Math.max(1, Number(headerForm.perNumberOfGuests))) * fnAttendance)
    : Number(headerForm.numberRequired);
  const isPackage = headerForm.pricingType !== "A La Carte Pricing";

  const updateMenuMutation = useUpdateFunctionMenu();
  const createSTMutation = useCreateServiceType();
  const createItemMutation = useCreateServiceItem();
  const updateItemMutation = useUpdateServiceItem();
  const deleteItemMutation = useDeleteServiceItem();

  useEffect(() => {
    if (!menu || allItems.length === 0) return;
    const itemsTotal = allItems.reduce(
      (s, i) => s + parseFloat(i.itemTotal ?? "0"),
      0
    );
    const storedTotal = parseFloat((menu as any).menuTotalCharges ?? "0");
    const rounded = Math.round(itemsTotal * 100) / 100;
    const key = rounded.toFixed(2);
    if (Math.abs(itemsTotal - storedTotal) > 0.005 && prevTotalRef.current !== key) {
      prevTotalRef.current = key;
      updateMenuMutation.mutate({
        id: menuId,
        data: { menuTotalCharges: rounded } as any,
      });
    }
  }, [menu]);

  function invalidateMenus() {
    qc.invalidateQueries({ queryKey: getGetFunctionMenuQueryKey(menuId) });
    qc.invalidateQueries({ queryKey: getGetFunctionMenusQueryKey(functionId) });
  }

  async function saveHeader() {
    try {
      await updateMenuMutation.mutateAsync({
        id: menuId,
        data: {
          functionMenuName: headerForm.functionMenuName,
          pricingType: headerForm.pricingType,
          numberRequired: Number(headerForm.numberRequired),
          perNumberOfGuests: Number(headerForm.perNumberOfGuests),
          menuLocation: headerForm.menuLocation || undefined,
          description: headerForm.description || undefined,
          menuNotes: headerForm.menuNotes || undefined,
          packagePrice: headerForm.packagePrice ? parseFloat(headerForm.packagePrice) : undefined,
          packageCost: headerForm.packageCost ? parseFloat(headerForm.packageCost) : undefined,
        } as any,
      });
      invalidateMenus();
      setHeaderDirty(false);
      toast.success("Menu saved");
    } catch {
      toast.error("Failed to save menu");
    }
  }

  const saveItem = useCallback(
    async (item: any) => {
      const qty = qtyOverrides[item.id] !== undefined ? qtyOverrides[item.id] : String(item.quantity ?? "");
      const notes =
        notesOverrides[item.id] !== undefined ? notesOverrides[item.id] : String(item.notes ?? "");
      const price = parseFloat(item.aLaCartePrice ?? "0") || 0;
      const qtyNum = parseFloat(qty) || 0;
      const itemTotal = Math.round(qtyNum * price * 100) / 100;
      try {
        await updateItemMutation.mutateAsync({
          id: item.id,
          data: {
            itemName: item.itemName,
            quantity: String(qtyNum),
            notes: notes || undefined,
            itemTotal: String(itemTotal),
          } as any,
        });
        invalidateMenus();
      } catch {
        toast.error("Failed to update item");
      }
    },
    [qtyOverrides, notesOverrides, menuId, functionId]
  );

  async function removeItem(itemId: number) {
    try {
      await deleteItemMutation.mutateAsync({ id: itemId });
      invalidateMenus();
      toast.success("Item removed");
    } catch {
      toast.error("Failed to remove item");
    }
  }

  async function handleAddItems(items: { item: any; qty: number }[]) {
    try {
      let serviceTypeId: number;
      if (allServiceTypes.length > 0) {
        serviceTypeId = allServiceTypes[0].id;
      } else {
        const newST = await createSTMutation.mutateAsync({
          id: menuId,
          data: { serviceTypeName: "Items", useFunctionTimeRange: true } as any,
        });
        serviceTypeId = (newST as any).id;
      }

      for (const { item, qty } of items) {
        const price = parseFloat(item.price ?? "0") || 0;
        const itemTotal = Math.round(qty * price * 100) / 100;
        await createItemMutation.mutateAsync({
          id: serviceTypeId,
          data: {
            itemName: item.name,
            quantity: String(qty),
            aLaCartePrice: String(price),
            cost: String(parseFloat(item.cost ?? "0") || 0),
            itemTotal: String(itemTotal),
            category: item.categoryName ?? undefined,
            revenueCenterId: item.revenueCenterId ?? undefined,
            notes: "",
          } as any,
        });
      }

      invalidateMenus();
      setShowAddModal(false);
      toast.success(`Added ${items.length} item${items.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Failed to add items");
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-12 w-1/3 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const fnLabel = `${(fn as any)?.functionType ?? "Function"}: ${event?.eventName ?? ""} - ${(fn as any)?.functionDate ?? ""} - ${(fn as any)?.functionNumber ?? `#${functionId}`} - ${(fn as any)?.location ?? ""}`;

  return (
    <div className="max-w-5xl mx-auto py-8 px-6">
      <div className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
        <Link href={`/events/${eventId}`} className="hover:underline">
          {event?.eventName ?? "Event"}
        </Link>
        <span>›</span>
        <Link
          href={`/events/${eventId}/functions/${functionId}`}
          className="hover:underline"
        >
          {(fn as any)?.functionType ?? "Function"}
        </Link>
        <span>›</span>
        <Link
          href={`/events/${eventId}/functions/${functionId}/services`}
          className="hover:underline"
        >
          Services
        </Link>
        <span>›</span>
        <span>Edit Menu</span>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/events/${eventId}/functions/${functionId}/services`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {headerForm.functionMenuName || (menu as any)?.functionMenuName || "Menu"}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">{fnLabel}</p>
        </div>
      </div>

      {/* Menu Header Card */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Menu Settings</h2>
            {headerDirty && (
              <Button size="sm" onClick={saveHeader} disabled={updateMenuMutation.isPending}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {updateMenuMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <F label="Menu Name" required>
              <Input
                value={headerForm.functionMenuName}
                onChange={(e) => {
                  setHF("functionMenuName", e.target.value);
                  setHeaderDirty(true);
                }}
              />
            </F>
            <F label="Pricing Type">
              <Select
                value={headerForm.pricingType}
                onValueChange={(v) => {
                  setHF("pricingType", v);
                  setHeaderDirty(true);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICING_TYPES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </F>
          </div>

          <div className="grid grid-cols-4 gap-3 items-end">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={headerForm.autoCalculateQuantity}
                onCheckedChange={(v) => {
                  setHF("autoCalculateQuantity", !!v);
                  setHeaderDirty(true);
                }}
              />
              <Label className="text-sm leading-tight">Auto Calc Quantity</Label>
            </div>
            <F label="Number Required">
              <Input
                type="number"
                value={headerForm.numberRequired}
                onChange={(e) => {
                  setHF("numberRequired", e.target.value);
                  setHeaderDirty(true);
                }}
              />
            </F>
            <F label="Per # Guests">
              <Input
                type="number"
                value={headerForm.perNumberOfGuests}
                onChange={(e) => {
                  setHF("perNumberOfGuests", e.target.value);
                  setHeaderDirty(true);
                }}
              />
            </F>
            <F label="Menu Quantity">
              <Input value={menuQty} readOnly className="bg-muted" />
            </F>
          </div>

          {isPackage && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
              <h3 className="text-sm font-semibold text-blue-800">Package Pricing</h3>
              <div className="grid grid-cols-3 gap-4">
                <F label="Package Type">
                  <Select
                    value={headerForm.packagePricing}
                    onValueChange={(v) => {
                      setHF("packagePricing", v);
                      setHeaderDirty(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACKAGE_PRICING_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </F>
                <F label="Package Price">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      className="pl-7"
                      type="number"
                      step="0.01"
                      value={headerForm.packagePrice}
                      onChange={(e) => {
                        setHF("packagePrice", e.target.value);
                        setHeaderDirty(true);
                      }}
                    />
                  </div>
                </F>
                <F label="Package Cost">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      className="pl-7"
                      type="number"
                      step="0.01"
                      value={headerForm.packageCost}
                      onChange={(e) => {
                        setHF("packageCost", e.target.value);
                        setHeaderDirty(true);
                      }}
                    />
                  </div>
                </F>
              </div>
            </div>
          )}

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline">
              {moreOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              More Menu Fields
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 grid grid-cols-2 gap-4">
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox
                  checked={headerForm.useFunctionTimeRange}
                  onCheckedChange={(v) => {
                    setHF("useFunctionTimeRange", !!v);
                    setHeaderDirty(true);
                  }}
                />
                <Label className="text-sm">Use Function Time Range</Label>
              </div>
              {!headerForm.useFunctionTimeRange && (
                <>
                  <F label="Start Time">
                    <Input
                      type="time"
                      value={headerForm.startTime}
                      onChange={(e) => {
                        setHF("startTime", e.target.value);
                        setHeaderDirty(true);
                      }}
                    />
                  </F>
                  <F label="End Time">
                    <Input
                      type="time"
                      value={headerForm.endTime}
                      onChange={(e) => {
                        setHF("endTime", e.target.value);
                        setHeaderDirty(true);
                      }}
                    />
                  </F>
                </>
              )}
              <F label="Menu Location">
                <Input
                  value={headerForm.menuLocation}
                  onChange={(e) => {
                    setHF("menuLocation", e.target.value);
                    setHeaderDirty(true);
                  }}
                />
              </F>
              <div />
              <F label="Description">
                <Textarea
                  className="h-20 resize-none"
                  value={headerForm.description}
                  onChange={(e) => {
                    setHF("description", e.target.value);
                    setHeaderDirty(true);
                  }}
                />
              </F>
              <F label="Menu Notes">
                <Textarea
                  className="h-20 resize-none"
                  value={headerForm.menuNotes}
                  onChange={(e) => {
                    setHF("menuNotes", e.target.value);
                    setHeaderDirty(true);
                  }}
                />
              </F>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox
                  checked={headerForm.markNotesInternal}
                  onCheckedChange={(v) => {
                    setHF("markNotesInternal", !!v);
                    setHeaderDirty(true);
                  }}
                />
                <Label className="text-sm">Mark Notes Internal</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold">
                Menu Items
                {allItems.length > 0 && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    ({allItems.length})
                  </span>
                )}
              </h2>
            </div>
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Items
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="w-8 text-center">#</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="w-32">Category</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-28">Unit Price</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-40">Notes</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map((item: any, idx: number) => {
                  const qty =
                    qtyOverrides[item.id] !== undefined
                      ? qtyOverrides[item.id]
                      : String(item.quantity ?? "");
                  const notes =
                    notesOverrides[item.id] !== undefined
                      ? notesOverrides[item.id]
                      : String(item.notes ?? "");
                  const price = parseFloat(item.aLaCartePrice ?? "0") || 0;
                  const qtyNum = parseFloat(qty) || 0;
                  const lineTotal = qtyNum * price;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{item.itemName}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-48">
                            {item.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.category ? (
                          <Badge variant="secondary" className="text-xs">
                            {item.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs w-16"
                          type="number"
                          min="0"
                          step="0.25"
                          value={qty}
                          onChange={(e) =>
                            setQtyOverrides((p) => ({ ...p, [item.id]: e.target.value }))
                          }
                          onBlur={() => saveItem(item)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {price > 0 ? (
                          <>
                            <span className="font-medium">${price.toFixed(2)}</span>
                            {item.revenueCenterName && (
                              <div className="text-xs text-muted-foreground">
                                {item.revenueCenterName}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-sm">${lineTotal.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-7 text-xs"
                          placeholder="Notes…"
                          value={notes}
                          onChange={(e) =>
                            setNotesOverrides((p) => ({ ...p, [item.id]: e.target.value }))
                          }
                          onBlur={() => saveItem(item)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                          disabled={deleteItemMutation.isPending}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {allItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Utensils className="w-8 h-8 opacity-30" />
                        <p className="text-sm">No items yet.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddModal(true)}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Items from Library
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pricing Footer */}
          {allItems.length > 0 && (
            <div className="mt-5 flex justify-end">
              <div className="w-72 space-y-1.5 text-sm bg-muted/30 rounded-lg border p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax{tax > 0 && (revCenters as any[])?.length ? " (est.)" : ""}
                  </span>
                  <span className="font-medium tabular-nums">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gratuity (22%)</span>
                  <span className="font-medium tabular-nums">${gratuity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5">
                  <span className="font-semibold">Estimated Total</span>
                  <span className="font-bold text-base tabular-nums">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-right pt-0.5">
                  <Link
                    href={`/events/${eventId}/functions/${functionId}/financials`}
                    className="text-xs text-primary hover:underline"
                  >
                    Full financial breakdown →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom nav */}
      <div className="flex items-center gap-3 text-sm">
        <Button variant="outline" asChild>
          <Link href={`/events/${eventId}/functions/${functionId}/services`}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Services
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/events/${eventId}/functions/${functionId}/financials`}>
            View Financials
          </Link>
        </Button>
      </div>

      <CatalogItemPickerModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItems}
      />
    </div>
  );
}
