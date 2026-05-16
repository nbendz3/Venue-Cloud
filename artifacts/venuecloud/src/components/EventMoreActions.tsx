import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal, Copy, ArrowRight, Network, Trash2, Printer, Mail, Download,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const BASE = "/api";

type MasterEvent = { id: number; masterEventName: string; masterEventNumber?: string | null };

type Props = {
  eventId: number;
  eventName: string;
  masterEventId?: number | null;
};

export function EventMoreActions({ eventId, eventName, masterEventId }: Props) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [showCopy, setShowCopy] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showChangeMaster, setShowChangeMaster] = useState(false);
  const [copyName, setCopyName] = useState(`Copy of ${eventName}`);
  const [moveTarget, setMoveTarget] = useState("");
  const [selectedMaster, setSelectedMaster] = useState<string>(String(masterEventId ?? ""));

  const { data: masterEvents = [] } = useQuery<MasterEvent[]>({
    queryKey: ["master-events"],
    queryFn: () => fetch(`${BASE}/master-events`).then((r) => r.json()),
    enabled: showChangeMaster,
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/events/${eventId}`);
      const event = await res.json();
      const { id, createdAt, updatedAt, eventNumber, ...rest } = event;
      return fetch(`${BASE}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rest, eventName: copyName }),
      }).then((r) => r.json());
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ["events"] });
      toast.success("Event copied");
      setShowCopy(false);
      navigate(`/events/${created.id}`);
    },
    onError: () => toast.error("Failed to copy event"),
  });

  const changeMasterMutation = useMutation({
    mutationFn: (masterEventId: number | null) =>
      fetch(`${BASE}/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterEventId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["events", String(eventId)] });
      toast.success("Master event updated");
      setShowChangeMaster(false);
    },
    onError: () => toast.error("Failed to update master event"),
  });

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => { setCopyName(`Copy of ${eventName}`); setShowCopy(true); }}>
            <Copy className="h-4 w-4 mr-2" />Copy Event
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowChangeMaster(true)}>
            <Network className="h-4 w-4 mr-2" />
            {masterEventId ? "Change Master Event" : "Link to Master Event"}
          </DropdownMenuItem>
          {masterEventId && (
            <DropdownMenuItem onClick={() => changeMasterMutation.mutate(null)} className="text-gray-500">
              <Network className="h-4 w-4 mr-2" />Unlink Master Event
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />Print Event
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Email BEO feature coming soon")}>
            <Mail className="h-4 w-4 mr-2" />Email BEO
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast.info("Export feature coming soon")}>
            <Download className="h-4 w-4 mr-2" />Export PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Copy Dialog */}
      <Dialog open={showCopy} onOpenChange={setShowCopy}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Copy Event</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">A new event will be created with all details copied from "{eventName}".</p>
            <div>
              <Label>New Event Name *</Label>
              <Input value={copyName} onChange={(e) => setCopyName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopy(false)}>Cancel</Button>
            <Button onClick={() => copyMutation.mutate()} disabled={!copyName || copyMutation.isPending}>
              {copyMutation.isPending ? "Copying…" : "Copy Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Master Event Dialog */}
      <Dialog open={showChangeMaster} onOpenChange={setShowChangeMaster}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{masterEventId ? "Change Master Event" : "Link to Master Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {masterEventId
                ? "Select a different master event to link this event to."
                : "Select a master event to group this event under."}
            </p>
            <div>
              <Label>Master Event</Label>
              <Select value={selectedMaster} onValueChange={setSelectedMaster}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select master event" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No Master Event —</SelectItem>
                  {masterEvents.map((me) => (
                    <SelectItem key={me.id} value={String(me.id)}>
                      {me.masterEventName} {me.masterEventNumber ? `(${me.masterEventNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeMaster(false)}>Cancel</Button>
            <Button
              onClick={() => changeMasterMutation.mutate(selectedMaster && selectedMaster !== "none" ? parseInt(selectedMaster) : null)}
              disabled={changeMasterMutation.isPending}
            >
              {changeMasterMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
