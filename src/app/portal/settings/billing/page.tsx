"use client";

import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalGuard } from "@/components/portal/usePortalGuard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { erp, formatMoney, useErpQuery } from "@/lib/erp";
import { formatDate } from "@/lib/formatDate";
import { hasPermission, useStaffSession } from "@/lib/staffAuth";
import { toast } from "@/lib/toast";
import type { BillingPlan, BillingView } from "./_components/billing-types";
import { createPaymentColumns } from "./_components/payment-columns";

const STATUS_TONE = { active: "success", trialing: "violet", authorization_pending: "warning", past_due: "warning", cancelled: "neutral", expired: "neutral" } as const;

function Meter({ label, used, max }: { label: string; used: number; max: number | null }) {
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[13px]"><span className="text-ink-600">{label}</span><span className="font-semibold text-ink-900">{used}{max ? ` / ${max}` : " (unlimited)"}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]"><div className={`h-full rounded-full ${pct >= 100 ? "bg-error" : "bg-brand-600"}`} style={{ width: max ? `${Math.max(pct, 2)}%` : "0%" }} /></div>
    </div>
  );
}

export default function BillingPage() {
  const { tenant, ready } = usePortalGuard();
  const session = useStaffSession();
  const view = useErpQuery<BillingView>("/api/v1/billing");
  const plansQ = useErpQuery<BillingPlan[]>("/api/v1/billing/plans");
  const canManage = hasPermission(session, "billing", "write");
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const columns = useMemo(() => createPaymentColumns(), []);

  // Checkout opens in a new tab (Razorpay's Subscriptions API cannot redirect back), so refresh when the person returns.
  const { reload } = view;
  useEffect(() => {
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, [reload]);

  if (!ready) return null;
  const data = view.data;
  const sub = data?.subscription ?? null;
  const billed = !!sub && (sub.status === "active" || sub.status === "past_due");
  const waiting = sub?.status === "authorization_pending" && !!sub.razorpay_short_url;
  const plans = plansQ.data ?? [];

  async function call(key: string, path: string, body: unknown, ok: string, after?: (d: never) => void) {
    setBusy(key);
    const res = await erp(path, "POST", body);
    setBusy(null);
    if (res.error) return toast.error("Couldn't complete that", res.error);
    toast.success(ok);
    after?.(res.data as never);
    view.reload();
  }

  const subscribe = (plan: BillingPlan) => call(`s:${plan.code}`, "/api/v1/billing/subscribe", { plan_code: plan.code, billing_cycle: cycle }, "Checkout is ready — complete the payment in the new tab.",
    ((d: { short_url: string }) => window.open(d.short_url, "_blank", "noopener")) as (d: never) => void);
  const changePlan = (plan: BillingPlan) => call(`c:${plan.code}`, "/api/v1/billing/change-plan", { plan_code: plan.code }, `Your plan will change to ${plan.name} at the end of the current period.`);

  return (
    <PortalShell tenant={tenant} active="billing">
      <PageHeader icon={<CreditCard size={20} />} title="Plan & Billing" description="Your subscription, usage and payment history." />
      {(view.error || plansQ.error) && <p className="mb-space-3 text-[13px] font-medium text-error">{view.error ?? plansQ.error}</p>}
      {data && !data.billing_configured && <p className="mb-space-3 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning">Online payments aren&apos;t switched on for this platform yet. Contact your account manager to change your plan.</p>}
      {sub?.status === "past_due" && <p className="mb-space-3 flex items-start gap-space-2 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning"><AlertTriangle size={16} className="mt-0.5 shrink-0" />Your last subscription payment failed. Update your payment method with Razorpay to keep your plan active — we&apos;ll retry automatically.</p>}
      {sub?.cancel_at_period_end && <p className="mb-space-3 rounded-md bg-warning-tint p-space-3 text-[13px] text-warning">Your subscription is set to cancel on <strong>{formatDate(sub.current_period_end)}</strong>. You keep full access until then.</p>}
      {waiting && (
        <Card className="mb-space-3 flex flex-wrap items-center justify-between gap-space-3 border-brand-300 bg-brand-50/50 p-space-3">
          <p className="text-[13.5px] text-ink-900">Your <strong>{data?.plan?.name}</strong> subscription is waiting for payment authorisation.</p>
          <Button href={sub!.razorpay_short_url!} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> Continue to payment</Button>
        </Card>
      )}

      <div className="grid gap-space-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="p-space-4">
          <div className="mb-space-3 flex flex-wrap items-center gap-space-2">
            <h2 className="text-[15px] font-bold text-ink-900">Current plan</h2>
            {sub && <Badge tone={STATUS_TONE[sub.status]}>{sub.status.replace("_", " ")}</Badge>}
          </div>
          {data ? (
            <>
              <p className="text-[22px] font-bold text-ink-900">{data.plan?.name ?? "No plan"}</p>
              {data.plan && billed && <p className="text-[13px] text-ink-600">{formatMoney(sub!.billing_cycle === "annual" ? data.plan.price_yearly_minor : data.plan.price_monthly_minor, data.plan.currency.trim())} per {sub!.billing_cycle === "annual" ? "year" : "month"} · {sub!.cancel_at_period_end ? "ends" : "renews"} {formatDate(sub!.current_period_end)}</p>}
              {!billed && <p className="text-[13px] text-ink-600">{waiting ? "Waiting for your first payment." : "Your plan is managed by your account manager. Subscribe below to pay online."}</p>}
              {data.pending_plan && <p className="mt-space-2 text-[13px] text-brand-700">Switching to <strong>{data.pending_plan.name}</strong> on {formatDate(sub?.current_period_end)}.</p>}
            </>
          ) : <p className="text-ink-400">{view.loading ? "Loading…" : ""}</p>}
        </Card>
        <Card className="space-y-space-3 p-space-4">
          <h2 className="text-[15px] font-bold text-ink-900">Usage</h2>
          {data && <><Meter label="Branches" used={data.usage.branches} max={data.usage.max_branches} /><Meter label="Users" used={data.usage.users} max={data.usage.max_users} /></>}
        </Card>
      </div>

      <div className="mt-space-4 flex flex-wrap items-center justify-between gap-space-3">
        <h2 className="text-[15px] font-bold text-ink-900">Plans</h2>
        <div className="inline-flex rounded-md border border-line bg-card p-0.5 text-[13px] font-semibold">
          {(["monthly", "annual"] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCycle(c)} className={`rounded px-space-3 py-1 ${cycle === c ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-paper"}`}>{c === "monthly" ? "Monthly" : "Annual"}</button>
          ))}
        </div>
      </div>
      <div className="mt-space-3 grid gap-space-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => {
          const current = data?.plan?.id === p.id;
          const price = cycle === "annual" ? p.price_yearly_minor : p.price_monthly_minor;
          const discount = Number(p.annual_discount_pct);
          return (
            <Card key={p.id} className={`flex flex-col p-space-4 ${current ? "border-brand-400" : ""}`}>
              <div className="flex items-center gap-space-2"><h3 className="text-[17px] font-bold text-ink-900">{p.name}</h3>{p.is_popular && <Badge tone="brand">Most popular</Badge>}{current && <Badge tone="success">Current</Badge>}</div>
              {p.description && <p className="text-[12.5px] text-ink-600">{p.description}</p>}
              <p className="mt-space-3"><span className="text-[26px] font-bold text-ink-900">{formatMoney(price, p.currency.trim()).replace(/\.00$/, "")}</span> <span className="text-[13px] text-ink-600">/ {cycle === "annual" ? "year" : "month"}</span></p>
              {cycle === "annual" && discount > 0 && <p className="text-[12px] text-success">You save {discount}% on yearly billing</p>}
              <ul className="my-space-3 flex-1 space-y-1.5 text-[13px]">
                {[p.max_branches ? `Up to ${p.max_branches} branch${p.max_branches === 1 ? "" : "es"}` : "Unlimited branches", p.max_users ? `Up to ${p.max_users} users` : "Unlimited users", ...(p.feature_labels ?? p.features)].map((t) => (
                  <li key={t} className="flex items-start gap-space-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-success" />{t}</li>
                ))}
              </ul>
              {canManage && data?.billing_configured && (
                billed
                  ? <Button variant="secondary" disabled={current || busy !== null || !!data.pending_plan && data.pending_plan.id === p.id || p.price_monthly_minor <= 0} onClick={() => changePlan(p)}>{current ? "Current plan" : data.pending_plan?.id === p.id ? "Scheduled" : "Switch at cycle end"}</Button>
                  : <Button disabled={busy !== null || p.price_monthly_minor <= 0} onClick={() => subscribe(p)}>{p.price_monthly_minor <= 0 ? "Contact us" : current ? "Subscribe to this plan" : "Subscribe"}</Button>
              )}
            </Card>
          );
        })}
        {plansQ.data && plans.length === 0 && <p className="text-ink-400">No plans are available right now.</p>}
      </div>

      {canManage && billed && !sub?.cancel_at_period_end && (
        <div className="mt-space-3"><Button variant="ghost" className="text-destructive" onClick={() => setConfirmCancel(true)}>Cancel subscription</Button></div>
      )}

      <h2 className="mt-space-5 mb-space-3 text-[15px] font-bold text-ink-900">Payment history</h2>
      <Card className="p-space-2">
        <DataTable columns={columns} data={data?.payments ?? []} getRowId={(p) => p.id} pageSize={10} emptyMessage={view.loading ? "Loading…" : "No payments yet."} />
      </Card>

      <ConfirmDialog open={confirmCancel} destructive busy={busy === "cancel"} title="Cancel subscription?" confirmLabel="Cancel at period end"
        message={`You keep full access until ${formatDate(sub?.current_period_end)}. After that your workspace is locked until you subscribe again.`}
        onCancel={() => setConfirmCancel(false)} onConfirm={async () => { await call("cancel", "/api/v1/billing/cancel", { at_cycle_end: true }, "Cancellation scheduled."); setConfirmCancel(false); }} />
    </PortalShell>
  );
}
