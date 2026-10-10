"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { BillingPlan } from "@/app/portal/settings/billing/_components/billing-types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useBilling, useChoosePlan, useServicePlans } from "@/hooks/useBilling";
import { formatMoney } from "@/lib/erp";
import {
  buyLabel,
  SERVICE_BLURB,
  SERVICE_LABEL,
  SERVICES,
  STATE_LABEL,
  STATE_TONE,
  type Service,
} from "@/lib/services";
import { toast } from "@/lib/toast";

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

/** Buy a plan, in two steps: choose the service (skipped when `service` is given), then its plan pack (Starter / Growth / Enterprise). A service that
 * is already paid through Razorpay gets "switch at cycle end"; any other opens Razorpay's hosted checkout in a new tab. */
type PickerProps = {
  open: boolean;
  onClose: () => void;
  /** Start on this service's plans (the channel pages know which service they are about). */
  service?: Service;
  /** Called after a checkout was opened or a plan change scheduled, so the caller can refresh. */
  onDone?: () => void;
};

/** Mounted only while open, so every opening starts fresh (at the service step unless a service was given) and loads current data. */
export function PlanPickerModal(props: PickerProps) {
  if (!props.open) return null;
  return <Picker {...props} />;
}

function Picker({ open, onClose, service, onDone }: PickerProps) {
  const [picked, setPicked] = useState<Service | null>(null);
  const chosen = service ?? picked;

  const view = useBilling();
  const plansQ = useServicePlans(chosen);
  const choosePlan = useChoosePlan();
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const plans = plansQ.data ?? [];
  const configured = view.data?.billing_configured ?? true;
  const current = chosen ? view.data?.services[chosen] : undefined;
  const billed =
    !!current?.subscription?.billed &&
    (current.subscription.status === "active" ||
      current.subscription.status === "past_due");

  function choose(plan: BillingPlan) {
    if (!chosen) return;
    setBusy(plan.code);
    choosePlan.mutate(
      {
        service: chosen,
        plan_code: plan.code,
        change: billed,
        billing_cycle: cycle,
      },
      {
        onSuccess: (data) => {
          if (billed) {
            toast.success(
              `Your ${SERVICE_LABEL[chosen]} plan will change to ${plan.name} at the end of the current period.`,
            );
          } else {
            window.open(
              (data as { short_url: string }).short_url,
              "_blank",
              "noopener",
            );
            toast.success(
              "Checkout is ready — complete the payment in the new tab. This page updates by itself once it goes through.",
            );
          }
          onDone?.();
          onClose();
        },
        onError: (e) =>
          toast.error(
            billed ? "Couldn't change the plan" : "Couldn't start checkout",
            e.message,
          ),
        onSettled: () => setBusy(null),
      },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="lg"
      title={
        chosen
          ? `${SERVICE_LABEL[chosen]} plans`
          : "What would you like to buy?"
      }
      description={
        chosen
          ? billed
            ? "A new plan starts at the end of your current billing period."
            : "Pay securely with Razorpay. Your data is kept exactly as you left it."
          : "Online, POS and WhatsApp are bought separately, each with its own plan and renewal."
      }
      footer={
        <>
          {chosen && !service && (
            <Button variant="ghost" onClick={() => setPicked(null)}>
              <ArrowLeft size={14} /> Services
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {!configured && (
        <p className="mb-space-3 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning">
          Online payments aren&apos;t switched on for this platform yet. Please
          contact support to buy or change a plan.
        </p>
      )}

      {!chosen && (
        <div className="grid gap-space-3 sm:grid-cols-3">
          {SERVICES.map((s) => {
            const info = view.data?.services[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setPicked(s)}
                className="flex flex-col items-start gap-space-1 rounded-md border border-line p-space-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50"
              >
                <span className="text-[16px] font-bold text-ink-900">
                  {SERVICE_LABEL[s]}
                </span>
                <span className="text-[12.5px] text-ink-600">
                  {SERVICE_BLURB[s]}
                </span>
                {info && (
                  <Badge tone={STATE_TONE[info.state]} className="mt-space-1">
                    {info.plan &&
                    info.state !== "none" &&
                    info.state !== "ended"
                      ? `${info.plan.name} · ${STATE_LABEL[info.state]}`
                      : STATE_LABEL[info.state]}
                  </Badge>
                )}
                <span className="mt-space-1 text-[13px] font-semibold text-brand-600">
                  {buyLabel(info?.state)} →
                </span>
              </button>
            );
          })}
        </div>
      )}

      {chosen && (
        <>
          <div className="mb-space-3 inline-flex rounded-md border border-line bg-card p-0.5 text-[13px] font-semibold">
            {(["monthly", "annual"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                disabled={billed}
                className={`rounded px-space-3 py-1 ${cycle === c ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-paper"} disabled:opacity-50`}
              >
                {c === "monthly" ? "Monthly" : "Annual"}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-space-3">
            {plans.map((p) => {
              const price =
                (billed ? current?.subscription?.billing_cycle : cycle) ===
                "annual"
                  ? p.price_yearly_minor
                  : p.price_monthly_minor;
              const shownCycle = billed
                ? current?.subscription?.billing_cycle
                : cycle;
              const discount = Number(p.annual_discount_pct);
              const isCurrent = current?.plan?.id === p.id;
              const scheduled = current?.pending_plan?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-md border p-space-3 ${isCurrent ? "border-brand-400" : "border-line"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-space-2">
                    <div className="flex items-center gap-space-2">
                      <h3 className="text-[16px] font-bold text-ink-900">
                        {p.name}
                      </h3>
                      {p.is_popular && <Badge tone="brand">Most popular</Badge>}
                      {isCurrent && <Badge tone="success">Current</Badge>}
                    </div>
                    {configured && (
                      <Button
                        variant={billed ? "secondary" : "primary"}
                        disabled={
                          busy !== null ||
                          p.price_monthly_minor <= 0 ||
                          (billed && (isCurrent || scheduled))
                        }
                        onClick={() => choose(p)}
                      >
                        {p.price_monthly_minor <= 0
                          ? "Contact us"
                          : busy === p.code
                            ? "Opening…"
                            : billed
                              ? isCurrent
                                ? "Current plan"
                                : scheduled
                                  ? "Scheduled"
                                  : "Switch at cycle end"
                              : "Subscribe"}
                      </Button>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-[12.5px] text-ink-600">
                      {p.description}
                    </p>
                  )}
                  <p className="mt-space-2">
                    <span className="text-[22px] font-bold text-ink-900">
                      {formatMoney(price, p.currency.trim()).replace(
                        /\.00$/,
                        "",
                      )}
                    </span>{" "}
                    <span className="text-[13px] text-ink-600">
                      {p.currency.trim()}/
                      {shownCycle === "annual" ? "year" : "month"}
                    </span>
                  </p>
                  {shownCycle === "annual" && discount > 0 && !billed && (
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
              <p className="text-ink-400">
                No {SERVICE_LABEL[chosen]} plans are available right now.
              </p>
            )}
            {plansQ.isFetching && !plansQ.data && (
              <p className="text-ink-400">Loading…</p>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
