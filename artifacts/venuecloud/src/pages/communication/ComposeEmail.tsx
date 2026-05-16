import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Paperclip, FileText, X, Mail } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

const CATEGORIES = ["Sales", "Service", "Billing", "Follow-Up", "Confirmation", "Complaint", "Thank You", "General"];
const RESULTS = ["Left Message", "Spoke With", "Email Sent", "Meeting Scheduled", "Booked", "Lost", "Follow-Up Needed"];
const BUSINESS_TYPES = ["Event", "Lead", "Account", "Contact", "Master Event"];

export default function ComposeEmail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"html"|"text">("html");
  const [sending, setSending] = useState(false);
  const [requestEsig, setRequestEsig] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const { data: event } = useQuery({
    queryKey: ["events", eventId],
    queryFn: () => fetch(`${BASE}/events/${eventId}`).then(r => r.json()),
    enabled: !!eventId,
  });

  const [form, setForm] = useState({
    to: "", additionalTo: "", cc: "", bcc: "",
    subject: "", body: "", from: "sarah.johnson@thepiresresort.com",
    category: "", result: "", contact: "", businessType: "Event",
    relatedBusiness: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleSend() {
    if (!form.to || !form.subject) { toast.error("To and Subject are required"); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    toast.success("Email sent successfully");
    navigate(-1 as any);
  }

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-4 gap-2 items-center">
      <Label className="text-xs text-right text-gray-500 col-span-1">{label}</Label>
      <div className="col-span-3">{children}</div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1 as any)} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Mail className="h-6 w-6 text-blue-600" />Compose Email</h1>
          {event && <p className="text-sm text-gray-500">{event.eventName} · {event.eventNumber}</p>}
        </div>
      </div>

      <div className="space-y-4">
        {/* Business context */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Business</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Contact</Label>
                <Input className="mt-1 h-8 text-sm" value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="Search contact…" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Related Business Type</Label>
                <Select value={form.businessType} onValueChange={v=>set("businessType",v)}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{BUSINESS_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Related Business Name</Label>
                <div className="mt-1 h-8 border rounded px-3 flex items-center text-sm bg-gray-50 text-gray-700">{event?.eventName ?? "—"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-500">Category</Label>
                  <Select value={form.category} onValueChange={v=>set("category",v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent><SelectItem value="_none_">None</SelectItem>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Result</Label>
                  <Select value={form.result} onValueChange={v=>set("result",v)}>
                    <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent><SelectItem value="_none_">None</SelectItem>{RESULTS.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email compose */}
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4 pb-2 border-b">
            <h2 className="font-semibold text-gray-800 flex-1">Email Content</h2>
            <Button size="sm" variant="outline" className="text-xs"><FileText className="h-3.5 w-3.5 mr-1" />Choose Email Template</Button>
            <Button size="sm" variant="outline" className="text-xs">Insert Email Signature</Button>
          </div>

          <div className="space-y-2">
            <F label="To *"><Input className="h-8 text-sm" value={form.to} onChange={e=>set("to",e.target.value)} placeholder="recipient@example.com" /></F>
            <F label="Additional To"><Input className="h-8 text-sm" value={form.additionalTo} onChange={e=>set("additionalTo",e.target.value)} placeholder="additional@example.com" /></F>
            <F label="CC"><Input className="h-8 text-sm" value={form.cc} onChange={e=>set("cc",e.target.value)} /></F>
            <F label="BCC"><Input className="h-8 text-sm" value={form.bcc} onChange={e=>set("bcc",e.target.value)} /></F>
            <F label="Subject *"><Input className="h-8 text-sm" value={form.subject} onChange={e=>set("subject",e.target.value)} /></F>
            <F label="From">
              <Select value={form.from} onValueChange={v=>set("from",v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sarah.johnson@thepiresresort.com">sarah.johnson@thepiresresort.com</SelectItem>
                  <SelectItem value="reservations@thepiresresort.com">reservations@thepiresresort.com (forwarding)</SelectItem>
                </SelectContent>
              </Select>
            </F>

            <div className="pt-2">
              <div className="flex gap-1 border-b mb-2">
                <button onClick={()=>setTab("html")} className={`px-3 py-1.5 text-sm font-medium ${tab==="html" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}>HTML Email</button>
                <button onClick={()=>setTab("text")} className={`px-3 py-1.5 text-sm font-medium ${tab==="text" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}>Text Email</button>
              </div>
              <Textarea
                className="min-h-[200px] font-mono text-sm"
                placeholder={tab === "html" ? "Compose HTML email content…" : "Compose plain text email…"}
                value={form.body}
                onChange={e=>set("body",e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold text-gray-800 mb-3 pb-2 border-b">Attachments</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            <Button size="sm" variant="outline" className="text-xs" onClick={()=>setAttachments(p=>[...p,"Generated_BEO.docx"])}>
              <FileText className="h-3.5 w-3.5 mr-1" />Generate Documents
            </Button>
            <Button size="sm" variant="outline" className="text-xs"><Paperclip className="h-3.5 w-3.5 mr-1" />Attach from Document Center</Button>
            <Button size="sm" variant="outline" className="text-xs"><Paperclip className="h-3.5 w-3.5 mr-1" />Attach from My Computer</Button>
            <Button size="sm" variant="outline" className="text-xs"><Paperclip className="h-3.5 w-3.5 mr-1" />Attach from Attachments</Button>
          </div>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a,i) => (
                <Badge key={i} variant="secondary" className="text-xs pr-1 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />{a}
                  <button onClick={()=>setAttachments(p=>p.filter((_,j)=>j!==i))} className="ml-1 hover:text-red-500"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* eSignature */}
        <div className="bg-white border rounded-lg p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={requestEsig} onCheckedChange={c=>setRequestEsig(!!c)} />
            <span className="font-medium text-sm">Request eSignature</span>
          </label>
          {requestEsig && (
            <div className="mt-3 pl-6 space-y-2 text-sm text-gray-500 border-l-2 border-blue-200">
              <p>eSignature workflow will be initiated after sending. The recipient will receive a separate signature request.</p>
              <div><Label className="text-xs">Signer Email</Label><Input className="mt-1 h-8 text-sm" placeholder="signer@example.com" /></div>
              <div><Label className="text-xs">Document to Sign</Label>
                <Select>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue placeholder="Select attached document" /></SelectTrigger>
                  <SelectContent>{attachments.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={handleSend} disabled={sending||!form.to||!form.subject}>
          <Send className="h-4 w-4 mr-2" />{sending?"Sending…":"Send Email"}
        </Button>
        <Button variant="outline" onClick={()=>navigate(-1 as any)}>Cancel</Button>
      </div>
    </div>
  );
}
