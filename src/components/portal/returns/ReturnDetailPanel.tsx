"use client";

import {
  ArrowLeftRight,
  CircleDollarSign,
  FileText,
  Undo2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Input";
import { SkeletonLines } from "@/components/ui/Skeleton";
import {
  useDecideReturn,
  useReceiveReturn,
  useReturn,
} from "@/hooks/useReturns";
import {
  channelLabel,
  formatDateTime,
  formatMoney,
  humanize,
  methodLabel,
} from "@/lib/erp";
import {
  REASON_LABEL,
  REFUND_LABEL,
  SOURCE_LABEL,
  STATUS_TONE,
  statusText,
  type RefundMode,
} from "@/lib/returns";
import { hasGrant, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import { formatPhone } from "@/lib/phone";

export const ReturnStatusBadge = ({
  r,
}: {
  r: { status: keyof typeof STATUS_TONE; kind: "return" | "exchange" };
}) => (
  <Badge
    tone={
      r.status === "completed" && r.kind === "exchange"
        ? "brand"
        : STATUS_TONE[r.status]
    }
  >
    {statusText(r)}
  </Badge>
);

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-line pt-space-3">
      <p className="mb-space-2 flex items-center gap-space-2 text-[13.5px] font-bold text-ink-900">
        {icon} {title}
      </p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-space-3 py-0.5 text-[13px]">
      <span className="shrink-0 text-ink-600">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-ink-900">
        {value}
      </span>
    </div>
  );
}

