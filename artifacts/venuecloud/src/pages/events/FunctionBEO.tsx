import { useParams, Link } from "wouter";
import { formatPricingType } from "@/lib/formatters";
import {
  useGetEvent,
  useGetFunction,
  useGetFunctionMenus,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

function fmt$(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  const n = parseFloat(String(val));
  if (isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function calcItemTotal(item: any): number {
  const stored = parseFloat(String(item.itemTotal ?? "0")) || 0;
  if (stored > 0) return stored;
  const qty = parseFloat(String(item.quantity ?? "1")) || 1;
  const price = parseFloat(String(item.aLaCartePrice ?? "0")) || 0;
  const hours = parseFloat(String(item.numHours ?? "1")) || 1;
  return item.chargeHourly ? price * hours * qty : price * qty;
}

export default function FunctionBEO() {
  const params = useParams<{ id: string; functionId: string }>();
  const eventId = Number(params.id);
  const functionId = Number(params.functionId);

  const { data: event, isLoading: eventLoading } = useGetEvent(eventId, {
    query: { enabled: !!eventId } as any,
  });
  const { data: fn, isLoading: fnLoading } = useGetFunction(functionId, {
    query: { enabled: !!functionId } as any,
  });
  const { data: menus, isLoading: menusLoading } = useGetFunctionMenus(functionId, {
    query: { enabled: !!functionId } as any,
  });

  const isLoading = eventLoading || fnLoading || menusLoading;

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!fn || !event) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Function or event not found.
      </div>
    );
  }

  const menusList = (menus as any[]) ?? [];

  const grandTotal = menusList.reduce((sum: number, menu: any) => {
    const menuTotal = parseFloat(String(menu.menuTotalCharges ?? "0")) || 0;
    if (menuTotal > 0) return sum + menuTotal;
    const itemsTotal = (menu.serviceTypes ?? []).reduce((s2: number, st: any) => {
      const stTotal = parseFloat(String(st.serviceTypeTotalCharges ?? "0")) || 0;
      if (stTotal > 0) return s2 + stTotal;
      return s2 + (st.items ?? []).reduce((s3: number, item: any) => s3 + calcItemTotal(item), 0);
    }, 0);
    return sum + itemsTotal;
  }, 0);

  const beoNumber = `BEO-${(fn as any).functionNumber ?? functionId}-${new Date().toISOString().slice(0, 10)}`;
  const printDate = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .beo-no-print { display: none !important; }
          .beo-root { padding: 0 !important; margin: 0 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0.75in; }
        }
      `}</style>

      {/* Screen toolbar */}
      <div className="beo-no-print flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/events/${eventId}/functions/${functionId}/services`}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Services
            </Link>
          </Button>
          <span className="text-muted-foreground text-sm">|</span>
          <span className="text-sm font-medium">
            BEO Preview — {(fn as any).functionType} · {(fn as any).functionDate}
          </span>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Print / Save PDF
        </Button>
      </div>

      {/* BEO Document */}
      <div className="beo-root max-w-4xl mx-auto bg-white border rounded-lg shadow-sm print:shadow-none print:border-none print:max-w-none">

        {/* Header */}
        <div className="border-b-4 border-gray-900 px-8 pt-8 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold tracking-tight text-gray-900">
                The Pines Resort
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                Hospitality &amp; Event Services
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">
                Banquet Event Order
              </div>
              <div className="text-xs text-gray-600 font-mono">{beoNumber}</div>
              <div className="text-xs text-gray-500 mt-0.5">Printed: {printDate}</div>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 space-y-6">

          {/* Event + Function Info */}
          <div className="grid grid-cols-2 gap-6">
            {/* Event */}
            <div className="border rounded-md overflow-hidden">
              <div className="bg-gray-900 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5">
                Event Information
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Event Name", event.eventName],
                    ["Event Number", (event as any).eventNumber ?? `#${event.id}`],
                    ["Event Dates", `${fmtDate(event.startDate)}${event.endDate && event.endDate !== event.startDate ? ` – ${fmtDate(event.endDate)}` : ""}`],
                    ["Site / Venue", (event as any).site ?? "The Pines Resort"],
                    ["Event Type", (event as any).eventType ?? "—"],
                    ["Account", (event as any).accountName ?? "—"],
                    ["Contact", (event as any).primaryContactName ?? "—"],
                    ["Salesperson", (event as any).salesperson ?? "—"],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b last:border-0">
                      <td className="py-1.5 px-3 text-xs text-gray-500 font-medium bg-gray-50 w-2/5 whitespace-nowrap">
                        {label}
                      </td>
                      <td className="py-1.5 px-3 text-xs font-medium">{value || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Function */}
            <div className="border rounded-md overflow-hidden">
              <div className="bg-gray-900 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5">
                Function Details
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Function Type", (fn as any).functionType],
                    ["Function Number", (fn as any).functionNumber ?? `#${fn.id}`],
                    ["Function Date", fmtDate((fn as any).functionDate)],
                    ["Start Time", fmtTime((fn as any).startTime)],
                    ["End Time", fmtTime((fn as any).endTime)],
                    ["Location / Room", (fn as any).location],
                    ["Setup Style", (fn as any).setupStyle],
                    ["Est. Attendance", (fn as any).estimatedAttendance],
                    ["Guaranteed", (fn as any).guaranteedAttendance],
                    ["Set For", (fn as any).set],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b last:border-0">
                      <td className="py-1.5 px-3 text-xs text-gray-500 font-medium bg-gray-50 w-2/5 whitespace-nowrap">
                        {label}
                      </td>
                      <td className="py-1.5 px-3 text-xs font-medium">
                        {value !== undefined && value !== null && value !== "" ? String(value) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Menus */}
          {menusList.length === 0 ? (
            <div className="border rounded-md p-8 text-center text-sm text-gray-400">
              No menus have been added to this function.
            </div>
          ) : (
            menusList.map((menu: any, menuIdx: number) => {
              const menuTotal = parseFloat(String(menu.menuTotalCharges ?? "0")) || 0;
              const serviceTypes = (menu.serviceTypes ?? []) as any[];

              const computedMenuTotal = menuTotal > 0
                ? menuTotal
                : serviceTypes.reduce((s: number, st: any) => {
                    const stTotal = parseFloat(String(st.serviceTypeTotalCharges ?? "0")) || 0;
                    if (stTotal > 0) return s + stTotal;
                    return s + (st.items ?? []).reduce((s2: number, item: any) => s2 + calcItemTotal(item), 0);
                  }, 0);

              return (
                <div key={menu.id} className="border rounded-md overflow-hidden">
                  {/* Menu Header */}
                  <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-2">
                        Menu {menuIdx + 1}
                      </span>
                      <span className="font-semibold">{menu.functionMenuName}</span>
                      {menu.pricingType && (
                        <span className="ml-2 text-xs text-gray-300">· {formatPricingType(menu.pricingType)}</span>
                      )}
                      {menu.menuLocation && (
                        <span className="ml-2 text-xs text-gray-300">· {menu.menuLocation}</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-white">
                      {computedMenuTotal > 0 ? fmt$(computedMenuTotal) : ""}
                    </div>
                  </div>

                  {/* Menu description / notes (non-internal) */}
                  {menu.description && (
                    <div className="px-4 py-2 text-xs text-gray-600 italic bg-gray-50 border-b">
                      {menu.description}
                    </div>
                  )}
                  {menu.menuNotes && !menu.notesInternal && (
                    <div className="px-4 py-2 text-xs text-gray-600 bg-amber-50 border-b border-amber-100">
                      <span className="font-semibold">Menu Notes: </span>{menu.menuNotes}
                    </div>
                  )}

                  {/* Service Types */}
                  {serviceTypes.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-gray-400">
                      No service types added.
                    </div>
                  ) : (
                    serviceTypes.map((st: any) => {
                      const items = (st.items ?? []) as any[];
                      const visibleItems = items.filter((item: any) => !item.markItemInternal);
                      const stTotal = parseFloat(String(st.serviceTypeTotalCharges ?? "0")) || 0;
                      const computedStTotal = stTotal > 0
                        ? stTotal
                        : visibleItems.reduce((s: number, item: any) => s + calcItemTotal(item), 0);

                      return (
                        <div key={st.id} className="border-t">
                          {/* Service Type sub-header */}
                          <div className="bg-gray-100 px-4 py-1.5 flex items-center justify-between">
                            <div className="text-xs font-bold uppercase tracking-wide text-gray-700">
                              {st.serviceTypeName}
                              {st.serviceLocation && (
                                <span className="ml-2 font-normal normal-case text-gray-500">
                                  · {st.serviceLocation}
                                </span>
                              )}
                              {st.useFunctionTimeRange && st.startTime && (
                                <span className="ml-2 font-normal normal-case text-gray-500">
                                  · {fmtTime(st.startTime)} – {fmtTime(st.endTime)}
                                </span>
                              )}
                            </div>
                            {computedStTotal > 0 && (
                              <span className="text-xs font-semibold text-gray-700">
                                {fmt$(computedStTotal)}
                              </span>
                            )}
                          </div>

                          {/* Service notes (non-internal) */}
                          {st.serviceNotes && !st.notesInternal && (
                            <div className="px-4 py-1.5 text-xs text-gray-600 italic bg-amber-50 border-b border-amber-100">
                              {st.serviceNotes}
                            </div>
                          )}

                          {/* Items table */}
                          {visibleItems.length > 0 && (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b bg-white">
                                  <th className="text-left py-1.5 px-4 font-semibold text-gray-500 w-1/2">Item</th>
                                  <th className="text-left py-1.5 px-2 font-semibold text-gray-500">Notes</th>
                                  <th className="text-right py-1.5 px-2 font-semibold text-gray-500 w-16">Qty</th>
                                  <th className="text-right py-1.5 px-2 font-semibold text-gray-500 w-20">Unit Price</th>
                                  <th className="text-right py-1.5 px-4 font-semibold text-gray-500 w-20">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleItems.map((item: any, itemIdx: number) => {
                                  const total = calcItemTotal(item);
                                  return (
                                    <tr key={item.id} className={`border-b last:border-0 ${itemIdx % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                                      <td className="py-2 px-4 align-top">
                                        <div className="font-medium text-gray-900">{item.itemName}</div>
                                        {item.description && (
                                          <div className="text-gray-500 mt-0.5 leading-relaxed">{item.description}</div>
                                        )}
                                        {item.dietaryRestrictions && item.dietaryRestrictions !== "None" && (
                                          <div className="text-green-700 mt-0.5 font-medium">{item.dietaryRestrictions}</div>
                                        )}
                                        {item.chargeHourly && (
                                          <div className="text-blue-600 mt-0.5">{item.numHours ?? "—"} hrs @ {fmt$(item.aLaCartePrice)}/hr</div>
                                        )}
                                      </td>
                                      <td className="py-2 px-2 align-top text-gray-500 max-w-[160px]">
                                        {!item.notesInternal && item.notes ? item.notes : ""}
                                      </td>
                                      <td className="py-2 px-2 align-top text-right text-gray-700">
                                        {item.quantity ?? "—"}
                                      </td>
                                      <td className="py-2 px-2 align-top text-right text-gray-700">
                                        {item.chargeHourly ? "—" : fmt$(item.aLaCartePrice)}
                                      </td>
                                      <td className="py-2 px-4 align-top text-right font-medium">
                                        {total > 0 ? fmt$(total) : "—"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              {computedStTotal > 0 && (
                                <tfoot>
                                  <tr className="bg-gray-50">
                                    <td colSpan={4} className="py-1.5 px-4 text-right text-xs font-semibold text-gray-600">
                                      {st.serviceTypeName} Subtotal
                                    </td>
                                    <td className="py-1.5 px-4 text-right text-xs font-bold">
                                      {fmt$(computedStTotal)}
                                    </td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          )}

                          {visibleItems.length === 0 && (
                            <div className="px-4 py-3 text-center text-xs text-gray-400">
                              No items.
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Menu total footer */}
                  {computedMenuTotal > 0 && serviceTypes.length > 1 && (
                    <div className="border-t bg-gray-800 text-white px-4 py-2 flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wide">
                        {menu.functionMenuName} Total
                      </span>
                      <span className="text-sm font-bold">{fmt$(computedMenuTotal)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Setup Notes */}
          {(fn as any).notes && (
            <div className="border rounded-md overflow-hidden">
              <div className="bg-amber-700 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5">
                Setup Notes / Special Instructions
              </div>
              <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {(fn as any).notes}
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="border rounded-md overflow-hidden">
            <div className="bg-gray-900 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5">
              Charges Summary
            </div>
            <div className="p-4">
              <table className="w-full text-sm">
                <tbody>
                  {menusList.map((menu: any) => {
                    const menuTotal = parseFloat(String(menu.menuTotalCharges ?? "0")) || 0;
                    const computed = menuTotal > 0
                      ? menuTotal
                      : (menu.serviceTypes ?? []).reduce((s: number, st: any) => {
                          const stTotal = parseFloat(String(st.serviceTypeTotalCharges ?? "0")) || 0;
                          if (stTotal > 0) return s + stTotal;
                          return s + ((st.items ?? []) as any[])
                            .filter((i: any) => !i.markItemInternal)
                            .reduce((s2: number, item: any) => s2 + calcItemTotal(item), 0);
                        }, 0);
                    return (
                      <tr key={menu.id} className="border-b">
                        <td className="py-2 text-gray-600">{menu.functionMenuName}</td>
                        <td className="py-2 text-right font-medium">
                          {computed > 0 ? fmt$(computed) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-b border-gray-300">
                    <td className="py-2.5 font-bold text-gray-900">Total F&amp;B Charges</td>
                    <td className="py-2.5 text-right font-bold text-gray-900">{fmt$(grandTotal)}</td>
                  </tr>
                  <tr className="border-b text-gray-500">
                    <td className="py-2">Gratuity (22%)</td>
                    <td className="py-2 text-right">{fmt$(grandTotal * 0.22)}</td>
                  </tr>
                  <tr className="border-b text-gray-500">
                    <td className="py-2">Sales Tax (8%)</td>
                    <td className="py-2 text-right">{fmt$(grandTotal * 0.08)}</td>
                  </tr>
                  <tr>
                    <td className="pt-3 pb-1 text-base font-bold text-gray-900">Estimated Grand Total</td>
                    <td className="pt-3 pb-1 text-right text-base font-bold text-gray-900">
                      {fmt$(grandTotal * 1.30)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">
                * Gratuity and tax are estimated. Final charges may vary based on actual consumption.
              </p>
            </div>
          </div>

          {/* Signature Block */}
          <div className="border rounded-md p-5 mt-2">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Authorized by (Client)
                </div>
                <div className="border-b border-gray-400 mb-1 h-8" />
                <div className="text-xs text-gray-500">Signature / Date</div>
                <div className="border-b border-gray-400 mt-3 mb-1 h-6" />
                <div className="text-xs text-gray-500">Printed Name</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Authorized by (The Pines Resort)
                </div>
                <div className="border-b border-gray-400 mb-1 h-8" />
                <div className="text-xs text-gray-500">Catering Manager / Date</div>
                <div className="border-b border-gray-400 mt-3 mb-1 h-6" />
                <div className="text-xs text-gray-500">Printed Name / Title</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              By signing above, client acknowledges that the information contained herein is accurate and
              agrees to the terms and conditions of The Pines Resort. Any modifications must be made in
              writing no later than 72 hours prior to the event.
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pb-2">
            The Pines Resort · Hospitality &amp; Event Services ·{" "}
            {(event as any).site ?? "The Pines Resort"}
          </div>
        </div>
      </div>
    </>
  );
}
