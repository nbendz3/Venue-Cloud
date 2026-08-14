import { useState } from "react";
import { TaxRatesDialog, ServiceFeesDialog } from "@/components/RateEditors";
import { useParams, Link } from "wouter";
import {
  useGetEventFinancials,
  useGetEvent,
  useCreatePayment,
  useDeletePayment,
  useCreateDeposit,
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
  TrendingDown,
  Calendar,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fmt(val: number | string | null | undefined, currency = true) {
  if (val === null || val === undefined) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  if (currency) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function pct(val: number | string | null | undefined) {
  if (val === null || val === undefined) return "—";
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "—";
  return `${n.toFixed(1)}%`;
}

const PAYMENT_METHODS = ["Check", "Credit Card", "Cash", "ACH", "Wire"];
const PAYMENT_TYPES = ["Deposit", "Payment"];

export default function EventFinancials() {
  const params = useParams<{ id: string }>();
  const eventId = Number(params.id);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    paymentAmount: "",
    paymentMethod: "Check",
    paymentType: "Payment",
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
  const { data: fin, isLoading } = useGetEventFinancials(eventId, { query: { enabled: !!eventId } as any });

  const createPayment = useCreatePayment();
  const deletePayment = useDeletePayment();
  const createDeposit = useCreateDeposit();

  const handleRecordPayment = () => {
    createPayment.mutate(
      {
        data: {
          relatedType: "Event",
          relatedId: eventId,
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
          queryClient.invalidateQueries({ queryKey: ["/api/events/{id}/financials"] });
          setPaymentOpen(false);
          toast({ title: "Payment recorded" });
        },
      }
    );
  };

  const handleScheduleDeposit = () => {
    createDeposit.mutate(
      {
        data: {
          relatedType: "Event",
          relatedId: eventId,
          date: depositForm.date,
          amount: parseFloat(depositForm.amount),
          description: depositForm.description,
          salesperson: depositForm.salesperson,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/events/{id}/financials"] });
          setDepositOpen(false);
          toast({ title: "Deposit scheduled" });
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

  const totals = fin?.totals as any;
  const functions = fin?.functions as any[] ?? [];
  const rcBreakdown = (fin as any)?.revenueCenterBreakdown as any[] ?? [];
  const balanceDue = fin?.balanceDue ?? 0;

  return (
    <>
    <div className="flex h-full -m-6">
      {/* Left sidebar */}
      <div className="w-64 border-r bg-card flex-shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <Link href={`/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Event
          </Link>
          <div className="font-semibold">{event?.eventName ?? "Event"}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Financial Details</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-muted-foreground uppercase font-medium tracking-wide">Overview</div>
          <div className="bg-muted/40 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Charges</span>
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
              <span>Grand Total</span>
              <span>{fmt(totals?.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payments Rec'd</span>
              <span className="font-medium text-green-600">−{fmt(fin?.paymentsReceived)}</span>
            </div>
            <div className={`border-t pt-2 flex justify-between text-sm font-bold ${Number(balanceDue) < 0 ? "text-green-600" : Number(balanceDue) > 0 ? "text-red-600" : ""}`}>
              <span>Balance Due</span>
              <span>{fmt(balanceDue)}</span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <Button size="sm" variant="outline" asChild className="w-full">
            <Link href={`/events/${eventId}`}>View Event Details</Link>
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <h1 className="font-bold text-lg">Event Financial Details</h1>
            <div className="text-xs text-muted-foreground">{event?.eventName}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">Post Functions</Button>
            <Button size="sm" variant="outline">Revert Functions</Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Event Total Charges */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Event Total Charges
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Function</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Charges</TableHead>
                      <TableHead className="text-right">Adj. Charges</TableHead>
                      <TableHead className="text-right">Sales Tax</TableHead>
                      <TableHead className="text-right">Occ. Tax</TableHead>
                      <TableHead className="text-right">Gratuity 22%</TableHead>
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {functions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No functions with services yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {functions.map((fn: any) => (
                      <TableRow key={fn.functionId}>
                        <TableCell>
                          <Link href={`/events/${eventId}/functions/${fn.functionId}/services`} className="text-primary hover:underline">
                            {fn.functionType}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fn.functionDate}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(fn.charges)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(fn.adjustedCharges)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(fn.salesTax)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(fn.occupancyTax)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(fn.gratuity)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(fn.total)}</TableCell>
                      </TableRow>
                    ))}
                    {functions.length > 0 && (
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={2}>Totals</TableCell>
                        <TableCell className="text-right">{fmt(totals?.charges)}</TableCell>
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

          {/* Revenue Center Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="w-4 h-4" /> Revenue Center Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead>Revenue Center</TableHead>
                      <TableHead className="text-right">Charges</TableHead>
                      <TableHead className="text-right">Adj. Charges</TableHead>
                      <TableHead className="text-right">Sales Tax</TableHead>
                      <TableHead className="text-right">Occ. Tax</TableHead>
                      <TableHead className="text-right">Gratuity 22%</TableHead>
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rcBreakdown.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No revenue center data — add services to functions to see a breakdown.
                        </TableCell>
                      </TableRow>
                    )}
                    {rcBreakdown.map((rc: any) => (
                      <TableRow key={rc.revenueCenter}>
                        <TableCell className="font-medium">{rc.revenueCenter}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.charges)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.adjustedCharges)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.salesTax)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.occupancyTax)}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(rc.gratuity)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(rc.total)}</TableCell>
                      </TableRow>
                    ))}
                    {rcBreakdown.length > 1 && (
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell>Totals</TableCell>
                        <TableCell className="text-right">{fmt(totals?.charges)}</TableCell>
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
            </CardContent>
          </Card>

          {/* Event Margins */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Event Margins
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Function</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Adj. Charges</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {functions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
                  )}
                  {functions.map((fn: any) => (
                    <TableRow key={fn.functionId}>
                      <TableCell className="text-sm">{fn.functionType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fn.functionDate}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(fn.adjustedCharges)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(fn.cost)}</TableCell>
                      <TableCell className={`text-right text-sm font-medium ${fn.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmt(fn.margin)}
                      </TableCell>
                      <TableCell className={`text-right text-sm font-medium ${fn.marginPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {pct(fn.marginPercent)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {functions.length > 0 && (
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell colSpan={2}>Totals</TableCell>
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
                    <TableHead>Has Task</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fin?.depositsScheduled?.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">No deposits scheduled</TableCell></TableRow>
                  )}
                  {fin?.depositsScheduled?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">{d.date}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(d.amount)}</TableCell>
                      <TableCell className="text-sm">{d.description ?? "—"}</TableCell>
                      <TableCell className="text-sm">{d.salesperson ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{d.hasTask ? "Yes" : "No"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Event Payments Received */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Event Payments Received
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
                    <TableHead>Allocated</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Salesperson</TableHead>
                    <TableHead>Posted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fin?.payments?.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6 text-sm">No payments recorded</TableCell></TableRow>
                  )}
                  {fin?.payments?.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            deletePayment.mutate({ id: p.id }, {
                              onSuccess: () => {
                                queryClient.invalidateQueries({ queryKey: ["/api/events/{id}/financials"] });
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
                      <TableCell className="text-sm">{fmt(p.allocatedAmount)}</TableCell>
                      <TableCell className="text-sm">{p.paymentMethod}</TableCell>
                      <TableCell><Badge variant="outline">{p.paymentType}</Badge></TableCell>
                      <TableCell className="text-sm">{p.description ?? "—"}</TableCell>
                      <TableCell className="text-sm">{p.salesperson ?? "—"}</TableCell>
                      <TableCell><Badge variant={p.posted ? "default" : "secondary"}>{p.posted ? "Yes" : "No"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tax Rates */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Tax Rates</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setTaxDialogOpen(true)}>Edit Rates</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Revenue Center</TableHead>
                    <TableHead className="text-right">Sales Tax %</TableHead>
                    <TableHead className="text-right">Occupancy Tax %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fin?.taxRates?.map((rc: any) => (
                    <TableRow key={rc.id}>
                      <TableCell className="text-sm">{rc.name}</TableCell>
                      <TableCell className="text-right text-sm">{rc.salesTaxRate ?? "0"}%</TableCell>
                      <TableCell className="text-right text-sm">{rc.occupancyTaxRate ?? "0"}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Service Fees */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Service Fee Rates</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setFeeDialogOpen(true)}>Edit Rates</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>Service Fee</TableHead>
                    <TableHead className="text-right">Rate (%)</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fin?.serviceFees?.map((sf: any) => (
                    <TableRow key={sf.id}>
                      <TableCell className="text-sm">{sf.name}</TableCell>
                      <TableCell className="text-right text-sm">{sf.ratePercent}%</TableCell>
                      <TableCell className="text-right"><Badge variant={sf.isTaxable ? "default" : "secondary"}>{sf.isTaxable ? "Yes" : "No"}</Badge></TableCell>
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
              <div className="col-span-2">
                <Label>Salesperson</Label>
                <Input value={paymentForm.salesperson} onChange={(e) => setPaymentForm({ ...paymentForm, salesperson: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment} disabled={!paymentForm.paymentAmount || createPayment.isPending}>
                Record Payment
              </Button>
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
              <div className="col-span-2">
                <Label>Salesperson</Label>
                <Input value={depositForm.salesperson} onChange={(e) => setDepositForm({ ...depositForm, salesperson: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDepositOpen(false)}>Cancel</Button>
              <Button onClick={handleScheduleDeposit} disabled={!depositForm.amount || createDeposit.isPending}>
                Schedule Deposit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
    <TaxRatesDialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen} />
    <ServiceFeesDialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen} />
    </>
  );
}
