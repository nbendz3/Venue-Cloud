import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetEvent, useGetFunction, useGetFunctionMenus } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, Save, ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

const PRICING_TYPES = [
  "A La Carte Pricing",
  "Package Pricing - Monetary Amount Allocation",
  "Package Pricing - Percentage Amount Allocation",
];
const PACKAGE_PRICING_OPTIONS = [
  "Per Person","Per Event","Per Table","Per Room","Per Night","Per Hour",
];
const QTY_PRECISION = ["Whole","Half","Quarter","Tenth"];
const HOURS_PRECISION = ["Whole","Half","Quarter"];

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

function fmt(val: string | number | null | undefined) {
  if (!val) return "—";
  const n = parseFloat(String(val));
  return isNaN(n) ? String(val) : `$${n.toFixed(2)}`;
}

function ServiceItemEditRow({ item, showDetails }: { item: any; showDetails: boolean }) {
  const [expanded, setExpanded] = useState(showDetails);
  const [f, setF] = useState({ ...item });
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  useEffect(() => { setExpanded(showDetails); }, [showDetails]);

  return (
    <div className="border rounded-lg p-3 mb-2 bg-white">
      <div className="grid grid-cols-12 gap-2 items-start text-xs">
        <div className="flex items-center gap-1">
          <Checkbox checked={expanded} onCheckedChange={(v) => setExpanded(!!v)} />
          <span className="text-muted-foreground">Details</span>
        </div>
        <div className="col-span-3">
          <Label className="text-xs text-muted-foreground">Item Name</Label>
          <Textarea className="h-8 text-xs resize-none" value={f.itemName ?? ""} onChange={e => set("itemName", e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea className="h-8 text-xs resize-none" value={f.description ?? ""} onChange={e => set("description", e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea className="h-8 text-xs resize-none" value={f.notes ?? ""} onChange={e => set("notes", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Internal</Label>
          <Checkbox checked={!!f.notesInternal} onCheckedChange={v => set("notesInternal", !!v)} className="mt-1.5" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Qty</Label>
          <Input className="h-7 text-xs" type="number" value={f.quantity ?? ""} onChange={e => set("quantity", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">A La Carte $</Label>
          <Input className="h-7 text-xs" type="number" step="0.01" value={f.aLaCartePrice ?? ""} onChange={e => set("aLaCartePrice", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Add-On $</Label>
          <Input className="h-7 text-xs" type="number" step="0.01" value={f.addOnPrice ?? ""} onChange={e => set("addOnPrice", e.target.value)} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <F label="Cost">
              <Input className="h-7 text-xs" type="number" step="0.01" value={f.cost ?? ""} onChange={e => set("cost", e.target.value)} />
            </F>
            <div className="flex items-center gap-2">
              <Checkbox id={`useIngCost-${item.id}`} checked={!!f.useIngredientsCost} onCheckedChange={v => set("useIngredientsCost", !!v)} />
              <Label className="text-xs cursor-pointer">Use Ingredients Cost</Label>
            </div>
            <F label="Quantity Precision">
              <Select value={f.quantityPrecision ?? "Whole"} onValueChange={v => set("quantityPrecision", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{QTY_PRECISION.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Category II">
              <Input className="h-7 text-xs" value={f.categoryII ?? ""} onChange={e => set("categoryII", e.target.value)} />
            </F>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Checkbox checked={!!f.markItemInternal} onCheckedChange={v => set("markItemInternal", !!v)} />
                <Label className="text-xs">Mark Item Internal</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!f.markQuantityInternal} onCheckedChange={v => set("markQuantityInternal", !!v)} />
                <Label className="text-xs">Mark Quantity Internal</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={!!f.useFunctionTimeRange} onCheckedChange={v => set("useFunctionTimeRange", !!v)} />
                <Label className="text-xs">Use Function Time Range</Label>
              </div>
            </div>
            {!f.useFunctionTimeRange && (
              <div className="grid grid-cols-2 gap-2">
                <F label="Start Time"><Input className="h-7 text-xs" type="time" value={f.startTime ?? ""} onChange={e => set("startTime", e.target.value)} /></F>
                <F label="End Time"><Input className="h-7 text-xs" type="time" value={f.endTime ?? ""} onChange={e => set("endTime", e.target.value)} /></F>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox checked={!!f.chargeHourly} onCheckedChange={v => set("chargeHourly", !!v)} />
              <Label className="text-xs">Charge Hourly</Label>
            </div>
            <F label="# Hours">
              <Input className="h-7 text-xs" type="number" step="0.5" value={f.numHours ?? ""} onChange={e => set("numHours", e.target.value)} disabled={!f.chargeHourly} />
            </F>
            <F label="Hours Precision">
              <Select value={f.hoursPrecision ?? "Whole"} onValueChange={v => set("hoursPrecision", v)} disabled={!f.chargeHourly}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{HOURS_PRECISION.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <div className="flex items-center gap-2">
              <Checkbox checked={!!f.useFunctionSetupTeardown} onCheckedChange={v => set("useFunctionSetupTeardown", !!v)} disabled={!f.chargeHourly} />
              <Label className="text-xs">Use Function Setup and Teardown Times</Label>
            </div>
            {f.chargeHourly && (
              <>
                <F label="Setup Minutes"><Input className="h-7 text-xs" type="number" value={f.setupMinutes ?? ""} onChange={e => set("setupMinutes", e.target.value)} /></F>
                <F label="Teardown Minutes"><Input className="h-7 text-xs" type="number" value={f.teardownMinutes ?? ""} onChange={e => set("teardownMinutes", e.target.value)} /></F>
                <div className="flex items-center gap-2">
                  <Checkbox checked={!!f.applyOvertimeCharges} onCheckedChange={v => set("applyOvertimeCharges", !!v)} />
                  <Label className="text-xs">Apply Overtime Hours Charges</Label>
                </div>
                <F label="Overtime Hours Price"><Input className="h-7 text-xs" type="number" step="0.01" value={f.overtimePrice ?? ""} onChange={e => set("overtimePrice", e.target.value)} /></F>
                <F label="Overtime Hours"><Input className="h-7 text-xs" type="number" step="0.5" value={f.overtimeHours ?? ""} onChange={e => set("overtimeHours", e.target.value)} /></F>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceTypeBlock({ serviceType, showAllDetails }: { serviceType: any; showAllDetails: boolean }) {
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [stForm, setStForm] = useState({
    serviceTypeName: serviceType.serviceTypeName ?? "",
    useFunctionTimeRange: true,
    startTime: "", endTime: "",
    serviceLocation: "",
    description: "",
    serviceNotes: "",
    markNotesInternal: false,
  });
  const set = (k: string, v: any) => setStForm(p => ({ ...p, [k]: v }));

  return (
    <div className="border-l-4 border-l-blue-400 bg-blue-50/30 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-blue-800">{serviceType.serviceTypeName}</span>
        <button onClick={() => setFieldsOpen(o => !o)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
          {fieldsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          Service Type Fields
        </button>
      </div>

      {fieldsOpen && (
        <div className="mb-3 p-3 bg-white border rounded-lg grid grid-cols-2 gap-3 text-xs">
          <F label="Service Type"><Input className="h-7 text-xs" value={stForm.serviceTypeName} onChange={e => set("serviceTypeName", e.target.value)} /></F>
          <F label="Service Location"><Input className="h-7 text-xs" value={stForm.serviceLocation} onChange={e => set("serviceLocation", e.target.value)} /></F>
          <div className="col-span-2 flex items-center gap-2">
            <Checkbox checked={stForm.useFunctionTimeRange} onCheckedChange={v => set("useFunctionTimeRange", !!v)} />
            <Label className="text-xs">Use Function Time Range</Label>
          </div>
          {!stForm.useFunctionTimeRange && (
            <>
              <F label="Start Time"><Input className="h-7 text-xs" type="time" value={stForm.startTime} onChange={e => set("startTime", e.target.value)} /></F>
              <F label="End Time"><Input className="h-7 text-xs" type="time" value={stForm.endTime} onChange={e => set("endTime", e.target.value)} /></F>
            </>
          )}
          <F label="Description"><Textarea className="h-16 text-xs resize-none" value={stForm.description} onChange={e => set("description", e.target.value)} /></F>
          <F label="Service Notes"><Textarea className="h-16 text-xs resize-none" value={stForm.serviceNotes} onChange={e => set("serviceNotes", e.target.value)} /></F>
          <div className="flex items-center gap-2">
            <Checkbox checked={stForm.markNotesInternal} onCheckedChange={v => set("markNotesInternal", !!v)} />
            <Label className="text-xs">Mark Notes Internal</Label>
          </div>
        </div>
      )}

      {(serviceType.items ?? []).map((item: any) => (
        <ServiceItemEditRow key={item.id} item={item} showDetails={showAllDetails} />
      ))}

      {serviceType.items?.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4 border-dashed border rounded">
          No items in this service type.
        </div>
      )}
    </div>
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
  const { data: menus, isLoading } = useGetFunctionMenus(functionId, { query: { enabled: !!functionId } as any });

  const menu = menus?.find((m: any) => m.id === menuId);

  const [showAllDetails, setShowAllDetails] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [f, setF] = useState<Record<string, any>>({
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
    useItemCosts: false,
    useInclusivePricing: false,
  });
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (menu) {
      setF((prev) => ({
        ...prev,
        functionMenuName: menu.functionMenuName ?? "",
        pricingType: menu.pricingType ?? "A La Carte Pricing",
        numberRequired: menu.numberRequired ?? 1,
        perNumberOfGuests: menu.perNumberOfGuests ?? 1,
        packagePrice: (menu as any).packagePrice ?? "",
        packageCost: (menu as any).packageCost ?? "",
      }));
    }
  }, [menu]);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/menus/${menuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          functionMenuName: f.functionMenuName,
          pricingType: f.pricingType,
          numberRequired: Number(f.numberRequired),
          perNumberOfGuests: Number(f.perNumberOfGuests),
          packagePrice: f.packagePrice ? parseFloat(f.packagePrice) : undefined,
          packageCost: f.packageCost ? parseFloat(f.packageCost) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save menu");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/functions/{id}/menus"] });
      toast.success("Menu saved");
      navigate(`/events/${eventId}/functions/${functionId}/services`);
    },
    onError: () => toast.error("Failed to save"),
  });

  const fnAttendance = parseFloat((fn as any)?.estimatedAttendance ?? "1") || 1;
  const menuQty = f.autoCalculateQuantity
    ? Math.round((Number(f.numberRequired) / Math.max(1, Number(f.perNumberOfGuests))) * fnAttendance)
    : Number(f.numberRequired);
  const isPackage = f.pricingType !== "A La Carte Pricing";

  if (isLoading) return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-4" /><Skeleton className="h-96 w-full" /></div>;

  const fnLabel = `${fn?.functionType ?? "Function"}: ${event?.eventName ?? ""} - ${(fn as any)?.functionDate ?? ""} - ${(fn as any)?.functionNumber ?? `#${functionId}`} - ${(fn as any)?.location ?? ""}`;

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
        <Link href={`/events/${eventId}`} className="hover:underline">{event?.eventName ?? "Event"}</Link>
        <span>›</span>
        <Link href={`/events/${eventId}/functions/${functionId}`} className="hover:underline">
          {fn?.functionType ?? "Function"}
        </Link>
        <span>›</span>
        <span>Edit Menu</span>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Link href={`/events/${eventId}/functions/${functionId}/services`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Function Menu — {f.functionMenuName || menu?.functionMenuName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{fnLabel}</p>
        </div>
      </div>

      {/* Save Actions */}
      <div className="flex items-center gap-2 mb-6 p-3 bg-muted/50 rounded-lg border">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="w-4 h-4 mr-1.5" /> Save
        </Button>
        <Button variant="ghost" asChild>
          <Link href={`/events/${eventId}/functions/${functionId}/services`}>Cancel</Link>
        </Button>
      </div>

      {/* Menu Header Section */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-5">
          <h2 className="text-base font-semibold border-b pb-2">{f.functionMenuName || "Custom Menu"}</h2>

          <div className="grid grid-cols-2 gap-4">
            <F label="Function Menu Name" required>
              <Input value={f.functionMenuName} onChange={e => set("functionMenuName", e.target.value)} />
            </F>
            <F label="Pricing Type">
              <Select value={f.pricingType} onValueChange={v => set("pricingType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRICING_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </div>

          <div className="grid grid-cols-4 gap-3 items-end">
            <div className="flex items-center gap-2 col-span-4 md:col-span-1">
              <Checkbox checked={f.autoCalculateQuantity} onCheckedChange={v => set("autoCalculateQuantity", !!v)} />
              <Label className="text-sm">Auto Calculate Quantity</Label>
            </div>
            <F label="Number Required">
              <Input type="number" value={f.numberRequired} onChange={e => set("numberRequired", e.target.value)} />
            </F>
            <F label="Per Number of Guests">
              <Input type="number" value={f.perNumberOfGuests} onChange={e => set("perNumberOfGuests", e.target.value)} />
            </F>
            <F label="Menu Quantity (calculated)">
              <Input value={menuQty} readOnly className="bg-muted" />
            </F>
          </div>

          {/* More Menu Fields */}
          <Collapsible open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm text-primary hover:underline">
              {moreMenuOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              More Menu Fields
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 grid grid-cols-2 gap-4">
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox checked={f.useFunctionTimeRange} onCheckedChange={v => set("useFunctionTimeRange", !!v)} />
                <Label className="text-sm">Use Function Time Range</Label>
              </div>
              {!f.useFunctionTimeRange && (
                <>
                  <F label="Start Time"><Input type="time" value={f.startTime} onChange={e => set("startTime", e.target.value)} /></F>
                  <F label="End Time"><Input type="time" value={f.endTime} onChange={e => set("endTime", e.target.value)} /></F>
                </>
              )}
              <F label="Menu Location">
                <Input value={f.menuLocation} onChange={e => set("menuLocation", e.target.value)} />
              </F>
              <div />
              <F label="Description">
                <Textarea className="h-20" value={f.description} onChange={e => set("description", e.target.value)} />
              </F>
              <F label="Menu Notes">
                <Textarea className="h-20" value={f.menuNotes} onChange={e => set("menuNotes", e.target.value)} />
              </F>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox checked={f.markNotesInternal} onCheckedChange={v => set("markNotesInternal", !!v)} />
                <Label className="text-sm">Mark Notes Internal</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Package Pricing Details */}
          {isPackage && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-4">
              <h3 className="text-sm font-semibold text-blue-800">Package Pricing Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <F label="Package Pricing">
                  <Select value={f.packagePricing} onValueChange={v => set("packagePricing", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PACKAGE_PRICING_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </F>
                <F label="Package Price">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input className="pl-7" type="number" step="0.01" value={f.packagePrice} onChange={e => set("packagePrice", e.target.value)} />
                  </div>
                </F>
                <F label="Package Cost">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input className="pl-7" type="number" step="0.01" value={f.packageCost} onChange={e => set("packageCost", e.target.value)} />
                  </div>
                </F>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox checked={f.useItemCosts} onCheckedChange={v => set("useItemCosts", !!v)} />
                  <Label className="text-sm">Use Item Costs</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={f.useInclusivePricing} onCheckedChange={v => set("useInclusivePricing", !!v)} />
                  <Label className="text-sm">Use Inclusive Pricing</Label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Edit Controls */}
      <div className="flex items-center gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={() => setShowAllDetails(true)}>
          <Eye className="w-3.5 h-3.5 mr-1" /> Show All Item Details
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowAllDetails(false)}>
          <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide All Item Details
        </Button>
      </div>

      {/* Service Type Blocks */}
      {menu?.serviceTypes?.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No service types in this menu. Go back to the BEO builder to add service types.
          </CardContent>
        </Card>
      )}
      {(menu?.serviceTypes ?? []).map((st: any) => (
        <ServiceTypeBlock key={st.id} serviceType={st} showAllDetails={showAllDetails} />
      ))}

      {/* New Service Type Placeholder */}
      <div className="border border-dashed rounded-lg p-3 mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ChevronRight className="w-4 h-4" />
          <span>New Service Type</span>
          <span className="text-xs ml-auto">(Add service types from the BEO builder)</span>
        </div>
      </div>

      {/* Bottom Save */}
      <div className="flex items-center gap-2 mt-6">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="w-4 h-4 mr-1.5" /> Save
        </Button>
        <Button variant="ghost" asChild>
          <Link href={`/events/${eventId}/functions/${functionId}/services`}>Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
