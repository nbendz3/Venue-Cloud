import { useGetEvent } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStatusColor } from "./EventsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SECTIONS = [
  "Event Details", "Billing Details", "Functions", "Guest Room Blocks", 
  "Personnel", "Event Timeline", "Contacts", "Event Lifecycle", 
  "Notes", "Tasks", "Appointments", "Communication History", 
  "Sertifi eSignature Details", "Event Booking Details", "Event Attachments", 
  "Function Attachments", "Last Updated"
];

export default function EventDetail() {
  const params = useParams();
  const eventId = Number(params.id);
  const { data: event, isLoading } = useGetEvent(eventId, { query: { enabled: !!eventId } });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!event) {
    return <div className="p-8 text-center text-muted-foreground">Event not found.</div>;
  }

  return (
    <div className="flex h-full -m-6">
      {/* Left Navigation Sidebar */}
      <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Events
          </Link>
          <div className="font-semibold">{event.eventName}</div>
          <div className="text-xs text-muted-foreground mt-1">{event.eventNumber || `#${event.id}`}</div>
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
            <h1 className="text-xl font-bold">{event.eventName}</h1>
            <Badge variant="outline" className={getStatusColor(event.eventStatus)}>
              {event.eventStatus}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Section 0: Event Details */}
            <div id="section-0" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Event Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Account</div>
                    <div className="font-medium">{event.accountName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Primary Contact</div>
                    <div className="font-medium">{event.primaryContactName || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Dates</div>
                    <div className="font-medium">
                      {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}
                      {event.endDate && event.endDate !== event.startDate ? ` - ${new Date(event.endDate).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Event Type</div>
                    <div className="font-medium">{event.eventType || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Market Type</div>
                    <div className="font-medium">{event.marketType || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Est. Attendance</div>
                    <div className="font-medium">{event.estimatedAttendance || '-'}</div>
                  </div>
                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground mb-1">Description / Notes</div>
                    <div className="font-medium whitespace-pre-wrap">{event.eventNote || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 1: Billing Details */}
            <div id="section-1" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Billing Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Payment Arrangements</div>
                    <div className="font-medium">{event.paymentArrangements || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Tax Exempt</div>
                    <div className="font-medium">{event.taxExempt ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground mb-1">Billing Notes</div>
                    <div className="font-medium whitespace-pre-wrap">{event.billingNotes || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Additional sections would map here... rendering placeholders to show structure */}
            {SECTIONS.slice(2).map((section, idx) => (
              <div key={section} id={`section-${idx+2}`} className="scroll-mt-6 opacity-60">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">{section}</h2>
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground text-sm">
                    {section} content will render here
                  </CardContent>
                </Card>
              </div>
            ))}

          </div>
        </div>
      </div>
    </div>
  );
}
