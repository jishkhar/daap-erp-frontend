"use client";

import { ArrowLeft, Ban, CreditCard, PackageCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChannelBadge, OrderStatusBadge, PaymentStatusBadge } from "@/components/erp/StatusBadges";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { erp, formatDateTime, formatMoney, humanize, methodLabel, toMinor, useErpQuery, type OrderDetail } from "@/lib/erp";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { SkeletonLines } from "@/components/ui/Skeleton";

// The schema's single order status runs from payment to delivery; only `completed` takes the stock out and books the sale.
const NEXT_STEP: Record<string, { to: string; label: string }[]> = {
  confirmed: [{ to: "preparing", label: "Start preparing" }],
  preparing: [{ to: "ready", label: "Mark ready" }],
  ready: [{ to: "shipped", label: "Mark shipped" }, { to: "completed", label: "Mark delivered" }],
  shipped: [{ to: "completed", label: "Mark delivered" }],
  out_for_delivery: [{ to: "completed", label: "Mark delivered" }],
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-space-3 py-1.5 text-[14px]">
      <span className="text-ink-600">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const order = useErpQuery<OrderDetail>(`/api/v1/orders/${id}`);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [serialDraft, setSerialDraft] = useState<Record<string, string>>({});

  if (!ready) return null;
  const o = order.data;
  const canUpdate = hasPermission(session, "orders", "write");
  const canCancel = hasPermission(session, "orders", "delete");

  async function act(path: string, body: unknown, okMessage: string, after?: () => void) {
    setBusy(true);
    const res = await erp(path, "POST", body);
    setBusy(false);
    if (res.error) return toast.error("Couldn't complete that", res.error);
    toast.success(okMessage);
    after?.();
    order.reload();
  }

  const outstanding = o ? o.total_minor - o.paid_minor : 0;
  const canPay = !!o && ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "shipped", "completed"].includes(o.status) && outstanding > 0;
  const steps = o ? NEXT_STEP[o.status] ?? [] : [];
  const canCancelNow = !!o && ["pending", "confirmed", "preparing", "ready"].includes(o.status);
  const cur = o?.currency ?? tenant?.currency ?? "INR";

  return (
    <PortalShell tenant={tenant} active="orders">
      <Link href="/portal/orders" className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 hover:underline">
        <ArrowLeft size={14} /> All orders
      </Link>
      {order.error && <p className="text-[14px] font-medium text-error">{order.error}</p>}
      {!o && !order.error && <SkeletonLines rows={3} />}
      {o && (
        <>
          <div className="mb-space-5 flex flex-wrap items-start justify-between gap-space-3">
            <div>
              <h1 className="text-display">{o.order_number}</h1>
              <div className="mt-space-2 flex flex-wrap items-center gap-space-2">
                <ChannelBadge channel={o.channel} />
                <OrderStatusBadge status={o.status} />
                <PaymentStatusBadge status={o.payment_status} />
              </div>
              <p className="mt-space-2 text-[13px] text-ink-600">
                Placed {formatDateTime(o.placed_at)} · {humanize(o.order_type)}
                {o.customer_id && (
                  <> · <Link href={`/portal/customers/${o.customer_id}`} className="font-semibold text-brand-600 hover:underline">View customer</Link></>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-space-2">
              {canUpdate && steps.map((s) => (
                <Button key={s.to} disabled={busy} onClick={() => act(`/api/v1/orders/${o.id}/fulfilment`, { status: s.to }, `Order ${humanize(s.to).toLowerCase()}`)}>
                  <PackageCheck size={16} /> {s.label}
                </Button>
              ))}
              {canUpdate && canPay && (
                <Button variant="secondary" onClick={() => { setAmount((outstanding / 100).toFixed(2)); setPayOpen(true); }}>
                  <CreditCard size={16} /> Record payment
                </Button>
              )}
              {canCancel && canCancelNow && (
                <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                  <Ban size={16} /> Cancel order
                </Button>
              )}
            </div>
          </div>

          {o.status === "cancelled" && (
            <Card className="mb-space-4 border-warning/40 bg-warning-tint p-space-3 text-[13.5px] text-warning">
              Cancelled{o.cancel_reason ? `: ${o.cancel_reason}` : ""}.{" "}
              {o.paid_minor - o.refunded_minor > 0 && <strong>{formatMoney(o.paid_minor - o.refunded_minor, cur)} was paid and is due back to the customer.</strong>}
            </Card>
          )}

          <div className="grid gap-space-4 lg:grid-cols-3">
            <Card className="p-space-4 lg:col-span-2">
              <h2 className="mb-space-3 text-[15px] font-bold text-ink-900">Items</h2>
              <ul className="divide-y divide-line">
                {o.items.map((item) => {
                  const bound = item.serials?.length ?? 0;
                  const needsSerials = item.serialization_type !== "NONE" && o.channel !== "pos" && ["pending", "confirmed", "preparing", "ready"].includes(o.status) && bound < item.quantity;
                  return (
                    <li key={item.id} className="py-space-3">
                      <div className="flex items-start justify-between gap-space-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900">{item.name_snapshot}</p>
                          <p className="text-[12.5px] text-ink-600">
                            {item.sku_snapshot} · {item.quantity} × {formatMoney(item.unit_price_minor, cur)}
                            {item.tax_minor > 0 && <> · tax {formatMoney(item.tax_minor, cur)}</>}
                            {item.returned_quantity > 0 && <> · {item.returned_quantity} returned</>}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold">{formatMoney(item.line_total_minor, cur)}</p>
                      </div>
                      {item.serials && item.serials.length > 0 && (
                        <p className="mt-1 text-[12.5px] text-ink-600">
                          {item.serialization_type === "IMEI" ? "IMEI" : "Serial"}: {item.serials.map((s) => `${s.serial_number} (${humanize(s.status)})`).join(", ")}
                        </p>
                      )}
                      {canUpdate && needsSerials && (
                        <div className="mt-space-2 flex flex-wrap items-center gap-space-2">
                          <Input
                            aria-label={`${item.serialization_type === "IMEI" ? "IMEI" : "Serial"} numbers for ${item.name_snapshot}`}
                            placeholder={`${item.quantity - bound} ${item.serialization_type === "IMEI" ? "IMEI" : "serial"} number(s), comma separated`}
                            value={serialDraft[item.id] ?? ""}
                            onChange={(e) => setSerialDraft({ ...serialDraft, [item.id]: e.target.value })}
                            className="max-w-md"
                          />
                          <Button variant="secondary" disabled={busy || !(serialDraft[item.id] ?? "").trim()}
                            onClick={() => act(`/api/v1/orders/${o.id}/items/${item.id}/serials`, { serial_numbers: serialDraft[item.id].split(",").map((s) => s.trim()).filter(Boolean) }, "Units bound", () => setSerialDraft({ ...serialDraft, [item.id]: "" }))}>
                            Bind units
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>

            <div className="space-y-space-4">
              <Card className="p-space-4">
                <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">Summary</h2>
                <Row label="Subtotal" value={formatMoney(o.subtotal_minor, cur)} />
                {o.discount_minor > 0 && <Row label="Discount" value={`− ${formatMoney(o.discount_minor, cur)}`} />}
                <Row label="Tax" value={formatMoney(o.tax_minor, cur)} />
                <div className="my-1 border-t border-line" />
                <Row label="Total" value={<span className="text-[16px] font-bold">{formatMoney(o.total_minor, cur)}</span>} />
                <Row label="Paid" value={formatMoney(o.paid_minor, cur)} />
                {o.refunded_minor > 0 && <Row label="Refunded" value={formatMoney(o.refunded_minor, cur)} />}
                {outstanding > 0 && o.status !== "cancelled" && <Row label="Outstanding" value={<span className="text-warning">{formatMoney(outstanding, cur)}</span>} />}
              </Card>
              <Card className="p-space-4">
                <h2 className="mb-space-2 text-[15px] font-bold text-ink-900">Payments</h2>
                {o.payments.length === 0 && <p className="text-[13px] text-ink-400">No payments yet.</p>}
                <ul className="divide-y divide-line">
                  {o.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-space-2 py-2 text-[13.5px]">
                      <span>
                        <span className="font-medium text-ink-900">{methodLabel(p.method)}</span>
                        <span className="ml-2 text-ink-400">{formatMoney(p.amount_minor, cur)}</span>
                      </span>
                      <span className="flex items-center gap-space-2">
                        <Badge tone={p.status === "paid" ? "success" : p.status === "failed" ? "neutral" : "warning"}>{humanize(p.status)}</Badge>
                        {canUpdate && p.method === "cod" && p.status === "pending" && o.status !== "cancelled" && (
                          <Button variant="secondary" disabled={busy} onClick={() => act(`/api/v1/payments/${p.id}/capture`, {}, "Cash collected")}>Collect</Button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?" description="Reserved stock is released. Any money already paid stays recorded and is flagged as due back."
            footer={<>
              <Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep order</Button>
              <Button variant="destructive" disabled={busy || !reason.trim()} onClick={() => act(`/api/v1/orders/${o.id}/cancel`, { reason: reason.trim() }, "Order cancelled", () => { setCancelOpen(false); setReason(""); })}>Cancel order</Button>
            </>}>
            <Field label="Reason" htmlFor="cancel_reason" required>
              <Textarea id="cancel_reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          </Modal>

          <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record a payment" description={`${formatMoney(outstanding, cur)} outstanding.`}
            footer={<>
              <Button variant="ghost" onClick={() => setPayOpen(false)}>Close</Button>
              <Button disabled={busy || toMinor(amount) === null || (toMinor(amount) ?? 0) === 0}
                onClick={() => act(`/api/v1/orders/${o.id}/payments`, { method, amount_minor: toMinor(amount) }, method === "cod" ? "Cash on delivery recorded" : "Payment recorded", () => setPayOpen(false))}>Save payment</Button>
            </>}>
            <Field label="Method" htmlFor="pay_method">
              <Select id="pay_method" value={method} onChange={(e) => setMethod(e.target.value)}>
                {["cash", "card", "upi", "netbanking", "cod", "wallet"].map((m) => <option key={m} value={m}>{methodLabel(m)}</option>)}
              </Select>
            </Field>
            <Field label={`Amount (${cur})`} htmlFor="pay_amount" hint="Cannot exceed the amount outstanding.">
              <Input id="pay_amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
          </Modal>
        </>
      )}
    </PortalShell>
  );
}
