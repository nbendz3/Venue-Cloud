import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const BASE = "/api";

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (r.status === 204) return null;
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error ?? `Request failed (${r.status})`);
  return body;
}

interface RevenueCentre {
  id: number;
  name: string;
  salesTaxRate: string | null;
  occupancyTaxRate: string | null;
  isDefault: boolean | null;
  isActive: boolean | null;
}

/**
 * Editor for per-revenue-centre tax.
 *
 * These rates drive every quoted total, and until now there was no screen that
 * could set them — the button that opened this dialog had no handler, so every
 * centre sat at 0% and BEOs printed with no tax at all.
 */
export function TaxRatesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rows, setRows] = useState<RevenueCentre[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulk, setBulk] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    json(`${BASE}/revenue-centers`)
      .then((d) => setRows(d ?? []))
      .catch((e) => toast({ title: "Could not load revenue centres", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open]);

  const setField = (id: number, field: keyof RevenueCentre, value: unknown) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));

  const setDefault = (id: number) =>
    setRows((prev) => prev.map((r) => ({ ...r, isDefault: r.id === id })));

  const applyToAll = () => {
    const n = Number(bulk);
    if (!Number.isFinite(n)) return;
    setRows((prev) => prev.map((r) => ({ ...r, salesTaxRate: n.toFixed(4) })));
  };

  const defaultCentre = rows.find((r) => r.isDefault);
  const defaultUntaxed = defaultCentre && Number(defaultCentre.salesTaxRate ?? 0) === 0;

  async function save() {
    setSaving(true);
    try {
      // Apply the default flag first so the server's "only one default" rule
      // cannot clear a flag we set later in the loop.
      const target = rows.find((r) => r.isDefault);
      if (target) await json(`${BASE}/revenue-centers/${target.id}`, { method: "PUT", body: JSON.stringify({ ...target, isDefault: true }) });
      for (const r of rows) {
        await json(`${BASE}/revenue-centers/${r.id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...r,
            salesTaxRate: Number(r.salesTaxRate ?? 0).toFixed(4),
            occupancyTaxRate: Number(r.occupancyTaxRate ?? 0).toFixed(4),
            isDefault: r.id === target?.id,
          }),
        });
      }
      await qc.invalidateQueries();
      toast({ title: "Tax rates saved" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tax Rates</DialogTitle>
          <DialogDescription>
            Rates are percentages, so enter 7.75 for 7.75%. They apply to every quote and BEO.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2 pb-2 border-b">
          <div className="flex-1">
            <Label className="text-xs">Set every centre to the same rate</Label>
            <Input value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="e.g. 7.75" />
          </div>
          <Button variant="outline" onClick={applyToAll} disabled={!bulk}>Apply to all</Button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : (
          <div className="max-h-[22rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="text-xs text-muted-foreground text-left">
                  <th className="py-1">Revenue Centre</th>
                  <th className="py-1 w-28">Sales Tax %</th>
                  <th className="py-1 w-28">Occupancy %</th>
                  <th className="py-1 w-20 text-center">Default</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1.5 pr-2">{r.name}</td>
                    <td className="py-1.5 pr-2">
                      <Input
                        className="h-8"
                        value={r.salesTaxRate ?? ""}
                        onChange={(e) => setField(r.id, "salesTaxRate", e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Input
                        className="h-8"
                        value={r.occupancyTaxRate ?? ""}
                        onChange={(e) => setField(r.id, "occupancyTaxRate", e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="radio"
                        name="default-rc"
                        checked={r.isDefault === true}
                        onChange={() => setDefault(r.id)}
                        title="Items with no revenue centre of their own fall back to this one"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!defaultCentre && !loading && (
          <p className="text-xs text-amber-700 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            No default centre is selected. Items without their own revenue centre will not be taxed.
          </p>
        )}
        {defaultUntaxed && (
          <p className="text-xs text-amber-700 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            The default centre ("{defaultCentre?.name}") has a 0% rate, so anything falling back to it is untaxed.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save rates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ServiceFee {
  id?: number;
  name: string;
  ratePercent: string;
  isTaxable: boolean;
  _new?: boolean;
  _deleted?: boolean;
}

/**
 * Editor for service charges and gratuity.
 *
 * Two fees of the same kind are ambiguous rather than additive — a property
 * with both "Gratuity 22%" and "Gratuity 20%" means one applies — so the
 * pricing engine charges neither until it can tell them apart. This dialog
 * warns before you can create that situation.
 */
export function ServiceFeesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rows, setRows] = useState<ServiceFee[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    json(`${BASE}/service-fees`)
      .then((d) => setRows((d ?? []).map((f: any) => ({ ...f, isTaxable: f.isTaxable === true }))))
      .catch((e) => toast({ title: "Could not load service fees", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [open]);

  const visible = rows.filter((r) => !r._deleted);
  const gratuityCount = visible.filter((r) => /gratuit|tip/i.test(r.name)).length;

  const setField = (i: number, field: keyof ServiceFee, value: unknown) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  async function save() {
    setSaving(true);
    try {
      for (const r of rows) {
        if (r._deleted && r.id) {
          await json(`${BASE}/service-fees/${r.id}`, { method: "DELETE" });
        } else if (r._new && !r._deleted) {
          await json(`${BASE}/service-fees`, { method: "POST", body: JSON.stringify(r) });
        } else if (r.id && !r._deleted) {
          await json(`${BASE}/service-fees/${r.id}`, { method: "PUT", body: JSON.stringify(r) });
        }
      }
      await qc.invalidateQueries();
      toast({ title: "Service fees saved" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Service Charges and Gratuity</DialogTitle>
          <DialogDescription>
            Rates are percentages, so enter 22 for 22%. Mark a fee taxable if sales tax applies on top of it.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : (
          <div className="space-y-2 max-h-[20rem] overflow-y-auto">
            {visible.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No service charge configured, so quotes show none. Add one below.
              </p>
            )}
            {rows.map((r, i) =>
              r._deleted ? null : (
                <div key={r.id ?? `new-${i}`} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={r.name} onChange={(e) => setField(i, "name", e.target.value)} placeholder="Gratuity 22%" />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Rate %</Label>
                    <Input value={r.ratePercent} onChange={(e) => setField(i, "ratePercent", e.target.value)} placeholder="22" />
                  </div>
                  <label className="flex items-center gap-1.5 pb-2 text-xs whitespace-nowrap">
                    <Checkbox checked={r.isTaxable} onCheckedChange={(v) => setField(i, "isTaxable", v === true)} />
                    Taxable
                  </label>
                  <Button variant="ghost" size="icon" className="mb-1" onClick={() => setField(i, "_deleted", true)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              )
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setRows((p) => [...p, { name: "", ratePercent: "", isTaxable: false, _new: true }])}
        >
          <Plus className="w-4 h-4 mr-1" /> Add a fee
        </Button>

        {gratuityCount > 1 && (
          <p className="text-xs text-amber-700 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            More than one gratuity is configured. These are treated as alternatives, not added together, so
            none will be charged until only one remains.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Save fees
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
