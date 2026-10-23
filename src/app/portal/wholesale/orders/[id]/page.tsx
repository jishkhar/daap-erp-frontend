"use client";

import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  PackageCheck,
  Printer,
  RefreshCw,
  Scissors,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useState } from "react";
import { CreditSummary } from "@/components/erp/wholesale/CreditSummary";
import { DispatchModal } from "@/components/erp/wholesale/DispatchModal";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SkeletonLines } from "@/components/ui/Skeleton";
import { useSalesOrder, useSalesOrderAction } from "@/hooks/useWholesale";
import { formatDateTime, formatMoney, humanize } from "@/lib/erp";
import { hasGrantAt, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import {
  SO_STATUS_LABEL,
  SO_STATUS_TONE,
  soNumber,
  type SalesOrderItem,
} from "@/lib/wholesale";

const SOURCE = {
  price_list: "price list",
  product: "normal price",
  override: "changed",
} as const;

const RIGHT = { className: "text-right" };

/** The order's lines: ordered, sent, held on the shelf, and what is still missing from the shelf while the order is open. */
function itemColumns(
  cur: string,
  open: boolean,
): ColumnDef<SalesOrderItem, unknown>[] {
  return [
    {
      header: "Product",
      cell: ({ row: { original: i } }) => {
        const missing = open
          ? i.quantity - i.dispatched_quantity - i.reserved_quantity
          : 0;
        return (
          <div className="min-w-36 max-w-64 [overflow-wrap:anywhere]">
            <p className="font-medium text-ink-900">{i.name}</p>
            <p className="text-[12px] text-ink-400">
              {i.sku} · {SOURCE[i.price_source]}
              {i.discount_minor
                ? ` · ${formatMoney(i.discount_minor, cur)} off`
                : ""}
            </p>
            {missing > 0 && (
              <p className="text-[12px] font-medium text-warning">
                {missing} not on the shelf yet
              </p>
            )}
          </div>
        );
      },
    },
    {
      header: "Ordered",
      meta: RIGHT,
      cell: ({ row }) => row.original.quantity,
    },
    {
      header: "Sent",
      meta: RIGHT,
      cell: ({ row }) => row.original.dispatched_quantity,
    },
    {
      header: "Held",
      meta: RIGHT,
      cell: ({ row }) => row.original.reserved_quantity,
    },
    {
      header: "Price",
      meta: RIGHT,
      cell: ({ row }) => formatMoney(row.original.unit_price_minor, cur),
    },
    {
      header: "GST",
      meta: RIGHT,
      cell: ({ row }) => `${row.original.tax_rate_bps / 100}%`,
    },
    {
      header: "Total",
      meta: RIGHT,
      cell: ({ row }) => (
        <span className="font-medium">
          {formatMoney(row.original.line_total_minor, cur)}
        </span>
      ),
    },
  ];
}

/** One quotation or sales order: its lines (ordered, dispatched, held on the shelf), the dispatches it has become (each a tax invoice),
 * the customer's credit, and the next step: confirm, dispatch, reserve again, close short or cancel. */
export default function SalesOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const query = useSalesOrder(id);
  const step = useSalesOrderAction(id);
  const [dispatching, setDispatching] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  if (!ready) return null;
  const so = query.data;
  const cur = so?.currency ?? tenant?.currency ?? "INR";
  const at = (perm: string) => !!so && hasGrantAt(session, perm, so.branch_id);
  const editable = so?.status === "QUOTATION" || so?.status === "DRAFT";
  const open =
    so?.status === "CONFIRMED" || so?.status === "PARTIALLY_DISPATCHED";
  const short =
    !!so &&
    open &&
    so.items.some(
      (i) => i.quantity - i.dispatched_quantity > i.reserved_quantity,
    );

  const run = (
    action: "confirm" | "reserve" | "close-short" | "cancel",
    message: string,
    body?: { reason: string },
  ) =>
    step.mutate(
      { action, body },
      {
        onSuccess: () => {
          toast.success(message);
          setCancelling(false);
        },
        onError: (e) => toast.error("Couldn't do that", e.message),
      },
    );

  return (
    <PortalShell tenant={tenant} active="wholesale">
      <Link
        href="/portal/wholesale"
        className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={15} /> Wholesale
      </Link>
      {query.error && (
        <p className="text-[13px] font-medium text-error">
          {query.error.message}
        </p>
      )}
      {!so && !query.error && <SkeletonLines rows={6} />}
      {so && (
        <>
          <div className="mb-space-4 flex flex-wrap items-start justify-between gap-space-3">
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <h1 className="flex flex-wrap items-center gap-space-2 text-[22px] font-bold text-ink-900">
                {soNumber(so)}
                <Badge tone={SO_STATUS_TONE[so.status]}>
                  {SO_STATUS_LABEL[so.status]}
                </Badge>
                {so.expired && <Badge tone="error">Expired</Badge>}
              </h1>
              <p className="text-[13.5px] text-ink-600">
                {so.account.legal_name} · {so.account.gstin ?? "Unregistered"}
                {so.customer_po_ref ? ` · their PO ${so.customer_po_ref}` : ""}
                {so.quote_number && so.so_number
                  ? ` · from quotation ${so.quote_number}`
                  : ""}
              </p>
              <p className="text-[12.5px] text-ink-400">
                Created {formatDateTime(so.created_at)}
                {so.valid_until && so.status === "QUOTATION"
                  ? ` · valid until ${so.valid_until}`
                  : ""}
                {so.expected_date ? ` · expected ${so.expected_date}` : ""}
              </p>
            </div>
            <div className="mobile-page-actions flex flex-wrap gap-space-2">
              <Button
                variant="ghost"
                href={`/portal/wholesale/orders/${so.id}/print`}
              >
                <Printer size={15} /> Print
              </Button>
              {editable && at("wholesale:approve") && (
                <Button
                  disabled={step.isPending || so.expired}
                  onClick={() => run("confirm", "Order confirmed")}
                >
                  <CheckCircle2 size={15} />{" "}
                  {so.status === "QUOTATION" ? "Confirm as order" : "Confirm"}
                </Button>
              )}
              {open && at("wholesale:dispatch") && (
                <Button onClick={() => setDispatching(true)}>
                  <PackageCheck size={15} /> Dispatch
                </Button>
              )}
              {short && at("wholesale:approve") && (
                <Button
                  variant="secondary"
                  disabled={step.isPending}
                  onClick={() => run("reserve", "Stock held for this order")}
                >
                  <RefreshCw size={15} /> Reserve stock again
                </Button>
              )}
              {so.status === "PARTIALLY_DISPATCHED" &&
                at("wholesale:cancel") && (
                  <Button
                    variant="secondary"
                    disabled={step.isPending}
                    onClick={() =>
                      run(
                        "close-short",
                        "Order closed; the rest is back on the shelf",
                      )
                    }
                  >
                    <Scissors size={15} /> Close short
                  </Button>
                )}
              {(editable || so.status === "CONFIRMED") &&
                at("wholesale:cancel") && (
                  <Button
                    variant="ghost"
                    className="text-error"
                    onClick={() => setCancelling(true)}
                  >
                    <Ban size={15} /> Cancel
                  </Button>
                )}
            </div>
          </div>
          {so.cancel_reason && (
            <p className="mb-space-3 rounded-md bg-error-tint p-space-3 text-[13px] text-error">
              Cancelled: {so.cancel_reason}
            </p>
          )}

          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-space-4 lg:grid-cols-3">
            <Card className="min-w-0 p-space-4 lg:col-span-2">
              <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
                Items
              </h2>
              <DataTable
                columns={itemColumns(cur, open)}
                data={so.items}
                getRowId={(i) => i.id}
                paginate={false}
                emptyMessage="No items."
              />
              <dl className="mt-space-3 ml-auto min-w-0 max-w-xs space-y-1 text-[13.5px] [&_dd]:min-w-0 [&_dd]:text-right [&_dd]:[overflow-wrap:anywhere]">
                <div className="flex justify-between gap-space-2">
                  <dt className="text-ink-600">Before GST</dt>
                  <dd>
                    {formatMoney(so.subtotal_minor - so.discount_minor, cur)}
                  </dd>
                </div>
                <div className="flex justify-between gap-space-2">
                  <dt className="text-ink-600">GST</dt>
                  <dd>{formatMoney(so.tax_minor, cur)}</dd>
                </div>
                <div className="flex justify-between gap-space-2 border-t border-line pt-1 font-semibold text-ink-900">
                  <dt>Total</dt>
                  <dd>{formatMoney(so.total_minor, cur)}</dd>
                </div>
              </dl>
              {so.notes && (
                <p className="mt-space-3 text-[13px] text-ink-600 [overflow-wrap:anywhere]">
                  Notes: {so.notes}
                </p>
              )}
            </Card>

            <div className="min-w-0 space-y-space-4">
              <Card className="min-w-0 p-space-4">
                <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
                  Customer credit
                </h2>
                <CreditSummary
                  accountId={so.customer_account_id}
                  currency={cur}
                />
              </Card>
              <Card className="min-w-0 p-space-4">
                <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
                  Dispatches
                </h2>
                {so.dispatches.length === 0 ? (
                  <p className="text-[13px] text-ink-400">Nothing sent yet.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {so.dispatches.map((d) => (
                      <li key={d.id} className="py-space-2 text-[13.5px]">
                        <div className="flex min-w-0 flex-wrap justify-between gap-space-2">
                          <Link
                            href={`/portal/orders/${d.id}`}
                            className="min-w-0 font-semibold text-ink-900 hover:underline [overflow-wrap:anywhere]"
                          >
                            {d.invoice_number ?? d.order_number}
                          </Link>
                          <span className="min-w-0 text-right [overflow-wrap:anywhere]">
                            {formatMoney(d.total_minor, cur)}
                          </span>
                        </div>
                        <p className="text-[12px] text-ink-400 [overflow-wrap:anywhere]">
                          {formatDateTime(d.created_at)} ·{" "}
                          {humanize(d.payment_status)}
                          {d.paid_minor < d.total_minor && d.due_date
                            ? ` · due ${d.due_date}`
                            : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          {dispatching && (
            <DispatchModal
              so={so}
              open
              onClose={() => setDispatching(false)}
              onDone={() => setDispatching(false)}
            />
          )}
          <Modal
            open={cancelling}
            onClose={() => setCancelling(false)}
            width="sm"
            title={`Cancel ${soNumber(so)}?`}
            description="Any stock it holds goes back on the shelf."
            footer={
              <>
                <Button variant="ghost" onClick={() => setCancelling(false)}>
                  Keep it
                </Button>
                <Button
                  disabled={!reason.trim() || step.isPending}
                  onClick={() =>
                    run("cancel", "Order cancelled", { reason: reason.trim() })
                  }
                >
                  Cancel order
                </Button>
              </>
            }
          >
            <Field label="Reason" htmlFor="so_reason" required>
              <Textarea
                id="so_reason"
                rows={2}
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          </Modal>
        </>
      )}
    </PortalShell>
  );
}
