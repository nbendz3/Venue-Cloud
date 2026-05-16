import { useQuery } from "@tanstack/react-query";

type LifecycleColor = { id: number; status: string; color: string; textColor: string };

const DEFAULT_COLORS: LifecycleColor[] = [
  { id: 1, status: "New", color: "#94A3B8", textColor: "#FFFFFF" },
  { id: 2, status: "Inquiry", color: "#60A5FA", textColor: "#FFFFFF" },
  { id: 3, status: "Proposal", color: "#A78BFA", textColor: "#FFFFFF" },
  { id: 4, status: "Tentative", color: "#FBBF24", textColor: "#1F2937" },
  { id: 5, status: "Definite", color: "#10B981", textColor: "#FFFFFF" },
  { id: 6, status: "Event Order", color: "#059669", textColor: "#FFFFFF" },
  { id: 7, status: "Actualized", color: "#1D4ED8", textColor: "#FFFFFF" },
  { id: 8, status: "Cancelled", color: "#EF4444", textColor: "#FFFFFF" },
];

export function useLifecycleColors() {
  const { data } = useQuery<LifecycleColor[]>({
    queryKey: ["settings", "lifecycle-colors"],
    queryFn: () => fetch("/api/settings/lifecycle-colors").then((r) => r.json()),
    staleTime: 5 * 60 * 1000,
  });
  return data ?? DEFAULT_COLORS;
}

export function getStatusColor(colors: LifecycleColor[], status: string): { background: string; color: string } {
  const lc = colors.find((c) => c.status.toLowerCase() === status.toLowerCase());
  return lc ? { background: lc.color, color: lc.textColor } : { background: "#6B7280", color: "#FFFFFF" };
}

export function CalendarLegend() {
  const colors = useLifecycleColors();

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {colors.map((lc) => (
        <div key={lc.id} className="flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-3 rounded-sm shrink-0"
            style={{ backgroundColor: lc.color }}
          />
          <span className="text-xs text-gray-600">{lc.status}</span>
        </div>
      ))}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors = useLifecycleColors();
  const style = getStatusColor(colors, status);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: style.background, color: style.color }}
    >
      {status}
    </span>
  );
}
