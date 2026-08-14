import { useListTasks, useUpdateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, CheckCircle2, ListTodo, AlertCircle, CheckCheck, ClipboardList, User, Calendar } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDateOnly } from "@/lib/date";

type Folder = "All" | "My" | "Overdue" | "Completed";
type Priority = "All" | "High" | "Medium" | "Low";

const FOLDERS: Array<{ id: Folder; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "All", label: "All Tasks", icon: ListTodo },
  { id: "My", label: "My Tasks", icon: User },
  { id: "Overdue", label: "Overdue", icon: AlertCircle },
  { id: "Completed", label: "Completed", icon: CheckCheck },
];

const PRIORITIES: Priority[] = ["All", "High", "Medium", "Low"];

export default function TasksList() {
  const [folder, setFolder] = useState<Folder>("All");
  const [priority, setPriority] = useState<Priority>("All");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");

  const apiStatus = folder === "Completed" ? "Closed" : "Open";
  const { data: allTasks, isLoading } = useListTasks({ status: folder === "All" || folder === "My" || folder === "Overdue" ? "Open" : "Closed" });
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);

  const tasks = (allTasks ?? []).filter(task => {
    if (folder === "Overdue") {
      if (!task.dueDate || task.dueDate >= today || task.status !== "Open") return false;
    }
    if (folder === "My") {
      if (task.salesperson !== "JS") {
        // Show all open tasks as "my tasks" since we don't have a real user system
      }
    }
    if (priority !== "All" && task.priority !== priority) return false;
    if (dueDateFrom && task.dueDate && task.dueDate < dueDateFrom) return false;
    if (dueDateTo && task.dueDate && task.dueDate > dueDateTo) return false;
    return true;
  });

  const handleToggleStatus = (taskId: number, currentStatus: string) => {
    updateTask.mutate(
      { id: taskId, data: { status: currentStatus === "Open" ? "Closed" : "Open" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ status: apiStatus }) });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ status: "Open" }) });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ status: "Closed" }) });
        },
      }
    );
  };

  const overdueCount = (allTasks ?? []).filter(
    t => t.status === "Open" && t.dueDate && t.dueDate < today
  ).length;

  return (
    <div className="flex h-full -m-6">
      {/* Left sidebar */}
      <div className="w-56 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Tasks
            </div>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" asChild>
              <Link href="/tasks/new"><Plus className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>

        {/* Folders */}
        <div className="p-2">
          <div className="text-xs font-medium text-muted-foreground px-3 py-1.5 uppercase tracking-wide">Views</div>
          <div className="space-y-0.5">
            {FOLDERS.map(f => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setFolder(f.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                    folder === f.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" />
                    {f.label}
                  </span>
                  {f.id === "Overdue" && overdueCount > 0 && (
                    <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium">
                      {overdueCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t my-1" />

        {/* Priority filter */}
        <div className="p-2">
          <div className="text-xs font-medium text-muted-foreground px-3 py-1.5 uppercase tracking-wide">Priority</div>
          <div className="space-y-0.5">
            {PRIORITIES.map(p => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                  priority === p
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {p !== "All" && (
                  <span className={`w-2 h-2 rounded-full ${
                    p === "High" ? "bg-red-500" : p === "Medium" ? "bg-amber-500" : "bg-gray-400"
                  }`} />
                )}
                {p === "All" ? "All Priorities" : p}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t my-1" />

        {/* Due date filter */}
        <div className="p-3">
          <div className="text-xs font-medium text-muted-foreground px-0 py-1.5 uppercase tracking-wide flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Due Date Range
          </div>
          <div className="space-y-2 mt-1">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={dueDateFrom}
                onChange={e => setDueDateFrom(e.target.value)}
                className="h-7 text-xs mt-0.5"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={dueDateTo}
                onChange={e => setDueDateTo(e.target.value)}
                className="h-7 text-xs mt-0.5"
              />
            </div>
            {(dueDateFrom || dueDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => { setDueDateFrom(""); setDueDateTo(""); }}
              >
                Clear dates
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="h-14 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">
              {FOLDERS.find(f => f.id === folder)?.label ?? "Tasks"}
            </h1>
            {!isLoading && <Badge variant="secondary">{tasks.length}</Badge>}
            {priority !== "All" && (
              <Badge variant="outline" className="text-xs">{priority} priority</Badge>
            )}
          </div>
          <Button size="sm" asChild>
            <Link href="/tasks/new"><Plus className="w-4 h-4 mr-2" />New Task</Link>
          </Button>
        </header>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Task Name</TableHead>
                <TableHead>Related To</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-10 h-10 text-muted" />
                      <div className="text-sm">No tasks found</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map(task => {
                  const isOverdue = task.dueDate && task.dueDate < today && task.status === "Open";
                  return (
                    <TableRow key={task.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={task.status === "Closed"}
                          onCheckedChange={() => handleToggleStatus(task.id, task.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${task.status === 'Closed' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.name}
                        </div>
                        {(task as any).description && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                            {(task as any).description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {task.relatedType && task.relatedId ? (
                          <Link href={`/${task.relatedType.toLowerCase()}s/${task.relatedId}`} className="text-primary hover:underline text-sm">
                            {task.relatedName || `${task.relatedType} #${task.relatedId}`}
                          </Link>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'secondary' : 'outline'}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}>
                          {formatDateOnly(task.dueDate, "medium", "-")}
                        </span>
                        {isOverdue && (
                          <span className="ml-1.5 text-xs text-red-500">Overdue</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{task.salesperson || '-'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
