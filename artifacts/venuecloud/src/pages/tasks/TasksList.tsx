import { useListTasks, useUpdateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function TasksList() {
  const [filter, setFilter] = useState<"Open" | "Closed">("Open");
  const { data: tasks, isLoading } = useListTasks({ status: filter });
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();

  const handleToggleStatus = (taskId: number, currentStatus: string) => {
    updateTask.mutate({ 
      id: taskId, 
      data: { status: currentStatus === "Open" ? "Closed" : "Open" } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ status: filter }) });
      }
    });
  };

  return (
    <div className="space-y-4 h-full flex flex-col max-w-6xl mx-auto">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your activities and to-dos.</p>
        </div>
        <Button asChild>
          <Link href="/tasks/new"><Plus className="w-4 h-4 mr-2" />New Task</Link>
        </Button>
      </div>

      <div className="flex gap-2">
        <Button 
          variant={filter === "Open" ? "default" : "outline"} 
          onClick={() => setFilter("Open")}
          size="sm"
        >
          Open Tasks
        </Button>
        <Button 
          variant={filter === "Closed" ? "default" : "outline"} 
          onClick={() => setFilter("Closed")}
          size="sm"
        >
          Completed
        </Button>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="p-0 flex-1 overflow-auto">
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
              ) : tasks?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-muted mb-2" />
                    No {filter.toLowerCase()} tasks found.
                  </TableCell>
                </TableRow>
              ) : (
                tasks?.map(task => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status === "Open";
                  
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
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{task.salesperson || '-'}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}