import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, Users, Building2, Contact2, Network, FileText } from "lucide-react";

type RecordType = "event" | "lead" | "account" | "contact" | "master-event" | "function";

type RecentRecord = {
  id: number;
  type: RecordType;
  name: string;
  href: string;
};

const MAX_RECENT = 15;

const TYPE_CONFIG: Record<RecordType, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  "event":        { color: "text-white", bg: "bg-red-600",    icon: CalendarDays, label: "Event" },
  "lead":         { color: "text-white", bg: "bg-amber-500",  icon: FileText,     label: "Lead"  },
  "account":      { color: "text-white", bg: "bg-purple-600", icon: Building2,    label: "Account" },
  "contact":      { color: "text-white", bg: "bg-teal-600",   icon: Contact2,     label: "Contact" },
  "master-event": { color: "text-white", bg: "bg-violet-700", icon: Network,      label: "Master Event" },
  "function":     { color: "text-white", bg: "bg-orange-500", icon: CalendarDays, label: "Function" },
};

type RecentRecordsCtx = {
  records: RecentRecord[];
  push: (r: RecentRecord) => void;
};

const Ctx = createContext<RecentRecordsCtx>({ records: [], push: () => {} });

export function RecentRecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<RecentRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vc_recent") ?? "[]");
    } catch { return []; }
  });

  const push = useCallback((r: RecentRecord) => {
    setRecords(prev => {
      const deduped = [r, ...prev.filter(x => !(x.type === r.type && x.id === r.id))].slice(0, MAX_RECENT);
      localStorage.setItem("vc_recent", JSON.stringify(deduped));
      return deduped;
    });
  }, []);

  return <Ctx.Provider value={{ records, push }}>{children}</Ctx.Provider>;
}

export function useRecentRecords() {
  return useContext(Ctx);
}

export function RecentRecordsBar() {
  const { records } = useRecentRecords();
  const [location] = useLocation();

  const fallback: RecentRecord[] = [
    { id: 1, type: "event", name: "Meridian Annual Summit", href: "/events/1" },
    { id: 1, type: "lead", name: "Tech Summit 2026", href: "/leads/1" },
    { id: 1, type: "account", name: "Meridian Corp", href: "/accounts/1" },
  ];

  const shown = records.length > 0 ? records : fallback;

  return (
    <div className="h-8 bg-muted/50 border-b flex items-center px-3 gap-1.5 overflow-x-auto flex-shrink-0 scrollbar-thin">
      <span className="text-muted-foreground font-medium text-xs whitespace-nowrap flex-shrink-0 mr-1">Recent:</span>
      {shown.map((r, i) => {
        const cfg = TYPE_CONFIG[r.type];
        const Icon = cfg.icon;
        const isActive = location === r.href;
        return (
          <Link key={`${r.type}-${r.id}-${i}`} href={r.href}>
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap transition-all ${cfg.bg} ${cfg.color} ${isActive ? "ring-2 ring-offset-1 ring-current opacity-100" : "opacity-80 hover:opacity-100"}`}>
              <Icon className="h-3 w-3 shrink-0" />
              <span className="max-w-[120px] truncate">{r.name}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
