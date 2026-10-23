"use client";

import { useParams } from "next/navigation";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { useSalesOrder } from "@/hooks/useWholesale";
import { formatMoney } from "@/lib/erp";
import { useStaffSession } from "@/lib/staffAuth";
import { soNumber } from "@/lib/wholesale";

/** A quotation or sales order as a plain document to print or save as PDF and send to the customer. Not a tax invoice: the invoice is
 * issued for each dispatch. */
export default function SalesOrderPrintPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const query = useSalesOrder(id);
  if (!ready) return null;
  const so = query.data;
  if (!so)
    return (
      <p className="p-space-5 text-[14px] text-ink-600">
        {query.error?.message ?? "Loading…"}
      </p>
    );
  const cur = so.currency;
  const branch = session?.branches.find((b) => b.id === so.branch_id);
  const isQuote = so.status === "QUOTATION";
  const a = so.account;
  return (
    <div className="mx-auto max-w-3xl bg-white p-space-6 text-[13.5px] text-ink-900 print:p-0">
      <div className="mobile-page-actions mb-space-4 flex justify-end gap-space-2 print:hidden">
        <Button variant="ghost" href={`/portal/wholesale/orders/${so.id}`}>
          Back
        </Button>
        <Button className="mobile-page-action" onClick={() => window.print()}>
          Print / save as PDF
        </Button>
      </div>
      <div className="flex items-start justify-between border-b border-ink-900 pb-space-3">
        <div>
          <p className="text-[20px] font-bold">{tenant?.name}</p>
          {branch && <p className="text-ink-600">{branch.branch_name}</p>}
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold uppercase tracking-wide">
            {isQuote ? "Quotation" : "Sales order"}
          </p>
          <p className="font-semibold">{soNumber(so)}</p>
          <p className="text-ink-600">Date {so.created_at.slice(0, 10)}</p>
          {isQuote && so.valid_until && (
            <p className="text-ink-600">Valid until {so.valid_until}</p>
          )}
          {so.customer_po_ref && (
            <p className="text-ink-600">Your PO {so.customer_po_ref}</p>
          )}
        </div>
      </div>
      <div className="mt-space-3">
        <p className="text-label">To</p>
        <p className="font-semibold">{a.legal_name}</p>
        {a.billing_address && (
          <p className="whitespace-pre-line">{a.billing_address}</p>
        )}
        <p>
          {a.gstin ? `GSTIN ${a.gstin}` : "Unregistered"}
          {a.billing_state ? ` · ${a.billing_state}` : ""}
        </p>
      </div>
      <table className="mt-space-4 w-full border-collapse">
        <thead>
          <tr className="border-y border-ink-900 text-left">
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">Item</th>
            <th className="py-1 pr-2 text-right">Qty</th>
            <th className="py-1 pr-2 text-right">Rate</th>
            <th className="py-1 pr-2 text-right">Discount</th>
            <th className="py-1 pr-2 text-right">GST</th>
            <th className="py-1 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {so.items.map((i, n) => (
            <tr key={i.id} className="border-b border-line">
              <td className="py-1 pr-2">{n + 1}</td>
              <td className="py-1 pr-2">
                {i.name}
                <span className="block text-[11.5px] text-ink-400">
                  {i.sku}
                </span>
              </td>
              <td className="py-1 pr-2 text-right">{i.quantity}</td>
              <td className="py-1 pr-2 text-right">
                {formatMoney(i.unit_price_minor, cur)}
              </td>
              <td className="py-1 pr-2 text-right">
                {i.discount_minor ? formatMoney(i.discount_minor, cur) : "—"}
              </td>
              <td className="py-1 pr-2 text-right">{i.tax_rate_bps / 100}%</td>
              <td className="py-1 text-right">
                {formatMoney(i.line_total_minor, cur)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="mt-space-3 ml-auto max-w-xs space-y-1">
        <div className="flex justify-between">
          <dt>Taxable value</dt>
          <dd>{formatMoney(so.subtotal_minor - so.discount_minor, cur)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>GST</dt>
          <dd>{formatMoney(so.tax_minor, cur)}</dd>
        </div>
        <div className="flex justify-between border-t border-ink-900 pt-1 text-[15px] font-bold">
          <dt>Total</dt>
          <dd>{formatMoney(so.total_minor, cur)}</dd>
        </div>
      </dl>
      <div className="mt-space-5 space-y-1 text-[12.5px] text-ink-600">
        <p>
          {so.prices_include_tax
            ? "Prices include GST."
            : "Prices are before GST; GST is added at the rates shown."}{" "}
          GST is charged as CGST + SGST within the state and IGST across states,
          on the tax invoice issued with each delivery.
        </p>
        {a.credit_limit_minor !== null ? (
          <p>Payment: within {so.credit_days} days of each invoice.</p>
        ) : (
          <p>Payment: on delivery.</p>
        )}
        {so.notes && <p>Notes: {so.notes}</p>}
        <p className="pt-space-2">This is not a tax invoice.</p>
      </div>
      <div className="mt-space-6 flex justify-end">
        <div className="w-56 border-t border-ink-900 pt-1 text-center text-[12.5px]">
          For {tenant?.name}
        </div>
      </div>
    </div>
  );
}
