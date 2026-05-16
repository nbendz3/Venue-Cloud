import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

const ME_TYPES = ["Corporate","Social","Wedding","Conference","Exhibition","Sporting Event","Association","Government","Educational"];
const MARKET_TYPES = ["Corporate","Association","Social","Government","Sports","SMERF","Other"];
const REFERRAL_TYPES = ["Website","Referral","Cold Call","Trade Show","Social Media","Repeat Business","Travel Agent","CVB","Other"];
const DIVISIONS = ["Sales East","Sales West","National Accounts","Local Sales","Catering","Events"];
const PAYMENT_ARRANGEMENTS = ["Credit Card on File","Invoice Net 30","Invoice Net 60","Prepaid in Full","Deposit Required","No Charge"];

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm mb-1.5 block">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

type MasterEvent = {
  id: number;
  masterEventName: string;
  masterEventNumber?: string | null;
  masterEventType?: string | null;
  marketType?: string | null;
  referralType?: string | null;
  groupMasterAccount?: string | null;
  owner?: string | null;
  salesperson?: string | null;
  division?: string | null;
  paymentArrangements?: string | null;
  primaryContactId?: number | null;
  primaryContactName?: string | null;
  billingNotes?: string | null;
};

export default function MasterEventEdit() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const meId = isNew ? null : Number(id);
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: me, isLoading } = useQuery<MasterEvent>({
    queryKey: [`${BASE}/master-events/${meId}`],
    queryFn: () => fetch(`${BASE}/master-events/${meId}`).then(r => r.json()),
    enabled: !!meId,
  });

  const [form, setForm] = useState<Record<string, any>>({
    masterEventName: "",
    groupMasterAccount: "",
    masterEventType: "",
    marketType: "",
    referralType: "",
    owner: "",
    salesperson: "",
    division: "",
    primaryContactName: "",
    paymentArrangements: "",
    billingContactName: "",
    billingNotes: "",
  });

  useEffect(() => {
    if (me) {
      setForm({
        masterEventName: me.masterEventName ?? "",
        groupMasterAccount: me.groupMasterAccount ?? "",
        masterEventType: me.masterEventType ?? "",
        marketType: me.marketType ?? "",
        referralType: me.referralType ?? "",
        owner: me.owner ?? "",
        salesperson: me.salesperson ?? "",
        division: me.division ?? "",
        primaryContactName: me.primaryContactName ?? "",
        paymentArrangements: me.paymentArrangements ?? "",
        billingContactName: "",
        billingNotes: me.billingNotes ?? "",
      });
    }
  }, [me]);

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  const save = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const url = isNew ? `${BASE}/master-events` : `${BASE}/master-events/${meId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [`${BASE}/master-events`] });
      toast.success(isNew ? "Master Event created" : "Master Event saved");
      return data;
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleSave = async (action: "save" | "newEventWithFunction") => {
    const data = await save.mutateAsync(form);
    const savedId = data?.id ?? meId;
    if (action === "save") navigate(`/master-events/${savedId}`);
    else if (action === "newEventWithFunction") navigate(`/events/new`);
  };

  if (!isNew && isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-4" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href={isNew ? "/master-events" : `/master-events/${meId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600" />
            <h1 className="text-2xl font-bold">{isNew ? "New Master Event" : "Edit Master Event"}</h1>
          </div>
          {!isNew && me && (
            <p className="text-sm text-muted-foreground">#{me.masterEventNumber}</p>
          )}
        </div>
      </div>

      {/* Save Actions */}
      <div className="flex items-center gap-2 mb-6 p-3 bg-muted/50 rounded-lg border">
        <Button onClick={() => handleSave("save")} disabled={save.isPending}>
          <Save className="w-4 h-4 mr-1.5" /> Save
        </Button>
        <Button variant="outline" onClick={() => handleSave("newEventWithFunction")} disabled={save.isPending}>
          Save and New Event with Function
        </Button>
        <Button variant="ghost" asChild>
          <Link href={isNew ? "/master-events" : `/master-events/${meId}`}>Cancel</Link>
        </Button>
      </div>

      {/* Master Event Details */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-5">
          <h2 className="text-base font-semibold border-b pb-2 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />
            Master Event Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Primary Contact" required>
              <Input value={form.primaryContactName} onChange={(e) => set("primaryContactName", e.target.value)}
                placeholder="Search contact..." />
            </F>
            <F label="Master Event Name" required>
              <Input value={form.masterEventName} onChange={(e) => set("masterEventName", e.target.value)} />
            </F>
            <F label="Group Master Account">
              <Input value={form.groupMasterAccount} onChange={(e) => set("groupMasterAccount", e.target.value)} />
            </F>
            <F label="Master Event Type">
              <Select value={form.masterEventType || "_none_"} onValueChange={(v) => set("masterEventType", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">None</SelectItem>
                  {ME_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Market Type">
              <Select value={form.marketType || "_none_"} onValueChange={(v) => set("marketType", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">None</SelectItem>
                  {MARKET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Referral Type">
              <Select value={form.referralType || "_none_"} onValueChange={(v) => set("referralType", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">None</SelectItem>
                  {REFERRAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Owner" required>
              <Input value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Search owner..." />
            </F>
            <F label="Salesperson" required>
              <Input value={form.salesperson} onChange={(e) => set("salesperson", e.target.value)} placeholder="Search salesperson..." />
            </F>
            <F label="Division" required>
              <Select value={form.division || "_none_"} onValueChange={(v) => set("division", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select division..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Select Division —</SelectItem>
                  {DIVISIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
          </div>
          {!isNew && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Master Event Number</Label>
              <p className="text-sm font-medium mt-0.5 text-muted-foreground">{me?.masterEventNumber ?? "Auto-assigned"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Details */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Billing Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Payment Arrangements">
              <Select value={form.paymentArrangements || "_none_"} onValueChange={(v) => set("paymentArrangements", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">None</SelectItem>
                  {PAYMENT_ARRANGEMENTS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Billing Contact">
              <Input value={form.billingContactName} onChange={(e) => set("billingContactName", e.target.value)}
                placeholder="Search contact..." />
            </F>
          </div>
          <F label="Billing Notes">
            <Textarea value={form.billingNotes} onChange={(e) => set("billingNotes", e.target.value)}
              className="h-24" />
          </F>
        </CardContent>
      </Card>

      {/* Bottom Save Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={() => handleSave("save")} disabled={save.isPending}>
          <Save className="w-4 h-4 mr-1.5" /> Save
        </Button>
        <Button variant="outline" onClick={() => handleSave("newEventWithFunction")} disabled={save.isPending}>
          Save and New Event with Function
        </Button>
        <Button variant="ghost" asChild>
          <Link href={isNew ? "/master-events" : `/master-events/${meId}`}>Cancel</Link>
        </Button>
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className}`} />;
}
