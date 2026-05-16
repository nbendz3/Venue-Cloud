import { useGetLead } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLeadStatusColor } from "./LeadsList";

const SECTIONS = [
  "Lead Details", "Event Details", "Budget & Value", "Notes", "Tasks", "Communication History"
];

export default function LeadDetail() {
  const params = useParams();
  const leadId = Number(params.id);
  const { data: lead, isLoading } = useGetLead(leadId, { query: { enabled: !!leadId } as any });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!lead) {
    return <div className="p-8 text-center text-muted-foreground">Lead not found.</div>;
  }

  return (
    <div className="flex h-full -m-6">
      {/* Left Navigation Sidebar */}
      <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/leads" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Leads
          </Link>
          <div className="font-semibold">{lead.leadName}</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SECTIONS.map((section, idx) => (
            <a 
              key={section} 
              href={`#section-${idx}`}
              className="block px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {section}
            </a>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{lead.leadName}</h1>
            <Badge variant="outline" className={getLeadStatusColor(lead.leadStatus)}>
              {lead.leadStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8">
            <div id="section-0" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Lead Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Primary Contact</div>
                    <div className="font-medium">{lead.primaryContactName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Salesperson</div>
                    <div className="font-medium">{lead.salesperson || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Division</div>
                    <div className="font-medium">{lead.division || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Decision Date</div>
                    <div className="font-medium">{lead.decisionDate ? new Date(lead.decisionDate).toLocaleDateString() : '-'}</div>
                  </div>
                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground mb-1">Description</div>
                    <div className="font-medium whitespace-pre-wrap">{lead.description || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div id="section-1" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Event Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Event Date</div>
                    <div className="font-medium">{lead.eventDate ? new Date(lead.eventDate).toLocaleDateString() : '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Function Type</div>
                    <div className="font-medium">{lead.functionType || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Estimated Attendance</div>
                    <div className="font-medium">{lead.estimatedAttendance || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div id="section-2" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Budget & Value</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Budget</div>
                    <div className="font-medium">{lead.budget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lead.budget) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Probability</div>
                    <div className="font-medium">{lead.probability ? `${lead.probability}%` : '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Expected Value</div>
                    <div className="font-medium">{lead.budget && lead.probability ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lead.budget * (lead.probability / 100)) : '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}