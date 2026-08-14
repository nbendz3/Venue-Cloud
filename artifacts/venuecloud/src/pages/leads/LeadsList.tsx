import { useListLeads } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { formatDateOnly } from "@/lib/date";

export function getLeadStatusColor(status: string) {
  switch (status) {
    case 'Definite': return 'bg-green-100 text-green-800 border-green-200';
    case 'Tentative': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'New': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export default function LeadsList() {
  const [search, setSearch] = useState("");
  const { data: leads, isLoading } = useListLeads({ search });

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event Leads</h1>
          <p className="text-muted-foreground">Manage your sales pipeline.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Lead
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between space-y-0 flex-shrink-0">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search leads..." 
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
                <TableHead>Lead Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Probability</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : leads?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No leads found.
                  </TableCell>
                </TableRow>
              ) : (
                leads?.map(lead => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50 transition-colors group">
                    <TableCell>
                      <Link href={`/leads/${lead.id}`} className="font-semibold text-foreground group-hover:text-primary transition-colors block">
                        {lead.leadName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{lead.primaryContactName || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {formatDateOnly(lead.eventDate, "short", "TBD")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getLeadStatusColor(lead.leadStatus)}>
                        {lead.leadStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {lead.probability ? `${lead.probability}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {lead.budget ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lead.budget) : '-'}
                    </TableCell>
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
