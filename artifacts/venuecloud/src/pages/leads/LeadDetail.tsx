import { useGetLead } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLeadStatusColor } from "./LeadsList";
import { CommunicationHistoryPanel } from "@/components/CommunicationHistoryPanel";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateOnly } from "@/lib/date";

const SECTIONS = [
  "Lead Details", "Event Details", "Budget & Value", "Notes", "Tasks", "Communication History"
];

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="font-medium">{children ?? <span className="text-muted-foreground">-</span>}</div>
    </div>
  );
}

const fmt$ = (n: number | string | null | undefined) => {
  if (n == null) return '-';
  const num = typeof n === 'string' ? parseFloat(n) : n;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
};

export default function LeadDetail() {
  const params = useParams();
  const leadId = Number(params.id);
  const { data: lead, isLoading } = useGetLead(leadId, { query: { enabled: !!leadId } as any });
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks", { relatedType: "Lead", relatedId: leadId }],
    queryFn: () => fetch(`/api/tasks?relatedType=Lead&relatedId=${leadId}`).then(r => r.json()),
    enabled: !!leadId,
  });

  const today = new Date().toISOString().slice(0, 10);

  const handleToggle = (taskId: number, current: string) => {
    updateTask.mutate(
      { id: taskId, data: { status: current === "Open" ? "Closed" : "Open" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ status: "Open" }) });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ status: "Closed" }) });
          queryClient.invalidateQueries({ queryKey: ["/api/tasks", { relatedType: "Lead", relatedId: leadId }] });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-12 w-1/3 mb-8" /><Skeleton className="h-96 w-full" /></div>;
  }

  if (!lead) {
    return <div className="p-8 text-center text-muted-foreground">Lead not found.</div>;
  }

  const expectedValue = lead.budget && lead.probability
    ? parseFloat(String(lead.budget)) * (lead.probability / 100)
    : null;

  return (
    <div className="flex h-full -m-6">
      {/* Left Navigation Sidebar */}
      <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href="/leads" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Leads
          </Link>
          <div className="font-semibold">{lead.leadName}</div>
          <Badge variant="outline" className={`mt-1 text-xs ${getLeadStatusColor(lead.leadStatus)}`}>
            {lead.leadStatus}
          </Badge>
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
            {lead.probability != null && (
              <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                {lead.probability}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/leads/${leadId}/edit`}><Edit className="w-4 h-4 mr-2" /> Edit</Link>
            </Button>
            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-4xl mx-auto space-y-8">

            {/* Section 0: Lead Details */}
            <div id="section-0" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Lead Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <Field label="Lead Name">{lead.leadName}</Field>
                  <Field label="Status">
                    <Badge variant="outline" className={getLeadStatusColor(lead.leadStatus)}>{lead.leadStatus}</Badge>
                  </Field>
                  <Field label="Primary Contact">
                    {(lead as any).primaryContactId ? (
                      <Link href={`/contacts/${(lead as any).primaryContactId}`} className="text-primary hover:underline">
                        {(lead as any).primaryContactName || `Contact #${(lead as any).primaryContactId}`}
                      </Link>
                    ) : ((lead as any).primaryContactName || '-')}
                  </Field>
                  <Field label="Owner">{lead.owner || '-'}</Field>
                  <Field label="Salesperson">{lead.salesperson || '-'}</Field>
                  <Field label="Division">{lead.division || '-'}</Field>
                  <Field label="Site">{lead.site || '-'}</Field>
                  <Field label="Lead Type">{lead.leadType || '-'}</Field>
                  <Field label="Referral Type">{lead.referralType || '-'}</Field>
                  <Field label="Decision Date">
                    {lead.decisionDate ? new Date(lead.decisionDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : '-'}
                  </Field>
                  <div className="col-span-full border-t pt-4">
                    <Field label="Description / Notes">
                      <span className="font-normal text-sm whitespace-pre-wrap">{lead.description || '-'}</span>
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 1: Event Details */}
            <div id="section-1" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Event Details</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-2 gap-6">
                  <Field label="Event Date">
                    {formatDateOnly(lead.eventDate, "long", "-")}
                  </Field>
                  <Field label="Function Type">{lead.functionType || '-'}</Field>
                  <Field label="Start Time">{lead.startTime || '-'}</Field>
                  <Field label="End Time">{lead.endTime || '-'}</Field>
                  <Field label="Estimated Attendance">
                    {lead.estimatedAttendance != null ? lead.estimatedAttendance.toLocaleString() : '-'}
                  </Field>
                  <Field label="Payment Arrangements">{(lead as any).paymentArrangements || '-'}</Field>
                  <div className="col-span-full border-t pt-4">
                    <Field label="Billing Notes">
                      <span className="font-normal text-sm whitespace-pre-wrap">{(lead as any).billingNotes || '-'}</span>
                    </Field>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 2: Budget & Value */}
            <div id="section-2" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Budget & Value</h2>
              <Card>
                <CardContent className="p-6 grid grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Estimated Budget</div>
                    <div className="text-2xl font-bold">{lead.budget ? fmt$(lead.budget) : '-'}</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Probability</div>
                    <div className="text-2xl font-bold">{lead.probability != null ? `${lead.probability}%` : '-'}</div>
                  </div>
                  <div className="text-center p-4 bg-primary/5 border border-primary/10 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Expected Value</div>
                    <div className="text-2xl font-bold text-primary">{expectedValue != null ? fmt$(expectedValue) : '-'}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Section 3: Notes */}
            <div id="section-3" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold">Notes</h2>
                <Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> New Note</Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead>Notes</TableHead>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Salesperson</TableHead>
                        <TableHead>Internal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-sm">
                          No notes added.
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Section 4: Tasks */}
            <div id="section-4" className="scroll-mt-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h2 className="text-lg font-semibold">Tasks</h2>
                <Button size="sm" asChild>
                  <Link href="/tasks/new"><Plus className="w-3.5 h-3.5 mr-1" /> New Task</Link>
                </Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Task Name</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasksLoading ? (
                        <TableRow><TableCell colSpan={6} className="py-4"><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                      ) : tasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                            No tasks linked to this lead.
                          </TableCell>
                        </TableRow>
                      ) : tasks.map((task: any) => {
                        const isOverdue = task.dueDate && task.dueDate < today && task.status === "Open";
                        return (
                          <TableRow key={task.id} className="hover:bg-muted/30">
                            <TableCell>
                              <Checkbox
                                checked={task.status === "Closed"}
                                onCheckedChange={() => handleToggle(task.id, task.status)}
                              />
                            </TableCell>
                            <TableCell className={`font-medium ${task.status === "Closed" ? "line-through text-muted-foreground" : ""}`}>
                              {task.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "secondary" : "outline"}>
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                                {formatDateOnly(task.dueDate, "medium", "-")}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{task.salesperson || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={task.status === "Closed" ? "secondary" : "outline"} className="text-xs">
                                {task.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Section 5: Communication History */}
            <div id="section-5" className="scroll-mt-6">
              <h2 className="text-lg font-semibold mb-4 pb-2 border-b">Communication History</h2>
              <Card>
                <CardContent className="p-6">
                  <div className="flex gap-2 mb-4 pb-4 border-b">
                    <Button size="sm">Log Activity</Button>
                    <Button size="sm" variant="outline">Compose Email</Button>
                  </div>
                  <CommunicationHistoryPanel relatedType="Lead" relatedId={leadId} />
                </CardContent>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
