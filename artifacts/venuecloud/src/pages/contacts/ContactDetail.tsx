import { useGetContact } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, MoreHorizontal, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ContactDetail() {
  const params = useParams();
  const contactId = Number(params.id);
  const { data: contact, isLoading } = useGetContact(contactId, { query: { enabled: !!contactId } as any });

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!contact) {
    return <div className="p-8 text-center text-muted-foreground">Contact not found.</div>;
  }

  return (
    <div className="flex h-full flex-col max-w-5xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/contacts" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Contacts
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center border border-primary/20">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {contact.salutation} {contact.firstName} {contact.lastName}
                {!contact.active && <Badge variant="secondary">Inactive</Badge>}
              </h1>
              {contact.title && <div className="text-muted-foreground">{contact.title}</div>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/contacts/${contactId}/edit`}><Edit className="w-4 h-4 mr-2" /> Edit</Link>
          </Button>
          <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 grid grid-cols-2 gap-y-6 gap-x-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Account</div>
                {contact.accountId ? (
                  <Link href={`/accounts/${contact.accountId}`} className="font-medium text-primary hover:underline">
                    {contact.accountName}
                  </Link>
                ) : (
                  <div className="font-medium text-muted-foreground">-</div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Department</div>
                <div className="font-medium">{contact.department || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Email</div>
                <div className="font-medium">{contact.email ? <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a> : '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Work Phone</div>
                <div className="font-medium">{contact.workPhone || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Mobile Phone</div>
                <div className="font-medium">{contact.mobilePhone || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Contact Type</div>
                <div className="font-medium">{contact.contactType || '-'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 pb-2 border-b">Additional Information</h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div className="col-span-full">
                  <div className="text-sm text-muted-foreground mb-1">Mailing Address</div>
                  <div className="font-medium">
                    {contact.mailingAddress1 || contact.city || contact.state ? (
                      <>
                        {contact.mailingAddress1 && <div>{contact.mailingAddress1}</div>}
                        <div>
                          {[contact.city, contact.state, contact.postalCode].filter(Boolean).join(', ')}
                        </div>
                        {contact.country && <div>{contact.country}</div>}
                      </>
                    ) : '-'}
                  </div>
                </div>
                <div className="col-span-full">
                  <div className="text-sm text-muted-foreground mb-1">Description / Notes</div>
                  <div className="font-medium whitespace-pre-wrap">{contact.description || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4 pb-2 border-b text-sm">System Info</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1">Owner</div>
                  <div>{contact.owner || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Created</div>
                  <div>{new Date(contact.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Last Updated</div>
                  <div>{new Date(contact.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}