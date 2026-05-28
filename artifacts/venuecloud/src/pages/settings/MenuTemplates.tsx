import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMenuTemplates,
  useGetMenuTemplate,
  useCreateMenuTemplate,
  useUpdateMenuTemplate,
  useDeleteMenuTemplate,
  useAddMenuTemplateItem,
  useUpdateMenuTemplateItem,
  useDeleteMenuTemplateItem,
  useListCatalogItems,
  getGetMenuTemplatesQueryKey,
  getGetMenuTemplateQueryKey,
} from "@workspace/api-client-react";
import type {
  MenuTemplate,
  MenuTemplateItem,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  LayoutList,
  ChevronRight,
  X,
  GripVertical,
  Package,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MENU_CATEGORIES = [
  "Wedding Menus",
  "Banquet Menus",
  "Beverage Menus",
  "Setup and Service Menus",
  "Amenities",
];

const PRICING_TYPES = [
  "A La Carte Pricing",
  "Package Pricing - Percentage Amount Allocation",
  "Package Pricing - Monetary Amount Allocation",
];

// ─── Template Header Form ─────────────────────────────────────────────────────

interface HeaderForm {
  name: string;
  menuNumber: string;
  category: string;
  pricingType: string;
  packagePrice: string;
  packageCost: string;
  description: string;
  isActive: boolean;
}

const EMPTY_HEADER: HeaderForm = {
  name: "",
  menuNumber: "",
  category: "_none_",
  pricingType: "_none_",
  packagePrice: "",
  packageCost: "",
  description: "",
  isActive: true,
};

function templateToForm(t: MenuTemplate): HeaderForm {
  return {
    name: t.name,
    menuNumber: t.menuNumber ?? "",
    category: t.category ?? "_none_",
    pricingType: t.pricingType ?? "_none_",
    packagePrice: t.packagePrice != null ? String(t.packagePrice) : "",
    packageCost: t.packageCost != null ? String(t.packageCost) : "",
    description: t.description ?? "",
    isActive: t.isActive ?? true,
  };
}

// ─── Item Picker Modal ────────────────────────────────────────────────────────

function ItemPickerModal({
  open,
  onClose,
  onAdd,
  excludeIds,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (catalogItemId: number, qty: string, notes: string, sectionName: string) => Promise<void>;
  excludeIds: number[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: items = [] } = useListCatalogItems({ isActive: true });

  const filtered = items.filter((item) => {
    if (excludeIds.includes(item.id)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return item.name.toLowerCase().includes(s) || (item.description ?? "").toLowerCase().includes(s);
  });

  useEffect(() => {
    if (open) { setSearch(""); setSelected(null); setQty("1"); setNotes(""); setSectionName(""); }
  }, [open]);

  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    try { await onAdd(selected, qty, notes, sectionName); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Item from Library</DialogTitle>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-8 text-sm"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setSearch("")}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">No items found</TableCell></TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer ${selected === item.id ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/40"}`}
                    onClick={() => setSelected(item.id)}
                  >
                    <TableCell>
                      <div className="font-medium text-sm">{item.name}</div>
                      {item.description && <div className="text-xs text-muted-foreground truncate max-w-xs">{item.description}</div>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {item.price != null ? `$${parseFloat(item.price).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.unit ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {selected && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-sm">Quantity</Label>
              <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Section / Course <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="e.g. First Course, Setup…" />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-sm">Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special notes for this item" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!selected || saving}>
            {saving ? "Adding…" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Builder (Edit Panel) ───────────────────────────────────────────

function TemplateBuilder({
  templateId,
  onClose,
  onDeleted,
}: {
  templateId: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: detail } = useGetMenuTemplate(templateId);
  const updateMutation = useUpdateMenuTemplate();
  const deleteMutation = useDeleteMenuTemplate();
  const addItemMutation = useAddMenuTemplateItem();
  const updateItemMutation = useUpdateMenuTemplateItem();
  const deleteItemMutation = useDeleteMenuTemplateItem();

  const [form, setForm] = useState<HeaderForm>(EMPTY_HEADER);
  const [dirty, setDirty] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuTemplateItem | null>(null);

  useEffect(() => {
    if (detail) { setForm(templateToForm(detail)); setDirty(false); }
  }, [detail]);

  function setField(field: keyof HeaderForm, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      menuNumber: form.menuNumber || undefined,
      category: form.category !== "_none_" ? form.category : undefined,
      pricingType: form.pricingType !== "_none_" ? form.pricingType : undefined,
      packagePrice: form.packagePrice || undefined,
      packageCost: form.packageCost || undefined,
      description: form.description || undefined,
      isActive: form.isActive,
    };
    await updateMutation.mutateAsync({ id: templateId, data: payload });
    queryClient.invalidateQueries({ queryKey: getGetMenuTemplatesQueryKey() });
    setDirty(false);
  }

  async function handleAddItem(catalogItemId: number, qty: string, notes: string, sectionName: string) {
    await addItemMutation.mutateAsync({
      id: templateId,
      data: { catalogItemId, quantity: qty || "1", notes: notes || undefined, sectionName: sectionName || undefined },
    });
    queryClient.invalidateQueries({ queryKey: getGetMenuTemplateQueryKey(templateId) });
  }

  async function handleRemoveItem(itemId: number) {
    await deleteItemMutation.mutateAsync({ id: templateId, itemId });
    queryClient.invalidateQueries({ queryKey: getGetMenuTemplateQueryKey(templateId) });
  }

  async function handleDeleteTemplate() {
    await deleteMutation.mutateAsync({ id: templateId });
    queryClient.invalidateQueries({ queryKey: getGetMenuTemplatesQueryKey() });
    onDeleted();
  }

  const items = (detail as any)?.items ?? [];
  const existingCatalogIds = items.map((i: MenuTemplateItem) => i.catalogItemId);

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <span className="font-semibold text-sm text-gray-900 truncate max-w-56">{detail?.name ?? "Loading…"}</span>
          {detail && (
            <Badge variant={detail.isActive ? "default" : "secondary"}
              className={detail.isActive
                ? "bg-green-100 text-green-800 border-green-200 font-normal text-xs"
                : "bg-gray-100 text-gray-500 border-gray-200 font-normal text-xs"}>
              {detail.isActive ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          )}
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-muted-foreground hover:text-red-600 p-1"
            title="Delete template"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Header fields */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Template Details</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Name <span className="text-red-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Menu Number</Label>
              <Input value={form.menuNumber} onChange={(e) => setField("menuNumber", e.target.value)} placeholder="e.g. M-101" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setField("category", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— None —</SelectItem>
                  {MENU_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pricing Type</Label>
              <Select value={form.pricingType} onValueChange={(v) => setField("pricingType", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— None —</SelectItem>
                  {PRICING_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Package Price ($)</Label>
              <Input value={form.packagePrice} onChange={(e) => setField("packagePrice", e.target.value)} placeholder="0.00" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} className="text-sm" />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={(v) => setField("isActive", v)} id={`active-${templateId}`} />
              <Label htmlFor={`active-${templateId}`} className="text-sm">Active</Label>
            </div>
          </div>
        </div>

        {/* Items section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Items ({items.length})
            </h3>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setPickerOpen(true)}>
              <Plus className="h-3 w-3" /> Add Item
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="border border-dashed rounded-lg py-8 text-center text-muted-foreground text-sm">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No items yet. Click "Add Item" to pick from the Items Library.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-5"></TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const rows: React.ReactNode[] = [];
                    let lastSection: string | null = null;
                    items.forEach((item: any) => {
                      const sec: string | null = item.sectionName ?? null;
                      if (sec !== null && sec !== lastSection) {
                        rows.push(
                          <TableRow key={`sec-${sec}`} className="bg-teal-50 border-y border-teal-100 hover:bg-teal-50">
                            <TableCell colSpan={6} className="py-1.5 px-4">
                              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">{sec}</span>
                            </TableCell>
                          </TableRow>
                        );
                      }
                      lastSection = sec;
                      rows.push(
                        <TableRow key={item.id} className="group">
                          <TableCell className="text-muted-foreground/30">
                            <GripVertical className="h-3.5 w-3.5" />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{item.catalogItemName ?? "—"}</div>
                            {item.notes && <div className="text-xs text-muted-foreground">{item.notes}</div>}
                          </TableCell>
                          <TableCell className="text-right text-sm font-mono">
                            {item.quantity != null ? parseFloat(item.quantity) : 1}
                          </TableCell>
                          <TableCell className="text-right text-sm font-mono">
                            {item.priceOverride != null
                              ? <span className="text-amber-700">${parseFloat(item.priceOverride).toFixed(2)}</span>
                              : item.catalogItemPrice != null
                                ? `$${parseFloat(item.catalogItemPrice).toFixed(2)}`
                                : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.catalogItemUnit ?? "—"}
                          </TableCell>
                          <TableCell>
                            <button
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    });
                    return rows;
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <ItemPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={handleAddItem}
        excludeIds={existingCatalogIds}
      />

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{detail?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the template and all its items.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteTemplate}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── New Template Modal ───────────────────────────────────────────────────────

function NewTemplateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const createMutation = useCreateMenuTemplate();
  const [form, setForm] = useState(EMPTY_HEADER);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setForm(EMPTY_HEADER); setError(""); } }, [open]);

  function set(field: keyof HeaderForm, v: string | boolean) {
    setForm((f) => ({ ...f, [field]: v }));
  }

  async function handleCreate() {
    if (!form.name.trim()) { setError("Name is required"); return; }
    const payload = {
      name: form.name.trim(),
      menuNumber: form.menuNumber || undefined,
      category: form.category !== "_none_" ? form.category : undefined,
      pricingType: form.pricingType !== "_none_" ? form.pricingType : undefined,
      packagePrice: form.packagePrice || undefined,
      description: form.description || undefined,
      isActive: form.isActive,
    };
    const result = await createMutation.mutateAsync({ data: payload });
    onCreated(result.id);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Menu Template</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1">
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={(e) => { set("name", e.target.value); setError(""); }} placeholder="Template name" />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
          <div className="space-y-1">
            <Label>Menu Number</Label>
            <Input value={form.menuNumber} onChange={(e) => set("menuNumber", e.target.value)} placeholder="M-101" />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">— None —</SelectItem>
                {MENU_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Pricing Type</Label>
            <Select value={form.pricingType} onValueChange={(v) => set("pricingType", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">— None —</SelectItem>
                {PRICING_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Package Price ($)</Label>
            <Input value={form.packagePrice} onChange={(e) => set("packagePrice", e.target.value)} placeholder="0.00" />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} id="new-active" />
            <Label htmlFor="new-active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create & Edit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MenuTemplates() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("_all_");
  const [filterActive, setFilterActive] = useState<"active" | "inactive" | "all">("active");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: templates = [], isLoading } = useGetMenuTemplates({
    isActive: filterActive === "active" ? true : filterActive === "inactive" ? false : undefined,
  });

  const filtered = templates.filter((t: MenuTemplate) => {
    if (filterCategory !== "_all_" && t.category !== filterCategory) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!t.name.toLowerCase().includes(s) && !(t.description ?? "").toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const activeCount = templates.filter((t: MenuTemplate) => t.isActive).length;

  return (
    <div className="flex h-full">
      {/* ── Left: Template List ── */}
      <div className={`flex flex-col border-r bg-white ${selectedId ? "w-96 flex-shrink-0" : "flex-1"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <LayoutList className="h-5 w-5 text-gray-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Menu Templates</h1>
              <p className="text-xs text-muted-foreground">{activeCount} active templates</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setNewModalOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Template
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-2.5 border-b bg-gray-50">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-7 text-xs"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Categories</SelectItem>
              {MENU_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={(v) => setFilterActive(v as any)}>
            <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {search || filterCategory !== "_all_" ? "No templates match your filters." : "No templates yet. Click \"New Template\" to create one."}
            </div>
          ) : (
            filtered.map((t: MenuTemplate) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                className={`w-full text-left px-4 py-3 border-b flex items-center justify-between group transition-colors
                  ${selectedId === t.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm truncate">{t.name}</span>
                    {t.menuNumber && (
                      <span className="text-xs text-muted-foreground shrink-0">#{t.menuNumber}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {t.category && <span>{t.category}</span>}
                    {t.category && t.pricingType && <span className="text-gray-300">·</span>}
                    {t.pricingType && <span className="truncate">{t.pricingType}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {t.packagePrice != null && (
                      <span className="text-xs font-mono text-gray-700">${parseFloat(t.packagePrice).toFixed(2)}/pp</span>
                    )}
                    <span className="text-xs text-muted-foreground">{(t as any).itemCount ?? 0} items</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {!t.isActive && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-xs font-normal">Inactive</Badge>
                  )}
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${selectedId === t.id ? "rotate-90 text-primary" : "group-hover:translate-x-0.5"}`} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Builder Panel ── */}
      {selectedId && (
        <div className="flex-1 flex flex-col bg-white">
          <TemplateBuilder
            key={selectedId}
            templateId={selectedId}
            onClose={() => setSelectedId(null)}
            onDeleted={() => setSelectedId(null)}
          />
        </div>
      )}

      <NewTemplateModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onCreated={(id) => { setNewModalOpen(false); setSelectedId(id); }}
      />
    </div>
  );
}
