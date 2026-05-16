import { useListContacts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

export default function ContactsList() {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = useListContacts({ search });

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage people associated with accounts and events.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Contact
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between space-y-0 flex-shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search contacts..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : contacts?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No contacts found.
                  </TableCell>
                </TableRow>
              ) : (
                contacts?.map(contact => (
                  <TableRow key={contact.id} className="cursor-pointer hover:bg-muted/50 transition-colors group">
                    <TableCell>
                      <Link href={`/contacts/${contact.id}`} className="font-semibold text-foreground group-hover:text-primary transition-colors block">
                        {contact.firstName} {contact.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {contact.accountId ? (
                        <Link href={`/accounts/${contact.accountId}`} className="text-primary hover:underline">
                          {contact.accountName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contact.title || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.email ? <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a> : '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contact.workPhone || contact.mobilePhone || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
