"use client";

import {
  AlertTriangle,
  ExternalLink,
  Globe,
  MessageCircle,
  Store,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlanBadge } from "@/components/ui/ServicePlanBadge";
import { formatMoney } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import {
  buyLabel,
  SERVICE_BLURB,
  SERVICE_LABEL,
  STATE_LABEL,
  STATE_TONE,
  type Service,
  type ServiceState,
} from "@/lib/services";
import type { BillingService, BillingView } from "./billing-types";
import { gstNote } from "./gst";
import { canChangeMethod, paysWithText } from "./PaymentMethod";

const ICON = { online: Globe, pos: Store, whatsapp: MessageCircle } as const;
const ICON_TONE = {
  online: "bg-info-tint text-info",
  pos: "bg-service-pos-tint text-service-pos",
  whatsapp: "bg-success-tint text-success",
} as const;

/** Services the business is on (shown under "Your plans"); the rest are offered under "Add more services". */
export const ON_PLAN: ServiceState[] = [
  "trialing",
  "active",
  "past_due",
  "pending",
  "comped",
];

/** Is there something to cancel: a live subscription (paid online, billed by DAAP, a trial, or an unfinished checkout) not already set to end. */
export function canCancel(info: BillingService) {
  const sub = info.subscription;
  return (
    !!sub &&
    ["trialing", "authorization_pending", "active", "past_due"].includes(
      sub.status,
    ) &&
    !sub.cancel_at_period_end
  );
}

/** What cancelling does for this service, for the confirm dialog. Mirrors services/subscriptions.cancel on the server. */
export function cancelCopy(service: Service, info: BillingService) {
  const sub = info.subscription;
  const name = SERVICE_LABEL[service];
  const end = sub?.current_period_end;
  const keepsPaidTime =
    !!sub &&
    (sub.billed ||
      (sub.status === "active" && !!end && new Date(end) > new Date()));
  if (sub?.status === "authorization_pending")
    return {
      label: "Cancel checkout",
      message: `The unfinished payment for ${name} is cancelled. Nothing is charged.`,
    };
  if (keepsPaidTime)
    return {
      label: "Cancel at period end",
      message: `You keep ${name} until ${formatDate(end)}. After that it stops working until you subscribe again. Your other services and your data are not affected.`,
    };
  return {
    label: "Cancel now",
    message: `${name} stops working now${sub?.status === "trialing" ? " and your trial ends" : ""}. Your other services and your data are not affected; you can subscribe again at any time.`,
  };
}

