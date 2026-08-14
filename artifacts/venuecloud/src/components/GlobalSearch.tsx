import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, CornerDownLeft, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const BASE = "/api";

interface SearchHit {
  type: string;
  id: number;
  title: string;
  subtitle: string | null;
  reference: string | null;
  href: string;
}

/** Order groups the way a salesperson thinks, not alphabetically. */
const TYPE_ORDER = ["Event", "Function", "Lead", "Account", "Contact", "Master Event", "Task"];

export function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [, navigate] = useLocation();
  const [raw, setRaw] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce so a fast typist does not fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(raw.trim()), 200);
    return () => clearTimeout(t);
  }, [raw]);

  useEffect(() => {
    if (open) {
      setRaw("");
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const { data, isFetching } = useQuery<{ hits: SearchHit[]; truncated: boolean }>({
    queryKey: ["global-search", query],
    queryFn: async () => {
      const r = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}`);
      if (!r.ok) throw new Error(`Search failed (${r.status})`);
      return r.json();
    },
    enabled: query.length >= 2,
    retry: 0,
  });

  const grouped = useMemo(() => {
    const hits = data?.hits ?? [];
    const groups = new Map<string, SearchHit[]>();
    for (const h of hits) {
      if (!groups.has(h.type)) groups.set(h.type, []);
      groups.get(h.type)!.push(h);
    }
    return [...groups.entries()].sort(
      (a, b) => TYPE_ORDER.indexOf(a[0]) - TYPE_ORDER.indexOf(b[0])
    );
  }, [data]);

  // Flat list drives keyboard navigation across group boundaries.
  const flat = useMemo(() => grouped.flatMap(([, hits]) => hits), [grouped]);

  useEffect(() => setActive(0), [query]);

  function go(hit: SearchHit | undefined) {
    if (!hit) return;
    onOpenChange(false);
    navigate(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(flat[active]);
    }
  }

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search events, functions, accounts, contacts, leads…"
            className="border-0 shadow-none focus-visible:ring-0 h-12 px-1"
          />
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {query.length < 2 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Type at least two characters. Record numbers work too, like EVT-2026-0001.
            </p>
          ) : flat.length === 0 && !isFetching ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing matches “{query}”.
            </p>
          ) : (
            grouped.map(([type, hits]) => (
              <div key={type}>
                <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {type}
                </div>
                {hits.map((hit) => {
                  runningIndex++;
                  const isActive = runningIndex === active;
                  return (
                    <button
                      key={`${hit.type}-${hit.id}`}
                      onClick={() => go(hit)}
                      onMouseEnter={() => setActive(flat.indexOf(hit))}
                      className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 ${
                        isActive ? "bg-muted" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">{hit.title}</span>
                        {hit.subtitle && (
                          <span className="block text-xs text-muted-foreground truncate">{hit.subtitle}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        {hit.reference && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {hit.reference}
                          </Badge>
                        )}
                        {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
          {data?.truncated && (
            <p className="px-4 py-2 text-[11px] text-muted-foreground border-t">
              Showing the first few of each type — narrow the search to see more.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Cmd/Ctrl+K anywhere in the app. */
export function useGlobalSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}
