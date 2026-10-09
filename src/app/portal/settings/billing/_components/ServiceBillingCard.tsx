"use client";

import { AlertTriangle, Check, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import {
  buyLabel,
  SERVICE_BLURB,
  SERVICE_LABEL,
  STATE_LABEL,
  STATE_TONE,
  type Service,
} from "@/lib/services";
import type { BillingPlan, BillingService } from "./billing-types";

const planFeatures = (p: BillingPlan) => [
  p.max_branches
    ? `Up to ${p.max_branches} branch${p.max_branches === 1 ? "" : "es"}`
    : "Unlimited branches",
  p.max_users ? `Up to ${p.max_users} users` : "Unlimited users",
  ...(p.service === "pos"
    ? [
        p.max_terminals
          ? `Up to ${p.max_terminals} POS terminal${p.max_terminals === 1 ? "" : "s"}`
          : "Unlimited POS terminals",
      ]
    : []),
  ...(p.feature_labels ?? p.features),
];

/** One service's plan, renewal and actions. Every service is its own subscription: bought, renewed, changed and cancelled on its own. */
export function ServiceBillingCard({
  service,
  info,
  canManage,
  onChoose,
  onCancel,
}: {
  service: Service;
  info: BillingService;
  canManage: boolean;
  onChoose: () => void;
  onCancel: () => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const { plan, subscription: sub, pending_plan: pending } = info;
  const cycle = sub?.billing_cycle ?? "monthly";
  const billed =
    !!sub?.billed && (sub.status === "active" || sub.status === "past_due");
  const waiting =
    sub?.status === "authorization_pending" && !!sub.razorpay_short_url;
  const live = info.state !== "none" && info.state !== "ended";
  const features = plan ? planFeatures(plan) : [];

  return (
    <Card id={service} className="flex scroll-mt-24 flex-col p-space-4">
      <div className="mb-space-3 flex flex-wrap items-start justify-between gap-space-2">
        <div>
          <h2 className="text-[16px] font-bold text-ink-900">
            {SERVICE_LABEL[service]}
          </h2>
          <p className="text-[12.5px] text-ink-600">{SERVICE_BLURB[service]}</p>
        </div>
        <Badge tone={STATE_TONE[info.state]}>{STATE_LABEL[info.state]}</Badge>
      </div>

      {info.state === "past_due" && (
        <p className="mb-space-3 flex items-start gap-space-2 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          Your last payment failed. Update your payment method with Razorpay to
          keep {SERVICE_LABEL[service]} active — we&apos;ll retry automatically.
        </p>
      )}
      {sub?.cancel_at_period_end && (
        <p className="mb-space-3 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning">
          Set to cancel on <strong>{formatDate(sub.current_period_end)}</strong>.
          {SERVICE_LABEL[service]} keeps working until then.
        </p>
      )}
      {waiting && (
        <div className="mb-space-3 flex flex-wrap items-center justify-between gap-space-2 rounded-md border border-brand-300 bg-brand-50/50 p-space-3">
          <p className="text-[13px] text-ink-900">
            Waiting for your first payment.
          </p>
          <Button
            href={sub!.razorpay_short_url!}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={14} /> Continue to payment
          </Button>
        </div>
      )}

      <div className="flex-1 rounded-md border border-line p-space-3">
        <p className="text-[16px] font-bold text-ink-900">
          {live || info.state === "ended" ? (plan?.name ?? "No plan") : "No plan"}
        </p>
        {plan && live && (
          <p className="mt-1">
            <span className="text-[22px] font-bold text-ink-900">
              {formatMoney(
                cycle === "annual"
                  ? plan.price_yearly_minor
                  : plan.price_monthly_minor,
                plan.currency.trim(),
              ).replace(/\.00$/, "")}
            </span>{" "}
            <span className="text-[13px] text-ink-600">
              {plan.currency.trim()}/{cycle === "annual" ? "year" : "month"}
            </span>
          </p>
        )}
        {sub && info.state === "trialing" && (
          <p className="text-[13px] text-ink-600">
            {sub.current_period_end
              ? `Trial ends ${formatDate(sub.current_period_end)}`
              : "Trial with no end date"}
            . Choose a plan to keep going.
          </p>
        )}
        {sub && billed && (
          <p className="text-[13px] text-ink-600">
            {sub.cancel_at_period_end ? "Ends" : "Renews"}{" "}
            {formatDate(sub.current_period_end)}
          </p>
        )}
        {sub && info.state === "active" && !billed && (
          <p className="mt-1 text-[13px] text-ink-600">
            {sub.current_period_end
              ? `Paid until ${formatDate(sub.current_period_end)}.`
              : "Managed by your account manager."}{" "}
            Choose a plan to pay online.
          </p>
        )}
        {info.state === "comped" && (
          <p className="mt-1 text-[13px] text-ink-600">
            Included with your account.
          </p>
        )}
        {info.state === "ended" && (
          <p className="mt-1 text-[13px] text-ink-600">
            This plan has ended. Renew to use {SERVICE_LABEL[service]} again — your
            data is kept.
          </p>
        )}
        {info.state === "none" && (
          <p className="mt-1 text-[13px] text-ink-600">
            You haven&apos;t bought {SERVICE_LABEL[service]} yet.
          </p>
        )}
        {pending && (
          <p className="mt-space-2 text-[13px] text-brand-700">
            Switching to <strong>{pending.name}</strong> on{" "}
            {formatDate(sub?.current_period_end)}.
          </p>
        )}
        {plan && live && (
          <>
            <ul className="mt-space-3 space-y-1.5 text-[14px]">
              {(showAll ? features : features.slice(0, 3)).map((t) => (
                <li key={t} className="flex items-start gap-space-2">
                  <Check size={14} className="mt-1 shrink-0 text-ink-600" />
                  {t}
                </li>
              ))}
            </ul>
            {features.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-space-3 flex w-full items-center justify-between border-t border-line pt-space-3 text-[14px] font-semibold text-ink-900"
              >
                {showAll ? "Show fewer features" : "View all features"}
                <ChevronRight size={16} className={showAll ? "rotate-90" : ""} />
              </button>
            )}
          </>
        )}
      </div>

      {canManage && (
        <div className="mt-space-3 flex flex-wrap justify-end gap-space-2">
          {billed && !sub?.cancel_at_period_end && (
            <Button
              variant="secondary"
              className="text-destructive"
              onClick={onCancel}
            >
              Cancel plan
            </Button>
          )}
          <Button
            variant={live && !sub?.billed ? "secondary" : billed ? "secondary" : "primary"}
            onClick={onChoose}
          >
            {billed ? "Change plan" : buyLabel(info.state)}
          </Button>
        </div>
      )}
    </Card>
  );
}
