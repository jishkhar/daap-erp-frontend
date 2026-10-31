"use client";

import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PlanPickerModal } from "@/components/portal/PlanPickerModal";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlanBadge } from "@/components/ui/ServicePlanBadge";
import { SkeletonLines } from "@/components/ui/Skeleton";
import {
  abandonCheckout,
  useCheckoutQuote,
  useConfirmCheckout,
  useServicePlans,
  useStartCheckout,
} from "@/hooks/useBilling";
import { formatMoney } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import { paySubscription } from "@/lib/razorpayCheckout";
import { SERVICE_LABEL, SERVICES } from "@/lib/services";
import {
  refreshStaffSession,
  hasPermission,
  useStaffSession,
} from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import type { CheckoutQuote } from "../_components/billing-types";
import { ServiceIcon } from "../_components/ServicePlans";

type Cycle = "monthly" | "annual";

const per = (c: Cycle) => (c === "annual" ? "year" : "month");

/** The business's checkout for one service's plan: the plan and cycle, whom the invoice is made out to, and the order summary with its
 * GST exactly as the invoice will show it. Paying opens Razorpay's window over this page; the plan is live as soon as it says paid. */
function Checkout() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const router = useRouter();
  const params = useSearchParams();
  const service = SERVICES.find((s) => s === params.get("service")) ?? null;
  const planCode = params.get("plan");
  const [cycle, setCycle] = useState<Cycle>(
    params.get("cycle") === "annual" ? "annual" : "monthly",
  );
  const [picking, setPicking] = useState(false);
  const [paying, setPaying] = useState(false);
  const quote = useCheckoutQuote(service, planCode, cycle);
  const plans = useServicePlans(service);
  const startCheckout = useStartCheckout();
  const confirm = useConfirmCheckout();
  const canManage = hasPermission(session, "billing", "write");
  const q = quote.data;
  const discount = Number(
    plans.data?.find((p) => p.code === planCode)?.annual_discount_pct ?? 0,
  );

  if (!ready) return null;

  function done(message: string) {
    toast.success(message);
    void refreshStaffSession();
    router.push("/portal/settings/billing");
  }

  async function pay(q: CheckoutQuote) {
    if (!service) return;
    setPaying(true);
    try {
      const started = await startCheckout.mutateAsync({
        service,
        plan_code: q.plan.code,
        billing_cycle: cycle,
      });
      if (started.kind === "scheduled") {
        done(
          `${SERVICE_LABEL[service]} switches to ${q.plan.name} on ${formatDate(q.starts_at)}.`,
        );
        return;
      }
      const paid = await paySubscription({
        keyId: started.key_id,
        subscriptionId: started.razorpay_subscription_id,
        name: "DAAP",
        description: started.description,
        prefill: started.prefill,
      });
      if (!paid) {
        void abandonCheckout(started.checkout_id);
        toast.info("Payment cancelled. Nothing was charged.");
        return;
      }
      await confirm.mutateAsync({ checkoutId: started.checkout_id, paid });
      done(
        `${SERVICE_LABEL[service]} ${q.plan.name} is active. Your invoice is on its way to your email.`,
      );
    } catch (e) {
      toast.error("Couldn't complete the payment", (e as Error).message);
    } finally {
      setPaying(false);
    }
  }

  return (
    <PortalShell tenant={tenant} active="billing">
      <Link
        href="/portal/settings/billing"
        className="mb-space-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft size={14} /> Plan & Billing
      </Link>
      <h1 className="mb-space-5 text-[22px] font-bold text-ink-900">
        {q?.kind === "upgrade"
          ? `Upgrade to ${q.plan.name}`
          : q?.kind === "scheduled"
            ? `Switch to ${q.plan.name}`
            : "Checkout"}
      </h1>

      {!service || !planCode ? (
        <Card className="p-space-4 text-[13px] text-ink-600">
          Choose a plan first.{" "}
          <Link
            href="/portal/settings/billing"
            className="text-brand-600 hover:underline"
          >
            Back to Plan & Billing
          </Link>
        </Card>
      ) : quote.error ? (
        <Card className="p-space-4 text-[13px] text-error">
          {quote.error.message}
        </Card>
      ) : !q ? (
        <Card className="p-space-4">
          <SkeletonLines rows={6} />
        </Card>
      ) : (
        <div className="grid items-start gap-space-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-space-4">
            <Card className="p-space-4">
              <p className="text-label mb-space-3">Plan</p>
              <div className="flex flex-wrap items-center justify-between gap-space-3">
                <div className="flex items-center gap-space-3">
                  <ServiceIcon service={service} />
                  <div>
                    <p className="flex items-center gap-space-2 text-[15px] font-bold text-ink-900">
                      {SERVICE_LABEL[service]}
                      <PlanBadge name={q.plan.name} code={q.plan.code} />
                    </p>
                    <p className="text-[13px] text-ink-600">
                      {formatMoney(
                        q.price_minor,
                        q.plan.currency.trim(),
                      ).replace(/\.00$/, "")}
                      /{per(cycle)}
                      {q.price_mode === "exclusive" && Number(q.gst_rate) > 0
                        ? ` + ${Number(q.gst_rate)}% GST`
                        : ""}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setPicking(true)}>
                  Change plan
                </Button>
              </div>
              <div className="mt-space-4 grid grid-cols-2 gap-space-2">
                {(["monthly", "annual"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCycle(c)}
                    className={`rounded-md border p-space-3 text-left transition-colors ${cycle === c ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-500" : "border-line hover:border-brand-300"}`}
                  >
                    <span className="block text-[14px] font-semibold text-ink-900">
                      {c === "monthly" ? "Monthly" : "Annual"}
                    </span>
                    <span className="text-[12.5px] text-ink-600">
                      {c === "annual" && discount > 0
                        ? `Save ${discount}%`
                        : c === "monthly"
                          ? "Billed every month"
                          : "Billed once a year"}
                    </span>
                  </button>
                ))}
              </div>
              {q.kind === "upgrade" && q.current && (
                <p className="mt-space-3 rounded-md bg-info-tint p-space-3 text-[13px] text-info">
                  Replaces your {q.current.plan_name} plan today. Your new{" "}
                  {per(cycle)} starts now; the rest of the current period is not
                  refunded.
                </p>
              )}
              {q.kind === "new" && q.current && !q.current.billed && (
                <p className="mt-space-3 text-[13px] text-ink-600">
                  Your current {q.current.plan_name} plan
                  {q.current.status === "trialing" ? " trial" : ""} is replaced
                  as soon as you pay.
                </p>
              )}
              {q.kind === "scheduled" && (
                <p className="mt-space-3 rounded-md bg-brand-50 p-space-3 text-[13px] text-brand-700">
                  You keep {q.current?.plan_name} until{" "}
                  {formatDate(q.starts_at)}, then move to {q.plan.name}. Nothing
                  to pay today.
                </p>
              )}
              {(q.kind === "current" || q.kind === "unavailable") &&
                q.reason && (
                  <p className="mt-space-3 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning">
                    {q.reason}
                  </p>
                )}
            </Card>

            <Card className="p-space-4">
              <div className="mb-space-3 flex items-center justify-between">
                <p className="text-label">Billing details</p>
                <Link
                  href="/portal/settings/taxes"
                  className="text-[13px] font-medium text-brand-600 hover:underline"
                >
                  Edit
                </Link>
              </div>
              <p className="text-[14px] font-semibold text-ink-900">
                {q.bill_to.legal_name}
              </p>
              {q.bill_to.address && (
                <p className="text-[13px] text-ink-600">{q.bill_to.address}</p>
              )}
              <p className="text-[13px] text-ink-600">
                {q.bill_to.state && `${q.bill_to.state} · `}
                {q.bill_to.gstin ? `GSTIN ${q.bill_to.gstin}` : "No GSTIN"}
              </p>
              {!q.bill_to.gstin && (
                <p className="text-hint mt-space-1">
                  The invoice is issued without a GSTIN. Add yours under Taxes
                  before paying to claim input tax credit.
                </p>
              )}
              {q.bill_to.email && (
                <p className="text-hint mt-space-2">
                  Invoice emailed to {q.bill_to.email}
                </p>
              )}
            </Card>
          </div>

          <OrderSummary
            q={q}
            cycle={cycle}
            busy={paying || quote.isFetching}
            canPay={canManage && q.billing_configured}
            onPay={() => pay(q)}
          />
        </div>
      )}

      <PlanPickerModal
        open={picking}
        service={service ?? undefined}
        onClose={() => setPicking(false)}
      />
    </PortalShell>
  );
}

