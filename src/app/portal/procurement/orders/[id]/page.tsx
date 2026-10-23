"use client";

import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  PackageCheck,
  Undo2,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PayBillsModal } from "@/components/erp/procurement/PayBillsModal";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  useFetchGoodsReceipt,
  usePurchaseOrder,
  usePurchaseOrderAction,
  useReturnGoods,
  useSuppliers,
  type GoodsReceipt,
  type PurchaseOrderAction,
} from "@/hooks/useProcurement";
import {
  PO_STATUS_TONE,
  formatDateTime,
  formatMoney,
  humanize,
  toMinor,
  type PoItem,
} from "@/lib/erp";
import {
  BILL_STATE_LABEL,
  BILL_STATE_TONE,
  receiptLabelsText,
} from "@/lib/procurement";
import { hasGrant, hasGrantAt, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { SkeletonLines } from "@/components/ui/Skeleton";

export default function PurchaseOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const po = usePurchaseOrder(id);
  const suppliers = useSuppliers();
  const step = usePurchaseOrderAction(id);
  const returnGoods = useReturnGoods();
  const fetchGoodsReceipt = useFetchGoodsReceipt();
  const busy = step.isPending || returnGoods.isPending;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [recvOpen, setRecvOpen] = useState(false);
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const [recvSerials, setRecvSerials] = useState<Record<string, string>>({});
  const [invoiceNo, setInvoiceNo] = useState("");
  const [freight, setFreight] = useState("");
  const [returnGrn, setReturnGrn] = useState<GoodsReceipt | null>(null);
  const [retQty, setRetQty] = useState<Record<string, string>>({});
  const [retSerials, setRetSerials] = useState<Record<string, string>>({});
  const [retReason, setRetReason] = useState("");
  const [paying, setPaying] = useState(false);

  if (!ready) return null;
  const o = po.data;
  const cur = o?.currency ?? tenant?.currency ?? "INR";
  const supplier = suppliers.data?.find((s) => s.id === o?.supplier_id);
  const canApprove = hasGrant(session, "procurement:approve");
  const canReceive = hasGrant(session, "procurement:receive");
  const canReturn = hasGrant(session, "procurement:return");
  const canPay = !!o && hasGrantAt(session, "procurement:pay", o.branch_id);
  const billing = o?.billing;
  const canCancel = hasGrant(session, "procurement:create") || canApprove;
  const open = o?.status === "APPROVED" || o?.status === "PARTIALLY_RECEIVED";
  const splitList = (text: string) =>
    text
      .split(/[\n,]+/)
      .map((x) => x.trim())
      .filter(Boolean);

  /** The toasts (and what to do next) of one action on this order. */
  const done = (message: string, after?: () => void) => ({
    onSuccess: () => {
      toast.success(message);
      after?.();
    },
    onError: (e: Error) => toast.error("Couldn't complete that", e.message),
  });
  const act = (
    action: PurchaseOrderAction,
    body: unknown,
    message: string,
    after?: () => void,
  ) => step.mutate({ action, body }, done(message, after));

  function openReceive() {
    if (!o?.items) return;
    setRecvQty(
      Object.fromEntries(
        o.items.map((i) => [i.id, String(i.quantity - i.received_quantity)]),
      ),
    );
    setRecvSerials({});
    setInvoiceNo("");
    setFreight("");
    setRecvOpen(true);
  }

  const receiveBody = () => ({
    lines: (o?.items ?? [])
      .filter((i) => (parseInt(recvQty[i.id] ?? "0", 10) || 0) > 0)
      .map((i: PoItem) => ({
        po_item_id: i.id,
        quantity: parseInt(recvQty[i.id], 10),
        ...(i.serialization_type !== "NONE"
          ? { serial_numbers: splitList(recvSerials[i.id] ?? "") }
          : {}),
      })),
    additional_costs_minor: freight ? (toMinor(freight) ?? 0) : 0,
    supplier_invoice_number: invoiceNo.trim() || null,
  });

  async function openReturn(grnId: string) {
    let grn: GoodsReceipt;
    try {
      grn = await fetchGoodsReceipt(grnId);
    } catch (e) {
      return toast.error("Couldn't load the receipt", (e as Error).message);
    }
    setReturnGrn(grn);
    setRetQty({});
    setRetSerials({});
    setRetReason("");
  }

  return (
    <PortalShell tenant={tenant} active="procurement">
      <Link
        href="/portal/procurement"
        className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline"
      >
        <ArrowLeft size={14} /> All purchase orders
      </Link>
      {po.error && (
        <p className="text-[14px] font-medium text-error">{po.error.message}</p>
      )}
      {!o && !po.error && <SkeletonLines rows={3} />}
      {o && (
        <>
          <div className="mb-space-5 flex flex-wrap items-start justify-between gap-space-3">
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <h1 className="text-display">{o.po_number}</h1>
              <div className="mt-space-2 flex flex-wrap items-center gap-space-2">
                <Badge tone={PO_STATUS_TONE[o.status]}>
                  {humanize(o.status)}
                </Badge>
                {supplier && (
                  <span className="text-[13.5px] text-ink-600">
                    {supplier.name} · {supplier.payment_terms_days}-day terms
                  </span>
                )}
              </div>
              <p className="mt-space-1 text-[13px] text-ink-400">
                Created {formatDateTime(o.created_at)}
                {o.expected_date ? ` · expected ${o.expected_date}` : ""}
              </p>
            </div>
            <div className="mobile-page-actions flex flex-wrap gap-space-2">
              {o.status === "DRAFT" && canApprove && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    act("approve", undefined, "Purchase order approved")
                  }
                >
                  <CheckCircle2 size={16} /> Approve
                </Button>
              )}
              {open && canReceive && (
                <Button onClick={openReceive}>
                  <PackageCheck size={16} /> Receive goods
                </Button>
              )}
              {o.status === "PARTIALLY_RECEIVED" && canApprove && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => act("close-short", undefined, "Order closed")}
                >
                  Close short
                </Button>
              )}
              {["DRAFT", "APPROVED"].includes(o.status) && canCancel && (
                <Button
                  variant="destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  <Ban size={16} /> Cancel
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-space-4 lg:grid-cols-3">
            <Card className="min-w-0 p-space-4 lg:col-span-2">
              <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">
                Items
              </h2>
              <ul className="divide-y divide-line">
                {(o.items ?? []).map((i) => (
                  <li
                    key={i.id}
                    className="flex min-w-0 flex-col items-start justify-between gap-space-2 py-space-3 min-[480px]:flex-row min-[480px]:gap-space-3"
                  >
                    <div className="min-w-0 [overflow-wrap:anywhere]">
                      <p className="font-semibold text-ink-900">
                        {i.product_name}
                      </p>
                      <p className="text-[12.5px] text-ink-600">
                        {i.sku} · {i.quantity} ×{" "}
                        {formatMoney(i.unit_cost_minor, cur)} · GST{" "}
                        {i.tax_rate_bps / 100}%
                      </p>
                      <p className="text-[12.5px] text-ink-400">
                        Received {i.received_quantity} of {i.quantity}
                        {i.returned_quantity
                          ? ` · ${i.returned_quantity} returned`
                          : ""}
                      </p>
                    </div>
                    <p className="min-w-0 max-w-full font-semibold [overflow-wrap:anywhere]">
                      {formatMoney(i.line_total_minor, cur)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
            <div className="min-w-0 space-y-space-4">
              <Card className="p-space-4">
                <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">
                  Order value
                </h2>
                {[
                  ["Items", o.subtotal_minor],
                  ["GST", o.tax_minor],
                  ["Freight / duty (expected)", o.additional_costs_minor],
                ].map(([k, v]) => (
                  <div
                    key={k as string}
                    className="flex justify-between gap-space-2 py-1 text-[14px]"
                  >
                    <span className="min-w-0 text-ink-600">{k}</span>
                    <span className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">
                      {formatMoney(v as number, cur)}
                    </span>
                  </div>
                ))}
                <div className="my-1 border-t border-line" />
                <div className="flex justify-between gap-space-2 py-1 text-[15px]">
                  <span className="font-semibold">Total</span>
                  <span className="min-w-0 text-right font-bold [overflow-wrap:anywhere]">
                    {formatMoney(o.total_minor, cur)}
                  </span>
                </div>
              </Card>
              <Card className="@container min-w-0 p-space-4">
                <div className="mb-space-3 flex flex-wrap items-center justify-between gap-space-2">
                  <h2 className="text-[15px] font-bold text-ink-900">
                    Bills &amp; payments
                  </h2>
                  {canPay && billing && billing.owed_minor > 0 && (
                    <Button
                      className="mobile-page-action w-full @min-[300px]:w-auto"
                      onClick={() => setPaying(true)}
                    >
                      <Wallet size={15} /> Pay
                    </Button>
                  )}
                </div>
                {billing && (o.receipts ?? []).length > 0 && (
                  <div className="mb-space-3 grid grid-cols-1 gap-space-2 @min-[300px]:grid-cols-3">
                    {(
                      [
                        [
                          "Billed",
                          billing.billed_minor - billing.returned_minor,
                        ],
                        ["Paid", billing.paid_minor],
                        ["We owe", billing.owed_minor],
                      ] as const
                    ).map(([label, v]) => (
                      <div
                        key={label}
                        className="flex min-w-0 items-center justify-between gap-space-2 rounded-md border border-line p-space-2 @min-[300px]:flex-col @min-[300px]:justify-center @min-[300px]:gap-0"
                      >
                        <p className="shrink-0 text-[11.5px] text-ink-600">
                          {label}
                        </p>
                        <p
                          className={`min-w-0 text-right text-[14px] font-bold [overflow-wrap:anywhere] @min-[300px]:text-center ${label === "We owe" && billing.overdue ? "text-error" : "text-ink-900"}`}
                        >
                          {formatMoney(v, cur)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {(o.receipts ?? []).length === 0 && (
                  <p className="text-[13px] text-ink-400">
                    Nothing received yet. Each goods receipt becomes the
                    supplier&apos;s bill.
                  </p>
                )}
                <ul className="divide-y divide-line">
                  {(o.receipts ?? []).map((r) => (
                    <li key={r.id} className="min-w-0 py-space-3 text-[13.5px]">
                      <div className="flex items-start justify-between gap-space-2">
                        <strong className="min-w-0 [overflow-wrap:anywhere]">
                          {r.grn_number}
                        </strong>
                        <Badge
                          tone={BILL_STATE_TONE[r.payment_state]}
                          className="shrink-0"
                        >
                          {BILL_STATE_LABEL[r.payment_state]}
                        </Badge>
                      </div>
                      {r.supplier_invoice_number && (
                        <p className="mt-1 text-[12px] text-ink-600 [overflow-wrap:anywhere]">
                          Bill {r.supplier_invoice_number}
                        </p>
                      )}
                      <p className="mt-1 text-[12px] text-ink-400 [overflow-wrap:anywhere]">
                        {formatDateTime(r.received_at)} ·{" "}
                        {formatMoney(r.total_minor, cur)}
                        {r.returned_minor
                          ? ` · ${formatMoney(r.returned_minor, cur)} returned`
                          : ""}
                      </p>
                      <dl className="mt-space-2 space-y-1 text-[12px]">
                        <div className="flex justify-between gap-space-2">
                          <dt className="text-ink-600">Paid</dt>
                          <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">
                            {formatMoney(r.paid_minor, cur)}
                          </dd>
                        </div>
                        {r.owed_minor > 0 && (
                          <>
                            <div className="flex justify-between gap-space-2">
                              <dt className="text-ink-600">We owe</dt>
                              <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere]">
                                {formatMoney(r.owed_minor, cur)}
                              </dd>
                            </div>
                            {r.due_date && (
                              <div className="flex justify-between gap-space-2">
                                <dt className="text-ink-600">Due</dt>
                                <dd>
                                  <time
                                    dateTime={r.due_date}
                                    className="whitespace-nowrap"
                                  >
                                    {r.due_date}
                                  </time>
                                </dd>
                              </div>
                            )}
                          </>
                        )}
                      </dl>
                      {r.labels && (
                        <p
                          className={`mt-1 text-[12px] [overflow-wrap:anywhere] ${r.labels.status === "open" ? "text-warning" : "text-ink-400"}`}
                        >
                          {receiptLabelsText(r.labels)}
                        </p>
                      )}
                      {canReturn && (
                        <div className="mobile-page-actions mt-space-2 flex justify-end">
                          <Button
                            variant="ghost"
                            onClick={() => openReturn(r.id)}
                          >
                            <Undo2 size={14} /> Return
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          {paying && (
            <PayBillsModal
              poId={o.id}
              poNumber={o.po_number}
              bills={o.receipts ?? []}
              currency={cur}
              onClose={() => setPaying(false)}
            />
          )}
          <Modal
            open={cancelOpen}
            onClose={() => setCancelOpen(false)}
            title="Cancel this purchase order?"
            footer={
              <>
                <Button variant="ghost" onClick={() => setCancelOpen(false)}>
                  Keep
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy || !reason.trim()}
                  onClick={() =>
                    act(
                      "cancel",
                      { reason: reason.trim() },
                      "Purchase order cancelled",
                      () => {
                        setCancelOpen(false);
                        setReason("");
                      },
                    )
                  }
                >
                  Cancel order
                </Button>
              </>
            }
          >
            <Field label="Reason" htmlFor="po_cancel" required>
              <Textarea
                id="po_cancel"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          </Modal>

          <Modal
            open={recvOpen}
            onClose={() => setRecvOpen(false)}
            width="lg"
            title="Receive goods"
            description="Stock goes into the branch and the amount is booked as owed to the supplier. Freight is spread across the items as landed cost."
            footer={
              <>
                <Button variant="ghost" onClick={() => setRecvOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={busy || receiveBody().lines.length === 0}
                  onClick={() =>
                    act("receive", receiveBody(), "Goods received", () =>
                      setRecvOpen(false),
                    )
                  }
                >
                  Book receipt
                </Button>
              </>
            }
          >
            <ul className="space-y-space-3">
              {(o.items ?? [])
                .filter((i) => i.quantity > i.received_quantity)
                .map((i) => (
                  <li
                    key={i.id}
                    className="rounded-md border border-line p-space-3"
                  >
                    <div className="flex items-center justify-between gap-space-3">
                      <span className="font-medium text-ink-900">
                        {i.product_name}{" "}
                        <span className="text-[12px] text-ink-400">
                          ({i.quantity - i.received_quantity} outstanding)
                        </span>
                      </span>
                      <Input
                        aria-label={`Quantity received for ${i.product_name}`}
                        inputMode="numeric"
                        value={recvQty[i.id] ?? ""}
                        onChange={(e) =>
                          setRecvQty({ ...recvQty, [i.id]: e.target.value })
                        }
                        className="w-24"
                      />
                    </div>
                    {i.serialization_type !== "NONE" && (
                      <Textarea
                        aria-label={`${i.serialization_type} numbers for ${i.product_name}`}
                        className="mt-space-2"
                        rows={2}
                        placeholder={`${i.serialization_type === "IMEI" ? "IMEI" : "Serial"} numbers — one per line, exactly as many as the quantity`}
                        value={recvSerials[i.id] ?? ""}
                        onChange={(e) =>
                          setRecvSerials({
                            ...recvSerials,
                            [i.id]: e.target.value,
                          })
                        }
                      />
                    )}
                  </li>
                ))}
            </ul>
            <div className="mt-space-3 grid gap-x-space-4 @min-[400px]:grid-cols-2">
              <Field
                label="Supplier bill number"
                htmlFor="grn_inv"
                hint="The same bill can't be booked twice."
              >
                <Input
                  id="grn_inv"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
              </Field>
              <Field
                label={`Freight / duty on this delivery (${cur})`}
                htmlFor="grn_fr"
              >
                <Input
                  id="grn_fr"
                  inputMode="decimal"
                  value={freight}
                  onChange={(e) => setFreight(e.target.value)}
                />
              </Field>
            </div>
          </Modal>

          <Modal
            open={returnGrn !== null}
            onClose={() => setReturnGrn(null)}
            width="lg"
            title={`Return goods — ${returnGrn?.grn_number ?? ""}`}
            description="Stock leaves the branch and what you owe the supplier is reduced."
            footer={
              <>
                <Button variant="ghost" onClick={() => setReturnGrn(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={
                    busy ||
                    !retReason.trim() ||
                    !returnGrn ||
                    !returnGrn.items.some(
                      (i) => (parseInt(retQty[i.id] ?? "0", 10) || 0) > 0,
                    )
                  }
                  onClick={() =>
                    returnGoods.mutate(
                      {
                        grnId: returnGrn!.id,
                        body: {
                          reason: retReason.trim(),
                          lines: returnGrn!.items
                            .filter(
                              (i) =>
                                (parseInt(retQty[i.id] ?? "0", 10) || 0) > 0,
                            )
                            .map((i) => ({
                              grn_item_id: i.id,
                              quantity: parseInt(retQty[i.id], 10),
                              ...(i.serial_numbers.length
                                ? {
                                    serial_numbers: splitList(
                                      retSerials[i.id] ?? "",
                                    ),
                                  }
                                : {}),
                            })),
                        },
                      },
                      done("Goods returned", () => setReturnGrn(null)),
                    )
                  }
                >
                  Return to supplier
                </Button>
              </>
            }
          >
            <ul className="space-y-space-3">
              {(returnGrn?.items ?? []).map((i) => (
                <li
                  key={i.id}
                  className="rounded-md border border-line p-space-3"
                >
                  <div className="flex items-center justify-between gap-space-3">
                    <span className="font-medium text-ink-900">
                      {i.product_name}{" "}
                      <span className="text-[12px] text-ink-400">
                        ({i.quantity - i.returned_quantity} returnable)
                      </span>
                    </span>
                    <Input
                      aria-label={`Quantity to return for ${i.product_name}`}
                      inputMode="numeric"
                      placeholder="0"
                      value={retQty[i.id] ?? ""}
                      onChange={(e) =>
                        setRetQty({ ...retQty, [i.id]: e.target.value })
                      }
                      className="w-24"
                    />
                  </div>
                  {i.serial_numbers.length > 0 && (
                    <Textarea
                      aria-label={`Serial numbers to return for ${i.product_name}`}
                      className="mt-space-2"
                      rows={2}
                      placeholder={`Units to return, from: ${i.serial_numbers.join(", ")}`}
                      value={retSerials[i.id] ?? ""}
                      onChange={(e) =>
                        setRetSerials({ ...retSerials, [i.id]: e.target.value })
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
            <Field
              label="Reason"
              htmlFor="ret_reason"
              required
              className="mt-space-3"
            >
              <Input
                id="ret_reason"
                value={retReason}
                onChange={(e) => setRetReason(e.target.value)}
              />
            </Field>
          </Modal>
        </>
      )}
    </PortalShell>
  );
}
