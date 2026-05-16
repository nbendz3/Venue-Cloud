import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetEvent, useGetFunction } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

const FUNCTION_TYPES = [
  "Dinner","Breakfast","Brunch","Lunch","Ceremony","Reception",
  "Meeting","Cocktail Hour","Gala","Conference","Workshop","Seminar",
  "Break","Registration","Networking","Awards Ceremony","After Party",
];
const LOCATIONS = [
  "Grand Ballroom","Pine Room","Lakeside Pavilion","Garden Terrace",
  "Boardroom A","Boardroom B","Executive Suite","Mountain View Room",
  "Poolside Deck","Main Dining Room","Private Dining Room","Lobby Foyer",
];
const SETUP_STYLES = [
  "Banquet Rounds","Classroom","Theater","U-Shape","Hollow Square",
  "Boardroom","Reception","Cabaret","Crescent Rounds","E-Shape",
];

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

export default function FunctionEdit() {
  const params = useParams<{ id: string; functionId: string }>();
  const eventId = Number(params.id);
  const functionId = params.functionId ? Number(params.functionId) : null;
  const isNew = !functionId;
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: event } = useGetEvent(eventId, { query: { enabled: !!eventId } as any });
  const { data: fn, isLoading } = useGetFunction(functionId!, { query: { enabled: !!functionId } as any });

  const [form, setForm] = useState<Record<string, any>>({
    functionType: "Meeting",
    functionDate: "",
    location: "",
    startTime: "08:00",
    endTime: "09:00",
    setupMinutes: 30,
    teardownMinutes: 30,
    setupStyle: "",
    roomRental: "",
    autoUpdateAttendance: false,
    estimatedAttendance: "",
    guaranteedAttendance: "",
    set: "",
    owner: "",
  });

  useEffect(() => {
    if (fn) {
      setForm({
        functionType: (fn as any).functionType ?? "Meeting",
        functionDate: (fn as any).functionDate ?? "",
        location: (fn as any).location ?? "",
        startTime: (fn as any).startTime ?? "08:00",
        endTime: (fn as any).endTime ?? "09:00",
        setupMinutes: (fn as any).setupMinutes ?? 30,
        teardownMinutes: (fn as any).teardownMinutes ?? 30,
        setupStyle: (fn as any).setupStyle ?? "",
        roomRental: (fn as any).roomRental ?? "",
        autoUpdateAttendance: (fn as any).autoUpdateAttendance ?? false,
        estimatedAttendance: (fn as any).estimatedAttendance ?? "",
        guaranteedAttendance: (fn as any).guaranteedAttendance ?? "",
        set: (fn as any).set ?? "",
        owner: (fn as any).owner ?? "",
      });
    }
  }, [fn]);

  const set = (key: string, val: any) => setForm((p) => ({ ...p, [key]: val }));

  const save = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const url = isNew
        ? `${BASE}/events/${eventId}/functions`
        : `${BASE}/functions/${functionId}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save function");
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/events/{id}/functions"] });
      qc.invalidateQueries({ queryKey: ["/api/functions/{id}"] });
      toast.success(isNew ? "Function created" : "Function saved");
      return data;
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleSave = async (action: "save" | "newFunction" | "copyFunction" | "addServices") => {
    const payload = {
      ...form,
      setupMinutes: form.setupMinutes ? Number(form.setupMinutes) : undefined,
      teardownMinutes: form.teardownMinutes ? Number(form.teardownMinutes) : undefined,
      estimatedAttendance: form.estimatedAttendance ? Number(form.estimatedAttendance) : undefined,
      guaranteedAttendance: form.guaranteedAttendance ? Number(form.guaranteedAttendance) : undefined,
      roomRental: form.roomRental ? parseFloat(form.roomRental) : undefined,
    };
    const data = await save.mutateAsync(payload);
    const savedId = data?.id ?? functionId;
    if (action === "save") navigate(`/events/${eventId}/functions/${savedId}`);
    else if (action === "newFunction") navigate(`/events/${eventId}/functions/new`);
    else if (action === "copyFunction") navigate(`/events/${eventId}/functions/new`);
    else if (action === "addServices") navigate(`/events/${eventId}/functions/${savedId}/services`);
  };

  if (!isNew && isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-4" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/events/${eventId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{isNew ? "New Function" : "Edit Function"}</h1>
          <p className="text-sm text-muted-foreground">{event?.eventName ?? `Event #${eventId}`}</p>
        </div>
      </div>

      {/* Save Actions */}
      <div className="flex items-center gap-2 mb-6 p-3 bg-muted/50 rounded-lg border">
        <Button onClick={() => handleSave("save")} disabled={save.isPending}>
          <Save className="w-4 h-4 mr-1.5" /> Save
        </Button>
        <Button variant="outline" onClick={() => handleSave("newFunction")} disabled={save.isPending}>
          Save and New Function
        </Button>
        <Button variant="outline" onClick={() => handleSave("copyFunction")} disabled={save.isPending}>
          Save and Copy Function
        </Button>
        <Button variant="outline" onClick={() => handleSave("addServices")} disabled={save.isPending}>
          Save and Add Services
        </Button>
        <Button variant="ghost" asChild>
          <Link href={isNew ? `/events/${eventId}` : `/events/${eventId}/functions/${functionId}`}>Cancel</Link>
        </Button>
      </div>

      {/* Function Details */}
      <Card className="mb-6">
        <CardContent className="p-6 space-y-5">
          <h2 className="text-base font-semibold border-b pb-2">Function Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <F label="Function Type" required>
              <Select value={form.functionType} onValueChange={(v) => set("functionType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FUNCTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </F>
            <F label="Function Date" required>
              <Input type="date" value={form.functionDate} onChange={(e) => set("functionDate", e.target.value)} />
            </F>
            <F label="Location" required>
              <Select value={form.location || "_none_"} onValueChange={(v) => set("location", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select location..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Select Location —</SelectItem>
                  {LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Setup Style">
              <Select value={form.setupStyle || "_none_"} onValueChange={(v) => set("setupStyle", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">None</SelectItem>
                  {SETUP_STYLES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </F>
            <F label="Start Time" required>
              <Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} />
            </F>
            <F label="End Time" required>
              <Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} />
            </F>
            <F label="Setup Minutes" required>
              <Input type="number" value={form.setupMinutes} onChange={(e) => set("setupMinutes", e.target.value)} />
            </F>
            <F label="Teardown Minutes" required>
              <Input type="number" value={form.teardownMinutes} onChange={(e) => set("teardownMinutes", e.target.value)} />
            </F>
            <F label="Room Rental" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input className="pl-7" type="number" step="0.01" value={form.roomRental}
                  onChange={(e) => set("roomRental", e.target.value)} />
              </div>
            </F>
            <F label="Owner" required>
              <Input value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Search owner..." />
            </F>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <F label="Estimated Attendance" required>
              <Input type="number" value={form.estimatedAttendance} onChange={(e) => set("estimatedAttendance", e.target.value)} />
            </F>
            <F label="Guaranteed Attendance">
              <Input type="number" value={form.guaranteedAttendance} onChange={(e) => set("guaranteedAttendance", e.target.value)} />
            </F>
            <F label="Set (Place Settings)">
              <Input value={form.set} onChange={(e) => set("set", e.target.value)} />
            </F>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="autoUpdate"
              checked={!!form.autoUpdateAttendance}
              onCheckedChange={(v) => set("autoUpdateAttendance", !!v)}
            />
            <Label htmlFor="autoUpdate" className="text-sm cursor-pointer">
              Auto Update Attendance (syncs from event attendance)
            </Label>
          </div>

          {!isNew && (
            <div className="pt-2 border-t">
              <Label className="text-xs text-muted-foreground">Function Number</Label>
              <p className="text-sm font-medium mt-0.5">{(fn as any)?.functionNumber ?? "Auto-assigned"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Actions (bottom) */}
      <div className="flex items-center gap-2">
        <Button onClick={() => handleSave("save")} disabled={save.isPending}>
          <Save className="w-4 h-4 mr-1.5" /> Save
        </Button>
        <Button variant="outline" onClick={() => handleSave("newFunction")} disabled={save.isPending}>
          Save and New Function
        </Button>
        <Button variant="outline" onClick={() => handleSave("copyFunction")} disabled={save.isPending}>
          Save and Copy Function
        </Button>
        <Button variant="outline" onClick={() => handleSave("addServices")} disabled={save.isPending}>
          Save and Add Services
        </Button>
        <Button variant="ghost" asChild>
          <Link href={isNew ? `/events/${eventId}` : `/events/${eventId}/functions/${functionId}`}>Cancel</Link>
        </Button>
      </div>
    </div>
  );
}
