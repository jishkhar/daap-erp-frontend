import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Dashboard, DashboardRange } from "@/hooks/useDashboard";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/erp";
import { compactMoney, RANGE_LABEL } from "./format";
import { Refreshing } from "./Refreshing";

const RANGES: { key: DashboardRange; label: string }[] = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "3m", label: "3 Months" },
  { key: "1y", label: "1 Year" },
];

const dayFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});
const monthFmt = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
});

/** A bucket's label: a day ("8 Jan"), the week starting that day, or a month ("Jan 26"). */
function label(iso: string, granularity: Dashboard["granularity"]) {
  const d = new Date(`${iso}T00:00:00`);
  if (granularity === "month") return monthFmt.format(d);
  return granularity === "week"
    ? `Week of ${dayFmt.format(d)}`
    : dayFmt.format(d);
}

export function SalesTrend({
  data,
  range,
  onRange,
  currency,
  refreshing,
}: {
  data: Dashboard | undefined;
  range: DashboardRange;
  onRange: (r: DashboardRange) => void;
  currency: string;
  /** Another range is loading: the old chart fades and a spinner shows. */
  refreshing: boolean;
}) {
  const points = (data?.trend ?? []).map((t) => ({
    ...t,
    name: label(t.date, data!.granularity),
  }));
  const none = data && data.range_totals.orders === 0;

  return (
    <Card className="p-space-4">
      <div className="mb-space-3 flex flex-wrap items-start justify-between gap-space-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">Sales trend</h2>
          <p className="text-hint">
            {data
              ? `${formatMoney(data.range_totals.revenue_minor, currency)} from ${data.range_totals.orders} order${data.range_totals.orders === 1 ? "" : "s"} · ${RANGE_LABEL[range].toLowerCase()}`
              : " "}
          </p>
        </div>
        <div className="flex overflow-hidden rounded-md border border-line text-[13px] font-semibold">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => onRange(r.key)}
              aria-pressed={range === r.key}
              className={cn(
                "px-space-3 py-1.5",
                range === r.key
                  ? "bg-brand-600 text-white"
                  : "bg-card text-ink-600 hover:bg-brand-50",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <Refreshing active={refreshing} className="h-[260px]">
        {!data ? (
          <Skeleton className="h-full w-full" />
        ) : none ? (
          <div className="flex h-full items-center justify-center text-[13.5px] text-ink-400">
            No sales in this period yet.
          </div>
        ) : (
          <ResponsiveContainer>
            <AreaChart data={points} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4a5d45" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#4a5d45" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                fontSize={12}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={56}
                tickFormatter={(v) => compactMoney(Number(v))}
              />
              <Tooltip
                formatter={(v, _n, item) => [
                  `${formatMoney(Number(v), currency)} · ${item.payload.orders} order${item.payload.orders === 1 ? "" : "s"}`,
                  "Sales",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue_minor"
                stroke="#4a5d45"
                strokeWidth={2}
                fill="url(#trendFill)"
                dot={{ r: 3, fill: "#4a5d45", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Refreshing>
    </Card>
  );
}
