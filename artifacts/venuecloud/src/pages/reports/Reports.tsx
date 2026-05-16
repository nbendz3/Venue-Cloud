import { useListReports } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Folder, FileText, Play } from "lucide-react";

export default function Reports() {
  const { data: reports, isLoading } = useListReports({});

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analytics and data exports.</p>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        <Card className="w-64 flex-shrink-0 flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b bg-muted/20">
            <h3 className="font-semibold text-sm">Folders</h3>
          </CardHeader>
          <CardContent className="p-2 overflow-y-auto">
            <div className="space-y-1">
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm rounded bg-muted font-medium text-foreground">
                <Folder className="w-4 h-4 text-blue-500" /> All Reports
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/50 text-muted-foreground cursor-pointer">
                <Folder className="w-4 h-4 text-blue-500" /> Sales & Catering
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/50 text-muted-foreground cursor-pointer">
                <Folder className="w-4 h-4 text-blue-500" /> Financial
              </div>
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/50 text-muted-foreground cursor-pointer">
                <Folder className="w-4 h-4 text-blue-500" /> Operations
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardContent className="p-0 flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  <TableHead>Report Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : reports?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No reports found.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports?.map(report => (
                    <TableRow key={report.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {report.reportName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{report.description}</TableCell>
                      <TableCell className="text-muted-foreground">{report.folder || 'Unfiled'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline">
                          <Play className="w-3 h-3 mr-2" /> Run
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}