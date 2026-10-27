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
import type { Dashboard } from "@/hooks/useDashboard";
import { formatMoney } from "@/lib/erp";
import { compactMoney } from "./format";
import { periodText } from "@/lib/globalFilter";
import { Refreshing } from "./Refreshing";

const dayFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});
const monthFmt = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
});

/** A bucket's label: an hour ("14:00"), a day ("8 Jan"), the week starting that day, or a month ("Jan 26"). */
function label(iso: string, granularity: Dashboard["granularity"]) {
  if (granularity === "hour") return iso.slice(11);
  const d = new Date(`${iso}T00:00:00`);
  if (granularity === "month") return monthFmt.format(d);
  return granularity === "week"
    ? `Week of ${dayFmt.format(d)}`
    : dayFmt.format(d);
}

export function SalesTrend({
  data,
  currency,
  refreshing,
}: {
  data: Dashboard | undefined;
  currency: string;
  /** Another period is loading: the old chart fades and a spinner shows. */
  refreshing: boolean;
}) {
  const points = (data?.trend ?? []).map((t) => ({
    ...t,
    name: label(t.date, data!.granularity),
  }));
  const none =
    data && data.sales.orders === 0 && data.sales.returns_minor === 0;

  return (
    <Card className="p-space-4">
      <div className="mb-space-3 flex flex-wrap items-start justify-between gap-space-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">Sales trend</h2>
          <p className="text-hint">
            {data
              ? `${formatMoney(data.sales.revenue_minor, currency)} from ${data.sales.orders} order${data.sales.orders === 1 ? "" : "s"} · ${periodText(data?.period)}`
              : " "}
          </p>
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
