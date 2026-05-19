import { useGetAccount } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, MoreHorizontal, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const SECTIONS = [
  "Account Details", "Address Information", "Contacts", "Events", "Leads", "Notes", "Tasks", "Attachments"
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="font-medium">{children}</div>
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

export default function AccountDetail() {
  const params = useParams();
  const accountId = Number(params.id);
  const { data: account, isLoading } = useGetAccount(accountId, { query: { enabled: !!accountId } as any });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<any[]>({
    queryKey: ["/api/contacts", { accountId }],
    queryFn: () => fetch(`/api/contacts?accountId=${accountId}`).then(r => r.json()),
    enabled: !!accountId,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/accounts", accountId, "events"],
    queryFn: () => fetch(`/api/accounts/${accountId}/events`).then(r => r.json()),
    enabled: !!accountId,
  });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!account) {
    return <div className="p-8 text-center text-muted-foreground">Account not found.</div>;
  }

  return (
    <div className="flex h-full -m-6">
      {/* Left Navigation Sidebar */}
      <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/accounts" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Accounts
          </Link>
          <div className="font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {account.name}
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
            <h1 className="text-xl font-bold">{account.name}</h1>
            {account.accountNumber && (
              <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                #{account.accountNumber}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/accounts/${accountId}/edit`}><Edit className="w-4 h-4 mr-2" /> Edit</Link>
            </Button>
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Section 0: Account Details */}
            <div id="section-0" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Account Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <Field label="Account Owner">{account.owner || '-'}</Field>
                  <Field label="Phone">{account.phone || '-'}</Field>
                  <Field label="Fax">{account.fax || '-'}</Field>
                  <Field label="Website">
                    {account.website ? (
                      <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`}
                        target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {account.website}
                      </a>
                    ) : '-'}
                  </Field>
                  <Field label="Tax Exempt">
                    {account.taxExempt ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Yes</span>
                    ) : 'No'}
                  </Field>
                  <Field label="Tax Exempt Exp. Date">{account.taxExemptExpDate || '-'}</Field>
                  <Field label="Tax Exempt Number">{account.taxExemptNumber || '-'}</Field>
                  <div className="col-span-full">
                    <Field label="Description">
                      <span className="whitespace-pre-wrap font-normal text-sm">{account.description || '-'}</span>
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
                      {account.mailingAddress1 || account.city || account.state ? (
                        <>
                          {account.mailingAddress1 && <div>{account.mailingAddress1}</div>}
                          {account.mailingAddress2 && <div>{account.mailingAddress2}</div>}
                          <div>{[account.city, account.state, account.postalCode].filter(Boolean).join(', ')}</div>
                          {account.country && <div>{account.country}</div>}
                        </>
                      ) : '-'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Contacts */}
            <div id="section-2" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Contacts</h2>
              <Card>
                <CardContent className="p-0">
                  {contactsLoading ? (
                    <div className="p-4"><Skeleton className="h-16 w-full" /></div>
                  ) : contacts.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No contacts linked to this account.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Name</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((c: any) => (
                          <TableRow key={c.id} className="hover:bg-muted/30">
                            <TableCell>
                              <Link href={`/contacts/${c.id}`} className="font-medium text-primary hover:underline">
                                {c.firstName} {c.lastName}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{c.title || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">{c.email || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">{c.workPhone || c.mobilePhone || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">{c.contactType || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Section 3: Events */}
            <div id="section-3" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Events</h2>
              <Card>
                <CardContent className="p-0">
                  {eventsLoading ? (
                    <div className="p-4"><Skeleton className="h-16 w-full" /></div>
                  ) : events.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No events linked to this account.</div>
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
                              {e.startDate ? new Date(e.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
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

            {/* Remaining placeholder sections */}
            {["Leads", "Notes", "Tasks", "Attachments"].map((section, idx) => (
              <div key={section} id={`section-${idx + 4}`} className="scroll-mt-6 opacity-60">
                <h2 className="text-lg font-semibold mb-4 pb-2 border-b">{section}</h2>
                <Card className="bg-muted/30 border-dashed">
                  <CardContent className="p-8 text-center text-muted-foreground text-sm">
                    {section} will appear here
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
