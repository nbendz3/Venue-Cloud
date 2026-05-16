import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type CommEntry = {
  relatedType: string;
  relatedId: number;
  subject?: string;
  type?: string;
  category?: string;
  result?: string;
  date?: string;
  content?: string;
  internal?: boolean;
  createdBy?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  relatedType: string;
  relatedId: number;
};

const COMM_TYPES = ["Call", "Email", "Meeting", "Note", "Letter", "Fax", "Text"];
const COMM_RESULTS = ["Left Message", "Spoke With", "No Answer", "Email Sent", "Meeting Scheduled", "Booked", "Lost", "Follow-Up Needed"];
const COMM_CATEGORIES = ["Sales", "Service", "Billing", "Follow-Up", "Confirmation", "Complaint", "Thank You", "General"];

export function LogActivityModal({ open, onClose, relatedType, relatedId }: Props) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<CommEntry>({
    relatedType,
    relatedId,
    date: today,
    internal: false,
  });

  const set = (k: keyof CommEntry, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const createMutation = useMutation({
    mutationFn: (data: CommEntry) =>
      fetch("/api/communication-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communication-history", relatedType, String(relatedId)] });
      setForm({ relatedType, relatedId, date: today, internal: false });
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Subject</Label>
            <Input
              placeholder="Brief subject line"
              value={form.subject ?? ""}
              onChange={(e) => set("subject", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type ?? ""} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {COMM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date ?? ""} onChange={(e) => set("date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={form.category ?? ""} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {COMM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Result</Label>
              <Select value={form.result ?? ""} onValueChange={(v) => set("result", v)}>
                <SelectTrigger><SelectValue placeholder="Result" /></SelectTrigger>
                <SelectContent>
                  {COMM_RESULTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Enter notes about this communication…"
              rows={4}
              value={form.content ?? ""}
              onChange={(e) => set("content", e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="internal"
              checked={form.internal ?? false}
              onCheckedChange={(c) => set("internal", c)}
            />
            <Label htmlFor="internal" className="cursor-pointer">
              Internal note (not visible to client)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({ ...form, relatedType, relatedId })}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Saving…" : "Log Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
