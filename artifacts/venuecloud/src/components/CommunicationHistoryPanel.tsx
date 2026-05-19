import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LogActivityModal } from "./LogActivityModal";
import {
  MessageSquare, Phone, Mail, Users, FileText, Trash2, Plus,
  ChevronDown, ChevronUp, Lock, FileOutput, Send,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const BASE = "/api";

type CommEntry = {
  id: number;
  relatedType: string;
  relatedId: number;
  subject?: string | null;
  type?: string | null;
  category?: string | null;
  result?: string | null;
  date?: string | null;
  contactName?: string | null;
  content?: string | null;
  internal?: boolean | null;
  createdAt: string;
  createdBy?: string | null;
};

type Props = {
  relatedType: string;
  relatedId: number;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  Call:     <Phone className="h-3 w-3" />,
  Email:    <Mail className="h-3 w-3" />,
  Meeting:  <Users className="h-3 w-3" />,
  Note:     <FileText className="h-3 w-3" />,
  Document: <FileOutput className="h-3 w-3" />,
  Fax:      <FileText className="h-3 w-3" />,
  Text:     <MessageSquare className="h-3 w-3" />,
};

const TYPE_COLOR: Record<string, string> = {
  Call:     "bg-blue-100 text-blue-700 border-blue-200",
  Email:    "bg-purple-100 text-purple-700 border-purple-200",
  Meeting:  "bg-green-100 text-green-700 border-green-200",
  Note:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  Document: "bg-orange-100 text-orange-700 border-orange-200",
  Fax:      "bg-gray-100 text-gray-700 border-gray-200",
  Text:     "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const DOC_TEMPLATES = [
  "Banquet Event Order (BEO)",
  "Event Contract",
  "Proposal / Quote",
  "Banquet Check",
  "Room Block Agreement",
  "Deposit Invoice",
];

function fmtDt(d: string | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CommunicationHistoryPanel({
  relatedType, relatedId, primaryContactName, primaryContactEmail,
}: Props) {
  const qc = useQueryClient();

  const [expanded, setExpanded] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showGenDoc, setShowGenDoc] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const [docForm, setDocForm] = useState({ template: "", space: "", notes: "" });
  const [emailForm, setEmailForm] = useState({
    to: primaryContactEmail ?? primaryContactName ?? "",
    subject: "",
    body: "",
  });

  const { data: entries = [], isLoading } = useQuery<CommEntry[]>({
    queryKey: ["communication-history", relatedType, String(relatedId)],
    queryFn: () =>
      fetch(`${BASE}/communication-history?relatedType=${relatedType}&relatedId=${relatedId}`)
        .then((r) => r.json()),
    enabled: !!relatedId,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["communication-history", relatedType, String(relatedId)] });

  const today = new Date().toISOString().slice(0, 10);

  const createEntry = useMutation({
    mutationFn: (data: object) =>
      fetch(`${BASE}/communication-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: invalidate,
  });

  const deleteEntry = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/communication-history/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const handleGenerateDoc = () => {
    if (!docForm.template) return;
    createEntry.mutate({
      relatedType, relatedId,
      type: "Document",
      subject: `${docForm.template}${docForm.space ? ` — ${docForm.space}` : ""}`,
      result: "PDF generated",
      content: docForm.notes || null,
      date: today,
      createdBy: "Current User",
    }, {
      onSuccess: () => {
        setShowGenDoc(false);
        setDocForm({ template: "", space: "", notes: "" });
      },
    });
  };

  const handleSendEmail = () => {
    if (!emailForm.subject) return;
    createEntry.mutate({
      relatedType, relatedId,
      type: "Email",
      subject: emailForm.subject,
      content: emailForm.body || null,
      result: `Sent to ${emailForm.to || primaryContactName || "contact"}`,
      date: today,
      createdBy: "Current User",
    }, {
      onSuccess: () => {
        setShowEmail(false);
        setEmailForm({ to: primaryContactEmail ?? primaryContactName ?? "", subject: "", body: "" });
      },
    });
  };

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 mb-4">
        <Button size="sm" onClick={() => setShowLog(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Log Activity
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowGenDoc(true)}>
          <FileOutput className="h-3.5 w-3.5 mr-1" /> Generate Document
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowEmail(true)}>
          <Send className="h-3.5 w-3.5 mr-1" /> Compose Email
        </Button>
        {entries.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        )}
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No communication history yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-muted/40">
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject / Description</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <TableRow
                      className="text-sm cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    >
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                        {fmtDt(entry.date ?? entry.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_COLOR[entry.type ?? ""] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                          {TYPE_ICON[entry.type ?? ""] ?? <MessageSquare className="h-3 w-3" />}
                          {entry.type ?? "Note"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate max-w-[280px]">
                            {entry.subject ?? "(No subject)"}
                          </span>
                          {entry.internal && <Lock className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                        </div>
                        {entry.result && (
                          <div className="text-xs text-muted-foreground truncate max-w-[280px]">{entry.result}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {entry.createdBy ?? "—"}
                      </TableCell>
                      <TableCell>
                        {expanded === entry.id
                          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </TableCell>
                    </TableRow>

                    {expanded === entry.id && (
                      <TableRow key={`${entry.id}-exp`} className="bg-muted/20">
                        <TableCell colSpan={5} className="py-3 px-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {entry.category && <span>Category: <span className="font-medium text-foreground">{entry.category}</span></span>}
                                {entry.result && <span>Result: <span className="font-medium text-foreground">{entry.result}</span></span>}
                                {entry.contactName && <span>Contact: <span className="font-medium text-foreground">{entry.contactName}</span></span>}
                                {entry.internal && (
                                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                                    <Lock className="h-3 w-3" /> Internal
                                  </span>
                                )}
                              </div>
                              {entry.content && (
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed border-l-2 border-muted-foreground/20 pl-3">
                                  {entry.content}
                                </p>
                              )}
                            </div>
                            <button
                              className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this entry?")) deleteEntry.mutate(entry.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* ── Log Activity Modal ── */}
      <LogActivityModal
        open={showLog}
        onClose={() => setShowLog(false)}
        relatedType={relatedType}
        relatedId={relatedId}
      />

      {/* ── Generate Document Modal ── */}
      {showGenDoc && (
        <Dialog open onOpenChange={(o) => { if (!o) { setShowGenDoc(false); setDocForm({ template: "", space: "", notes: "" }); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Generate Document</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs mb-1.5 block">Document Template</Label>
                <Select value={docForm.template || "_none_"} onValueChange={(v) => setDocForm(f => ({ ...f, template: v === "_none_" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select template…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">— Select template —</SelectItem>
                    {DOC_TEMPLATES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Function / Space (optional)</Label>
                <Input
                  placeholder="e.g. Main Ballroom, May 23"
                  value={docForm.space}
                  onChange={(e) => setDocForm(f => ({ ...f, space: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Notes (optional)</Label>
                <Textarea
                  className="resize-none text-sm"
                  rows={3}
                  placeholder="Any special instructions or notes for this document…"
                  value={docForm.notes}
                  onChange={(e) => setDocForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowGenDoc(false); setDocForm({ template: "", space: "", notes: "" }); }}>Cancel</Button>
              <Button
                onClick={handleGenerateDoc}
                disabled={!docForm.template || createEntry.isPending}
              >
                <FileOutput className="h-3.5 w-3.5 mr-1" />
                Generate PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Compose Email Modal ── */}
      {showEmail && (
        <Dialog open onOpenChange={(o) => { if (!o) { setShowEmail(false); setEmailForm({ to: primaryContactEmail ?? primaryContactName ?? "", subject: "", body: "" }); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs mb-1.5 block">To</Label>
                <Input
                  placeholder="Recipient name or email"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm(f => ({ ...f, to: e.target.value }))}
                />
                {primaryContactName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Primary contact: <span className="font-medium">{primaryContactName}</span>
                    {primaryContactEmail && ` — ${primaryContactEmail}`}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Subject</Label>
                <Input
                  placeholder="Email subject…"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(f => ({ ...f, subject: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Body</Label>
                <Textarea
                  className="resize-none text-sm min-h-[140px]"
                  placeholder="Compose your message…"
                  value={emailForm.body}
                  onChange={(e) => setEmailForm(f => ({ ...f, body: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowEmail(false); setEmailForm({ to: primaryContactEmail ?? primaryContactName ?? "", subject: "", body: "" }); }}>Cancel</Button>
              <Button
                onClick={handleSendEmail}
                disabled={!emailForm.subject || createEntry.isPending}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
