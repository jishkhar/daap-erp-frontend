import { Card } from "@/components/ui/Card";
import type { BillingView } from "./billing-types";

function Stat({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number | null;
}) {
  const full = max !== null && used >= max;
  return (
    <Card className="p-space-4">
      <p className="text-[12.5px] font-medium text-ink-600">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`text-[24px] font-bold tabular-nums ${full ? "text-warning" : "text-ink-900"}`}
        >
          {used}
        </span>
        <span className="text-[13px] text-ink-400">
          {max === null ? "· unlimited" : `of ${max}`}
        </span>
      </p>
      {full && (
        <p className="mt-1 text-[12px] text-warning">
          Limit reached. Change plan for more.
        </p>
      )}
    </Card>
  );
}

/** What the business uses against its plan limits, as plain numbers. Terminals only while POS is on. */
export function UsageStats({
  usage,
  showTerminals,
}: {
  usage: BillingView["usage"];
  showTerminals: boolean;
}) {
  return (
    <div
      className={`grid gap-space-3 sm:grid-cols-2 ${showTerminals ? "lg:grid-cols-3" : ""}`}
    >
      <Stat label="Branches" used={usage.branches} max={usage.max_branches} />
      <Stat label="Users" used={usage.users} max={usage.max_users} />
      {showTerminals && (
        <Stat
          label="POS terminals"
          used={usage.terminals}
          max={usage.max_terminals}
        />
      )}
    </div>
  );
}