function Line({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-space-3 ${strong ? "text-[15px] font-bold text-ink-900" : "text-[13.5px] text-ink-600"}`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function OrderSummary({
  q,
  cycle,
  busy,
  canPay,
  onPay,
}: {
  q: CheckoutQuote;
  cycle: Cycle;
  busy: boolean;
  canPay: boolean;
  onPay: () => void;
}) {
  const cur = q.plan.currency.trim();
  const m = (v: number) => formatMoney(v, cur);
  const half = Number(q.gst_rate) / 2;
  const buyable =
    q.kind === "new" || q.kind === "upgrade" || q.kind === "scheduled";
  return (
    <Card className="p-space-4 lg:sticky lg:top-24">
      <p className="text-label mb-space-3">Order summary</p>
      <div className="space-y-space-2">
        <Line
          label={`${SERVICE_LABEL[q.service]} ${q.plan.name}, ${cycle}`}
          value={m(q.taxable_minor)}
        />
        {q.supply_type === "INTER" ? (
          <Line label={`IGST ${Number(q.gst_rate)}%`} value={m(q.igst_minor)} />
        ) : (
          Number(q.gst_rate) > 0 && (
            <>
              <Line label={`CGST ${half}%`} value={m(q.cgst_minor)} />
              <Line label={`SGST ${half}%`} value={m(q.sgst_minor)} />
            </>
          )
        )}
        <div className="border-t border-line pt-space-2">
          <Line label={`Total per ${per(cycle)}`} value={m(q.total_minor)} />
        </div>
        <Line strong label="Due today" value={m(q.due_now_minor)} />
      </div>
      <p className="mt-space-3 text-[12.5px] text-ink-600">
        {q.kind === "scheduled"
          ? `From ${formatDate(q.starts_at)}: ${m(q.total_minor)}/${per(cycle)}.`
          : `Renews ${formatDate(q.renews_at)} at ${m(q.total_minor)}/${per(cycle)}. Cancel any time from Plan & Billing.`}
      </p>
      {canPay && buyable && (
        <Button
          className="mt-space-4 w-full"
          size="lg"
          disabled={busy}
          onClick={onPay}
        >
          {q.kind === "scheduled" ? (
            `Switch on ${formatDate(q.starts_at)}`
          ) : (
            <>
              <Lock size={16} /> Pay {m(q.due_now_minor)}
            </>
          )}
        </Button>
      )}
      {!q.billing_configured && (
        <p className="mt-space-3 text-[12.5px] text-warning">
          Online payments aren&apos;t switched on yet. Contact your account
          manager.
        </p>
      )}
      <p className="mt-space-3 flex items-center gap-1.5 text-[12px] text-ink-400">
        <ShieldCheck size={14} /> Payments are processed securely by Razorpay. A
        GST tax invoice is issued for every payment.
      </p>
    </Card>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <Checkout />
    </Suspense>
  );
}
