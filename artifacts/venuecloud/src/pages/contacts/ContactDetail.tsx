import { useGetContact } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDateOnly } from "@/lib/date";

const SECTIONS = [
  "Contact Details", "Address Information", "Events", "System Info"
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="font-medium">{children ?? '-'}</div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "Definite": return "bg-green-100 text-green-800";
    case "Tentative": return "bg-amber-100 text-amber-800";
    case "Actualized": return "bg-blue-100 text-blue-800";
    case "Cancelled": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-700";
  }
}

export default function ContactDetail() {
  const params = useParams();
  const contactId = Number(params.id);
  const { data: contact, isLoading } = useGetContact(contactId, { query: { enabled: !!contactId } as any });

  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/contacts", contactId, "events"],
    queryFn: () => fetch(`/api/contacts/${contactId}/events`).then(r => r.json()),
    enabled: !!contactId,
  });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!contact) {
    return <div className="p-8 text-center text-muted-foreground">Contact not found.</div>;
  }

  return (
    <div className="flex h-full -m-6">
      {/* Left Navigation Sidebar */}
      <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/contacts" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Contacts
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center border border-primary/20 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-sm">{contact.firstName} {contact.lastName}</div>
              {contact.title && <div className="text-xs text-muted-foreground">{contact.title}</div>}
            </div>
          </div>
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
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center border border-primary/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {contact.salutation} {contact.firstName} {contact.lastName}
                {!contact.active && <Badge variant="secondary">Inactive</Badge>}
              </h1>
              {contact.title && <div className="text-sm text-muted-foreground">{contact.title}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/contacts/${contactId}/edit`}><Edit className="w-4 h-4 mr-2" /> Edit</Link>
            </Button>
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Section 0: Contact Details */}
            <div id="section-0" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Contact Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <Field label="Account">
                    {contact.accountId ? (
                      <Link href={`/accounts/${contact.accountId}`} className="text-primary hover:underline">
                        {contact.accountName}
                      </Link>
                    ) : '-'}
                  </Field>
                  <Field label="Department">{contact.department || '-'}</Field>
                  <Field label="Contact Type">{contact.contactType || '-'}</Field>
                  <Field label="Owner">{contact.owner || '-'}</Field>
                  <Field label="Email">
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
                    ) : '-'}
                  </Field>
                  <Field label="Work Phone">{contact.workPhone || '-'}</Field>
                  <Field label="Mobile Phone">{contact.mobilePhone || '-'}</Field>
                  <Field label="Home Phone">{contact.homePhone || '-'}</Field>
                  <Field label="Fax">{contact.fax || '-'}</Field>
                  <Field label="Birthday">{contact.birthday || '-'}</Field>
                  <Field label="Anniversary">{contact.anniversary || '-'}</Field>
                  <Field label="Preferences">
                    <span className="font-normal text-sm whitespace-pre-wrap">{contact.preferences || '-'}</span>
                  </Field>
                  <div className="col-span-full">
                    <Field label="Description / Notes">
                      <span className="font-normal text-sm whitespace-pre-wrap">{contact.description || '-'}</span>
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 1: Address Information */}
            <div id="section-1" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Address Information</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Primary Address</div>
                    <div className="font-medium">
                      {contact.mailingAddress1 || contact.city || contact.state ? (
                        <>
                          {contact.mailingAddress1 && <div>{contact.mailingAddress1}</div>}
                          {(contact as any).mailingAddress2 && <div>{(contact as any).mailingAddress2}</div>}
                          <div>{[contact.city, contact.state, contact.postalCode].filter(Boolean).join(', ')}</div>
                          {contact.country && <div>{contact.country}</div>}
                        </>
                      ) : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Alternate Address</div>
                    <div className="font-medium">
                      {(contact as any).otherAddress1 || (contact as any).otherCity || (contact as any).otherState ? (
                        <>
                          {(contact as any).otherAddress1 && <div>{(contact as any).otherAddress1}</div>}
                          <div>{[(contact as any).otherCity, (contact as any).otherState, (contact as any).otherPostalCode].filter(Boolean).join(', ')}</div>
                          {(contact as any).otherCountry && <div>{(contact as any).otherCountry}</div>}
                        </>
                      ) : '-'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Events */}
            <div id="section-2" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Events</h2>
              <Card>
                <CardContent className="p-0">
                  {eventsLoading ? (
                    <div className="p-4"><Skeleton className="h-16 w-full" /></div>
                  ) : events.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No events linked to this contact.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Event Name</TableHead>
                          <TableHead>Event #</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead className="text-right">Attendance</TableHead>
                          <TableHead>Owner</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {events.map((e: any) => (
                          <TableRow key={e.id} className="hover:bg-muted/30">
                            <TableCell>
                              <Link href={`/events/${e.id}`} className="font-medium text-primary hover:underline">
                                {e.eventName}
                              </Link>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{e.eventNumber || `#${e.id}`}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${getStatusColor(e.eventStatus)}`}>{e.eventStatus}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDateOnly(e.startDate, "medium", "TBD")}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{e.estimatedAttendance ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{e.owner || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Section 3: System Info */}
            <div id="section-3" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">System Info</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-3 gap-6">
                  <Field label="Site">{contact.site || '-'}</Field>
                  <Field label="Created">{new Date(contact.createdAt).toLocaleDateString()}</Field>
                  <Field label="Last Updated">{new Date(contact.updatedAt).toLocaleDateString()}</Field>
                  <Field label="Created By">{(contact as any).createdBy || '-'}</Field>
                  <Field label="Updated By">{(contact as any).updatedBy || '-'}</Field>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
