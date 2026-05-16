import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Printer, ChevronRight, ChevronDown, Folder } from "lucide-react";
import { toast } from "sonner";

const BASE = "/api";

type DocTemplate = {
  id: number;
  name: string;
  description: string;
  documentType: string;
  folder: string;
  format: string;
  separateFunctionPages: boolean;
  sortFirstBy?: string;
};

const MOCK_TEMPLATES: DocTemplate[] = [
  { id: 1, name: "Standard Event Contract", description: "Full event contract with terms", documentType: "Contract", folder: "Event Document Templates", format: ".docx", separateFunctionPages: false, sortFirstBy: "Date" },
  { id: 2, name: "Wedding Contract", description: "Wedding-specific contract", documentType: "Contract", folder: "Wedding", format: ".docx", separateFunctionPages: false, sortFirstBy: "Date" },
  { id: 3, name: "Event Order — Standard", description: "Full BEO document", documentType: "Event Order", folder: "Banquets Beo Folder", format: ".docx", separateFunctionPages: true, sortFirstBy: "Function Date" },
  { id: 4, name: "Event Order — Condensed", description: "Condensed function details", documentType: "Event Order", folder: "Banquets Beo Folder", format: ".docx", separateFunctionPages: true },
  { id: 5, name: "Corporate Proposal", description: "Proposal with room rates and menus", documentType: "Proposal", folder: "Event Document Templates", format: ".docx", separateFunctionPages: false },
  { id: 6, name: "Wedding Proposal", description: "Wedding package proposal", documentType: "Proposal", folder: "Wedding", format: ".docx", separateFunctionPages: false },
  { id: 7, name: "Invoice — Standard", description: "Full financial invoice", documentType: "Invoice", folder: "Event Document Templates", format: ".pdf", separateFunctionPages: false },
  { id: 8, name: "Invoice — Deposit", description: "Deposit invoice only", documentType: "Invoice", folder: "Event Document Templates", format: ".pdf", separateFunctionPages: false },
  { id: 9, name: "Thank You Letter", description: "Post-event thank you", documentType: "Miscellaneous", folder: "Event Document Templates", format: ".docx", separateFunctionPages: false },
  { id: 10, name: "Wedding Agreement", description: "Wedding venue agreement", documentType: "Agreement", folder: "Wedding", format: ".docx", separateFunctionPages: false },
  { id: 11, name: "Bus Tour BEO", description: "Bus tour function order", documentType: "Event Order", folder: "Bus Tours", format: ".docx", separateFunctionPages: true },
  { id: 12, name: "Infor Default Contract", description: "System default contract template", documentType: "Contract", folder: "Infor Default Documents", format: ".docx", separateFunctionPages: false },
];

const DOC_TYPES = ["All Document Types", "Contract", "Event Order", "Invoice", "Proposal", "Agreement", "Miscellaneous"];
const FILE_FORMATS = ["Document Template Default", "PDF", "DOCX"];
const BUSINESS_TYPES = ["Event", "Lead", "Account", "Contact", "Master Event"];
const FOLDERS = ["Infor Default Documents", "All Enterprise Folders", "Event Document Templates", "Banquets Beo Folder", "Wedding", "Bus Tours", "Tracy"];

export default function GenerateDocuments() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, navigate] = useLocation();
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [typeFilter, setTypeFilter] = useState("All Document Types");
  const [formatFilter, setFormatFilter] = useState("Document Template Default");
  const [businessType, setBusinessType] = useState("Event");
  const [filterByFunctions, setFilterByFunctions] = useState(false);
  const [overrideDefaults, setOverrideDefaults] = useState(false);
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["Event Document Templates"]);
  const [generating, setGenerating] = useState(false);

  const { data: event } = useQuery({
    queryKey: ["events", eventId],
    queryFn: () => fetch(`${BASE}/events/${eventId}`).then(r => r.json()),
    enabled: !!eventId,
  });

  const filtered = MOCK_TEMPLATES.filter(t =>
    (typeFilter === "All Document Types" || t.documentType === typeFilter) &&
    (formatFilter === "Document Template Default" || t.format === (formatFilter === "PDF" ? ".pdf" : ".docx"))
  );

  function toggleDoc(id: number) {
    setSelectedDocs(p => p.includes(id) ? p.filter(d => d !== id) : [...p, id]);
  }

  function toggleFolder(f: string) {
    setExpandedFolders(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f]);
  }

  async function handleGenerate() {
    if (!selectedDocs.length) { toast.error("Select at least one document"); return; }
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1500));
    setGenerating(false);
    toast.success(`Generated ${selectedDocs.length} document(s)`);
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1 as any)} className="text-gray-400 hover:text-gray-700"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-2xl font-bold">Generate Documents</h1>
          {event && <p className="text-sm text-gray-500">{event.eventName} · {event.eventNumber}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Options */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h2 className="font-semibold text-gray-800 mb-3">Business</h2>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Related Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{BUSINESS_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Related Business Name</Label>
                <div className="mt-1 h-8 border rounded px-3 flex items-center text-sm text-gray-700 bg-gray-50">{event?.eventName ?? "—"}</div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-600">Choose Filters</p>
              {[{ label: "Filter by Functions", val: filterByFunctions, set: setFilterByFunctions },
                { label: "Override Document Defaults", val: overrideDefaults, set: setOverrideDefaults },
                { label: "Include Attachments", val: includeAttachments, set: setIncludeAttachments }].map(item => (
                <label key={item.label} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox checked={item.val} onCheckedChange={c => item.set(!!c)} />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {/* Folder tree */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Folders</h3>
            <div className="space-y-0.5">
              {FOLDERS.map(f => (
                <div key={f}>
                  <button onClick={() => toggleFolder(f)} className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100">
                    {expandedFolders.includes(f) ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                    <Folder className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-gray-700">{f}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Template table */}
        <div className="col-span-2">
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
              <h2 className="font-semibold text-gray-800 flex-1">Choose Document Template</h2>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t=><SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{FILE_FORMATS.map(f=><SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="overflow-auto max-h-[480px]">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="w-8 px-3 py-2"></th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Doc Type</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Folder</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Format</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(tpl => (
                    <tr key={tpl.id} className={`hover:bg-gray-50 cursor-pointer ${selectedDocs.includes(tpl.id) ? "bg-blue-50" : ""}`} onClick={() => toggleDoc(tpl.id)}>
                      <td className="px-3 py-2"><Checkbox checked={selectedDocs.includes(tpl.id)} onCheckedChange={() => toggleDoc(tpl.id)} /></td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-800">{tpl.name}</div>
                        <div className="text-gray-400 text-[11px]">{tpl.description}</div>
                      </td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[11px]">{tpl.documentType}</Badge></td>
                      <td className="px-3 py-2 text-gray-500">{tpl.folder}</td>
                      <td className="px-3 py-2 font-mono text-gray-500">{tpl.format}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
              <span className="text-xs text-gray-500">{filtered.length} templates · {selectedDocs.length} selected</span>
              <span className="text-xs text-gray-400">Showing {filtered.length} of {MOCK_TEMPLATES.length}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button onClick={handleGenerate} disabled={generating || !selectedDocs.length}>
              <FileText className="h-4 w-4 mr-2" />{generating ? "Generating…" : "Generate Documents"}
            </Button>
            <Button variant="outline" onClick={() => navigate(-1 as any)}>Done</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
