import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogActivityModal } from "./LogActivityModal";
import { MessageSquare, Phone, Mail, Users, FileText, Pencil, Trash2, Plus, ChevronDown, ChevronUp, Lock } from "lucide-react";
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
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Call: <Phone className="h-3.5 w-3.5" />,
  Email: <Mail className="h-3.5 w-3.5" />,
  Meeting: <Users className="h-3.5 w-3.5" />,
  Note: <FileText className="h-3.5 w-3.5" />,
  Fax: <FileText className="h-3.5 w-3.5" />,
  Text: <MessageSquare className="h-3.5 w-3.5" />,
};

const TYPE_COLORS: Record<string, string> = {
  Call: "bg-blue-100 text-blue-700",
  Email: "bg-purple-100 text-purple-700",
  Meeting: "bg-green-100 text-green-700",
  Note: "bg-yellow-100 text-yellow-700",
  Fax: "bg-gray-100 text-gray-700",
  Text: "bg-cyan-100 text-cyan-700",
};

export function CommunicationHistoryPanel({ relatedType, relatedId }: Props) {
  const qc = useQueryClient();
  const [showLog, setShowLog] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: entries = [], isLoading } = useQuery<CommEntry[]>({
    queryKey: ["communication-history", relatedType, String(relatedId)],
    queryFn: () =>
      fetch(`${BASE}/communication-history?relatedType=${relatedType}&relatedId=${relatedId}`).then((r) => r.json()),
    enabled: !!relatedId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`${BASE}/communication-history/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communication-history", relatedType, String(relatedId)] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-800">Communication History</h3>
          {entries.length > 0 && <Badge variant="secondary">{entries.length}</Badge>}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowLog(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Log Activity
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 py-4">Loading…</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400">No communication history yet.</p>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setShowLog(true)}>
            Log first activity
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="border rounded-lg bg-white overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              >
                {/* Type icon */}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium shrink-0 ${TYPE_COLORS[entry.type ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                  {TYPE_ICONS[entry.type ?? ""] ?? <MessageSquare className="h-3.5 w-3.5" />}
                  {entry.type ?? "Note"}
                </span>

                {/* Subject */}
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">
                  {entry.subject ?? "(No subject)"}
                </span>

                {/* Date */}
                <span className="text-xs text-gray-400 shrink-0">{entry.date ?? formatDate(entry.createdAt)}</span>

                {/* Internal indicator */}
                {entry.internal && <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="Internal note" />}

                {/* Expand chevron */}
                {expanded === entry.id ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </div>

              {/* Expanded content */}
              {expanded === entry.id && (
                <div className="px-3 pb-3 border-t bg-gray-50/50">
                  <div className="flex items-start gap-4 pt-2.5">
                    <div className="flex-1 min-w-0">
                      {/* Meta row */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                        {entry.category && <span>Category: {entry.category}</span>}
                        {entry.result && <span>Result: {entry.result}</span>}
                        {entry.contactName && <span>Contact: {entry.contactName}</span>}
                        {entry.createdBy && <span>By: {entry.createdBy}</span>}
                        {entry.internal && (
                          <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <Lock className="h-3 w-3" />Internal
                          </span>
                        )}
                      </div>
                      {entry.content && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => { if (confirm("Delete this entry?")) deleteMutation.mutate(entry.id); }}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <LogActivityModal
        open={showLog}
        onClose={() => setShowLog(false)}
        relatedType={relatedType}
        relatedId={relatedId}
      />
    </div>
  );
}
