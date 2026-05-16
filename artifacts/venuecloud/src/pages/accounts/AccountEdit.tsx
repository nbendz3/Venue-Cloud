import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

const ACCOUNT_TYPES = ["Corporate", "Association", "Government", "Social", "Sports", "Religious", "Educational", "Other"];
const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Other"];

export default function AccountEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const isNew = id === "new";

  const { data: existing } = useQuery({
    queryKey: ["accounts", id],
    queryFn: () => fetch(`${BASE}/accounts/${id}`).then(r => r.json()),
    enabled: !isNew && !!id,
  });

  const [form, setForm] = useState<Record<string, string | boolean>>({
    accountName: "", accountType: "", accountNumber: "", description: "",
    phone: "", fax: "", website: "", owner: "Sarah Johnson",
    mailingAddress1: "", mailingAddress2: "", mailingCity: "", mailingState: "",
    mailingPostalCode: "", mailingCountry: "United States",
    taxExempt: false, taxExemptExpDate: "", taxExemptNumber: "",
  });

  useEffect(() => { if (existing) setForm(existing as any); }, [existing]);
  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => isNew
      ? fetch(`${BASE}/accounts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch(`${BASE}/accounts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (saved) => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success(isNew?"Account created":"Account saved"); navigate(`/accounts/${saved.id}`); },
    onError: () => toast.error("Failed to save account"),
  });

  const F = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-gray-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>
      {children}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(isNew ? "/accounts" : `/accounts/${id}`)} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold">{isNew ? "New Account" : "Edit Account"}</h1>
      </div>

      <div className="space-y-6">
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Account Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Account Name" required><Input value={String(form.accountName||"")} onChange={e=>set("accountName",e.target.value)} /></F>
            <F label="Account Type">
              <Select value={String(form.accountType||"")} onValueChange={v=>set("accountType",v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{ACCOUNT_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Account Number"><Input value={String(form.accountNumber||"")} onChange={e=>set("accountNumber",e.target.value)} /></F>
            <F label="Owner" required><Input value={String(form.owner||"")} onChange={e=>set("owner",e.target.value)} /></F>
            <F label="Phone"><Input value={String(form.phone||"")} onChange={e=>set("phone",e.target.value)} /></F>
            <F label="Fax"><Input value={String(form.fax||"")} onChange={e=>set("fax",e.target.value)} /></F>
            <div className="col-span-2">
              <F label="Website"><Input type="url" value={String(form.website||"")} onChange={e=>set("website",e.target.value)} placeholder="https://" /></F>
            </div>
            <div className="col-span-2">
              <F label="Description"><Textarea rows={3} maxLength={256} value={String(form.description||"")} onChange={e=>set("description",e.target.value)} /></F>
            </div>
          </div>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Address Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><F label="Mailing Address Line 1"><Input value={String(form.mailingAddress1||"")} onChange={e=>set("mailingAddress1",e.target.value)} /></F></div>
            <div className="col-span-2"><F label="Address Line 2"><Input value={String(form.mailingAddress2||"")} onChange={e=>set("mailingAddress2",e.target.value)} /></F></div>
            <F label="City"><Input value={String(form.mailingCity||"")} onChange={e=>set("mailingCity",e.target.value)} /></F>
            <F label="State / Province"><Input value={String(form.mailingState||"")} onChange={e=>set("mailingState",e.target.value)} /></F>
            <F label="Postal Code"><Input value={String(form.mailingPostalCode||"")} onChange={e=>set("mailingPostalCode",e.target.value)} /></F>
            <F label="Country">
              <Select value={String(form.mailingCountry||"United States")} onValueChange={v=>set("mailingCountry",v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </F>
          </div>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Billing Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 pt-2">
              <Checkbox checked={!!form.taxExempt} onCheckedChange={c=>set("taxExempt",!!c)} />
              <Label>Tax Exempt</Label>
            </div>
            {form.taxExempt && <>
              <F label="Tax Exempt Exp Date"><Input type="date" value={String(form.taxExemptExpDate||"")} onChange={e=>set("taxExemptExpDate",e.target.value)} /></F>
              <F label="Tax Exempt Number"><Input value={String(form.taxExemptNumber||"")} onChange={e=>set("taxExemptNumber",e.target.value)} /></F>
            </>}
          </div>
        </section>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={()=>mutation.mutate(form)} disabled={!form.accountName||mutation.isPending}>
          <Save className="h-4 w-4 mr-2" />{mutation.isPending?"Saving…":"Save"}
        </Button>
        <Button variant="outline" onClick={()=>navigate(isNew?"/accounts":`/accounts/${id}`)}>Cancel</Button>
      </div>
    </div>
  );
}
