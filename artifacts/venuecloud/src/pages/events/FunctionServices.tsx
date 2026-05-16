import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetEvent,
  useGetFunction,
  useGetFunctionMenus,
  useGetMenuTemplates,
  useCreateFunctionMenu,
  useUpdateFunctionMenu,
  useDeleteFunctionMenu,
  useCreateServiceType,
  useDeleteServiceType,
  useCreateServiceItem,
  useUpdateServiceItem,
  useDeleteServiceItem,
  useAddMenuTemplate,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  itemTotal?: string | null;
  revenueCenterName?: string | null;
  chargeHourly?: boolean | null;
  numHours?: string | null;
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
        <TableCell className="font-medium">{item.itemName}</TableCell>
        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
          {item.notes ?? "—"}
        </TableCell>
        <TableCell className="text-sm">{item.notesInternal ? "Yes" : "No"}</TableCell>
        <TableCell className="text-sm">{item.quantity ?? "—"}</TableCell>
        <TableCell className="text-sm">{fmt(item.aLaCartePrice)}</TableCell>
        <TableCell className="text-sm">{fmt(item.addOnPrice)}</TableCell>
        <TableCell className="text-sm">{item.numHours ?? "—"}</TableCell>
        <TableCell className="text-sm font-medium">{fmt(item.itemTotal)}</TableCell>
        <TableCell className="text-sm">{item.revenueCenterName ?? "—"}</TableCell>
        <TableCell className="text-sm">{item.appliedRates ?? "—"}</TableCell>
        <TableCell className="text-sm">{item.category ?? "—"}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={13} className="py-4 px-6">
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
        <Dialog open onOpenChange={() => setEditing(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Service Item</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="col-span-2">
                <Label>Item Name</Label>
                <Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>A La Carte Price</Label>
                <Input type="number" value={form.aLaCartePrice ?? ""} onChange={(e) => setForm({ ...form, aLaCartePrice: e.target.value })} />
              </div>
              <div>
                <Label>Add-On Price</Label>
                <Input type="number" value={form.addOnPrice ?? ""} onChange={(e) => setForm({ ...form, addOnPrice: e.target.value })} />
              </div>
              <div>
                <Label>Cost</Label>
                <Input type="number" value={form.cost ?? ""} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity ?? ""} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <Label>Applied Rates</Label>
                <Select value={form.appliedRates ?? ""} onValueChange={(v) => setForm({ ...form, appliedRates: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{APPLIED_RATES_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={save} disabled={updateItem.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function ServiceTypeBlock({
  serviceType,
  functionId,
  menuId,
}: {
  serviceType: any;
  functionId: number;
  menuId: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
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
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Total: <span className="font-medium text-foreground">{fmt(totalCharges)}</span></span>
          <Button size="sm" variant="outline" onClick={() => setAddItemOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Custom Item
          </Button>
          <button onClick={removeType} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-20">Actions</TableHead>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceType.items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center text-muted-foreground py-6 text-sm">
                    No items yet. Click "Add Custom Item" to begin.
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
    </div>
  );
}

function MenuBlock({
  menu,
  functionId,
  eventId,
}: {
  menu: any;
  functionId: number;
  eventId: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [addServiceTypeOpen, setAddServiceTypeOpen] = useState(false);
  const [serviceTypeName, setServiceTypeName] = useState(SERVICE_TYPE_NAMES[0]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteMenu = useDeleteFunctionMenu();
  const createServiceType = useCreateServiceType();

  const removeMenu = () => {
    deleteMenu.mutate(
      { id: menu.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
          toast({ title: "Menu removed" });
        },
      }
    );
  };

  const addServiceType = () => {
    createServiceType.mutate(
      {
        id: menu.id,
        data: { serviceTypeName },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
          setAddServiceTypeOpen(false);
          toast({ title: "Service type added" });
        },
      }
    );
  };

  const menuTotal = (menu.serviceTypes ?? []).reduce((sum: number, st: any) => {
    return sum + (st.items ?? []).reduce((s: number, i: any) => s + (parseFloat(i.itemTotal ?? "0") || 0), 0);
  }, 0);

  const MENU_BORDER_COLORS = [
    "border-l-blue-500", "border-l-green-500", "border-l-purple-500",
    "border-l-orange-500", "border-l-pink-500", "border-l-teal-500",
  ];
  const borderColor = MENU_BORDER_COLORS[menu.id % MENU_BORDER_COLORS.length];

  return (
    <div className={`border-l-4 ${borderColor} rounded-lg border border-border overflow-hidden`}>
      <div className="bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCollapsed((c) => !c)} className="text-muted-foreground hover:text-foreground">
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <div>
            <div className="font-semibold">{menu.functionMenuName}</div>
            <div className="text-xs text-muted-foreground">
              {menu.pricingType} · {menu.serviceTypes?.length ?? 0} service type(s) · Total: {fmt(menuTotal)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddServiceTypeOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> New Service Type
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={removeMenu} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Menu
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4 bg-muted/10">
          {menu.serviceTypes?.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8 border-dashed border rounded-lg">
              No service types yet. Click "New Service Type" to add one.
            </div>
          )}
          {menu.serviceTypes?.map((st: any) => (
            <ServiceTypeBlock key={st.id} serviceType={st} functionId={functionId} menuId={menu.id} />
          ))}
        </div>
      )}

      {addServiceTypeOpen && (
        <Dialog open onOpenChange={() => setAddServiceTypeOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Service Type</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Label>Service Type</Label>
              <Select value={serviceTypeName} onValueChange={setServiceTypeName}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPE_NAMES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddServiceTypeOpen(false)}>Cancel</Button>
              <Button onClick={addServiceType} disabled={createServiceType.isPending}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function AddMenuDialog({
  functionId,
  onClose,
}: {
  functionId: number;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Show All");
  const [selected, setSelected] = useState<number[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates, isLoading } = useGetMenuTemplates(
    { category: category !== "Show All" ? category : undefined, search: search || undefined },
    { query: { keepPreviousData: true } as any }
  );
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

  const handleAddCustom = () => {
    createMenu.mutate(
      { id: functionId, data: { functionMenuName: "Custom Menu", pricingType: "A La Carte Pricing" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
          toast({ title: "Custom menu added" });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Menu from Template Library</DialogTitle>
        </DialogHeader>
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
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MENU_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
              {templates?.map((t: any) => (
                <TableRow
                  key={t.id}
                  className={`cursor-pointer ${selected.includes(t.id) ? "bg-primary/10" : ""}`}
                  onClick={() => toggleSelect(t.id)}
                >
                  <TableCell>
                    <Checkbox checked={selected.includes(t.id)} onCheckedChange={() => toggleSelect(t.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.menuNumber}</TableCell>
                  <TableCell className="text-sm">{t.category}</TableCell>
                  <TableCell className="text-sm text-xs">{t.pricingType}</TableCell>
                  <TableCell className="text-sm">{fmt(t.packagePrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleAddCustom} className="sm:mr-auto">
            <Plus className="w-4 h-4 mr-1" /> Add Custom (Blank) Menu
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selected.length === 0 || addTemplate.isPending}>
            Add Selected ({selected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FunctionServices() {
  const params = useParams<{ id: string; functionId: string }>();
  const eventId = Number(params.id);
  const functionId = Number(params.functionId);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const { data: event } = useGetEvent(eventId, { query: { enabled: !!eventId } as any });
  const { data: fn, isLoading: fnLoading } = useGetFunction(functionId, {
    query: { enabled: !!functionId } as any,
  });
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
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <h1 className="font-bold text-lg">Function Services</h1>
            <div className="text-xs text-muted-foreground">
              {event?.eventName} → {fn?.functionType} · {fn?.functionDate}
              {fn?.functionNumber ? ` · ${fn.functionNumber}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/events/${eventId}/functions/${functionId}/financials`}>View Financials</Link>
            </Button>
            <Button size="sm" onClick={() => setAddMenuOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Menu
            </Button>
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
              <MenuBlock key={menu.id} menu={menu} functionId={functionId} eventId={eventId} />
            ))}
          </div>
        </div>
      </div>

      {addMenuOpen && (
        <AddMenuDialog functionId={functionId} onClose={() => setAddMenuOpen(false)} />
      )}
    </div>
  );
}