export function ServiceIcon({ service }: { service: Service }) {
  const Icon = ICON[service];
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[service]}`}
    >
      <Icon size={20} />
    </span>
  );
}

/** The renewal / end line under a plan's price. */
function periodText(info: BillingService) {
  const sub = info.subscription;
  if (info.state === "comped") return "Included with your account";
  if (!sub) return null;
  const end = sub.current_period_end;
  if (sub.status === "authorization_pending")
    return "Waiting for the first payment";
  if (sub.status === "past_due") return "Payment failed, retrying";
  if (sub.status === "trialing")
    return end ? `Trial ends ${formatDate(end)}` : "Trial, no end date";
  if (!end) return "Billed by your account manager";
  if (sub.cancel_at_period_end) return `Ends ${formatDate(end)}`;
  return sub.billed
    ? `Renews ${formatDate(end)}`
    : `Paid until ${formatDate(end)}`;
}

/** One service the business is on: plan, price, renewal, notices, and Change plan / Cancel. */
export function PlanRow({
  service,
  info,
  tax,
  canManage,
  onChoose,
  onCancel,
  onChangeMethod,
}: {
  service: Service;
  info: BillingService;
  tax: BillingView["tax"];
  canManage: boolean;
  onChoose: () => void;
  onCancel: () => void;
  /** Change the card / UPI AutoPay (or, after a failed charge, pay now with another one). */
  onChangeMethod: () => void;
}) {
  const { plan, subscription: sub, pending_plan: pending } = info;
  const cycle = sub?.billing_cycle ?? "monthly";
  const price = plan
    ? cycle === "annual"
      ? plan.price_yearly_minor
      : plan.price_monthly_minor
    : 0;
  const period = periodText(info);
  const checkout =
    sub?.status === "authorization_pending" ? sub.razorpay_short_url : null;
  const method = paysWithText(info.pays_with);
  const changeable = canChangeMethod(info);
  const changeLabel =
    sub?.billed || info.state === "active"
      ? "Change plan"
      : buyLabel(info.state);

  return (
    <div
      id={service}
      className="flex scroll-mt-24 flex-col gap-space-3 p-space-4 md:flex-row md:items-center"
    >
      <div className="flex min-w-0 flex-1 gap-space-3">
        <ServiceIcon service={service} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-space-2">
            <span className="text-[15px] font-bold text-ink-900">
              {SERVICE_LABEL[service]}
            </span>
            {plan && <PlanBadge name={plan.name} code={plan.code} />}
            {sub && info.state !== "comped" && (
              <span className="text-[12.5px] capitalize text-ink-400">
                {cycle}
              </span>
            )}
            {info.state !== "active" && (
              <Badge tone={STATE_TONE[info.state]}>
                {STATE_LABEL[info.state]}
              </Badge>
            )}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-600">
            {plan && price > 0 && info.state !== "comped" && (
              <>
                <span className="font-semibold text-ink-900">
                  {formatMoney(price, plan.currency.trim()).replace(
                    /\.00$/,
                    "",
                  )}
                </span>
                /{cycle === "annual" ? "year" : "month"}
                {gstNote(tax.price_mode, tax.gst_rate) &&
                  ` ${gstNote(tax.price_mode, tax.gst_rate)}`}
                {period && " · "}
              </>
            )}
            {period}
          </p>

          {sub?.billed && (method || changeable) && (
            <p className="mt-0.5 text-[13px] text-ink-600">
              {method ? `Pays with ${method}` : "Payment method"}
              {canManage && changeable && info.state !== "past_due" && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={onChangeMethod}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    Change
                  </button>
                </>
              )}
            </p>
          )}
          {info.state === "past_due" && (
            <p className="mt-space-2 flex items-start gap-space-2 text-[13px] text-error">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              Your last payment failed. {SERVICE_LABEL[service]} keeps working
              while Razorpay retries, then stops. Pay with another card or UPI
              AutoPay to keep it on.
            </p>
          )}
          {sub?.cancel_at_period_end && (
            <p className="mt-space-2 text-[13px] text-warning">
              Set to cancel on {formatDate(sub.current_period_end)}. It keeps
              working until then.
            </p>
          )}
          {pending && (
            <p className="mt-space-2 text-[13px] text-brand-700">
              Switching to <strong>{pending.name}</strong> on{" "}
              {formatDate(sub?.current_period_end)}.
            </p>
          )}
        </div>
      </div>

      {canManage && (
        <div className="mobile-page-actions flex flex-wrap gap-space-2 md:justify-end">
          {checkout && (
            <Button href={checkout} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} /> Continue to payment
            </Button>
          )}
          {info.state === "past_due" && changeable && (
            <Button variant="destructive" onClick={onChangeMethod}>
              Fix payment
            </Button>
          )}
          {!checkout && (
            <Button variant="secondary" onClick={onChoose}>
              {changeLabel}
            </Button>
          )}
          {canCancel(info) && (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** A service the business is not on (never bought, or ended): what it is and a button to see its plans. */
export function AddServiceCard({
  service,
  info,
  canManage,
  onChoose,
}: {
  service: Service;
  info: BillingService;
  canManage: boolean;
  onChoose: () => void;
}) {
  return (
    <Card
      id={service}
      className="flex scroll-mt-24 flex-col gap-space-3 p-space-4"
    >
      <div className="flex gap-space-3">
        <ServiceIcon service={service} />
        <div>
          <p className="text-[15px] font-bold text-ink-900">
            {SERVICE_LABEL[service]}
          </p>
          <p className="text-[13px] text-ink-600">{SERVICE_BLURB[service]}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-space-2">
        <span className="text-[12.5px] text-ink-400">
          {info.state === "ended"
            ? `Ended${info.subscription?.current_period_end ? ` ${formatDate(info.subscription.current_period_end)}` : ""}. Your data is kept.`
            : "Not bought yet"}
        </span>
        {canManage && (
          <Button variant="secondary" onClick={onChoose}>
            {info.state === "ended" ? "Renew" : "See plans"}
          </Button>
        )}
      </div>
    </Card>
  );
}
