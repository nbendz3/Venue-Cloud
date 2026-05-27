import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCatalogItems,
  useGetCatalogItemsMeta,
  useCreateCatalogItem,
  useUpdateCatalogItem,
  useDeleteCatalogItem,
  getListCatalogItemsQueryKey,
} from "@workspace/api-client-react";
import type { CatalogItem, CatalogItemInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  BookOpen,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "name" | "price" | "cost" | "unit" | "sortOrder";
type SortDir = "asc" | "desc";

interface FormState {
  name: string;
  description: string;
  price: string;
  cost: string;
  categoryId: string;
  masterTypeId: string;
  revenueCenterId: string;
  taxRateCenterId: string;
  unit: string;
  isActive: boolean;
  sortOrder: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  cost: "",
  categoryId: "_none_",
  masterTypeId: "_none_",
  revenueCenterId: "_none_",
  taxRateCenterId: "_none_",
  unit: "",
  isActive: true,
  sortOrder: "",
};

function formToInput(f: FormState): CatalogItemInput {
  return {
    name: f.name.trim(),
    description: f.description || undefined,
    price: f.price !== "" ? f.price : undefined,
    cost: f.cost !== "" ? f.cost : undefined,
    categoryId: f.categoryId !== "_none_" ? parseInt(f.categoryId) : undefined,
    masterTypeId: f.masterTypeId !== "_none_" ? parseInt(f.masterTypeId) : undefined,
    revenueCenterId: f.revenueCenterId !== "_none_" ? parseInt(f.revenueCenterId) : undefined,
    taxRateCenterId: f.taxRateCenterId !== "_none_" ? parseInt(f.taxRateCenterId) : undefined,
    unit: f.unit || undefined,
    isActive: f.isActive,
    sortOrder: f.sortOrder !== "" ? parseInt(f.sortOrder) : undefined,
  };
}

function itemToForm(item: CatalogItem): FormState {
  return {
    name: item.name,
    description: item.description ?? "",
    price: item.price != null ? String(item.price) : "",
    cost: item.cost != null ? String(item.cost) : "",
    categoryId: item.categoryId != null ? String(item.categoryId) : "_none_",
    masterTypeId: item.masterTypeId != null ? String(item.masterTypeId) : "_none_",
    revenueCenterId: item.revenueCenterId != null ? String(item.revenueCenterId) : "_none_",
    taxRateCenterId: item.taxRateCenterId != null ? String(item.taxRateCenterId) : "_none_",
    unit: item.unit ?? "",
    isActive: item.isActive ?? true,
    sortOrder: item.sortOrder != null ? String(item.sortOrder) : "",
  };
}

// ─── Item Form Modal ──────────────────────────────────────────────────────────

function ItemFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: CatalogItem | null;
  onSaved: () => void;
}) {
  const { data: meta } = useGetCatalogItemsMeta();
  const createMutation = useCreateCatalogItem();
  const updateMutation = useUpdateCatalogItem();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(editing ? itemToForm(editing) : EMPTY_FORM);
      setErrors({});
    }
  }, [open, editing]);

  function set(field: keyof FormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.price !== "" && isNaN(parseFloat(form.price))) e.price = "Must be a number";
    if (form.cost !== "" && isNaN(parseFloat(form.cost))) e.cost = "Must be a number";
    if (form.sortOrder !== "" && isNaN(parseInt(form.sortOrder))) e.sortOrder = "Must be a number";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    const input = formToInput(form);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, data: input });
      } else {
        await createMutation.mutateAsync({ data: input });
      }
      onSaved();
      onClose();
    } catch {
      /* error handled by mutation */
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Item" : "Add Catalog Item"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-2">
          {/* Name */}
          <div className="col-span-2 space-y-1">
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Item name"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="col-span-2 space-y-1">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Optional description"
            />
          </div>

          {/* Price */}
          <div className="space-y-1">
            <Label>Price ($)</Label>
            <Input
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="0.00"
            />
            {errors.price && <p className="text-xs text-red-500">{errors.price}</p>}
          </div>

          {/* Cost */}
          <div className="space-y-1">
            <Label>Cost ($)</Label>
            <Input
              value={form.cost}
              onChange={(e) => set("cost", e.target.value)}
              placeholder="0.00"
            />
            {errors.cost && <p className="text-xs text-red-500">{errors.cost}</p>}
          </div>

          {/* Unit */}
          <div className="space-y-1">
            <Label>Unit</Label>
            <Input
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="per person, per day, each…"
            />
          </div>

          {/* Sort Order */}
          <div className="space-y-1">
            <Label>Sort Order</Label>
            <Input
              value={form.sortOrder}
              onChange={(e) => set("sortOrder", e.target.value)}
              placeholder="10"
            />
            {errors.sortOrder && <p className="text-xs text-red-500">{errors.sortOrder}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">— None —</SelectItem>
                {meta?.categories?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Type */}
          <div className="space-y-1">
            <Label>Service Type</Label>
            <Select value={form.masterTypeId} onValueChange={(v) => set("masterTypeId", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">— None —</SelectItem>
                {meta?.masterTypes?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Revenue Center */}
          <div className="space-y-1">
            <Label>Revenue Center</Label>
            <Select value={form.revenueCenterId} onValueChange={(v) => set("revenueCenterId", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">— None —</SelectItem>
                {meta?.revenueCenters?.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tax Rate Center */}
          <div className="space-y-1">
            <Label>Tax Rate Center</Label>
            <Select value={form.taxRateCenterId} onValueChange={(v) => set("taxRateCenterId", v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">— None —</SelectItem>
                {meta?.revenueCenters?.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name}{r.sales_tax_rate != null ? ` (${r.sales_tax_rate}%)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active toggle */}
          <div className="col-span-2 flex items-center gap-3">
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
              id="isActive"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : editing ? "Save Changes" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ItemsLibrary() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("_all_");
  const [filterType, setFilterType] = useState("_all_");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("active");
  const [sortKey, setSortKey] = useState<SortKey>("sortOrder");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);

  const { data: items = [], isLoading } = useListCatalogItems();
  const { data: meta } = useGetCatalogItemsMeta();
  const deleteMutation = useDeleteCatalogItem();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListCatalogItemsQueryKey() });
  }

  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(item: CatalogItem) { setEditing(item); setModalOpen(true); }
  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync({ id: deleteTarget.id });
    invalidate();
    setDeleteTarget(null);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  // ── filtering + sorting ──
  const filtered = items
    .filter((item) => {
      if (filterActive === "active" && !item.isActive) return false;
      if (filterActive === "inactive" && item.isActive) return false;
      if (filterCategory !== "_all_" && String(item.categoryId) !== filterCategory) return false;
      if (filterType !== "_all_" && String(item.masterTypeId) !== filterType) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !item.name.toLowerCase().includes(s) &&
          !(item.description ?? "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let va: string | number = 0;
      let vb: string | number = 0;
      if (sortKey === "name") { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortKey === "price") { va = parseFloat(a.price ?? "0"); vb = parseFloat(b.price ?? "0"); }
      else if (sortKey === "cost") { va = parseFloat(a.cost ?? "0"); vb = parseFloat(b.cost ?? "0"); }
      else if (sortKey === "unit") { va = (a.unit ?? "").toLowerCase(); vb = (b.unit ?? "").toLowerCase(); }
      else if (sortKey === "sortOrder") { va = a.sortOrder ?? 999; vb = b.sortOrder ?? 999; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  // ── lookup maps for display ──
  const catMap = Object.fromEntries((meta?.categories ?? []).map((c) => [c.id, c.name]));
  const typeMap = Object.fromEntries((meta?.masterTypes ?? []).map((t) => [t.id, t.name]));
  const rcMap = Object.fromEntries((meta?.revenueCenters ?? []).map((r) => [r.id, r.name]));

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="ml-1 opacity-30 text-xs">↕</span>;
    return sortDir === "asc"
      ? <ChevronUp className="inline ml-1 h-3 w-3" />
      : <ChevronDown className="inline ml-1 h-3 w-3" />;
  }

  const activeCount = items.filter((i) => i.isActive).length;
  const inactiveCount = items.length - activeCount;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Items Library</h1>
            <p className="text-sm text-muted-foreground">Master catalog of service items for BEO Builder</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* ── Summary Chips ── */}
      <div className="flex items-center gap-3 px-6 py-3 border-b bg-gray-50 text-sm text-muted-foreground">
        <span>{items.length} total items</span>
        <span className="text-gray-300">|</span>
        <span className="text-green-700">{activeCount} active</span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-500">{inactiveCount} inactive</span>
      </div>

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b bg-white">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-8 text-sm"
            placeholder="Search name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-8 text-sm w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">All Categories</SelectItem>
            {meta?.categories?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 text-sm w-48">
            <SelectValue placeholder="All Service Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all_">All Service Types</SelectItem>
            {meta?.masterTypes?.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Active filter */}
        <Select
          value={filterActive}
          onValueChange={(v) => setFilterActive(v as "all" | "active" | "inactive")}
        >
          <SelectTrigger className="h-8 text-sm w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>

        {/* Result count */}
        {(search || filterCategory !== "_all_" || filterType !== "_all_" || filterActive !== "active") && (
          <span className="text-xs text-muted-foreground ml-auto">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead
                className="cursor-pointer select-none w-8 text-center text-muted-foreground text-xs"
                onClick={() => handleSort("sortOrder")}
              >
                #<SortIcon k="sortOrder" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("name")}
              >
                Item Name <SortIcon k="name" />
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Revenue Center</TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort("price")}
              >
                Price <SortIcon k="price" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => handleSort("cost")}
              >
                Cost <SortIcon k="cost" />
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("unit")}
              >
                Unit <SortIcon k="unit" />
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  {search || filterCategory !== "_all_" || filterType !== "_all_"
                    ? "No items match your filters."
                    : "No catalog items yet. Click \"Add Item\" to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="group hover:bg-blue-50/40">
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {item.sortOrder ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{item.name}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.categoryId != null ? catMap[item.categoryId] ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.masterTypeId != null ? typeMap[item.masterTypeId] ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.revenueCenterId != null ? rcMap[item.revenueCenterId] ?? "—" : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.price != null
                      ? `$${parseFloat(item.price).toFixed(2)}`
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {item.cost != null
                      ? `$${parseFloat(item.cost).toFixed(2)}`
                      : <span>—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.unit ?? "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={item.isActive ? "default" : "secondary"}
                      className={
                        item.isActive
                          ? "bg-green-100 text-green-800 border-green-200 font-normal text-xs"
                          : "bg-gray-100 text-gray-500 border-gray-200 font-normal text-xs"
                      }
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-600"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Modals ── */}
      <ItemFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={invalidate}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This item will be permanently removed from the catalog. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
