"use client";

import {
  Building2,
  Check,
  Rocket,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { BillingPlan } from "@/app/portal/settings/billing/_components/billing-types";
import { DemoRequestButton } from "@/components/marketing/DemoRequestButton";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/erp";
import { API_BASE_URL } from "@/lib/staffAuth";

const ICONS: LucideIcon[] = [Sprout, Building2, Rocket];
const planFeatures = (p: BillingPlan) => [
  p.max_branches
    ? `Up to ${p.max_branches} branch${p.max_branches === 1 ? "" : "es"}`
    : "Unlimited branches",
  p.max_users ? `Up to ${p.max_users} users` : "Unlimited users",
  ...(p.feature_labels ?? p.features),
];

/** Every plan on offer, from the public plans endpoint (no sign-in needed), centred under the page heading. */
export function PlansView() {
  const [plans, setPlans] = useState<BillingPlan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/public/plans`)
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then((data: BillingPlan[]) => {
        if (!cancelled) setPlans(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const anyDiscount = (plans ?? []).some(
    (p) => Number(p.annual_discount_pct) > 0,
  );

  return (
    <>
      <div className="relative mx-auto mb-space-8 w-fit">
        <div className="inline-flex rounded-full bg-black/[0.05] p-1 text-[13px] font-semibold">
          {(["monthly", "annual"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCycle(c)}
              className={`rounded-full px-space-5 py-2 transition-colors ${cycle === c ? "bg-card text-ink-900 shadow-[var(--shadow-sm)]" : "text-ink-600 hover:text-ink-900"}`}
            >
              {c === "monthly" ? "Monthly" : "Annual"}
            </button>
          ))}
        </div>
        {anyDiscount && (
          <span className="absolute -top-3 -right-4 rounded-full bg-success px-space-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
            Save more
          </span>
        )}
      </div>

      {failed && (
        <p className="text-center text-[14px] text-error">
          We couldn&apos;t load the plans right now. Please try again in a
          moment.
        </p>
      )}
      {!plans && !failed && (
        <p className="text-center text-[14px] text-ink-400">Loading plans…</p>
      )}
      {plans && plans.length === 0 && (
        <p className="mx-auto max-w-md text-center text-[14px] text-ink-600">
          Plans will be listed here soon. In the meantime, request a demo and
          we&apos;ll walk you through the options.
        </p>
      )}

      <div className="mx-auto flex max-w-[1180px] flex-wrap items-stretch justify-center gap-space-5">
        {(plans ?? []).map((p, i) => {
          const Icon = ICONS[i % ICONS.length]!;
          const price =
            cycle === "annual" ? p.price_yearly_minor : p.price_monthly_minor;
          const discount = Number(p.annual_discount_pct);
          const custom = p.price_monthly_minor <= 0;
          return (
            <div
              key={p.id}
              className={`relative flex w-full flex-col rounded-xl border bg-card p-space-6 shadow-[var(--shadow-sm)] sm:w-[340px] ${p.is_popular ? "border-brand-500" : "border-line"}`}
            >
              {p.is_popular && (
                <span className="absolute -top-3 right-space-5 rounded-full bg-brand-600 px-space-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
                  Most popular
                </span>
              )}
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon size={20} />
              </span>
              <h2 className="mt-space-4 text-[19px] font-bold text-ink-900">
                {p.name}
              </h2>
              {p.description && (
                <p className="mt-1 text-[13px] text-ink-400">{p.description}</p>
              )}
              <p className="mt-space-5">
                {custom ? (
                  <span className="text-[30px] font-bold text-ink-900">
                    Custom
                  </span>
                ) : (
                  <>
                    <span className="text-[32px] font-bold text-ink-900">
                      {formatMoney(price, p.currency.trim()).replace(
                        /\.00$/,
                        "",
                      )}
                    </span>{" "}
                    <span className="text-[13px] text-ink-400">
                      / {cycle === "annual" ? "year" : "month"}
                    </span>
                  </>
                )}
              </p>
              {!custom && cycle === "annual" && discount > 0 && (
                <p className="mt-1 text-[12px] font-medium text-success">
                  You save {discount}% on yearly billing
                </p>
              )}
              <ul className="mt-space-5 mb-space-6 flex-1 space-y-2.5 text-[13.5px] text-ink-700">
                {planFeatures(p).map((t) => (
                  <li key={t} className="flex items-start gap-space-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-success" />
                    {t}
                  </li>
                ))}
              </ul>
              {custom ? (
                <DemoRequestButton>Contact us</DemoRequestButton>
              ) : (
                <Button
                  href="/auth"
                  size="lg"
                  variant={p.is_popular ? "primary" : "secondary"}
                >
                  Get started
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