/** One return: the original bill, who, what came back, any exchange, the refund, and for a website request the staff decisions. */
export function ReturnDetailPanel({
  id,
  currency,
}: {
  id: string;
  currency: string;
}) {
  const session = useStaffSession();
  const ret = useReturn(id);
  const decide = useDecideReturn(id);
  const receive = useReceiveReturn(id);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<RefundMode | "">("");
  const busy = decide.isPending || receive.isPending;
  const r = ret.data;
  if (!r)
    return (
      <Card className="p-space-4">
        {ret.error ? (
          <p className="text-[13px] text-error">{ret.error.message}</p>
        ) : (
          <SkeletonLines rows={6} />
        )}
      </Card>
    );

  const canAct = hasGrant(session, "orders:return");
  const open = r.status === "requested" || r.status === "approved";
  const customerExchange = r.requested_replacement?.length > 0;
  const defaultMode: RefundMode = customerExchange
    ? "loyalty_points"
    : r.customer_preference === "store_credit" ||
        r.customer_preference === "loyalty_points"
      ? r.customer_preference
      : "original";
  const after = (msg: string) => ({
    onSuccess: () => {
      toast.success(msg);
      setNote("");
    },
    onError: (e: Error) => toast.error("Couldn't update the return", e.message),
  });

  return (
    <Card className="space-y-space-3 p-space-4">
      <div className="flex items-start justify-between gap-space-2">
        <div>
          <p className="text-[16px] font-bold text-ink-900">Return details</p>
          <p className="text-[13.5px] font-semibold text-ink-900">
            {r.return_number}
          </p>
          <p className="text-[12.5px] text-ink-600">
            {formatDateTime(r.created_at)} · {SOURCE_LABEL[r.source]}
            {r.created_by_name ? ` · ${r.created_by_name}` : ""}
          </p>
        </div>
        <ReturnStatusBadge r={r} />
      </div>

      <Section
        icon={<FileText size={15} className="text-brand-600" />}
        title="Original bill"
      >
        <Row
          label="Bill"
          value={
            <Link
              href={`/portal/orders/${r.order_id}`}
              className="text-brand-700 hover:underline"
            >
              {r.bill_number ?? r.order_number}
            </Link>
          }
        />
        <Row label="Billed" value={formatDateTime(r.order_placed_at)} />
        <Row label="Total" value={formatMoney(r.order_total_minor, currency)} />
        <Row label="Channel" value={channelLabel(r.order_channel)} />
      </Section>

      <Section
        icon={<User size={15} className="text-brand-600" />}
        title="Customer"
      >
        <div role="group" aria-label="Customer details">
          <Row
            label="Customer ID"
            value={
              r.customer_id ? (
                <Link
                  href={`/portal/customers/${r.customer_id}`}
                  className="text-brand-700 hover:underline"
                >
                  {r.customer_code ?? "View customer"}
                </Link>
              ) : (
                "Not recorded"
              )
            }
          />
          <Row label="Name" value={r.customer_name || "Not recorded"} />
          <Row label="Phone" value={r.customer_phone || "Not recorded"} />
          <Row label="Email" value={r.customer_email || "Not recorded"} />
          {(r.customer_addresses ?? []).length > 0 ? (
            <div className="mt-space-2 space-y-space-2">
              <p className="text-[13px] text-ink-600">Saved addresses</p>
              {r.customer_addresses.map((address) => (
                <div
                  key={address.id}
                  className="min-w-0 break-words rounded-md border border-line p-space-2 text-[13px] text-ink-900"
                >
                  <p className="font-semibold">
                    {address.label || "Address"}
                    {address.is_default ? " · Default" : ""}
                  </p>
                  {address.name && <p>{address.name}</p>}
                  <p>
                    {[
                      address.line1,
                      address.line2,
                      address.city,
                      address.state,
                      address.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {address.phone && <p>{formatPhone(address.phone)}</p>}
                </div>
              ))}
            </div>
          ) : (
            <Row label="Address" value="Not recorded" />
          )}
          {!r.customer_id && (
            <p className="mt-space-2 text-[12px] text-ink-600">
              No customer was linked to this walk-in sale.
            </p>
          )}
        </div>
      </Section>

      <Section
        icon={<Undo2 size={15} className="text-error" />}
        title="Returned items"
      >
        <ul className="space-y-space-2">
          {r.items.map((i) => (
            <li
              key={i.id}
              className="rounded-md border border-line p-space-2 text-[13px]"
            >
              <div className="flex justify-between gap-space-2">
                <span className="font-semibold text-ink-900">{i.name}</span>
                <span className="font-semibold">
                  {formatMoney(i.amount_minor, currency)}
                </span>
              </div>
              <p className="text-[12px] text-ink-600">
                {i.sku} · qty {i.quantity} ·{" "}
                {i.disposition === "RESTOCK" ? "back in stock" : "written off"}
                {i.serial_numbers.length > 0 &&
                  ` · ${i.serial_numbers.join(", ")}`}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-space-2 text-[12.5px] text-ink-600">
          <span className="font-semibold text-ink-900">Reason:</span>{" "}
          {REASON_LABEL[r.reason_code]}
          {r.reason_note ? ` — ${r.reason_note}` : ""}
        </p>
        {r.customer_preference && (
          <p className="text-[12.5px] text-ink-600">
            <span className="font-semibold text-ink-900">
              Customer asked for:
            </span>{" "}
            {humanize(r.customer_preference)}
          </p>
        )}
      </Section>

      {r.kind === "exchange" && r.exchange_items.length > 0 && (
        <Section
          icon={<ArrowLeftRight size={15} className="text-accent-violet" />}
          title="Exchange items"
        >
          {r.exchange_items.map((i, n) => (
            <Row
              key={n}
              label={`${i.name} × ${i.quantity}`}
              value={formatMoney(i.line_total_minor, currency)}
            />
          ))}
          {r.exchange_order_id && (
            <Row
              label="Replacement order"
              value={
                <Link
                  href={`/portal/orders/${r.exchange_order_id}`}
                  className="text-brand-700 hover:underline"
                >
                  {r.exchange_order_number}
                </Link>
              }
            />
          )}
        </Section>
      )}

      {r.status === "completed" && (
        <Section
          icon={<CircleDollarSign size={15} className="text-success" />}
          title="Refund summary"
        >
          <Row
            label="Item amount"
            value={formatMoney(r.items_value_minor, currency)}
          />
          {r.kind === "exchange" && (
            <Row
              label={
                r.difference_minor >= 0 ? "Customer paid extra" : "Difference"
              }
              value={formatMoney(Math.abs(r.difference_minor), currency)}
            />
          )}
          <Row
            label="Refunded"
            value={
              <span className="text-success">
                {formatMoney(r.refund_minor, currency)}
              </span>
            }
          />
          {r.refund_mode && (
            <Row label="Refund mode" value={REFUND_LABEL[r.refund_mode]} />
          )}
          {!!r.loyalty_points && (
            <Row
              label="Loyalty points credited"
              value={r.loyalty_points.toLocaleString("en-IN")}
            />
          )}
          {r.refunds
            .filter(
              (x) =>
                !(r.kind === "exchange" && x.payout_method === "store_credit"),
            )
            .map((x) => (
              <Row
                key={x.id}
                label={`from ${methodLabel(x.payment_method)} payment`}
                value={`${formatMoney(x.amount_minor, currency)} · ${REFUND_LABEL[x.payout_method]}`}
              />
            ))}
          {r.credit_note_number && (
            <Row label="Credit note" value={r.credit_note_number} />
          )}
          <Row label="Received at" value={r.branch_name ?? "—"} />
        </Section>
      )}

      {r.decision_note && (
        <p className="rounded-md bg-black/[0.03] p-space-2 text-[12.5px] text-ink-600">
          <span className="font-semibold text-ink-900">Note to customer:</span>{" "}
          {r.decision_note}
        </p>
      )}

      {open && canAct && (
        <div className="space-y-space-2 border-t border-line pt-space-3">
          {customerExchange && (
            <div className="rounded-md bg-black/[0.03] p-space-2 text-[12.5px] text-ink-700">
              <p className="font-semibold text-ink-900">
                Customer chose this replacement
              </p>
              {r.requested_replacement.map((x) => (
                <p key={x.variant_id}>
                  {x.name} × {x.quantity} ·{" "}
                  {formatMoney(x.unit_price_minor, currency)} each
                </p>
              ))}
              <p className="mt-1 text-ink-600">
                When you mark it received, the replacement order is placed from
                the value of the returned items.{" "}
                {r.exchange_payment === "cod"
                  ? "It costs more: the difference is collected in cash on delivery (the original order was COD)."
                  : r.exchange_payment === "online"
                    ? r.top_up && r.top_up.outstanding_minor > 0
                      ? `It costs more: the customer still has to pay ${formatMoney(r.top_up.outstanding_minor, currency)} online, so it can't be received yet.`
                      : `It costs more: the customer already paid ${formatMoney(r.top_up?.due_minor ?? r.difference_minor, currency)} online. The replacement order is held until the goods arrive; if you reject the request, it is cancelled and that payment is refunded.`
                    : "If it costs less, the difference goes back as loyalty points."}
              </p>
            </div>
          )}
          <Field
            label={
              customerExchange
                ? "If the replacement is cheaper, give the difference back as"
                : "Refund when received"
            }
            htmlFor="recv_mode"
          >
            <Select
              id="recv_mode"
              value={mode || defaultMode}
              onValueChange={(value) => setMode(value as RefundMode)}
            >
              {(
                [
                  "original",
                  "loyalty_points",
                  "store_credit",
                  "upi",
                  "cash",
                  "none",
                ] as RefundMode[]
              ).map((m) => (
                <option key={m} value={m}>
                  {REFUND_LABEL[m]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Note to the customer"
            htmlFor="recv_note"
            hint="Required to reject."
          >
            <Textarea
              id="recv_note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <div className="mobile-page-actions flex flex-wrap gap-space-2">
            {r.status === "requested" && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  decide.mutate(
                    { action: "approve", note },
                    after("Request approved"),
                  )
                }
              >
                Approve
              </Button>
            )}
            <Button
              variant="destructive"
              disabled={busy || !note.trim()}
              onClick={() =>
                decide.mutate(
                  { action: "reject", note },
                  after("Request rejected"),
                )
              }
            >
              Reject
            </Button>
            <Button
              disabled={busy || (r.top_up?.outstanding_minor ?? 0) > 0}
              onClick={() =>
                receive.mutate(
                  { refund_mode: mode || defaultMode },
                  after("Goods received, return completed"),
                )
              }
            >
              Mark received
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-line pt-space-2">
        {r.timeline.map((t, n) => (
          <p key={n} className="text-[12px] text-ink-600">
            {formatDateTime(t.at)} · {humanize(t.event)}
          </p>
        ))}
      </div>
    </Card>
  );
}
