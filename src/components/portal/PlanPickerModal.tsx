"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type {
  BillingPlan,
  BillingView,
} from "@/app/portal/settings/billing/_components/billing-types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { erp, formatMoney, useErpQuery } from "@/lib/erp";
import { toast } from "@/lib/toast";

const planFeatures = (p: BillingPlan) => [
  p.max_branches
    ? `Up to ${p.max_branches} branch${p.max_branches === 1 ? "" : "es"}`
    : "Unlimited branches",
  p.max_users ? `Up to ${p.max_users} users` : "Unlimited users",
  ...(p.feature_labels ?? p.features),
];

/** Pick a plan and pay: opens Razorpay's hosted checkout in a new tab. Used by the renew screen, where the tenant has no active plan. */
export function PlanPickerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const plansQ = useErpQuery<BillingPlan[]>(
    open ? "/api/v1/billing/plans" : null,
  );
  const view = useErpQuery<BillingView>(open ? "/api/v1/billing" : null);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const plans = plansQ.data ?? [];
  const configured = view.data?.billing_configured ?? true;

  async function subscribe(plan: BillingPlan) {
    setBusy(plan.code);
    const res = await erp<{ short_url: string }>(
      "/api/v1/billing/subscribe",
      "POST",
      { plan_code: plan.code, billing_cycle: cycle },
    );
    setBusy(null);
    if (res.error || !res.data)
      return toast.error("Couldn't start checkout", res.error ?? undefined);
    window.open(res.data.short_url, "_blank", "noopener");
    toast.success(
      "Checkout is ready — complete the payment in the new tab. This screen unlocks by itself once it goes through.",
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="lg"
      title="Choose a plan"
      description="Pay securely with Razorpay. Your data is kept exactly as you left it."
      footer={
        <Button variant="ghost" onClick={onClose}>
          Back
        </Button>
      }
    >
      {!configured && (
        <p className="mb-space-3 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning">
          Online payments aren&apos;t switched on for this platform yet. Please
          contact support to renew.
        </p>
      )}
      <div className="mb-space-3 inline-flex rounded-md border border-line bg-card p-0.5 text-[13px] font-semibold">
        {(["monthly", "annual"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            className={`rounded px-space-3 py-1 ${cycle === c ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-paper"}`}
          >
            {c === "monthly" ? "Monthly" : "Annual"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-space-3">
        {plans.map((p) => {
          const price =
            cycle === "annual" ? p.price_yearly_minor : p.price_monthly_minor;
          const discount = Number(p.annual_discount_pct);
          return (
            <div key={p.id} className="rounded-md border border-line p-space-3">
              <div className="flex flex-wrap items-center justify-between gap-space-2">
                <div className="flex items-center gap-space-2">
                  <h3 className="text-[16px] font-bold text-ink-900">
                    {p.name}
                  </h3>
                  {p.is_popular && <Badge tone="brand">Most popular</Badge>}
                </div>
                {configured && (
                  <Button
                    disabled={busy !== null || p.price_monthly_minor <= 0}
                    onClick={() => subscribe(p)}
                  >
                    {p.price_monthly_minor <= 0
                      ? "Contact us"
                      : busy === p.code
                        ? "Opening…"
                        : "Subscribe"}
                  </Button>
                )}
              </div>
              {p.description && (
                <p className="text-[12.5px] text-ink-600">{p.description}</p>
              )}
              <p className="mt-space-2">
                <span className="text-[22px] font-bold text-ink-900">
                  {formatMoney(price, p.currency.trim()).replace(/\.00$/, "")}
                </span>{" "}
                <span className="text-[13px] text-ink-600">
                  {p.currency.trim()}/{cycle === "annual" ? "year" : "month"}
                </span>
              </p>
              {cycle === "annual" && discount > 0 && (
                <p className="text-[12px] text-success">
                  You save {discount}% on yearly billing
                </p>
              )}
              <ul className="mt-space-2 space-y-1 text-[13px]">
                {planFeatures(p).map((t) => (
                  <li key={t} className="flex items-start gap-space-2">
                    <CheckCircle2
                      size={15}
                      className="mt-0.5 shrink-0 text-success"
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {plansQ.data && plans.length === 0 && (
          <p className="text-ink-400">No plans are available right now.</p>
        )}
        {plansQ.loading && !plansQ.data && (
          <p className="text-ink-400">Loading…</p>
        )}
      </div>
    </Modal>
  );
}
