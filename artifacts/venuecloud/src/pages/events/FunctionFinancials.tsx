import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetFunctionFinancials,
  useGetFunction,
  useGetEvent,
  useCreatePayment,
  useDeletePayment,
  useCreateAdjustment,
  useDeleteAdjustment,
  useCreateDeposit,
  usePostFunction,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  Calendar,
  History,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fmt(val: number | string | null | undefined) {
  if (val === null || val === undefined) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(val: number | string | null | undefined) {
  if (val === null || val === undefined) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

const PAYMENT_METHODS = ["Check", "Credit Card", "Cash", "ACH", "Wire"];
const PAYMENT_TYPES = ["Deposit", "Payment"];
const APPLIED_RATES_OPTIONS = [
  "Gratuity and Sales Tax",
  "Sales Tax Only",
  "Gratuity Only",
  "None",
];

const LIFECYCLE_ORDER = [
  "New", "Inquiry", "Proposal", "Tentative", "Definite",
  "Event Order", "Guaranteed", "Actualized", "Thank You", "Closed",
];

export default function FunctionFinancials() {
  const params = useParams<{ id: string; functionId: string }>();
  const eventId = Number(params.id);
  const functionId = Number(params.functionId);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [expandedLifecycle, setExpandedLifecycle] = useState<number[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    paymentAmount: "",
    paymentMethod: "Check",
    paymentType: "Payment",
    description: "",
    salesperson: "Sarah Johnson",
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    appliedRates: "None",
    description: "",
    salesperson: "Sarah Johnson",
  });
  const [depositForm, setDepositForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    description: "",
    salesperson: "Sarah Johnson",
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: event } = useGetEvent(eventId, { query: { enabled: !!eventId } as any });
  const { data: fn } = useGetFunction(functionId, { query: { enabled: !!functionId } as any });
  const { data: fin, isLoading } = useGetFunctionFinancials(functionId, { query: { enabled: !!functionId } as any });

  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const createAdjustment = useCreateAdjustment();
  const deleteAdjustment = useDeleteAdjustment();
  const createDeposit = useCreateDeposit();
  const postFunction = usePostFunction();

  const totals = fin?.totals as any;
  const balanceDue = fin?.balanceDue ?? 0;

  const handleRecordPayment = () => {
    createPayment.mutate(
      {
        data: {
          relatedType: "Function",
          relatedId: functionId,
          date: paymentForm.date,
          paymentAmount: parseFloat(paymentForm.paymentAmount),
          paymentMethod: paymentForm.paymentMethod,
          paymentType: paymentForm.paymentType,
          description: paymentForm.description,
          salesperson: paymentForm.salesperson,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/financials"] });
          setPaymentOpen(false);
          toast({ title: "Payment recorded" });
        },
      }
    );
  };

  const handleAddAdjustment = () => {
    createAdjustment.mutate(
      {
        data: {
          functionId,
          date: adjustmentForm.date,
          amount: parseFloat(adjustmentForm.amount),
          appliedRates: adjustmentForm.appliedRates,
          description: adjustmentForm.description,
          salesperson: adjustmentForm.salesperson,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/financials"] });
          setAdjustmentOpen(false);
          toast({ title: "Adjustment added" });
        },
      }
    );
  };

  const handleScheduleDeposit = () => {
    createDeposit.mutate(
      {
        data: {
          relatedType: "Function",
          relatedId: functionId,
          date: depositForm.date,
          amount: parseFloat(depositForm.amount),
          description: depositForm.description,
          salesperson: depositForm.salesperson,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/financials"] });
          setDepositOpen(false);
          toast({ title: "Deposit scheduled" });
        },
      }
    );
  };

  const handlePostFunction = () => {
    postFunction.mutate(
      { id: functionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/financials"] });
          toast({ title: "Function posted" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full -m-6">
      {/* Left sidebar */}
      <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href={`/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </Link>
          <div className="font-semibold">{fn?.functionType ?? "Function"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{fn?.functionDate} · Financial Details</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Overview</div>
          <div className="bg-muted/40 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Charges</span>
              <span className="font-medium">{fmt(totals?.charges)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Adj. Charges</span>
              <span className="font-medium">{fmt(totals?.adjustedCharges)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sales Tax</span>
              <span className="font-medium">{fmt(totals?.salesTax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Gratuity</span>
              <span className="font-medium">{fmt(totals?.gratuity)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm font-bold">
              <span>Total</span>
              <span>{fmt(totals?.total)}</span>
            </div>
            <div className={`border-t pt-2 flex justify-between text-sm font-bold ${Number(balanceDue) > 0 ? "text-red-600" : "text-green-600"}`}>
              <span>Balance Due</span>
              <span>{fmt(balanceDue)}</span>
            </div>
          </div>
          <div className="pt-1 space-y-1">
            <Button size="sm" variant="outline" asChild className="w-full">
              <Link href={`/events/${eventId}/functions/${functionId}/services`}>View Services (BEO)</Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="w-full">
              <Link href={`/events/${eventId}/financials`}>Event Financials</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <h1 className="font-bold text-lg">Function Financial Details</h1>
            <div className="text-xs text-muted-foreground">
              {event?.eventName} → {fn?.functionType} · {fn?.functionDate}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link href={`/events/${eventId}/functions/${functionId}/services`}>View Services</Link>
            </Button>
            <Button size="sm" onClick={handlePostFunction} disabled={postFunction.isPending}>
              Post Function
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Function Total Charges by Revenue Center */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Function Total Charges
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Revenue Center</TableHead>
                      <TableHead className="text-right">Charges</TableHead>
                      <TableHead className="text-right">Adjustments</TableHead>
                      <TableHead className="text-right">Adj. Charges</TableHead>
                      <TableHead className="text-right">Sales Tax</TableHead>
                      <TableHead className="text-right">Occ. Tax</TableHead>
                      <TableHead className="text-right">Gratuity</TableHead>
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fin?.revenueBreakdown?.length ?? 0) === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">
                          No services added yet.{" "}
                          <Link href={`/events/${eventId}/functions/${functionId}/services`} className="text-primary hover:underline">
                            Add services →
                          </Link>
                        </TableCell>
                      </TableRow>
                    )}
                    {fin?.revenueBreakdown?.map((rc: any) => (
                      <TableRow key={rc.revenueCenterName}>
                        <TableCell className="text-sm">{rc.revenueCenterName}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.charges)}</TableCell>
                        <TableCell className="text-right text-sm text-red-600">{rc.adjustments > 0 ? `−${fmt(rc.adjustments)}` : "—"}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.adjustedCharges)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.salesTax)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.occupancyTax)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.gratuity)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(rc.total)}</TableCell>
                      </TableRow>
                    ))}
                    {(fin?.revenueBreakdown?.length ?? 0) > 0 && (
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell>Totals</TableCell>
                        <TableCell className="text-right">{fmt(totals?.charges)}</TableCell>
                        <TableCell className="text-right"></TableCell>
                        <TableCell className="text-right">{fmt(totals?.adjustedCharges)}</TableCell>
                        <TableCell className="text-right">{fmt(totals?.salesTax)}</TableCell>
                        <TableCell className="text-right">{fmt(totals?.occupancyTax)}</TableCell>
                        <TableCell className="text-right">{fmt(totals?.gratuity)}</TableCell>
                        <TableCell className="text-right text-primary">{fmt(totals?.total)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col items-end gap-1 px-4 py-3 border-t text-sm">
                <div className="flex gap-8">
                  <span className="text-muted-foreground">Payments Received</span>
                  <span className="font-medium text-green-600">{fmt(fin?.paymentsReceived)}</span>
                </div>
                <div className={`flex gap-8 font-bold text-base ${Number(balanceDue) > 0 ? "text-red-600" : "text-green-600"}`}>
                  <span>Balance Due</span>
                  <span>{fmt(balanceDue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Function Margins */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Function Margins
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Revenue Center</TableHead>
                    <TableHead className="text-right">Adj. Charges</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fin?.revenueBreakdown?.map((rc: any) => (
                    <TableRow key={rc.revenueCenterName}>
                      <TableCell className="text-sm">{rc.revenueCenterName}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(rc.adjustedCharges)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(rc.cost)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${rc.margin >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(rc.margin)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${rc.marginPercent >= 0 ? "text-green-600" : "text-red-600"}`}>{pct(rc.marginPercent)}</TableCell>
                    </TableRow>
                  ))}
                  {(fin?.revenueBreakdown?.length ?? 0) > 0 && (
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell>Totals</TableCell>
                      <TableCell className="text-right">{fmt(totals?.adjustedCharges)}</TableCell>
                      <TableCell className="text-right">{fmt(totals?.cost)}</TableCell>
                      <TableCell className={`text-right ${totals?.margin >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(totals?.margin)}</TableCell>
                      <TableCell className={`text-right ${totals?.marginPercent >= 0 ? "text-green-600" : "text-red-600"}`}>{pct(totals?.marginPercent)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Deposits Scheduled */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Deposits Scheduled
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setDepositOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Schedule Deposit
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Salesperson</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fin?.depositsScheduled?.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4 text-sm">No deposits</TableCell></TableRow>
                  )}
                  {fin?.depositsScheduled?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">{d.date}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(d.amount)}</TableCell>
                      <TableCell className="text-sm">{d.description ?? "—"}</TableCell>
                      <TableCell className="text-sm">{d.salesperson ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payments Received */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Payments Received
              </CardTitle>
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Record Payment
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Salesperson</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fin?.payments?.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4 text-sm">No payments</TableCell></TableRow>
                  )}
                  {fin?.payments?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            deletePayment.mutate({ id: p.id }, {
                              onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/financials"] });
                                toast({ title: "Payment deleted" });
                              },
                            });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">{p.date}</TableCell>
                      <TableCell className="text-sm font-medium text-green-600">{fmt(p.paymentAmount)}</TableCell>
                      <TableCell className="text-sm">{p.paymentMethod}</TableCell>
                      <TableCell><Badge variant="outline">{p.paymentType}</Badge></TableCell>
                      <TableCell className="text-sm">{p.description ?? "—"}</TableCell>
                      <TableCell className="text-sm">{p.salesperson ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Adjustments / Discounts */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Adjustments / Discounts</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setAdjustmentOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Adjustment
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Revenue Center</TableHead>
                    <TableHead>Applied Rates</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Salesperson</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fin?.adjustments?.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4 text-sm">No adjustments</TableCell></TableRow>
                  )}
                  {fin?.adjustments?.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            deleteAdjustment.mutate({ id: a.id }, {
                              onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ["/api/functions/{id}/financials"] });
                                toast({ title: "Adjustment deleted" });
                              },
                            });
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">{a.date}</TableCell>
                      <TableCell className="text-sm font-medium text-orange-600">{fmt(a.amount)}</TableCell>
                      <TableCell className="text-sm">{a.revenueCenterName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{a.appliedRates ?? "—"}</TableCell>
                      <TableCell className="text-sm">{a.description ?? "—"}</TableCell>
                      <TableCell className="text-sm">{a.salesperson ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Function Lifecycle History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" /> Function Lifecycle History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Salesperson</TableHead>
                    <TableHead className="text-right">Forecasted</TableHead>
                    <TableHead className="text-right">Charges</TableHead>
                    <TableHead className="text-right">Adj. Charges</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fin?.lifecycleHistory?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-6 text-sm">
                        No lifecycle history yet. Click "Post Function" to create the first snapshot.
                      </TableCell>
                    </TableRow>
                  )}
                  {fin?.lifecycleHistory?.map((h: any) => (
                    <TableRow key={h.id}>
                      <TableCell>
                        <button onClick={() => setExpandedLifecycle(prev => prev.includes(h.id) ? prev.filter(x => x !== h.id) : [...prev, h.id])}>
                          {expandedLifecycle.includes(h.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{h.eventStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{h.date}</TableCell>
                      <TableCell className="text-sm">{h.salesperson}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(h.forecastedCharges)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(h.charges)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(h.adjustedCharges)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(h.cost)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(h.margin)}</TableCell>
                      <TableCell className="text-right text-sm">{pct(h.marginPercent)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Dialog */}
      {paymentOpen && (
        <Dialog open onOpenChange={() => setPaymentOpen(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div>
                <Label>Date</Label>
                <Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input type="number" value={paymentForm.paymentAmount} onChange={(e) => setPaymentForm({ ...paymentForm, paymentAmount: e.target.value })} />
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={paymentForm.paymentMethod} onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Type</Label>
                <Select value={paymentForm.paymentType} onValueChange={(v) => setPaymentForm({ ...paymentForm, paymentType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment} disabled={!paymentForm.paymentAmount || createPayment.isPending}>Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Adjustment Dialog */}
      {adjustmentOpen && (
        <Dialog open onOpenChange={() => setAdjustmentOpen(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Adjustment / Discount</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div>
                <Label>Date</Label>
                <Input type="date" value={adjustmentForm.date} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input type="number" value={adjustmentForm.amount} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Applied Rates</Label>
                <Select value={adjustmentForm.appliedRates} onValueChange={(v) => setAdjustmentForm({ ...adjustmentForm, appliedRates: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{APPLIED_RATES_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={adjustmentForm.description} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>Cancel</Button>
              <Button onClick={handleAddAdjustment} disabled={!adjustmentForm.amount || createAdjustment.isPending}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Schedule Deposit Dialog */}
      {depositOpen && (
        <Dialog open onOpenChange={() => setDepositOpen(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Schedule Deposit</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div>
                <Label>Date</Label>
                <Input type="date" value={depositForm.date} onChange={(e) => setDepositForm({ ...depositForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Amount *</Label>
                <Input type="number" value={depositForm.amount} onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Input value={depositForm.description} onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
              <Button onClick={handleScheduleDeposit} disabled={!depositForm.amount || createDeposit.isPending}>Schedule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
