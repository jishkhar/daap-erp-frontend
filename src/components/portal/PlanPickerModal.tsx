"use client";

import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BillingPlan } from "@/app/portal/settings/billing/_components/billing-types";
import { Badge } from "@/components/ui/Badge";
import { PlanBadge } from "@/components/ui/ServicePlanBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useBilling, useServicePlans } from "@/hooks/useBilling";
import { gstNote } from "@/app/portal/settings/billing/_components/gst";
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

/** Choose a plan, in two steps: the service (skipped when `service` is given), then its plan pack (Starter / Growth / Enterprise) and cycle.
 * Choosing opens the checkout page, which shows the price with GST and what happens (pay now, or switch at the period end) before paying. */
type PickerProps = {
  open: boolean;
  onClose: () => void;
  /** Start on this service's plans (the channel pages know which service they are about). */
  service?: Service;
  /** Kept for callers; checkout itself happens on the checkout page. */
  onDone?: () => void;
};

/** Mounted only while open, so every opening starts fresh (at the service step unless a service was given) and loads current data. */
export function PlanPickerModal(props: PickerProps) {
  if (!props.open) return null;
  return <Picker {...props} />;
}

function Picker({ open, onClose, service }: PickerProps) {
  const router = useRouter();
  const [picked, setPicked] = useState<Service | null>(null);
  const chosen = service ?? picked;

  const view = useBilling();
  const plansQ = useServicePlans(chosen);
  const plans = plansQ.data ?? [];
  const configured = view.data?.billing_configured ?? true;
  const current = chosen ? view.data?.services[chosen] : undefined;
  const live =
    !!current && current.state !== "none" && current.state !== "ended";
  const [cycle, setCycle] = useState<"monthly" | "annual">(
    current?.subscription?.billing_cycle ?? "monthly",
  );

  function choose(plan: BillingPlan) {
    if (!chosen) return;
    onClose();
    router.push(
      `/portal/settings/billing/checkout?service=${chosen}&plan=${encodeURIComponent(plan.code)}&cycle=${cycle}`,
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
          ? "Pick a plan. You'll see the full price with GST before you pay."
          : "Website, POS and WhatsApp are bought separately, each with its own plan and renewal."
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
          Website payments aren&apos;t switched on for this platform yet. Please
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
                  <span className="mt-space-1 flex flex-wrap gap-1">
                    {info.plan &&
                      info.state !== "none" &&
                      info.state !== "ended" && (
                        <PlanBadge
                          name={info.plan.name}
                          code={info.plan.code}
                        />
                      )}
                    <Badge tone={STATE_TONE[info.state]}>
                      {STATE_LABEL[info.state]}
                    </Badge>
                  </span>
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
                className={`rounded px-space-3 py-1 ${cycle === c ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-paper"}`}
              >
                {c === "monthly" ? "Monthly" : "Annual"}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-space-3">
            {plans.map((p) => {
              const price =
                cycle === "annual"
                  ? p.price_yearly_minor
                  : p.price_monthly_minor;
              const charge =
                cycle === "annual"
                  ? p.charge_yearly_minor
                  : p.charge_monthly_minor;
              const shownCycle = cycle;
              const discount = Number(p.annual_discount_pct);
              const isCurrent = live && current?.plan?.id === p.id;
              const onThis =
                isCurrent && current?.subscription?.billing_cycle === cycle;
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
                        variant={p.is_popular ? "primary" : "secondary"}
                        disabled={
                          p.price_monthly_minor <= 0 || onThis || scheduled
                        }
                        onClick={() => choose(p)}
                      >
                        {p.price_monthly_minor <= 0
                          ? "Contact us"
                          : onThis
                            ? "Current plan"
                            : scheduled
                              ? "Scheduled"
                              : "Choose"}
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
                    {gstNote(p.price_mode, p.gst_rate) && (
                      <span className="block text-[12px] text-ink-400">
                        {gstNote(p.price_mode, p.gst_rate)}
                        {p.price_mode === "exclusive" &&
                          charge !== undefined &&
                          charge !== price &&
                          ` · you pay ${formatMoney(charge, p.currency.trim())}`}
                      </span>
                    )}
                  </p>
                  {shownCycle === "annual" && discount > 0 && (
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
