"use client";

import { SkeletonLines } from "@/components/ui/Skeleton";
import { useAccountCredit } from "@/hooks/useWholesale";
import { formatMoney } from "@/lib/erp";

/** A business customer's credit position: limit, what they owe, what is overdue, and what is left (or why credit is stopped). */
export function CreditSummary({
  accountId,
  currency,
  compact = false,
}: {
  accountId: string;
  currency: string;
  compact?: boolean;
}) {
  const credit = useAccountCredit(accountId);
  const c = credit.data;
  if (credit.error)
    return <p className="text-[13px] text-error">{credit.error.message}</p>;
  if (!c) return <SkeletonLines rows={compact ? 1 : 3} />;
  const tiles: [string, string, string?][] =
    c.credit_limit_minor === null
      ? [
          ["Credit", "None: pays at billing"],
          ["Owes", formatMoney(c.outstanding_minor, currency)],
        ]
      : [
          [
            "Credit limit",
            `${formatMoney(c.credit_limit_minor, currency)} · ${c.credit_days} days`,
          ],
          ["Owes", formatMoney(c.outstanding_minor, currency)],
          [
            "Overdue",
            formatMoney(c.overdue_minor, currency),
            c.overdue_minor > 0 ? "text-error" : undefined,
          ],
          ["Available", formatMoney(c.available_minor ?? 0, currency)],
        ];
  return (
    <div className="rounded-lg border border-line p-space-3">
      <div
        className={`grid gap-space-2 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}
      >
        {tiles.map(([label, value, tone]) => (
          <div key={label}>
            <p className="text-label">{label}</p>
            <p
              className={`text-[14px] font-semibold ${tone ?? "text-ink-900"}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
      {c.blocked_reason && c.credit_limit_minor !== null && (
        <p className="mt-space-2 text-[12.5px] font-medium text-warning">
          New credit is stopped: {c.blocked_reason}
        </p>
      )}
      {c.oldest_overdue_days > 0 && (
        <p className="mt-space-1 text-[12.5px] text-ink-600">
          Oldest unpaid invoice is {c.oldest_overdue_days} day
          {c.oldest_overdue_days === 1 ? "" : "s"} overdue.
        </p>
      )}
    </div>
  );
}
