import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Dashboard, DashboardRange } from "@/hooks/useDashboard";
import { cn } from "@/lib/cn";
import { CHANNELS, formatMoney, type Channel } from "@/lib/erp";
import { compactMoney, PAYMENT_LABEL, RANGE_LABEL } from "./format";
import { Refreshing } from "./Refreshing";

// Fixed order, never cycled: every legend row also names its slice and its share, so colour is never the only cue.
const COLORS = [
  "#4a5d45",
  "#2a211c",
  "#e0a100",
  "#6b7a4f",
  "#9c9086",
  "#a6b8a1",
  "#7d361d",
];

type View = "channel" | "payment";

/** Sales for the chosen range split by sales channel, or by how customers paid (when the person may see payments). */
export function BreakdownCard({
  data,
  range,
  currency,
  refreshing,
}: {
  data: Dashboard | undefined;
  range: DashboardRange;
  currency: string;
  refreshing: boolean;
}) {
  const [view, setView] = useState<View>("channel");
  const hasPayments = !!data?.by_payment;
  const active: View =
    view === "payment" && hasPayments ? "payment" : "channel";
  const slices = !data
    ? []
    : active === "channel"
      ? data.by_channel.map((c) => ({
          name: CHANNELS[c.channel as Channel]?.label ?? c.channel,
          value: c.amount_minor,
        }))
      : (data.by_payment ?? []).map((p) => ({
          name: PAYMENT_LABEL[p.method] ?? p.method,
          value: p.amount_minor,
        }));
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card className="p-space-4">
      <div className="mb-space-3 flex items-start justify-between gap-space-2">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">
            {active === "channel" ? "Sales by channel" : "Payment methods"}
          </h2>
          <p className="text-hint">{RANGE_LABEL[range]}</p>
        </div>
        {hasPayments && (
          <div className="flex overflow-hidden rounded-md border border-line text-[12px] font-semibold">
            {(["channel", "payment"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={active === v}
                className={cn(
                  "px-space-2 py-1",
                  active === v
                    ? "bg-brand-600 text-white"
                    : "bg-card text-ink-600 hover:bg-brand-50",
                )}
              >
                {v === "channel" ? "Channel" : "Payment"}
              </button>
            ))}
          </div>
        )}
      </div>
      <Refreshing active={refreshing}>
        {!data ? (
          <Skeleton className="h-[220px] w-full" />
        ) : total === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-[13px] text-ink-400">
            Nothing sold in this period yet.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-space-3">
            <div className="relative h-[170px] w-[170px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={82}
                    paddingAngle={slices.length > 1 ? 2 : 0}
                    strokeWidth={0}
                  >
                    {slices.map((s, i) => (
                      <Cell key={s.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatMoney(Number(v), currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] leading-none font-bold text-ink-900">
                  {compactMoney(total)}
                </span>
                <span className="text-[11.5px] text-ink-600">Total</span>
              </div>
            </div>
            <ul className="w-full space-y-space-2">
              {slices.map((s, i) => (
                <li
                  key={s.name}
                  className="flex items-center gap-space-2 text-[12.5px]"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="flex-1 truncate text-ink-900">{s.name}</span>
                  <span className="text-ink-600 tabular-nums">
                    {formatMoney(s.value, currency)}
                  </span>
                  <span className="w-9 text-right font-semibold text-ink-900 tabular-nums">
                    {Math.round((s.value / total) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Refreshing>
    </Card>
  );
}
