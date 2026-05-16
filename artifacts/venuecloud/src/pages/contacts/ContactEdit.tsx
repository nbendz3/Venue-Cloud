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

const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Rev."];
const SITES = ["The Pines Resort", "Mountain Lodge", "Lakeside Venue"];
const COUNTRIES = ["United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Other"];

export default function ContactEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const isNew = id === "new";

  const { data: contactTypes = [] } = useQuery<{id:number;name:string}[]>({ queryKey: ["settings","contact-types"], queryFn: () => fetch(`${BASE}/settings/contact-types`).then(r=>r.json()) });
  const { data: accounts = [] } = useQuery<{id:number;accountName:string}[]>({ queryKey: ["accounts-list"], queryFn: () => fetch(`${BASE}/accounts`).then(r=>r.json()) });

  const { data: existing } = useQuery({
    queryKey: ["contacts", id],
    queryFn: () => fetch(`${BASE}/contacts/${id}`).then(r => r.json()),
    enabled: !isNew && !!id,
  });

  const [form, setForm] = useState<Record<string, string | boolean>>({
    salutation: "", firstName: "", lastName: "", title: "", department: "",
    email: "", workPhone: "", mobilePhone: "", homePhone: "", fax: "",
    owner: "Sarah Johnson", site: "The Pines Resort", contactType: "",
    birthday: "", anniversary: "", active: true,
    information: "", description: "",
    mailingAddress1: "", mailingAddress2: "", mailingCity: "", mailingState: "",
    mailingPostalCode: "", mailingCountry: "United States",
    useAccountMailingAddress: false,
    otherAddress1: "", otherAddress2: "", otherCity: "", otherState: "",
    otherPostalCode: "", otherCountry: "United States",
    useAccountOtherAddress: false,
  });

  useEffect(() => { if (existing) setForm(existing as any); }, [existing]);
  const set = (k: string, v: string | boolean) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data: typeof form) => isNew
      ? fetch(`${BASE}/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json())
      : fetch(`${BASE}/contacts/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: (saved) => { qc.invalidateQueries({ queryKey: ["contacts"] }); toast.success(isNew?"Contact created":"Contact saved"); navigate(`/contacts/${saved.id}`); },
    onError: () => toast.error("Failed to save contact"),
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
        <button onClick={() => navigate(isNew ? "/contacts" : `/contacts/${id}`)} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold">{isNew ? "New Contact" : "Edit Contact"}</h1>
      </div>

      <div className="space-y-6">
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Contact Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-3 gap-2 col-span-2">
              <F label="Salutation">
                <Select value={String(form.salutation||"")} onValueChange={v=>set("salutation",v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent><SelectItem value="_none_">None</SelectItem>{SALUTATIONS.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="First Name"><Input value={String(form.firstName||"")} onChange={e=>set("firstName",e.target.value)} /></F>
              <F label="Last Name" required><Input value={String(form.lastName||"")} onChange={e=>set("lastName",e.target.value)} /></F>
            </div>
            <F label="Account">
              <Select value={String(form.accountId||"")} onValueChange={v=>set("accountId",v)}>
                <SelectTrigger><SelectValue placeholder="Search account" /></SelectTrigger>
                <SelectContent>{accounts.map(a=><SelectItem key={a.id} value={String(a.id)}>{a.accountName}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Title"><Input value={String(form.title||"")} onChange={e=>set("title",e.target.value)} /></F>
            <F label="Department"><Input value={String(form.department||"")} onChange={e=>set("department",e.target.value)} /></F>
            <F label="Contact Type">
              <Select value={String(form.contactType||"")} onValueChange={v=>set("contactType",v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="_none_">None</SelectItem>{contactTypes.map(t=><SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Email"><Input type="email" value={String(form.email||"")} onChange={e=>set("email",e.target.value)} /></F>
            <F label="Work Phone"><Input value={String(form.workPhone||"")} onChange={e=>set("workPhone",e.target.value)} /></F>
            <F label="Mobile Phone"><Input value={String(form.mobilePhone||"")} onChange={e=>set("mobilePhone",e.target.value)} /></F>
            <F label="Home Phone"><Input value={String(form.homePhone||"")} onChange={e=>set("homePhone",e.target.value)} /></F>
            <F label="Fax"><Input value={String(form.fax||"")} onChange={e=>set("fax",e.target.value)} /></F>
            <F label="Owner" required><Input value={String(form.owner||"")} onChange={e=>set("owner",e.target.value)} /></F>
            <F label="Site" required>
              <Select value={String(form.site||"The Pines Resort")} onValueChange={v=>set("site",v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SITES.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Birthday"><Input type="date" value={String(form.birthday||"")} onChange={e=>set("birthday",e.target.value)} /></F>
            <F label="Anniversary"><Input type="date" value={String(form.anniversary||"")} onChange={e=>set("anniversary",e.target.value)} /></F>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox checked={!!form.active} onCheckedChange={c=>set("active",!!c)} id="active" />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="col-span-2">
              <F label="Information"><Textarea rows={3} maxLength={2048} value={String(form.information||"")} onChange={e=>set("information",e.target.value)} /></F>
            </div>
            <div className="col-span-2">
              <F label="Description"><Textarea rows={2} maxLength={1024} value={String(form.description||"")} onChange={e=>set("description",e.target.value)} /></F>
            </div>
          </div>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Mailing Address</h2>
          <div className="mb-3 flex items-center gap-2">
            <Checkbox checked={!!form.useAccountMailingAddress} onCheckedChange={c=>set("useAccountMailingAddress",!!c)} id="useAcctMail" />
            <Label htmlFor="useAcctMail">Use Account Address for Mailing</Label>
          </div>
          {!form.useAccountMailingAddress && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><F label="Address Line 1"><Input value={String(form.mailingAddress1||"")} onChange={e=>set("mailingAddress1",e.target.value)} /></F></div>
              <div className="col-span-2"><F label="Address Line 2"><Input value={String(form.mailingAddress2||"")} onChange={e=>set("mailingAddress2",e.target.value)} /></F></div>
              <F label="City"><Input value={String(form.mailingCity||"")} onChange={e=>set("mailingCity",e.target.value)} /></F>
              <F label="State"><Input value={String(form.mailingState||"")} onChange={e=>set("mailingState",e.target.value)} /></F>
              <F label="Postal Code"><Input value={String(form.mailingPostalCode||"")} onChange={e=>set("mailingPostalCode",e.target.value)} /></F>
              <F label="Country">
                <Select value={String(form.mailingCountry||"United States")} onValueChange={v=>set("mailingCountry",v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </F>
            </div>
          )}
        </section>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={()=>mutation.mutate(form)} disabled={!form.lastName||mutation.isPending}>
          <Save className="h-4 w-4 mr-2" />{mutation.isPending?"Saving…":"Save"}
        </Button>
        <Button variant="outline" onClick={()=>navigate(isNew?"/contacts":`/contacts/${id}`)}>Cancel</Button>
      </div>
    </div>
  );
}
