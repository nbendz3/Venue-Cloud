import { useGetAccount } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, MoreHorizontal, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  "Account Details", "Address Information", "Contacts", "Events", "Leads", "Notes", "Tasks", "Attachments"
];

export default function AccountDetail() {
  const params = useParams();
  const accountId = Number(params.id);
  const { data: account, isLoading } = useGetAccount(accountId, { query: { enabled: !!accountId } as any });

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
            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8">
            <div id="section-0" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Account Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Account Owner</div>
                    <div className="font-medium">{account.owner || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Phone</div>
                    <div className="font-medium">{account.phone || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Website</div>
                    <div className="font-medium">{account.website ? (
                      <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {account.website}
                      </a>
                    ) : '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Tax Exempt</div>
                    <div className="font-medium">{account.taxExempt ? 'Yes' : 'No'}</div>
                  </div>
                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground mb-1">Description</div>
                    <div className="font-medium whitespace-pre-wrap">{account.description || '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div id="section-1" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Address Information</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <div className="col-span-full">
                    <div className="text-sm text-muted-foreground mb-1">Mailing Address</div>
                    <div className="font-medium">
                      {account.mailingAddress1 || account.city || account.state ? (
                        <>
                          {account.mailingAddress1 && <div>{account.mailingAddress1}</div>}
                          {account.mailingAddress2 && <div>{account.mailingAddress2}</div>}
                          <div>
                            {[account.city, account.state, account.postalCode].filter(Boolean).join(', ')}
                          </div>
                          {account.country && <div>{account.country}</div>}
                        </>
                      ) : '-'}
                    </div>
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